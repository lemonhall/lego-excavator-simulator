import {
  ACESFilmicToneMapping,
  Box3,
  Group,
  CylinderGeometry,
  Mesh,
  MeshPhysicalMaterial,
  Object3D,
  PCFSoftShadowMap,
  PerspectiveCamera,
  PointLight,
  Quaternion,
  SpotLight,
  Vector3,
  WebGLRenderer
} from "three";
import { deriveSoundState, GameAudioController } from "./audio";
import { computeCameraRig } from "./camera";
import { createDebrisCleanupTracker, updateDebrisCleanup, type DebrisCleanupTracker } from "./cleanup";
import {
  collectCommunityModelParts,
  loadCommunityModelCatalog,
  loadLDrawCommunityModel,
  resetCommunityPartToBase,
  setCommunityModelEdgeVisibility,
  validateCommunityModelCatalog,
  type CommunityModelCatalog,
  type CommunityModelInstance,
  type CommunityModelManifestEntry,
  type CommunityWheelAxis
} from "./communityModels";
import { KeyboardInput } from "./input";
import { loadOfficialWorkerModel } from "./officialWorkerModel";
import { createPhysicsWorldController, type PhysicsBodyHandle, type PhysicsWorldController } from "./physics";
import { createInitialGameState, updateGameState, type DestructibleState, type GameState } from "./state";
import { createWeaponSystem, type ProjectileHit, type ShooterTarget, type WeaponSystem } from "./weapon";
import { createFarmWorld, type FarmWorld } from "./world";

export interface GameApp {
  destroy: () => void;
}

declare global {
  interface Window {
    __legoGameDebug?: {
      officialModelLoaded: boolean;
      officialModelBounds?: unknown;
      fallbackVisible?: boolean;
      limbRotations?: Record<string, number | undefined>;
      officialRig?: Record<string, unknown>;
      excavator?: Record<string, unknown>;
      destructibles?: Record<string, unknown>;
      physics?: unknown;
      audio?: Record<string, unknown>;
      communityModels?: Record<string, unknown>;
      cleanup?: Record<string, unknown>;
      vehicles?: Record<string, unknown>;
      controls?: Record<string, unknown>;
      weapon?: Record<string, unknown>;
      worldBounds?: Record<string, unknown>;
      teleport?: (options: DebugTeleportOptions) => void;
    };
  }
}

interface DebugTeleportOptions {
  mode?: GameState["mode"];
  playerPosition?: { x: number; y: number; z: number };
  excavatorPosition?: { x: number; y: number; z: number };
}

const FIXED_DT = 1 / 60;
const destructiblePhysicsBodies = new WeakMap<Object3D, PhysicsBodyHandle>();
const destructibleImpulseStatuses = new WeakMap<Object3D, DestructibleState["status"]>();
const fallbackPhysicsDebug = {
  engine: "loading",
  ready: false,
  fixedColliderCount: 0,
  assemblyBodyCount: 0,
  activeLinkCount: 0,
  brokenLinkCount: 0,
  kinematicColliderCount: 0
} as const;
const physicsRegisteredWorlds = new WeakSet<FarmWorld>();
const communityPhysicsBodies = new WeakMap<Object3D, PhysicsBodyHandle>();
const communityImpulseStatuses = new WeakMap<Object3D, CommunityModelInstance["status"]>();
const COMMUNITY_VEHICLE_SPEED = 4.2;
const COMMUNITY_VEHICLE_PATROL_SPEED = 1.35;
const COMMUNITY_VEHICLE_INTERACTION_DISTANCE = 2.4;
const COMMUNITY_WHEEL_SPIN_PER_METER = 7.5;
const DEFAULT_COMMUNITY_TARGET_HEALTH = 4;
const FARM_TARGET_HEALTH = 3;
const DEBRIS_TTL_SECONDS = 4;
let lastAssistedTargetId: string | undefined;

interface CommunityVehicleDriveState {
  instanceId: string;
}

export interface CommunityModelPlacement {
  x: number;
  z: number;
  yaw: number;
}

export function mountGameApp(root: HTMLElement): GameApp {
  root.innerHTML = "";

  const wrapper = document.createElement("main");
  wrapper.className = "game-shell";

  const hud = document.createElement("section");
  hud.className = "hud";
  hud.dataset.testid = "hud";
  wrapper.appendChild(hud);

  const modelPanel = document.createElement("aside");
  modelPanel.className = "model-panel";
  modelPanel.dataset.testid = "community-model-panel";
  modelPanel.hidden = true;
  wrapper.appendChild(modelPanel);

  const renderer = new WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;
  renderer.domElement.dataset.testid = "game-canvas";
  wrapper.appendChild(renderer.domElement);
  root.appendChild(wrapper);

  const world = createFarmWorld();
  void loadOfficialWorkerModel(world).catch((error: unknown) => {
    console.warn("Failed to load official worker model; using procedural fallback.", error);
  });
  const camera = new PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 520);
  const input = new KeyboardInput(window, renderer.domElement);
  const audio = new GameAudioController();
  const weapon = createWeaponSystem({
    fireRatePerSecond: 42,
    projectileLifetime: 1.35,
    projectileSpeed: 85,
    damage: 1,
    maxProjectiles: 180
  });
  const debrisCleanup = createDebrisCleanupTracker({ ttlSeconds: DEBRIS_TTL_SECONDS });
  const projectileRoot = new Group();
  projectileRoot.name = "projectileRoot";
  world.scene.add(projectileRoot);
  const muzzleFlash = new PointLight("#ffd166", 0, 5.5, 1.5);
  muzzleFlash.name = "gatlingMuzzleFlash";
  world.scene.add(muzzleFlash);
  let physics: PhysicsWorldController | undefined;
  void createPhysicsWorldController()
    .then((controller) => {
      physics = controller;
      registerPhysicsAssemblies(world, controller);
      communityInstances.forEach((instance) => registerCommunityModelPhysics(instance, controller));
    })
    .catch((error: unknown) => {
      console.warn("Failed to initialize Rapier physics; using visual fallback shards.", error);
    });
  let state = createInitialGameState();
  let previousState = state;
  let animationFrame = 0;
  let disposed = false;
  let audioUnlockRequested = false;
  let modelBrowserOpen = false;
  let communityCatalog: CommunityModelCatalog | undefined;
  const communityInstances: CommunityModelInstance[] = [];
  const autoSpawnedCommunityModelIds = new Set<string>();
  let communityVehicleDrive: CommunityVehicleDriveState | undefined;
  let nextCommunityInstanceId = 0;
  let modelPanelMessage = "正在加载 LDraw 模型库...";
  let elapsedSeconds = 0;
  let vehiclePatrolDebug = { patrolCount: 0, movedCount: 0 };

  const onResize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  };
  window.addEventListener("resize", onResize);
  const unlockAudio = () => {
    if (audioUnlockRequested) {
      return;
    }
    audioUnlockRequested = true;
    void audio.unlock();
  };
  window.addEventListener("keydown", unlockAudio);
  window.addEventListener("pointerdown", unlockAudio);
  void loadCommunityModelCatalog()
    .then((catalog) => {
      const validation = validateCommunityModelCatalog(catalog);
      if (!validation.valid) {
        throw new Error(validation.errors.join("\n"));
      }
      communityCatalog = catalog;
      modelPanelMessage = "";
      spawnDefaultCommunityTargets(catalog, spawnCommunityModel, autoSpawnedCommunityModelIds);
      renderModelPanel(modelPanel, modelBrowserOpen, communityCatalog, modelPanelMessage, spawnCommunityModel);
    })
    .catch((error: unknown) => {
      console.warn("Failed to load community LDraw catalog.", error);
      modelPanelMessage = "LDraw 模型库加载失败";
      renderModelPanel(modelPanel, modelBrowserOpen, communityCatalog, modelPanelMessage, spawnCommunityModel);
    });

  const spawnCommunityModel = (model: CommunityModelManifestEntry) => {
    const instanceId = `community${nextCommunityInstanceId}`;
    nextCommunityInstanceId += 1;
    modelPanelMessage = `正在加载：${model.name}`;
    renderModelPanel(modelPanel, modelBrowserOpen, communityCatalog, modelPanelMessage, spawnCommunityModel);

    void loadLDrawCommunityModel(model, instanceId)
      .then((instance) => {
        positionCommunityInstance(instance.root, communityInstances.length);
        world.scene.add(instance.root);
        communityInstances.push(instance);
        registerCommunityModelPhysics(instance, physics);
        modelPanelMessage = `已放置：${model.name}`;
        renderModelPanel(modelPanel, modelBrowserOpen, communityCatalog, modelPanelMessage, spawnCommunityModel);
      })
      .catch((error: unknown) => {
        console.warn("Failed to spawn community LDraw model.", error);
        modelPanelMessage = `加载失败：${model.name}`;
        renderModelPanel(modelPanel, modelBrowserOpen, communityCatalog, modelPanelMessage, spawnCommunityModel);
      });
  };

  const tick = () => {
    if (disposed) {
      return;
    }

    previousState = state;
    elapsedSeconds += FIXED_DT;
    const inputState = input.snapshot();
    if (inputState.toggleModelBrowser) {
      modelBrowserOpen = !modelBrowserOpen;
      renderModelPanel(modelPanel, modelBrowserOpen, communityCatalog, modelPanelMessage, spawnCommunityModel);
    }
    const communityDriveResult = updateCommunityVehicleDrive(communityInstances, state, inputState, communityVehicleDrive, FIXED_DT);
    communityVehicleDrive = communityDriveResult.drive;
    if (communityDriveResult.consumeInteract) {
      inputState.interact = false;
    }
    state = updateGameState(state, inputState, FIXED_DT);
    if (communityDriveResult.playerPosition) {
      state.player.position = communityDriveResult.playerPosition;
    }
    state.player.visible = communityVehicleDrive === undefined && state.mode === "onFoot";
    vehiclePatrolDebug = updateCommunityVehiclePatrol(communityInstances, communityVehicleDrive, elapsedSeconds, FIXED_DT);
    audio.update(deriveSoundState(previousState, state));
    syncWorld(world, state, physics, communityInstances);
    if (communityVehicleDrive) {
      world.playerRoot.visible = false;
    }
    updateWeaponSystem(world, camera, weapon, projectileRoot, muzzleFlash, inputState.fire && state.mode === "onFoot", communityInstances, state);
    syncCommunityModels(communityInstances, state, physics);
    updateDebrisCleanup(debrisCleanup, collectDebrisCleanupTargets(state, communityInstances), FIXED_DT);
    applyDebrisCleanupVisibility(world, communityInstances, debrisCleanup);
    if (communityVehicleDrive) {
      const drivenInstance = communityInstances.find((instance) => instance.id === communityVehicleDrive?.instanceId);
      if (drivenInstance) {
        animateCommunityVehicleWheels(drivenInstance, communityDriveResult.travelDistance);
      }
    }
    syncDebugState(world, state, audio, physics, communityInstances, communityVehicleDrive, weapon, debrisCleanup, vehiclePatrolDebug, (options) => {
      if (options.mode) {
        state.mode = options.mode;
        state.player.visible = options.mode === "onFoot";
      }
      if (options.playerPosition) {
        state.player.position = { ...options.playerPosition };
      }
      if (options.excavatorPosition) {
        state.excavator.position = { ...options.excavatorPosition };
      }
    });
    updateCamera(camera, state);
    syncCameraFillLight(world, camera, state);
    updateHud(hud, state, audio, communityVehicleDrive);
    renderer.render(world.scene, camera);
    animationFrame = window.requestAnimationFrame(tick);
  };

  tick();

  return {
    destroy: () => {
      disposed = true;
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("keydown", unlockAudio);
      window.removeEventListener("pointerdown", unlockAudio);
      audio.dispose();
      renderer.dispose();
      root.innerHTML = "";
    }
  };
}

function syncDebugState(
  world: FarmWorld,
  state: GameState,
  audio: GameAudioController,
  physics: PhysicsWorldController | undefined,
  communityInstances: CommunityModelInstance[],
  communityVehicleDrive: CommunityVehicleDriveState | undefined,
  weapon: WeaponSystem,
  debrisCleanup: DebrisCleanupTracker,
  vehiclePatrolDebug: Record<string, unknown>,
  teleport: (options: DebugTeleportOptions) => void
): void {
  window.__legoGameDebug = {
    officialModelLoaded: world.playerRoot.userData.loadedOfficialWorkerModel === true,
    officialModelBounds: world.playerRoot.userData.officialModelBounds,
    fallbackVisible: world.playerRoot.getObjectByName("playerProceduralFallback")?.visible,
    excavator: getExcavatorDebug(world, state),
    destructibles: getDestructibleDebug(world, state),
    communityModels: getCommunityModelsDebug(communityInstances, communityVehicleDrive?.instanceId),
    cleanup: { ...debrisCleanup.getDebugState() },
    vehicles: vehiclePatrolDebug,
    weapon: getWeaponAppDebug(world, weapon),
    worldBounds: {
      width: 360,
      depth: 360
    },
    controls: {
      pointerLocked: document.pointerLockElement !== null,
      cameraYaw: state.camera.yaw,
      cameraPitch: state.camera.pitch,
      communityVehicleDriving: communityVehicleDrive?.instanceId
    },
    physics: physics?.getDebugState() ?? fallbackPhysicsDebug,
    limbRotations: {
      leftArm: world.playerRoot.getObjectByName("playerLeftArm")?.rotation.x,
      rightArm: world.playerRoot.getObjectByName("playerRightArm")?.rotation.x,
      leftLeg: world.playerRoot.getObjectByName("playerLeftLeg")?.rotation.x,
      rightLeg: world.playerRoot.getObjectByName("playerRightLeg")?.rotation.x
    },
    officialRig: getOfficialRigDebug(world),
    audio: audio.getDebugState(),
    teleport
  };
}

function getExcavatorDebug(world: FarmWorld, state: GameState): Record<string, unknown> {
  const opacitySample = findExcavatorOpacitySample(world);

  return {
    hasCrawlerBase: world.excavatorCrawlerBase.name === "excavatorCrawlerBase",
    hasUpper: world.excavatorUpper.name === "excavatorUpper",
    hasStick: world.excavatorStick.name === "excavatorStick",
    hasBucket: world.excavatorBucket.name === "excavatorBucket",
    crawlerHeading: state.excavator.crawlerHeading,
    upperRotation: state.excavator.upperRotation,
    boomAngle: state.excavator.boomAngle,
    stickAngle: state.excavator.stickAngle,
    bucketAngle: state.excavator.bucketAngle,
    crawlerWorldRotation: world.excavatorCrawlerBase.rotation.y,
    upperWorldRotation: world.excavatorUpper.rotation.y,
    transparentBody: state.mode === "driving",
    bodyOpacity: opacitySample
  };
}

function findExcavatorOpacitySample(world: FarmWorld): number | undefined {
  let opacity: number | undefined;
  world.excavatorRoot.traverse((object) => {
    if (opacity === undefined && object instanceof Mesh && object.material instanceof MeshPhysicalMaterial) {
      opacity = object.material.opacity;
    }
  });
  return opacity;
}

function getOfficialRigDebug(world: FarmWorld): Record<string, unknown> {
  let plasticMeshCount = 0;
  world.playerRoot.traverse((object) => {
    if (object instanceof Mesh && object.material instanceof MeshPhysicalMaterial && object.material.userData.materialKind === "legoPlastic") {
      plasticMeshCount += 1;
    }
  });

  return {
    leftHandParent: world.playerRoot.getObjectByName("playerLeftHand")?.parent?.name,
    rightHandParent: world.playerRoot.getObjectByName("playerRightHand")?.parent?.name,
    leftArmPivot: world.playerRoot.getObjectByName("playerLeftArm")?.userData.animationPivot,
    rightArmPivot: world.playerRoot.getObjectByName("playerRightArm")?.userData.animationPivot,
    physicalPlasticMeshes: plasticMeshCount,
    limbCenters: getOfficialLimbCenters(world),
    materialSample: getOfficialMaterialSample(world),
    namedRigNodes: getNamedRigNodes(world),
    cameraFillLight: getCameraFillLightDebug(world)
  };
}

function getOfficialLimbCenters(world: FarmWorld): Record<string, unknown> {
  const leftArm = getWorldCenter(world.playerRoot, "playerLeftArmPart");
  const rightArm = getWorldCenter(world.playerRoot, "playerRightArmPart");
  const leftHand = getWorldCenter(world.playerRoot, "playerLeftHand");
  const rightHand = getWorldCenter(world.playerRoot, "playerRightHand");

  return {
    leftArm,
    rightArm,
    leftHand,
    rightHand,
    leftHandArmDistance: leftArm && leftHand ? leftArm.distanceTo(leftHand) : undefined,
    rightHandArmDistance: rightArm && rightHand ? rightArm.distanceTo(rightHand) : undefined
  };
}

function getWorldCenter(root: FarmWorld["playerRoot"], name: string): Vector3 | undefined {
  const object = root.getObjectByName(name);
  if (!object) {
    return undefined;
  }

  const bounds = new Box3().setFromObject(object);
  const center = new Vector3();
  bounds.getCenter(center);
  return center;
}

function getOfficialMaterialSample(world: FarmWorld): Record<string, unknown> | undefined {
  let sample: MeshPhysicalMaterial | undefined;
  world.playerRoot.traverse((object) => {
    if (!sample && object instanceof Mesh && object.material instanceof MeshPhysicalMaterial && object.material.userData.materialKind === "legoPlastic") {
      sample = object.material;
    }
  });

  if (!sample) {
    return undefined;
  }

  return {
    clearcoat: sample.clearcoat,
    clearcoatRoughness: sample.clearcoatRoughness,
    roughness: sample.roughness,
    envMapIntensity: sample.envMapIntensity,
    color: `#${sample.color.getHexString()}`
  };
}

function getNamedRigNodes(world: FarmWorld): Record<string, unknown>[] {
  const nodes: Record<string, unknown>[] = [];
  world.playerRoot.traverse((object) => {
    if (object.name.includes("Arm") || object.name.includes("Hand")) {
      nodes.push({
        name: object.name,
        parent: object.parent?.name,
        visible: object.visible,
        path: getObjectPath(object),
        center: getCenterArray(object)
      });
    }
  });
  return nodes;
}

function getCameraFillLightDebug(world: FarmWorld): Record<string, unknown> | undefined {
  const light = world.scene.getObjectByName("cameraPlasticFillLight");
  if (!(light instanceof SpotLight)) {
    return undefined;
  }

  return {
    intensity: light.intensity,
    distance: light.distance,
    angle: light.angle,
    penumbra: light.penumbra,
    position: light.position.toArray()
  };
}

function getObjectPath(object: Object3D): string {
  const names: string[] = [];
  let current: Object3D | null = object;
  while (current) {
    names.unshift(current.name || "(unnamed)");
    current = current.parent;
  }
  return names.join("/");
}

function getCenterArray(object: Object3D): number[] {
  const bounds = new Box3().setFromObject(object);
  if (bounds.isEmpty()) {
    return object.getWorldPosition(new Vector3()).toArray();
  }
  const center = new Vector3();
  bounds.getCenter(center);
  return center.toArray();
}

function syncWorld(
  world: FarmWorld,
  state: GameState,
  physics: PhysicsWorldController | undefined,
  communityInstances: CommunityModelInstance[]
): void {
  world.playerRoot.visible = state.player.visible;
  world.playerRoot.position.set(state.player.position.x, state.player.position.y, state.player.position.z);
  world.playerRoot.rotation.y = state.player.facing;
  syncPlayerWalk(world, state);

  world.excavatorRoot.position.set(state.excavator.position.x, state.excavator.position.y, state.excavator.position.z);
  world.excavatorRoot.rotation.y = 0;
  world.excavatorCrawlerBase.rotation.y = state.excavator.crawlerHeading;
  world.excavatorUpper.rotation.y = state.excavator.crawlerHeading + state.excavator.upperRotation;
  world.excavatorBoom.rotation.x = state.excavator.boomAngle;
  world.excavatorStick.rotation.x = state.excavator.stickAngle;
  world.excavatorBucket.rotation.x = state.excavator.bucketAngle;
  syncExcavatorOpacity(world, state);
  syncPhysics(world, state, physics);
  syncDestructibles(world, state, physics);
  updateCommunityModelImpactState(communityInstances, state);
  physics?.step(FIXED_DT);
}

function syncExcavatorOpacity(world: FarmWorld, state: GameState): void {
  const transparentBody = state.mode === "driving";
  const opacity = transparentBody ? 0.3 : 1;

  world.excavatorRoot.traverse((object) => {
    if (!(object instanceof Mesh) || !(object.material instanceof MeshPhysicalMaterial)) {
      return;
    }

    if (object.material.userData.originalOpacity === undefined) {
      object.material.userData.originalOpacity = object.material.opacity;
      object.material.userData.originalTransparent = object.material.transparent;
      object.material.userData.originalDepthWrite = object.material.depthWrite;
    }

    object.material.opacity = opacity;
    object.material.transparent = transparentBody || object.material.userData.originalTransparent === true;
    object.material.depthWrite = transparentBody ? false : object.material.userData.originalDepthWrite !== false;
    object.material.needsUpdate = true;
  });
}

function syncPlayerWalk(world: FarmWorld, state: GameState): void {
  const swing = state.player.moving ? Math.sin(state.player.walkPhase) * 0.58 : 0;
  const bounce = state.player.moving ? Math.abs(Math.sin(state.player.walkPhase * 2)) * 0.045 : 0;
  const leftArm = world.playerRoot.getObjectByName("playerLeftArm");
  const rightArm = world.playerRoot.getObjectByName("playerRightArm");
  const leftLeg = world.playerRoot.getObjectByName("playerLeftLeg");
  const rightLeg = world.playerRoot.getObjectByName("playerRightLeg");

  if (leftArm) {
    leftArm.rotation.x = swing;
  }
  if (rightArm) {
    rightArm.rotation.x = -swing;
  }
  if (leftLeg) {
    leftLeg.rotation.x = -swing * 0.82;
  }
  if (rightLeg) {
    rightLeg.rotation.x = swing * 0.82;
  }

  world.playerRoot.position.y = state.player.position.y + bounce;
}

function syncDestructibles(world: FarmWorld, state: GameState, physics: PhysicsWorldController | undefined): void {
  const targetsById = new Map(state.destructibles.map((target) => [target.id, target]));

  world.destructibleRoots.forEach((root) => {
    const target = targetsById.get(String(root.userData.destructibleId));
    if (!target) {
      return;
    }

    root.userData.damageStatus = target.status;
    root.traverse((object) => {
      if (object.userData.destructibleCore === true) {
        object.visible = true;
      }

      if (isDestructiblePhysicsPart(object)) {
        syncDestructiblePart(object, target, physics);
      }
    });
  });
}

function syncDestructiblePart(object: Object3D, target: DestructibleState, physics: PhysicsWorldController | undefined): void {
  const basePosition = object.userData.basePosition;
  const baseRotation = object.userData.baseRotation;
  if (!(basePosition instanceof Vector3)) {
    object.userData.basePosition = object.position.clone();
  } else {
    object.position.copy(basePosition);
  }
  if (!baseRotation || typeof baseRotation.copy !== "function") {
    object.userData.baseRotation = object.rotation.clone();
  } else {
    object.rotation.copy(baseRotation);
  }

  if (object.userData.destructibleShard === true) {
    object.visible = target.status !== "intact";
  }

  if (target.status === "intact") {
    return;
  }

  if (physics) {
    syncPhysicsPart(object, target, physics);
    return;
  }

  const hash = stableNameHash(object.name);
  const spread = target.status === "detached" ? 0.62 : 0.22;
  const lift = target.status === "detached" ? 0.18 : 0.06;
  object.position.x += Math.sin(hash) * spread;
  object.position.y += lift + (hash % 3) * 0.04;
  object.position.z += Math.cos(hash * 1.7) * spread;
  object.rotation.x += 0.35 + (hash % 5) * 0.08;
  object.rotation.z += Math.sin(hash * 0.7) * 0.65;
}

function syncPhysics(world: FarmWorld, state: GameState, physics: PhysicsWorldController | undefined): void {
  if (!physics) {
    return;
  }

  physics.setKinematicBox("excavatorBody", {
    position: {
      x: state.excavator.position.x,
      y: 0.65,
      z: state.excavator.position.z
    },
    halfExtents: { x: 1.35, y: 0.55, z: 1.7 },
    rotationY: state.excavator.crawlerHeading
  });

  const bucketPosition = new Vector3();
  world.excavatorBucket.getWorldPosition(bucketPosition);
  physics.setKinematicBox("excavatorBucket", {
    position: {
      x: bucketPosition.x,
      y: Math.max(0.25, bucketPosition.y),
      z: bucketPosition.z
    },
    halfExtents: { x: 0.52, y: 0.24, z: 0.44 },
    rotationY: state.excavator.heading
  });
}

function syncPhysicsPart(object: Object3D, target: DestructibleState, physics: PhysicsWorldController): void {
  const body = destructiblePhysicsBodies.get(object);
  if (!body) {
    return;
  }

  const previousImpulseStatus = destructibleImpulseStatuses.get(object);
  if (target.status !== "intact" && previousImpulseStatus !== target.status) {
    const worldPosition = object.getWorldPosition(new Vector3());
    const worldQuaternion = object.getWorldQuaternion(new Quaternion());
    physics.setPartTransform(
      object.name,
      { x: worldPosition.x, y: worldPosition.y, z: worldPosition.z },
      { x: worldQuaternion.x, y: worldQuaternion.y, z: worldQuaternion.z, w: worldQuaternion.w }
    );
    const hash = stableNameHash(object.name);
    const direction = new Vector3(worldPosition.x - target.position.x, 0.2, worldPosition.z - target.position.z);
    if (direction.lengthSq() < 0.01) {
      direction.set(Math.sin(hash), 0.2, Math.cos(hash));
    }
    direction.normalize();
    const impulseScale = target.status === "detached" ? 1.8 : 0.65;
    physics.applyPartImpulse(object.name, {
      x: direction.x * impulseScale,
      y: 0.15 + (hash % 3) * 0.03,
      z: direction.z * impulseScale
    });
  }
  destructibleImpulseStatuses.set(object, target.status);

  const translation = body.translation();
  const rotation = body.rotation();
  const local = object.parent?.worldToLocal(new Vector3(translation.x, translation.y, translation.z));
  if (local) {
    object.position.copy(local);
  }
  object.quaternion.copy(new Quaternion(rotation.x, rotation.y, rotation.z, rotation.w));
}

function updateWeaponSystem(
  world: FarmWorld,
  camera: PerspectiveCamera,
  weapon: WeaponSystem,
  projectileRoot: Group,
  muzzleFlash: PointLight,
  firing: boolean,
  communityInstances: CommunityModelInstance[],
  state: GameState
): void {
  const muzzle = world.playerRoot.getObjectByName("playerWeaponMuzzle");
  const origin = muzzle ? muzzle.getWorldPosition(new Vector3()) : world.playerRoot.position.clone().add(new Vector3(0, 1.2, -0.4));
  const cameraDirection = camera.getWorldDirection(new Vector3()).normalize();
  const targets = collectShooterTargets(state, communityInstances);
  const direction = computeAssistedFireDirection(origin, cameraDirection, targets);
  const result = weapon.update({
    dt: FIXED_DT,
    firing,
    origin,
    direction,
    targets
  });

  for (const hit of result.hits) {
    applyShooterHit(hit, state, communityInstances);
  }
  syncProjectileVisuals(projectileRoot, weapon);
  muzzleFlash.position.copy(origin);
  muzzleFlash.intensity = weapon.getDebugState().muzzleFlashVisible ? 72 : 0;
}

function computeAssistedFireDirection(origin: Vector3, cameraDirection: Vector3, targets: ShooterTarget[]): Vector3 {
  let bestTarget: ShooterTarget | undefined;
  let bestScore = Number.POSITIVE_INFINITY;
  lastAssistedTargetId = undefined;
  for (const target of targets) {
    const toTarget = target.center.clone().sub(origin);
    const distance = toTarget.length();
    if (distance <= 0.01 || distance > 80) {
      continue;
    }
    const targetDirection = toTarget.clone().normalize();
    const angle = cameraDirection.angleTo(targetDirection);
    const score = angle + distance * 0.002;
    if (angle < 0.85 && score < bestScore) {
      bestTarget = target;
      bestScore = score;
    }
  }
  if (!bestTarget) {
    return cameraDirection.clone();
  }
  lastAssistedTargetId = bestTarget.id;
  return bestTarget.center.clone().sub(origin).normalize();
}

function collectShooterTargets(state: GameState, communityInstances: CommunityModelInstance[]): ShooterTarget[] {
  const targets: ShooterTarget[] = [];
  for (const target of state.destructibles) {
    if (target.status === "detached") {
      continue;
    }
    targets.push({
      id: `farm:${target.id}`,
      center: new Vector3(target.position.x, 0.8, target.position.z),
      radius: target.hitRadius + 0.55,
      health: target.integrity * FARM_TARGET_HEALTH
    });
  }

  for (const instance of communityInstances) {
    if (instance.status === "detached") {
      continue;
    }
    const bounds = new Box3().setFromObject(instance.root);
    if (bounds.isEmpty()) {
      continue;
    }
    const center = bounds.getCenter(new Vector3());
    const size = bounds.getSize(new Vector3());
    targets.push({
      id: `community:${instance.id}`,
      center,
      radius: Math.max(0.85, Math.min(3.6, Math.max(size.x, size.y, size.z) * 0.55)),
      health: getCommunityTargetHealth(instance)
    });
  }
  return targets;
}

function applyShooterHit(hit: ProjectileHit, state: GameState, communityInstances: CommunityModelInstance[]): void {
  const { targetId, damage } = hit;
  if (targetId.startsWith("community:")) {
    const id = targetId.slice("community:".length);
    const instance = communityInstances.find((candidate) => candidate.id === id);
    if (!instance || instance.status === "detached") {
      return;
    }
    const health = Math.max(0, getCommunityTargetHealth(instance) - damage);
    instance.root.userData.shooterHealth = health;
    if (health === 0) {
      instance.status = "detached";
      instance.root.userData.communityModelStatus = "detached";
    }
    return;
  }

  if (targetId.startsWith("farm:")) {
    const id = targetId.slice("farm:".length);
    state.destructibles = state.destructibles.map((target) => {
      if (target.id !== id || target.status === "detached") {
        return target;
      }
      const nextIntegrity = Math.max(0, target.integrity - damage);
      return {
        ...target,
        integrity: nextIntegrity,
        status: nextIntegrity === 0 ? "detached" : "damaged"
      };
    });
  }
}

function syncProjectileVisuals(projectileRoot: Group, weapon: WeaponSystem): void {
  const projectiles = weapon.getProjectiles();
  while (projectileRoot.children.length > projectiles.length) {
    const child = projectileRoot.children.pop();
    if (child instanceof Mesh) {
      child.geometry.dispose();
      if (Array.isArray(child.material)) {
        child.material.forEach((material) => material.dispose());
      } else {
        child.material.dispose();
      }
    }
  }
  projectiles.forEach((projectile, index) => {
    let mesh = projectileRoot.children[index];
    if (!(mesh instanceof Mesh)) {
      mesh = new Mesh(new CylinderGeometry(0.018, 0.045, 1, 8), new MeshPhysicalMaterial({
        color: "#ffdd55",
        emissive: "#ff9f1c",
        emissiveIntensity: 3.1,
        roughness: 0.2,
        metalness: 0.05
      }));
      mesh.name = `gatlingProjectile${index}`;
      mesh.userData.projectileVisual = true;
      mesh.userData.projectileVisualKind = "tracer-streak";
      projectileRoot.add(mesh);
    }
    const start = projectile.tracerStart;
    const end = projectile.tracerEnd;
    const direction = end.clone().sub(start);
    const length = Math.max(0.12, direction.length());
    mesh.scale.set(1, length, 1);
    mesh.position.copy(start).lerp(end, 0.5);
    mesh.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), direction.normalize());
  });
}

function getCommunityTargetHealth(instance: CommunityModelInstance): number {
  if (typeof instance.root.userData.shooterHealth !== "number") {
    instance.root.userData.shooterHealth = DEFAULT_COMMUNITY_TARGET_HEALTH;
  }
  return instance.root.userData.shooterHealth;
}

function getWeaponAppDebug(world: FarmWorld, weapon: WeaponSystem): Record<string, unknown> {
  const debug = weapon.getDebugState();
  const cluster = world.playerRoot.getObjectByName("playerGatlingBarrelCluster");
  return {
    ...debug,
    hasGatlingGun: world.playerRoot.getObjectByName("playerGatlingGun") !== undefined,
    hasMuzzle: world.playerRoot.getObjectByName("playerWeaponMuzzle") !== undefined,
    barrelCount: cluster?.userData.barrelCount,
    tracerVisualCount: debug.activeProjectileCount,
    assistedTargetId: lastAssistedTargetId,
    assetSource: world.playerRoot.getObjectByName("playerGatlingGun")?.userData.assetSource
  };
}

function renderModelPanel(
  panel: HTMLElement,
  open: boolean,
  catalog: CommunityModelCatalog | undefined,
  message: string,
  spawnCommunityModel: (model: CommunityModelManifestEntry) => void
): void {
  panel.hidden = !open;
  if (!open) {
    return;
  }

  const models = catalog?.models ?? [];
  panel.innerHTML = `
    <div class="model-panel-header">
      <div>
        <div class="model-panel-title">LDraw 模型库</div>
        <div class="model-panel-subtitle">砖块级 .ldr / .mpd</div>
      </div>
      <div class="model-panel-count">${models.length}</div>
    </div>
    ${message ? `<div class="model-panel-message">${message}</div>` : ""}
    <div class="model-panel-list">
      ${models
        .map(
          (model) => `
            <article class="model-card" data-testid="community-model-card">
              <div class="model-swatch" style="--swatch: ${model.thumbnailColor}"></div>
              <div class="model-card-main">
                <div class="model-card-title">${model.name}</div>
                <div class="model-card-meta">${model.category} | ${model.sourceKind}</div>
                <div class="model-card-license">许可证：${model.license}</div>
                <button class="model-card-button" data-model-id="${model.id}" data-testid="spawn-community-model-${model.id}">放置</button>
              </div>
            </article>
          `
        )
        .join("")}
    </div>
  `;

  panel.querySelectorAll<HTMLButtonElement>("[data-model-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const model = models.find((entry) => entry.id === button.dataset.modelId);
      if (model) {
        spawnCommunityModel(model);
      }
    });
  });
}

function spawnDefaultCommunityTargets(
  catalog: CommunityModelCatalog,
  spawnCommunityModel: (model: CommunityModelManifestEntry) => void,
  spawnedIds: Set<string>
): void {
  const population = computeCommunityArenaPopulation(9);
  for (const placement of population) {
    const model = catalog.models[placement.modelIndex % catalog.models.length];
    if (!model) {
      continue;
    }
    spawnedIds.add(`${model.id}:${placement.slot}`);
    spawnCommunityModel(model);
  }
}

function positionCommunityInstance(root: Group, index: number): void {
  const placement = computeCommunityModelPlacement(index);
  root.position.set(placement.x, 0, placement.z);
  root.rotation.y = placement.yaw;
}

export function computeCommunityModelPlacement(index: number): CommunityModelPlacement {
  return computeCommunityArenaPopulation(index + 1)[index] ?? { x: 0, z: -26, yaw: 0 };
}

export function computeCommunityArenaPopulation(count: number): Array<CommunityModelPlacement & { modelIndex: number; slot: number }> {
  const placements: Array<CommunityModelPlacement & { modelIndex: number; slot: number }> = [];
  const columns = [-70, -38, -6, 26, 58, 90];
  const rows = [-30, -58, -88, -118, -148, -174];
  const yawPattern = [0, Math.PI * 0.12, -Math.PI * 0.1, Math.PI * 0.24, -Math.PI * 0.22, Math.PI];
  for (let index = 0; index < count; index += 1) {
    const column = columns[index % columns.length] ?? 0;
    const row = rows[Math.floor(index / columns.length) % rows.length] ?? -30;
    const stagger = Math.floor(index / columns.length) % 2 === 0 ? 0 : 10;
    placements.push({
      x: column + stagger,
      z: row,
      yaw: yawPattern[index % yawPattern.length] ?? 0,
      modelIndex: index,
      slot: index
    });
  }
  return placements;
}

export function computeCommunityVehiclePatrolDelta(
  index: number,
  elapsedSeconds: number,
  dt: number
): { x: number; z: number; heading: number; travelDistance: number } {
  const phase = elapsedSeconds * 0.38 + index * 1.17;
  const heading = phase + Math.sin(phase * 0.7) * 0.65;
  const travelDistance = COMMUNITY_VEHICLE_PATROL_SPEED * Math.max(0, dt);
  return {
    x: Math.sin(heading) * travelDistance,
    z: Math.cos(heading) * travelDistance,
    heading,
    travelDistance
  };
}

export function isDrivableCommunityModel(model: Pick<CommunityModelManifestEntry, "category">): boolean {
  return model.category.toLowerCase() === "vehicle";
}

export function computeCommunityVehicleDriveDelta(
  input: { forward: boolean; backward: boolean; left: boolean; right: boolean },
  yaw: number,
  dt: number
): { x: number; z: number; heading?: number } {
  const strafe = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  const forwardAmount = (input.forward ? 1 : 0) - (input.backward ? 1 : 0);
  const x = Math.sin(yaw) * forwardAmount - Math.cos(yaw) * strafe;
  const z = Math.cos(yaw) * forwardAmount + Math.sin(yaw) * strafe;
  const length = Math.hypot(x, z);
  if (length === 0) {
    return { x: 0, z: 0 };
  }

  const directionX = x / length;
  const directionZ = z / length;
  return {
    x: directionX * COMMUNITY_VEHICLE_SPEED * dt,
    z: directionZ * COMMUNITY_VEHICLE_SPEED * dt,
    heading: Math.atan2(directionX, directionZ)
  };
}

function updateCommunityVehicleDrive(
  instances: CommunityModelInstance[],
  state: GameState,
  input: { forward: boolean; backward: boolean; left: boolean; right: boolean; interact: boolean },
  drive: CommunityVehicleDriveState | undefined,
  dt: number
): {
  drive: CommunityVehicleDriveState | undefined;
  consumeInteract: boolean;
  playerPosition?: { x: number; y: number; z: number };
  travelDistance: number;
} {
  if (drive) {
    const instance = instances.find((candidate) => candidate.id === drive.instanceId && candidate.status === "intact");
    if (!instance) {
      return { drive: undefined, consumeInteract: false, travelDistance: 0 };
    }
    if (input.interact) {
      const position = instance.root.position;
      return {
        drive: undefined,
        consumeInteract: true,
        playerPosition: { x: position.x + 1.4, y: 0, z: position.z + 0.8 },
        travelDistance: 0
      };
    }

    const delta = computeCommunityVehicleDriveDelta(input, state.camera.yaw, dt);
    instance.root.position.x += delta.x;
    instance.root.position.z += delta.z;
    if (delta.heading !== undefined) {
      instance.root.rotation.y = delta.heading;
    }
    return { drive, consumeInteract: false, travelDistance: Math.hypot(delta.x, delta.z) };
  }

  if (!input.interact || state.mode !== "onFoot") {
    return { drive, consumeInteract: false, travelDistance: 0 };
  }

  const nearest = findNearestDrivableCommunityVehicle(instances, state.player.position);
  if (!nearest) {
    return { drive, consumeInteract: false, travelDistance: 0 };
  }
  return { drive: { instanceId: nearest.id }, consumeInteract: true, travelDistance: 0 };
}

function updateCommunityVehiclePatrol(
  instances: CommunityModelInstance[],
  drive: CommunityVehicleDriveState | undefined,
  elapsedSeconds: number,
  dt: number
): { patrolCount: number; movedCount: number } {
  let patrolCount = 0;
  let movedCount = 0;
  instances.forEach((instance, index) => {
    if (
      instance.status !== "intact" ||
      instance.root.userData.communityModelCategory !== "Vehicle" ||
      drive?.instanceId === instance.id
    ) {
      return;
    }
    patrolCount += 1;
    const delta = computeCommunityVehiclePatrolDelta(index, elapsedSeconds, dt);
    instance.root.position.x += delta.x;
    instance.root.position.z += delta.z;
    instance.root.rotation.y = delta.heading;
    animateCommunityVehicleWheels(instance, delta.travelDistance);
    if (delta.travelDistance > 0) {
      movedCount += 1;
    }
  });
  return { patrolCount, movedCount };
}

function findNearestDrivableCommunityVehicle(
  instances: CommunityModelInstance[],
  playerPosition: { x: number; z: number }
): CommunityModelInstance | undefined {
  let best: CommunityModelInstance | undefined;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const instance of instances) {
    if (instance.status !== "intact" || instance.root.userData.communityModelCategory !== "Vehicle") {
      continue;
    }
    const distance = Math.hypot(instance.root.position.x - playerPosition.x, instance.root.position.z - playerPosition.z);
    if (distance < bestDistance && distance <= COMMUNITY_VEHICLE_INTERACTION_DISTANCE) {
      best = instance;
      bestDistance = distance;
    }
  }
  return best;
}

export function animateCommunityVehicleWheels(
  instance: Pick<CommunityModelInstance, "parts"> | { parts: Object3D[] },
  travelDistance: number
): void {
  const spin = travelDistance * COMMUNITY_WHEEL_SPIN_PER_METER;
  instance.parts.forEach((part) => {
    if (part.userData.communityModelWheel === true) {
      const axis = getCommunityWheelAxis(part);
      const baseRotationKey = `communityWheelBaseRotation${axis.toUpperCase()}`;
      const currentBaseRotation = part.userData[baseRotationKey];
      const baseRotation = typeof currentBaseRotation === "number" ? currentBaseRotation : part.rotation[axis];
      part.userData[baseRotationKey] = baseRotation;
      const previousSpin = typeof part.userData.communityWheelSpin === "number" ? part.userData.communityWheelSpin : 0;
      const nextSpin = previousSpin - spin;
      part.userData.communityWheelSpin = nextSpin;
      part.rotation[axis] = baseRotation + nextSpin;
    }
  });
}

function getCommunityWheelAxis(part: Object3D): CommunityWheelAxis {
  const axis = part.userData.communityWheelAxis;
  return axis === "x" || axis === "y" || axis === "z" ? axis : "x";
}

function updateCommunityModelImpactState(communityInstances: CommunityModelInstance[], state: GameState): void {
  if (state.mode !== "driving") {
    return;
  }

  communityInstances.forEach((instance) => {
    if (instance.status === "detached") {
      return;
    }
    const hitRadius = getCommunityModelHitRadius(instance.root);
    const distance = Math.hypot(
      state.excavator.position.x - instance.root.position.x,
      state.excavator.position.z - instance.root.position.z
    );
    if (distance <= hitRadius + 1.35) {
      instance.status = "detached";
      instance.root.userData.communityModelStatus = "detached";
    }
  });
}

function syncCommunityModels(
  communityInstances: CommunityModelInstance[],
  state: GameState,
  physics: PhysicsWorldController | undefined
): void {
  communityInstances.forEach((instance) => {
    if (instance.status === "intact") {
      setCommunityModelEdgeVisibility(instance.root, true);
      instance.parts.forEach(resetCommunityPartToBase);
      return;
    }

    setCommunityModelEdgeVisibility(instance.root, false);
    instance.parts.forEach((part) => {
      if (physics && communityPhysicsBodies.has(part)) {
        syncCommunityPhysicsPart(part, instance, state, physics);
        return;
      }

      applyDetachedCommunityFallbackPose(part);
    });
  });
}

function collectDebrisCleanupTargets(
  state: GameState,
  communityInstances: CommunityModelInstance[]
): Array<{ id: string; detached: boolean; visiblePartCount: number }> {
  const farm = state.destructibles.map((target) => ({
    id: `farm:${target.id}`,
    detached: target.status === "detached",
    visiblePartCount: target.kind === "barn" ? 8 : 3
  }));
  const community = communityInstances.map((instance) => ({
    id: `community:${instance.id}`,
    detached: instance.status === "detached",
    visiblePartCount: instance.parts.length
  }));
  return [...farm, ...community];
}

function applyDebrisCleanupVisibility(
  world: FarmWorld,
  communityInstances: CommunityModelInstance[],
  cleanup: DebrisCleanupTracker
): void {
  world.destructibleRoots.forEach((root) => {
    if (!cleanup.isRemoved(`farm:${String(root.userData.destructibleId)}`)) {
      return;
    }
    root.traverse((object) => {
      if (object.userData.destructibleShard === true || object.userData.destructiblePhysicsPart === true) {
        object.visible = false;
      }
    });
  });
  communityInstances.forEach((instance) => {
    if (cleanup.isRemoved(`community:${instance.id}`)) {
      instance.root.visible = false;
    }
  });
}

export function applyDetachedCommunityFallbackPose(part: Object3D): void {
  const basePosition = part.userData.basePosition;
  let baseQuaternion = part.userData.baseQuaternion;
  if (basePosition instanceof Vector3) {
    part.position.copy(basePosition);
  }
  if (!(baseQuaternion instanceof Quaternion)) {
    baseQuaternion = part.quaternion.clone();
    part.userData.baseQuaternion = baseQuaternion;
  }
  if (baseQuaternion instanceof Quaternion) {
    part.quaternion.copy(baseQuaternion);
  }

  const hash = stableNameHash(part.name);
  part.position.x += Math.sin(hash) * 0.62;
  part.position.y += 0.18 + (hash % 3) * 0.04;
  part.position.z += Math.cos(hash * 1.3) * 0.62;
  part.rotation.x += 0.35 + (hash % 5) * 0.08;
  part.rotation.z += Math.sin(hash * 0.7) * 0.65;
}

function syncCommunityPhysicsPart(
  object: Object3D,
  instance: CommunityModelInstance,
  state: GameState,
  physics: PhysicsWorldController
): void {
  const body = communityPhysicsBodies.get(object);
  if (!body) {
    return;
  }

  const previousImpulseStatus = communityImpulseStatuses.get(object);
  if (instance.status === "detached" && previousImpulseStatus !== "detached") {
    const worldPosition = object.getWorldPosition(new Vector3());
    const worldQuaternion = object.getWorldQuaternion(new Quaternion());
    physics.setPartTransform(
      object.name,
      { x: worldPosition.x, y: worldPosition.y, z: worldPosition.z },
      { x: worldQuaternion.x, y: worldQuaternion.y, z: worldQuaternion.z, w: worldQuaternion.w }
    );
    const hash = stableNameHash(object.name);
    const direction = new Vector3(
      worldPosition.x - state.excavator.position.x,
      0.25,
      worldPosition.z - state.excavator.position.z
    );
    if (direction.lengthSq() < 0.01) {
      direction.set(Math.sin(hash), 0.25, Math.cos(hash));
    }
    direction.normalize();
    physics.applyPartImpulse(object.name, {
      x: direction.x * 1.6,
      y: 0.22 + (hash % 4) * 0.03,
      z: direction.z * 1.6
    });
  }
  communityImpulseStatuses.set(object, instance.status);

  const translation = body.translation();
  const rotation = body.rotation();
  const local = object.parent?.worldToLocal(new Vector3(translation.x, translation.y, translation.z));
  if (local) {
    object.position.copy(local);
  }
  object.quaternion.copy(new Quaternion(rotation.x, rotation.y, rotation.z, rotation.w));
}

function registerCommunityModelPhysics(
  instance: CommunityModelInstance,
  physics: PhysicsWorldController | undefined
): void {
  if (!physics) {
    return;
  }

  const rootPosition = instance.root.getWorldPosition(new Vector3());
  const anchorId = `${instance.id}Anchor`;
  physics.addAssemblyPart({
    id: anchorId,
    locked: true,
    position: { x: rootPosition.x, y: 0.6, z: rootPosition.z },
    halfExtents: { x: 0.08, y: 0.08, z: 0.08 }
  });

  const parts = collectCommunityModelParts(instance.root).slice(0, 42);
  parts.forEach((part, index) => {
    if (communityPhysicsBodies.has(part)) {
      return;
    }
    const worldPosition = part.getWorldPosition(new Vector3());
    const body = physics.addAssemblyPart({
      id: part.name,
      locked: false,
      position: { x: worldPosition.x, y: Math.max(0.12, worldPosition.y), z: worldPosition.z },
      halfExtents: getCommunityPartHalfExtents(part),
      colliderOffset: getLocalColliderOffset(part)
    });
    physics.addBreakableLink({
      id: `${part.name}Link`,
      partA: anchorId,
      partB: part.name,
      breakDistance: 0.32 + (index % 3) * 0.04
    });
    communityPhysicsBodies.set(part, body);
    communityImpulseStatuses.set(part, "intact");
  });
}

function getCommunityModelsDebug(
  communityInstances: CommunityModelInstance[],
  activeVehicleInstanceId?: string
): Record<string, unknown> {
  let visiblePartCount = 0;
  let visibleEdgeCount = 0;
  let wheelCount = 0;
  let wheelRotationSample: number | undefined;
  const instances: Record<string, unknown>[] = [];
  communityInstances.forEach((instance) => {
    let instanceWheelCount = 0;
    const wheelAxes = new Set<string>();
    instance.root.traverse((object) => {
      if (object.visible && object.userData.communityModelPart === true) {
        visiblePartCount += 1;
      }
      if (object.visible && object.userData.communityModelEdge === true) {
        visibleEdgeCount += 1;
      }
      if (object.userData.communityModelWheel === true) {
        wheelCount += 1;
        instanceWheelCount += 1;
        wheelAxes.add(getCommunityWheelAxis(object));
        if (!activeVehicleInstanceId || instance.id === activeVehicleInstanceId) {
          const axis = getCommunityWheelAxis(object);
          wheelRotationSample ??= object.rotation[axis];
        }
      }
    });
    const bounds = new Box3().setFromObject(instance.root);
    instances.push({
      id: instance.id,
      modelId: instance.modelId,
      status: instance.status,
      health: getCommunityTargetHealth(instance),
      position: instance.root.position.toArray(),
      boundsMin: bounds.min.toArray(),
      boundsMax: bounds.max.toArray(),
      wheelCount: instanceWheelCount,
      wheelAxes: [...wheelAxes]
    });
  });

  return {
    modelFormat: "ldraw",
    instanceCount: communityInstances.length,
    visiblePartCount,
    visibleEdgeCount,
    wheelCount,
    wheelRotationSample,
    sourceKinds: [...new Set(communityInstances.map((instance) => instance.sourceKind))],
    statuses: Object.fromEntries(communityInstances.map((instance) => [instance.id, instance.status])),
    instances
  };
}

function getCommunityModelHitRadius(root: Group): number {
  const size = new Vector3();
  const bounds = new Box3().setFromObject(root);
  if (bounds.isEmpty()) {
    return 1.2;
  }
  bounds.getSize(size);
  return Math.max(0.8, Math.min(2.4, Math.max(size.x, size.z) / 2));
}

function getCommunityPartHalfExtents(object: Object3D): { x: number; y: number; z: number } {
  const size = new Vector3();
  const bounds = new Box3().setFromObject(object);
  bounds.getSize(size);
  return {
    x: Math.max(0.06, Math.min(0.32, size.x / 2)),
    y: Math.max(0.04, Math.min(0.28, size.y / 2)),
    z: Math.max(0.06, Math.min(0.32, size.z / 2))
  };
}

function registerPhysicsAssemblies(world: FarmWorld, physics: PhysicsWorldController): void {
  if (physicsRegisteredWorlds.has(world)) {
    return;
  }
  physicsRegisteredWorlds.add(world);

  world.destructibleRoots.forEach((root) => {
    const rootPosition = root.getWorldPosition(new Vector3());
    const anchorId = `${String(root.userData.destructibleId)}Anchor`;
    physics.addAssemblyPart({
      id: anchorId,
      locked: true,
      position: { x: rootPosition.x, y: Math.max(0.18, rootPosition.y + 0.2), z: rootPosition.z },
      halfExtents: { x: 0.08, y: 0.08, z: 0.08 }
    });

    root.traverse((object) => {
      if (!isDestructiblePhysicsPart(object)) {
        return;
      }

      const originalVisible = object.visible;
      object.visible = true;
      const worldPosition = object.getWorldPosition(new Vector3());
      const colliderOffset = getLocalColliderOffset(object);
      const body = physics.addAssemblyPart({
        id: object.name,
        locked: false,
        position: { x: worldPosition.x, y: worldPosition.y, z: worldPosition.z },
        halfExtents: getShardHalfExtents(object),
        colliderOffset
      });
      physics.addBreakableLink({
        id: `${object.name}Link`,
        partA: anchorId,
        partB: object.name,
        breakDistance: object.userData.destructibleShard === true ? 0.28 : 0.34
      });
      destructiblePhysicsBodies.set(object, body);
      destructibleImpulseStatuses.set(object, "intact");
      if (object.userData.destructibleShard === true) {
        object.visible = originalVisible;
      }
    });
  });
}

function isDestructiblePhysicsPart(object: Object3D): boolean {
  return object.userData.destructiblePhysicsPart === true || object.userData.destructibleShard === true;
}

function getShardHalfExtents(object: Object3D): { x: number; y: number; z: number } {
  const size = new Vector3();
  new Box3().setFromObject(object).getSize(size);
  return {
    x: Math.max(0.08, size.x / 2),
    y: Math.max(0.04, size.y / 2),
    z: Math.max(0.08, size.z / 2)
  };
}

function getLocalColliderOffset(object: Object3D): { x: number; y: number; z: number } {
  const worldPosition = object.getWorldPosition(new Vector3());
  const center = new Vector3();
  const bounds = new Box3().setFromObject(object);
  if (bounds.isEmpty()) {
    return { x: 0, y: 0, z: 0 };
  }

  bounds.getCenter(center);
  const worldRotation = object.getWorldQuaternion(new Quaternion());
  const localOffset = center.sub(worldPosition).applyQuaternion(worldRotation.invert());
  return { x: localOffset.x, y: localOffset.y, z: localOffset.z };
}

function stableNameHash(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) % 997;
  }
  return hash;
}

function updateCamera(camera: PerspectiveCamera, state: GameState): void {
  const rig = computeCameraRig(state);

  camera.position.lerp(rig.position, rig.lerp);
  camera.lookAt(rig.target.x, rig.target.y, rig.target.z);
}

function syncCameraFillLight(world: FarmWorld, camera: PerspectiveCamera, state: GameState): void {
  const light = world.scene.getObjectByName("cameraPlasticFillLight");
  if (!(light instanceof SpotLight) || !state.player.visible) {
    return;
  }

  const playerTarget = new Vector3(state.player.position.x, state.player.position.y + 1.25, state.player.position.z);
  const cameraSide = camera.position.clone().lerp(playerTarget, 0.28);
  cameraSide.y += 0.25;
  light.position.copy(cameraSide);
  light.target.position.copy(playerTarget);
  light.target.updateMatrixWorld();
}

function updateHud(
  hud: HTMLElement,
  state: GameState,
  audio: GameAudioController,
  communityVehicleDrive: CommunityVehicleDriveState | undefined
): void {
  const modeLabel = communityVehicleDrive ? "驾驶社区车辆" : state.mode === "driving" ? "驾驶挖掘机" : "步行";
  const cameraLabel = state.mode === "driving" ? "驾驶室视角" : "第三人称过肩";
  const audioLabel = audio.getDebugState().enabled === true ? "已启用" : "按任意控制键启用";
  const detachedCount = state.destructibles.filter((target) => target.status === "detached").length;
  const damagedCount = state.destructibles.filter((target) => target.status === "damaged").length;
  hud.innerHTML = `
    <div class="hud-title">LEGO EXCAVATOR FARM</div>
    <div data-testid="mode">状态：${modeLabel}</div>
    <div data-testid="camera-mode">镜头：${cameraLabel}</div>
    <div>点击画面锁定鼠标 | 左键 射击 | WASD 行走/开车 | 空格 跳跃 | E 上车/下车 | B 模型库 | J/L 上车回转 | U/O 大臂 | N/M 小臂 | Y/H 铲斗</div>
    <div>拆卸：${detachedCount} 已拆 / ${damagedCount} 受损</div>
    <div data-testid="audio-mode">声音：${audioLabel}</div>
  `;
}

function getDestructibleDebug(world: FarmWorld, state: GameState): Record<string, unknown> {
  let shardCount = 0;
  let visibleShardCount = 0;
  let visiblePhysicsPartCount = 0;
  const visiblePartPositions: Record<string, number[]> = {};
  const trackedPartNames = new Set(["treeTrunk0", "treeLeaves0", "barnBase"]);
  world.scene.traverse((object) => {
    if (object.userData.destructibleShard === true) {
      shardCount += 1;
      if (object.visible) {
        visibleShardCount += 1;
      }
    }
    if (object.visible && object.userData.destructiblePhysicsPart === true) {
      visiblePhysicsPartCount += 1;
    }
    if (trackedPartNames.has(object.name)) {
      visiblePartPositions[object.name] = object.position.toArray();
    }
  });

  return {
    targetCount: state.destructibles.length,
    damagedCount: state.destructibles.filter((target) => target.status === "damaged").length,
    detachedCount: state.destructibles.filter((target) => target.status === "detached").length,
    shardCount: visibleShardCount,
    totalShardCount: shardCount,
    visiblePhysicsPartCount,
    visiblePartPositions,
    statuses: Object.fromEntries(state.destructibles.map((target) => [target.id, target.status]))
  };
}
