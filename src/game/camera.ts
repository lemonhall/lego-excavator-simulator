import type { GameState, Vec3 } from "./state";

export interface CameraRig {
  mode: "overShoulder" | "driverCab";
  position: Vec3;
  target: Vec3;
  lerp: number;
}

export function computeCameraRig(state: GameState): CameraRig {
  if (state.mode === "driving") {
    return computeDriverCabRig(state);
  }

  return computeOverShoulderRig(state);
}

function computeOverShoulderRig(state: GameState): CameraRig {
  const player = state.player.position;
  const forward = computeLookForward(state.camera.yaw, state.camera.pitch);
  const right = computeHorizontalRight(state.camera.yaw);
  const position = {
    x: player.x - forward.x * 3.0 + right.x * 0.65,
    y: player.y + 1.55 - forward.y * 0.8,
    z: player.z - forward.z * 3.0 + right.z * 0.65
  };

  return {
    mode: "overShoulder",
    position,
    target: {
      x: position.x + forward.x * 6,
      y: position.y + forward.y * 6,
      z: position.z + forward.z * 6
    },
    lerp: 0.18
  };
}

function computeDriverCabRig(state: GameState): CameraRig {
  const excavator = state.excavator.position;
  const heading = getDriverHeading(state);
  const cabForward = { x: Math.sin(heading), z: Math.cos(heading) };
  const cabRight = { x: -Math.cos(heading), z: Math.sin(heading) };
  const lookForward = computeLookForward(state.camera.yaw, state.camera.pitch);
  const position = {
    x: excavator.x - cabRight.x * 1.25 - cabForward.x * 1.85,
    y: excavator.y + 2.55,
    z: excavator.z - cabRight.z * 1.25 - cabForward.z * 1.85
  };

  return {
    mode: "driverCab",
    position,
    target: {
      x: position.x + lookForward.x * 6,
      y: position.y + lookForward.y * 6,
      z: position.z + lookForward.z * 6
    },
    lerp: 0.45
  };
}

function getDriverHeading(state: GameState): number {
  return state.excavator.upperRotation;
}

function computeLookForward(yaw: number, pitch: number): Vec3 {
  const pitchScale = Math.cos(pitch);
  return {
    x: Math.sin(yaw) * pitchScale,
    y: Math.sin(pitch),
    z: Math.cos(yaw) * pitchScale
  };
}

function computeHorizontalRight(yaw: number): { x: number; z: number } {
  return {
    x: -Math.cos(yaw),
    z: Math.sin(yaw)
  };
}
