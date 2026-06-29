import {
  ACESFilmicToneMapping,
  Box3,
  Mesh,
  MeshPhysicalMaterial,
  Object3D,
  PCFSoftShadowMap,
  PerspectiveCamera,
  SpotLight,
  Vector3,
  WebGLRenderer
} from "three";
import { computeCameraRig } from "./camera";
import { KeyboardInput } from "./input";
import { loadOfficialWorkerModel } from "./officialWorkerModel";
import { createInitialGameState, updateGameState, type GameState } from "./state";
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
    };
  }
}

const FIXED_DT = 1 / 60;

export function mountGameApp(root: HTMLElement): GameApp {
  root.innerHTML = "";

  const wrapper = document.createElement("main");
  wrapper.className = "game-shell";

  const hud = document.createElement("section");
  hud.className = "hud";
  hud.dataset.testid = "hud";
  wrapper.appendChild(hud);

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
  let state = createInitialGameState();
  let animationFrame = 0;
  let disposed = false;

  const onResize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  };
  window.addEventListener("resize", onResize);

  const tick = () => {
    if (disposed) {
      return;
    }

    state = updateGameState(state, input.snapshot(), FIXED_DT);
    syncWorld(world, state);
    syncDebugState(world, state);
    updateCamera(camera, state);
    syncCameraFillLight(world, camera, state);
    updateHud(hud, state);
    renderer.render(world.scene, camera);
    animationFrame = window.requestAnimationFrame(tick);
  };

  tick();

  return {
    destroy: () => {
      disposed = true;
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      root.innerHTML = "";
    }
  };
}

function syncDebugState(world: FarmWorld, state: GameState): void {
  window.__legoGameDebug = {
    officialModelLoaded: world.playerRoot.userData.loadedOfficialWorkerModel === true,
    officialModelBounds: world.playerRoot.userData.officialModelBounds,
    fallbackVisible: world.playerRoot.getObjectByName("playerProceduralFallback")?.visible,
    excavator: getExcavatorDebug(world, state),
    limbRotations: {
      leftArm: world.playerRoot.getObjectByName("playerLeftArm")?.rotation.x,
      rightArm: world.playerRoot.getObjectByName("playerRightArm")?.rotation.x,
      leftLeg: world.playerRoot.getObjectByName("playerLeftLeg")?.rotation.x,
      rightLeg: world.playerRoot.getObjectByName("playerRightLeg")?.rotation.x
    },
    officialRig: getOfficialRigDebug(world)
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

function syncWorld(world: FarmWorld, state: GameState): void {
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

function updateHud(hud: HTMLElement, state: GameState): void {
  const modeLabel = state.mode === "driving" ? "驾驶挖掘机" : "步行";
  const cameraLabel = state.mode === "driving" ? "驾驶室视角" : "第三人称过肩";
  hud.innerHTML = `
    <div class="hud-title">LEGO EXCAVATOR FARM</div>
    <div data-testid="mode">状态：${modeLabel}</div>
    <div data-testid="camera-mode">镜头：${cameraLabel}</div>
    <div>WASD 行走/开车 | 空格 跳跃 | E 上车/下车 | J/L 上车回转 | U/O 大臂 | N/M 小臂 | Y/H 铲斗</div>
  `;
}
