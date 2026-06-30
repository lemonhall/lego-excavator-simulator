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
}

interface Projectile {
  id: number;
  position: Vector3;
  previousPosition: Vector3;
  direction: Vector3;
  age: number;
}

export interface WeaponSystemOptions {
  fireRatePerSecond?: number;
  projectileSpeed?: number;
  projectileLifetime?: number;
  damage?: number;
  maxProjectiles?: number;
}

export interface WeaponSystem {
  update: (options: WeaponUpdateOptions) => WeaponUpdateResult;
  getProjectiles: () => ReadonlyArray<Projectile>;
  getDebugState: () => WeaponDebugState;
}

const DEFAULT_FIRE_RATE = 18;
const DEFAULT_PROJECTILE_SPEED = 34;
const DEFAULT_PROJECTILE_LIFETIME = 0.72;
const DEFAULT_DAMAGE = 1;
const DEFAULT_MAX_PROJECTILES = 120;
const MUZZLE_FLASH_TIME = 0.07;

export function createWeaponSystem(options: WeaponSystemOptions = {}): WeaponSystem {
  const fireRate = Math.max(1, options.fireRatePerSecond ?? DEFAULT_FIRE_RATE);
  const projectileSpeed = Math.max(1, options.projectileSpeed ?? DEFAULT_PROJECTILE_SPEED);
  const projectileLifetime = Math.max(0.05, options.projectileLifetime ?? DEFAULT_PROJECTILE_LIFETIME);
  const damage = Math.max(0.1, options.damage ?? DEFAULT_DAMAGE);
  const maxProjectiles = Math.max(1, options.maxProjectiles ?? DEFAULT_MAX_PROJECTILES);
  const projectiles: Projectile[] = [];
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
          const projectile: Projectile = {
            id: nextProjectileId,
            position: origin.clone(),
            previousPosition: origin.clone(),
            direction: normalizedDirection.clone(),
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
      muzzleFlashVisible: muzzleFlashTime > 0
    })
  };
}

export function getWeaponDebugState(weapon: Pick<WeaponSystem, "getDebugState">): WeaponDebugState {
  return weapon.getDebugState();
}

function findProjectileHit(projectile: Projectile, targets: ShooterTarget[], damage: number): ProjectileHit | undefined {
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

function distancePointToSegment(point: Vector3, start: Vector3, end: Vector3): number {
  const segment = end.clone().sub(start);
  const lengthSq = segment.lengthSq();
  if (lengthSq === 0) {
    return point.distanceTo(start);
  }
  const t = Math.max(0, Math.min(1, point.clone().sub(start).dot(segment) / lengthSq));
  return point.distanceTo(start.clone().addScaledVector(segment, t));
}
