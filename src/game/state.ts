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
  upperLeft: boolean;
  upperRight: boolean;
  stickIn: boolean;
  stickOut: boolean;
  bucketCurl: boolean;
  bucketDump: boolean;
  toggleModelBrowser: boolean;
}

export interface PlayerState {
  position: Vec3;
  velocity: Vec3;
  grounded: boolean;
  visible: boolean;
  moving: boolean;
  facing: number;
  walkPhase: number;
}

export interface ExcavatorState {
  position: Vec3;
  crawlerHeading: number;
  upperRotation: number;
  heading: number;
  boomAngle: number;
  stickAngle: number;
  bucketAngle: number;
}

export type DestructibleKind = "barn" | "tree" | "fence";
export type DestructibleStatus = "intact" | "damaged" | "detached";

export interface DestructibleState {
  id: string;
  kind: DestructibleKind;
  position: Vec3;
  hitRadius: number;
  maxIntegrity: number;
  integrity: number;
  status: DestructibleStatus;
}

export interface GameState {
  mode: GameMode;
  player: PlayerState;
  excavator: ExcavatorState;
  destructibles: DestructibleState[];
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

export const STICK_LIMITS = {
  min: -1.05,
  max: 0.75
} as const;

export const BUCKET_LIMITS = {
  min: -1.15,
  max: 0.95
} as const;

const PLAYER_SPEED = 5.5;
const TRACK_SPEED = 3.4;
const JUMP_SPEED = 7.5;
const GRAVITY = -18;
const BOOM_SPEED = 1.8;
const STICK_SPEED = 1.65;
const BUCKET_SPEED = 2.25;
const UPPER_SLEW_SPEED = 1.45;
const INTERACTION_DISTANCE = 2.2;
const BODY_IMPACT_RADIUS = 1.35;
const BUCKET_IMPACT_RADIUS = 0.72;

const DEFAULT_DESTRUCTIBLES: DestructibleState[] = [
  { id: "barn", kind: "barn", position: { x: -9, y: 0, z: -8 }, hitRadius: 2.35, maxIntegrity: 3, integrity: 3, status: "intact" },
  { id: "tree0", kind: "tree", position: { x: -12, y: 0, z: 6 }, hitRadius: 1.2, maxIntegrity: 1, integrity: 1, status: "intact" },
  { id: "tree1", kind: "tree", position: { x: 13, y: 0, z: 7 }, hitRadius: 1.2, maxIntegrity: 1, integrity: 1, status: "intact" },
  { id: "tree2", kind: "tree", position: { x: 12, y: 0, z: -13 }, hitRadius: 1.2, maxIntegrity: 1, integrity: 1, status: "intact" },
  { id: "fence0", kind: "fence", position: { x: -14, y: 0, z: 9 }, hitRadius: 0.75, maxIntegrity: 1, integrity: 1, status: "intact" },
  { id: "fence1", kind: "fence", position: { x: -11.8, y: 0, z: 9 }, hitRadius: 0.75, maxIntegrity: 1, integrity: 1, status: "intact" },
  { id: "fence2", kind: "fence", position: { x: -9.6, y: 0, z: 9 }, hitRadius: 0.75, maxIntegrity: 1, integrity: 1, status: "intact" },
  { id: "fence3", kind: "fence", position: { x: -7.4, y: 0, z: 9 }, hitRadius: 0.75, maxIntegrity: 1, integrity: 1, status: "intact" },
  { id: "fence4", kind: "fence", position: { x: -5.2, y: 0, z: 9 }, hitRadius: 0.75, maxIntegrity: 1, integrity: 1, status: "intact" },
  { id: "fence5", kind: "fence", position: { x: -3, y: 0, z: 9 }, hitRadius: 0.75, maxIntegrity: 1, integrity: 1, status: "intact" },
  { id: "fence6", kind: "fence", position: { x: -0.8, y: 0, z: 9 }, hitRadius: 0.75, maxIntegrity: 1, integrity: 1, status: "intact" },
  { id: "fence7", kind: "fence", position: { x: 1.4, y: 0, z: 9 }, hitRadius: 0.75, maxIntegrity: 1, integrity: 1, status: "intact" },
  { id: "fence8", kind: "fence", position: { x: 3.6, y: 0, z: 9 }, hitRadius: 0.75, maxIntegrity: 1, integrity: 1, status: "intact" },
  { id: "fence9", kind: "fence", position: { x: 5.8, y: 0, z: 9 }, hitRadius: 0.75, maxIntegrity: 1, integrity: 1, status: "intact" },
  { id: "fence10", kind: "fence", position: { x: 8, y: 0, z: 9 }, hitRadius: 0.75, maxIntegrity: 1, integrity: 1, status: "intact" },
  { id: "fence11", kind: "fence", position: { x: 10.2, y: 0, z: 9 }, hitRadius: 0.75, maxIntegrity: 1, integrity: 1, status: "intact" }
];

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
      visible: mode === "onFoot",
      moving: false,
      facing: Math.PI,
      walkPhase: 0
    },
    excavator: {
      position: excavatorPosition,
      crawlerHeading: 0,
      upperRotation: 0,
      heading: 0,
      boomAngle: 0.15,
      stickAngle: -0.35,
      bucketAngle: -0.2
    },
    destructibles: DEFAULT_DESTRUCTIBLES.map(cloneDestructible)
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
  const moving = direction.x !== 0 || direction.z !== 0;
  state.player.moving = moving;
  if (moving) {
    state.player.facing = Math.atan2(direction.x, direction.z);
    state.player.walkPhase += dt * PLAYER_SPEED * 2.6;
  }

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
  state.excavator.position.x += direction.x * TRACK_SPEED * dt;
  state.excavator.position.z += direction.z * TRACK_SPEED * dt;
  state.excavator.position = clampToWorld(state.excavator.position);
  if (direction.x !== 0 || direction.z !== 0) {
    state.excavator.crawlerHeading = Math.atan2(direction.x, -direction.z);
  }

  const upperDelta = (input.upperLeft ? 1 : 0) - (input.upperRight ? 1 : 0);
  state.excavator.upperRotation = normalizeAngle(state.excavator.upperRotation + upperDelta * UPPER_SLEW_SPEED * dt);

  const boomDelta = (input.boomUp ? 1 : 0) - (input.boomDown ? 1 : 0);
  state.excavator.boomAngle = clamp(
    state.excavator.boomAngle + boomDelta * BOOM_SPEED * dt,
    BOOM_LIMITS.min,
    BOOM_LIMITS.max
  );

  const stickDelta = (input.stickIn ? 1 : 0) - (input.stickOut ? 1 : 0);
  state.excavator.stickAngle = clamp(
    state.excavator.stickAngle + stickDelta * STICK_SPEED * dt,
    STICK_LIMITS.min,
    STICK_LIMITS.max
  );

  const bucketDelta = (input.bucketCurl ? 1 : 0) - (input.bucketDump ? 1 : 0);
  state.excavator.bucketAngle = clamp(
    state.excavator.bucketAngle + bucketDelta * BUCKET_SPEED * dt,
    BUCKET_LIMITS.min,
    BUCKET_LIMITS.max
  );

  state.excavator.heading = state.excavator.upperRotation;
  updateDestructibles(state, input, direction);
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

function updateDestructibles(state: GameState, input: GameInput, direction: { x: number; z: number }): void {
  const bodyActive = direction.x !== 0 || direction.z !== 0;
  const bucketActive =
    input.upperLeft ||
    input.upperRight ||
    input.boomUp ||
    input.boomDown ||
    input.stickIn ||
    input.stickOut ||
    input.bucketCurl ||
    input.bucketDump;

  if (!bodyActive && !bucketActive) {
    return;
  }

  const bucketPoint = bucketActive ? computeBucketImpactPoint(state.excavator) : undefined;

  state.destructibles = state.destructibles.map((target) => {
    if (target.status === "detached") {
      return target;
    }

    const bodyHit = bodyActive && distanceXZ(state.excavator.position, target.position) <= BODY_IMPACT_RADIUS + target.hitRadius;
    const bucketHit = bucketPoint !== undefined && distanceXZ(bucketPoint, target.position) <= BUCKET_IMPACT_RADIUS + target.hitRadius;

    if (!bodyHit && !bucketHit) {
      return target;
    }

    return damageDestructible(target);
  });
}

function computeBucketImpactPoint(excavator: ExcavatorState): Vec3 {
  const heading = excavator.crawlerHeading + excavator.upperRotation;
  const reach = 3.3 + excavator.boomAngle * 0.4 - excavator.stickAngle * 0.25 - excavator.bucketAngle * 0.15;

  return {
    x: excavator.position.x + Math.sin(heading) * reach,
    y: 0,
    z: excavator.position.z - Math.cos(heading) * reach
  };
}

function damageDestructible(target: DestructibleState): DestructibleState {
  const integrity = Math.max(0, target.integrity - 1);
  return {
    ...target,
    integrity,
    status: integrity === 0 ? "detached" : "damaged"
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeAngle(value: number): number {
  let angle = value;
  while (angle > Math.PI) {
    angle -= Math.PI * 2;
  }
  while (angle < -Math.PI) {
    angle += Math.PI * 2;
  }
  return angle;
}

function cloneState(state: GameState): GameState {
  return {
    mode: state.mode,
    player: {
      position: cloneVec3(state.player.position),
      velocity: cloneVec3(state.player.velocity),
      grounded: state.player.grounded,
      visible: state.player.visible,
      moving: state.player.moving,
      facing: state.player.facing,
      walkPhase: state.player.walkPhase
    },
    excavator: {
      position: cloneVec3(state.excavator.position),
      crawlerHeading: state.excavator.crawlerHeading,
      upperRotation: state.excavator.upperRotation,
      heading: state.excavator.heading,
      boomAngle: state.excavator.boomAngle,
      stickAngle: state.excavator.stickAngle,
      bucketAngle: state.excavator.bucketAngle
    },
    destructibles: state.destructibles.map(cloneDestructible)
  };
}

function cloneVec3(value: Vec3): Vec3 {
  return { x: value.x, y: value.y, z: value.z };
}

function cloneDestructible(value: DestructibleState): DestructibleState {
  return {
    ...value,
    position: cloneVec3(value.position)
  };
}
