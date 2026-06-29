import {
  ACESFilmicToneMapping,
  PCFSoftShadowMap,
  PerspectiveCamera,
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
    syncDebugState(world);
    updateCamera(camera, state);
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

function syncDebugState(world: FarmWorld): void {
  window.__legoGameDebug = {
    officialModelLoaded: world.playerRoot.userData.loadedOfficialWorkerModel === true,
    officialModelBounds: world.playerRoot.userData.officialModelBounds,
    fallbackVisible: world.playerRoot.getObjectByName("playerProceduralFallback")?.visible
  };
}

function syncWorld(world: FarmWorld, state: GameState): void {
  world.playerRoot.visible = state.player.visible;
  world.playerRoot.position.set(state.player.position.x, state.player.position.y, state.player.position.z);
  world.playerRoot.rotation.y = state.player.facing;
  syncPlayerWalk(world, state);

  world.excavatorRoot.position.set(state.excavator.position.x, state.excavator.position.y, state.excavator.position.z);
  world.excavatorRoot.rotation.y = state.excavator.heading;
  world.excavatorBoom.rotation.z = state.excavator.boomAngle;
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

function updateHud(hud: HTMLElement, state: GameState): void {
  const modeLabel = state.mode === "driving" ? "DRIVING" : "ON FOOT";
  const cameraLabel = state.mode === "driving" ? "CAB VIEW" : "OVER-SHOULDER";
  hud.innerHTML = `
    <div class="hud-title">LEGO EXCAVATOR FARM</div>
    <div data-testid="mode">Mode: ${modeLabel}</div>
    <div data-testid="camera-mode">Camera: ${cameraLabel}</div>
    <div>WASD move / drive | Space jump | E enter/exit | Q/R boom</div>
  `;
}
