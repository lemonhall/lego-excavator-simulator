export type GameMode = "onFoot" | "driving";

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface GameInput {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  jump: boolean;
  interact: boolean;
  boomUp: boolean;
  boomDown: boolean;
}

export interface PlayerState {
  position: Vec3;
  velocity: Vec3;
  grounded: boolean;
  visible: boolean;
}

export interface ExcavatorState {
  position: Vec3;
  heading: number;
  boomAngle: number;
}

export interface GameState {
  mode: GameMode;
  player: PlayerState;
  excavator: ExcavatorState;
}

export interface InitialGameStateOptions {
  mode?: GameMode;
  playerPosition?: Vec3;
  excavatorPosition?: Vec3;
}

export const WORLD_BOUNDS = {
  minX: -18,
  maxX: 18,
  minZ: -18,
  maxZ: 18
} as const;

export const BOOM_LIMITS = {
  min: -0.85,
  max: 0.9
} as const;

const PLAYER_SPEED = 5.5;
const VEHICLE_SPEED = 4;
const JUMP_SPEED = 7.5;
const GRAVITY = -18;
const BOOM_SPEED = 1.8;
const INTERACTION_DISTANCE = 2.2;

export function createInitialGameState(options: InitialGameStateOptions = {}): GameState {
  const mode = options.mode ?? "onFoot";
  const playerPosition = cloneVec3(options.playerPosition ?? { x: 0, y: 0, z: 0 });
  const excavatorPosition = cloneVec3(options.excavatorPosition ?? { x: 3, y: 0, z: -3 });

  return {
    mode,
    player: {
      position: playerPosition,
      velocity: { x: 0, y: 0, z: 0 },
      grounded: true,
      visible: mode === "onFoot"
    },
    excavator: {
      position: excavatorPosition,
      heading: 0,
      boomAngle: 0.15
    }
  };
}

export function updateGameState(state: GameState, input: GameInput, dt: number): GameState {
  const next = cloneState(state);
  const step = Math.max(0, dt);

  if (input.interact) {
    if (next.mode === "onFoot" && distanceXZ(next.player.position, next.excavator.position) <= INTERACTION_DISTANCE) {
      next.mode = "driving";
      next.player.visible = false;
      return next;
    }

    if (next.mode === "driving") {
      next.mode = "onFoot";
      next.player.visible = true;
      next.player.position = clampToWorld({
        x: next.excavator.position.x + 1.7,
        y: 0,
        z: next.excavator.position.z + 0.8
      });
      next.player.velocity = { x: 0, y: 0, z: 0 };
      next.player.grounded = true;
      return next;
    }
  }

  if (next.mode === "driving") {
    updateExcavator(next, input, step);
    return next;
  }

  updatePlayer(next, input, step);
  return next;
}

function updatePlayer(state: GameState, input: GameInput, dt: number): void {
  const direction = movementDirection(input);
  state.player.position.x += direction.x * PLAYER_SPEED * dt;
  state.player.position.z += direction.z * PLAYER_SPEED * dt;

  if (input.jump && state.player.grounded) {
    state.player.velocity.y = JUMP_SPEED;
    state.player.grounded = false;
  }

  if (!state.player.grounded) {
    state.player.velocity.y += GRAVITY * dt;
    state.player.position.y += state.player.velocity.y * dt;
    if (state.player.position.y <= 0) {
      state.player.position.y = 0;
      state.player.velocity.y = 0;
      state.player.grounded = true;
    }
  }

  state.player.position = clampToWorld(state.player.position);
}

function updateExcavator(state: GameState, input: GameInput, dt: number): void {
  const direction = movementDirection(input);
  state.excavator.position.x += direction.x * VEHICLE_SPEED * dt;
  state.excavator.position.z += direction.z * VEHICLE_SPEED * dt;
  state.excavator.position = clampToWorld(state.excavator.position);

  if (direction.x !== 0 || direction.z !== 0) {
    state.excavator.heading = Math.atan2(direction.x, direction.z);
  }

  const boomDelta = (input.boomUp ? 1 : 0) - (input.boomDown ? 1 : 0);
  state.excavator.boomAngle = clamp(
    state.excavator.boomAngle + boomDelta * BOOM_SPEED * dt,
    BOOM_LIMITS.min,
    BOOM_LIMITS.max
  );
}

function movementDirection(input: GameInput): { x: number; z: number } {
  const x = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  const z = (input.backward ? 1 : 0) - (input.forward ? 1 : 0);
  const length = Math.hypot(x, z);

  if (length === 0) {
    return { x: 0, z: 0 };
  }

  return {
    x: x / length,
    z: z / length
  };
}

function clampToWorld(position: Vec3): Vec3 {
  return {
    x: clamp(position.x, WORLD_BOUNDS.minX, WORLD_BOUNDS.maxX),
    y: Math.max(0, position.y),
    z: clamp(position.z, WORLD_BOUNDS.minZ, WORLD_BOUNDS.maxZ)
  };
}

function distanceXZ(a: Vec3, b: Vec3): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function cloneState(state: GameState): GameState {
  return {
    mode: state.mode,
    player: {
      position: cloneVec3(state.player.position),
      velocity: cloneVec3(state.player.velocity),
      grounded: state.player.grounded,
      visible: state.player.visible
    },
    excavator: {
      position: cloneVec3(state.excavator.position),
      heading: state.excavator.heading,
      boomAngle: state.excavator.boomAngle
    }
  };
}

function cloneVec3(value: Vec3): Vec3 {
  return { x: value.x, y: value.y, z: value.z };
}
