export interface EnemyVec3 {
  x: number;
  y: number;
  z: number;
}

export type EnemyStatus = "active" | "destroyed";

export interface EnemyState {
  id: string;
  position: EnemyVec3;
  health: number;
  status: EnemyStatus;
}

export interface EnemyHit {
  targetId: string;
  damage: number;
}

export interface EnemySwarm {
  enemies: EnemyState[];
  destroyedCount: number;
}

const ENEMY_SPEED = 1.8;

export function createEnemySwarm(enemies: Array<{ id: string; position: EnemyVec3; health: number }>): EnemySwarm {
  return {
    enemies: enemies.map((enemy) => ({
      id: enemy.id,
      position: { ...enemy.position },
      health: enemy.health,
      status: "active"
    })),
    destroyedCount: 0
  };
}

export function updateEnemySwarm(
  swarm: EnemySwarm,
  playerPosition: EnemyVec3,
  dt: number,
  hits: EnemyHit[] = []
): void {
  for (const hit of hits) {
    const id = hit.targetId.startsWith("enemy:") ? hit.targetId.slice("enemy:".length) : hit.targetId;
    const enemy = swarm.enemies.find((candidate) => candidate.id === id && candidate.status === "active");
    if (!enemy) {
      continue;
    }
    enemy.health = Math.max(0, enemy.health - hit.damage);
    if (enemy.health === 0) {
      enemy.status = "destroyed";
      swarm.destroyedCount += 1;
    }
  }

  const step = Math.max(0, dt);
  for (const enemy of swarm.enemies) {
    if (enemy.status !== "active") {
      continue;
    }
    const dx = playerPosition.x - enemy.position.x;
    const dz = playerPosition.z - enemy.position.z;
    const distance = Math.hypot(dx, dz);
    if (distance < 0.4) {
      continue;
    }
    const travel = Math.min(distance - 0.35, ENEMY_SPEED * step);
    enemy.position.x += (dx / distance) * travel;
    enemy.position.z += (dz / distance) * travel;
  }
}

export function getEnemySwarmDebug(swarm: EnemySwarm, playerPosition: EnemyVec3): Record<string, unknown> {
  const active = swarm.enemies.filter((enemy) => enemy.status === "active");
  const nearestDistance = active.reduce((best, enemy) => {
    const distance = Math.hypot(enemy.position.x - playerPosition.x, enemy.position.z - playerPosition.z);
    return Math.min(best, distance);
  }, Number.POSITIVE_INFINITY);
  return {
    activeCount: active.length,
    destroyedCount: swarm.destroyedCount,
    nearestDistance: Number.isFinite(nearestDistance) ? nearestDistance : undefined,
    statuses: Object.fromEntries(swarm.enemies.map((enemy) => [enemy.id, enemy.status]))
  };
}
