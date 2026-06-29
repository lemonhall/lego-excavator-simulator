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
  const heading = getDriverHeading(state);
  const forward = { x: Math.sin(heading), z: -Math.cos(heading) };
  const right = { x: Math.cos(heading), z: Math.sin(heading) };

  return {
    mode: "driverCab",
    position: {
      x: excavator.x - right.x * 1.25 - forward.x * 1.85,
      y: excavator.y + 2.55,
      z: excavator.z - right.z * 1.25 - forward.z * 1.85
    },
    target: {
      x: excavator.x + right.x * 0.45 + forward.x * 4.2,
      y: excavator.y + 1.25,
      z: excavator.z + right.z * 0.45 + forward.z * 4.2
    },
    lerp: 0.45
  };
}

function getDriverHeading(state: GameState): number {
  const { crawlerHeading, upperRotation, heading } = state.excavator;
  if (crawlerHeading === 0 && upperRotation === 0 && heading !== 0) {
    return heading;
  }
  return crawlerHeading + upperRotation;
}
