import { Vector3 } from "three";

export interface ShooterTarget {
  id: string;
  center: Vector3;
  radius: number;
  health: number;
}

export interface ProjectileHit {
  targetId: string;
  projectileId: number;
  damage: number;
  position: Vector3;
}

export interface WeaponUpdateOptions {
  dt: number;
  firing: boolean;
  origin: Vector3;
  direction: Vector3;
  targets: ShooterTarget[];
}

export interface WeaponUpdateResult {
  hits: ProjectileHit[];
  spawnedProjectileIds: number[];
}

export interface WeaponDebugState {
  shotsFired: number;
  activeProjectileCount: number;
  hitCount: number;
  muzzleFlashVisible: boolean;
  projectileVisualKind: "tracer-streak";
  barrelLaneCount: number;
}

export interface WeaponProjectile {
  id: number;
  position: Vector3;
  previousPosition: Vector3;
  direction: Vector3;
  tracerStart: Vector3;
  tracerEnd: Vector3;
  barrelLane: number;
  age: number;
}

export interface WeaponSystemOptions {
  fireRatePerSecond?: number;
  projectileSpeed?: number;
  projectileLifetime?: number;
  damage?: number;
  maxProjectiles?: number;
  spreadRadians?: number;
  barrelLaneCount?: number;
}

export interface WeaponSystem {
  update: (options: WeaponUpdateOptions) => WeaponUpdateResult;
  getProjectiles: () => ReadonlyArray<WeaponProjectile>;
  getDebugState: () => WeaponDebugState;
}

const DEFAULT_FIRE_RATE = 18;
const DEFAULT_PROJECTILE_SPEED = 34;
const DEFAULT_PROJECTILE_LIFETIME = 0.72;
const DEFAULT_DAMAGE = 1;
const DEFAULT_MAX_PROJECTILES = 120;
const DEFAULT_SPREAD_RADIANS = 0.018;
const DEFAULT_BARREL_LANE_COUNT = 6;
const TRACER_LENGTH = 0.42;
const MUZZLE_FLASH_TIME = 0.07;

export function createWeaponSystem(options: WeaponSystemOptions = {}): WeaponSystem {
  const fireRate = Math.max(1, options.fireRatePerSecond ?? DEFAULT_FIRE_RATE);
  const projectileSpeed = Math.max(1, options.projectileSpeed ?? DEFAULT_PROJECTILE_SPEED);
  const projectileLifetime = Math.max(0.05, options.projectileLifetime ?? DEFAULT_PROJECTILE_LIFETIME);
  const damage = Math.max(0.1, options.damage ?? DEFAULT_DAMAGE);
  const maxProjectiles = Math.max(1, options.maxProjectiles ?? DEFAULT_MAX_PROJECTILES);
  const spreadRadians = Math.max(0, options.spreadRadians ?? DEFAULT_SPREAD_RADIANS);
  const barrelLaneCount = Math.max(1, Math.floor(options.barrelLaneCount ?? DEFAULT_BARREL_LANE_COUNT));
  const projectiles: WeaponProjectile[] = [];
  let nextProjectileId = 1;
  let fireAccumulator = 0;
  let shotsFired = 0;
  let hitCount = 0;
  let muzzleFlashTime = 0;

  return {
    update: ({ dt, firing, origin, direction, targets }) => {
      const step = Math.max(0, dt);
      const normalizedDirection = direction.lengthSq() > 0 ? direction.clone().normalize() : new Vector3(0, 0, -1);
      const spawnedProjectileIds: number[] = [];
      const hits: ProjectileHit[] = [];
      muzzleFlashTime = Math.max(0, muzzleFlashTime - step);

      if (firing) {
        fireAccumulator += step * fireRate;
        if (fireAccumulator < 1) {
          fireAccumulator = 1;
        }
        while (fireAccumulator >= 1 && projectiles.length < maxProjectiles) {
          const barrelLane = (nextProjectileId - 1) % barrelLaneCount;
          const projectileDirection = applyDeterministicSpread(normalizedDirection, nextProjectileId, spreadRadians);
          const tracerEnd = origin.clone().addScaledVector(projectileDirection, TRACER_LENGTH);
          const projectile: WeaponProjectile = {
            id: nextProjectileId,
            position: origin.clone(),
            previousPosition: origin.clone(),
            direction: projectileDirection,
            tracerStart: origin.clone(),
            tracerEnd,
            barrelLane,
            age: 0
          };
          projectiles.push(projectile);
          spawnedProjectileIds.push(projectile.id);
          nextProjectileId += 1;
          shotsFired += 1;
          fireAccumulator -= 1;
          muzzleFlashTime = MUZZLE_FLASH_TIME;
        }
      } else {
        fireAccumulator = 0;
      }

      for (let index = projectiles.length - 1; index >= 0; index -= 1) {
        const projectile = projectiles[index];
        projectile.previousPosition.copy(projectile.position);
        projectile.position.addScaledVector(projectile.direction, projectileSpeed * step);
        projectile.tracerEnd.copy(projectile.position);
        projectile.tracerStart.copy(projectile.position).addScaledVector(projectile.direction, -TRACER_LENGTH);
        projectile.age += step;

        const hit = findProjectileHit(projectile, targets, damage);
        if (hit) {
          hits.push(hit);
          hitCount += 1;
          projectiles.splice(index, 1);
          continue;
        }

        if (projectile.age >= projectileLifetime) {
          projectiles.splice(index, 1);
        }
      }

      return { hits, spawnedProjectileIds };
    },
    getProjectiles: () => projectiles,
    getDebugState: () => ({
      shotsFired,
      activeProjectileCount: projectiles.length,
      hitCount,
      muzzleFlashVisible: muzzleFlashTime > 0,
      projectileVisualKind: "tracer-streak",
      barrelLaneCount
    })
  };
}

export function getWeaponDebugState(weapon: Pick<WeaponSystem, "getDebugState">): WeaponDebugState {
  return weapon.getDebugState();
}

function findProjectileHit(projectile: WeaponProjectile, targets: ShooterTarget[], damage: number): ProjectileHit | undefined {
  for (const target of targets) {
    if (target.health <= 0 || target.radius <= 0) {
      continue;
    }
    if (distancePointToSegment(target.center, projectile.previousPosition, projectile.position) <= target.radius) {
      return {
        targetId: target.id,
        projectileId: projectile.id,
        damage,
        position: projectile.position.clone()
      };
    }
  }
  return undefined;
}

function applyDeterministicSpread(direction: Vector3, shotId: number, spreadRadians: number): Vector3 {
  if (spreadRadians === 0) {
    return direction.clone();
  }
  const laneAngle = shotId * 2.399963229728653;
  const radius = ((shotId % 5) / 4) * spreadRadians;
  const right = new Vector3().crossVectors(direction, new Vector3(0, 1, 0));
  if (right.lengthSq() < 0.0001) {
    right.set(1, 0, 0);
  }
  right.normalize();
  const up = new Vector3().crossVectors(right, direction).normalize();
  return direction
    .clone()
    .addScaledVector(right, Math.cos(laneAngle) * radius)
    .addScaledVector(up, Math.sin(laneAngle) * radius)
    .normalize();
}

function distancePointToSegment(point: Vector3, start: Vector3, end: Vector3): number {
  const segment = end.clone().sub(start);
  const lengthSq = segment.lengthSq();
  if (lengthSq === 0) {
    return point.distanceTo(start);
  }
  const t = Math.max(0, Math.min(1, point.clone().sub(start).dot(segment) / lengthSq));
  return point.distanceTo(start.clone().addScaledVector(segment, t));
}
