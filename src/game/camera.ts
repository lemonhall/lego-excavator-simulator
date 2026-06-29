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

  return {
    mode: "overShoulder",
    position: {
      x: player.x + 1.05,
      y: player.y + 2.15,
      z: player.z + 3.1
    },
    target: {
      x: player.x + 0.2,
      y: player.y + 1.35,
      z: player.z - 3.2
    },
    lerp: 0.18
  };
}

function computeDriverCabRig(state: GameState): CameraRig {
  const excavator = state.excavator.position;
  const heading = state.excavator.heading;
  const forward = { x: Math.sin(heading), z: Math.cos(heading) };
  const right = { x: Math.cos(heading), z: -Math.sin(heading) };

  return {
    mode: "driverCab",
    position: {
      x: excavator.x - right.x * 1.15 - forward.x * 0.85,
      y: excavator.y + 1.95,
      z: excavator.z - right.z * 1.15 - forward.z * 0.85
    },
    target: {
      x: excavator.x + right.x * 2.35 + forward.x * 0.85,
      y: excavator.y + 1.12,
      z: excavator.z + right.z * 2.35 + forward.z * 0.85
    },
    lerp: 0.45
  };
}
