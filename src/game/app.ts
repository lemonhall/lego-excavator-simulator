import {
  ACESFilmicToneMapping,
  Box3,
  Group,
  Mesh,
  MeshPhysicalMaterial,
  Object3D,
  PCFSoftShadowMap,
  PerspectiveCamera,
  Quaternion,
  SpotLight,
  Vector3,
  WebGLRenderer
} from "three";
import { deriveSoundState, GameAudioController } from "./audio";
import { computeCameraRig } from "./camera";
import {
  collectCommunityModelParts,
  loadCommunityModelCatalog,
  loadLDrawCommunityModel,
  resetCommunityPartToBase,
  validateCommunityModelCatalog,
  type CommunityModelCatalog,
  type CommunityModelInstance,
  type CommunityModelManifestEntry
} from "./communityModels";
import { KeyboardInput } from "./input";
import { loadOfficialWorkerModel } from "./officialWorkerModel";
import { createPhysicsWorldController, type PhysicsBodyHandle, type PhysicsWorldController } from "./physics";
import { createInitialGameState, updateGameState, type DestructibleState, type GameState } from "./state";
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
      teleport?: (options: DebugTeleportOptions) => void;
    };
  }
}

interface DebugTeleportOptions {
  mode?: GameState["mode"];
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
  const camera = new PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 120);
  const input = new KeyboardInput(window);
  const audio = new GameAudioController();
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
  let nextCommunityInstanceId = 0;
  let modelPanelMessage = "正在加载 LDraw 模型库...";

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
    const inputState = input.snapshot();
    if (inputState.toggleModelBrowser) {
      modelBrowserOpen = !modelBrowserOpen;
      renderModelPanel(modelPanel, modelBrowserOpen, communityCatalog, modelPanelMessage, spawnCommunityModel);
    }
    state = updateGameState(state, inputState, FIXED_DT);
    audio.update(deriveSoundState(previousState, state));
    syncWorld(world, state, physics, communityInstances);
    syncCommunityModels(communityInstances, state, physics);
    syncDebugState(world, state, audio, physics, communityInstances, (options) => {
      if (options.mode) {
        state.mode = options.mode;
        state.player.visible = options.mode === "onFoot";
      }
      if (options.excavatorPosition) {
        state.excavator.position = { ...options.excavatorPosition };
      }
    });
    updateCamera(camera, state);
    syncCameraFillLight(world, camera, state);
    updateHud(hud, state, audio);
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
  teleport: (options: DebugTeleportOptions) => void
): void {
  window.__legoGameDebug = {
    officialModelLoaded: world.playerRoot.userData.loadedOfficialWorkerModel === true,
    officialModelBounds: world.playerRoot.userData.officialModelBounds,
    fallbackVisible: world.playerRoot.getObjectByName("playerProceduralFallback")?.visible,
    excavator: getExcavatorDebug(world, state),
    destructibles: getDestructibleDebug(world, state),
    communityModels: getCommunityModelsDebug(communityInstances),
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

function positionCommunityInstance(root: Group, index: number): void {
  root.position.set(6.6 + (index % 2) * 2.2, 0, -3.2 - Math.floor(index / 2) * 2.2);
  root.rotation.y = index % 2 === 0 ? 0 : Math.PI * 0.15;
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
      instance.parts.forEach(resetCommunityPartToBase);
      return;
    }

    instance.parts.forEach((part) => {
      if (physics && communityPhysicsBodies.has(part)) {
        syncCommunityPhysicsPart(part, instance, state, physics);
        return;
      }

      const hash = stableNameHash(part.name);
      part.position.x += Math.sin(hash) * 0.018;
      part.position.y += 0.004 + (hash % 3) * 0.001;
      part.position.z += Math.cos(hash * 1.3) * 0.018;
      part.rotation.x += 0.025;
      part.rotation.z += 0.018;
    });
  });
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

function getCommunityModelsDebug(communityInstances: CommunityModelInstance[]): Record<string, unknown> {
  let visiblePartCount = 0;
  communityInstances.forEach((instance) => {
    instance.root.traverse((object) => {
      if (object.visible && object.userData.communityModelPart === true) {
        visiblePartCount += 1;
      }
    });
  });

  return {
    modelFormat: "ldraw",
    instanceCount: communityInstances.length,
    visiblePartCount,
    sourceKinds: [...new Set(communityInstances.map((instance) => instance.sourceKind))],
    statuses: Object.fromEntries(communityInstances.map((instance) => [instance.id, instance.status]))
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

function updateHud(hud: HTMLElement, state: GameState, audio: GameAudioController): void {
  const modeLabel = state.mode === "driving" ? "驾驶挖掘机" : "步行";
  const cameraLabel = state.mode === "driving" ? "驾驶室视角" : "第三人称过肩";
  const audioLabel = audio.getDebugState().enabled === true ? "已启用" : "按任意控制键启用";
  const detachedCount = state.destructibles.filter((target) => target.status === "detached").length;
  const damagedCount = state.destructibles.filter((target) => target.status === "damaged").length;
  hud.innerHTML = `
    <div class="hud-title">LEGO EXCAVATOR FARM</div>
    <div data-testid="mode">状态：${modeLabel}</div>
    <div data-testid="camera-mode">镜头：${cameraLabel}</div>
    <div>WASD 行走/开车 | 空格 跳跃 | E 上车/下车 | B 模型库 | J/L 上车回转 | U/O 大臂 | N/M 小臂 | Y/H 铲斗</div>
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
