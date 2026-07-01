import { describe, expect, it } from "vitest";
import { createEnemySwarm, updateEnemySwarm } from "./enemies";

describe("enemy swarm", () => {
  it("REQ-0007-004 moves active enemies toward the player", () => {
    const swarm = createEnemySwarm([{ id: "enemy0", position: { x: 12, y: 0, z: 0 }, health: 3 }]);
    const before = swarm.enemies[0].position.x;

    updateEnemySwarm(swarm, { x: 0, y: 0, z: 0 }, 1);

    expect(swarm.enemies[0].position.x).toBeLessThan(before);
    expect(swarm.enemies[0].status).toBe("active");
  });

  it("REQ-0007-004 marks enemies destroyed when health reaches zero", () => {
    const swarm = createEnemySwarm([{ id: "enemy0", position: { x: 2, y: 0, z: 0 }, health: 1 }]);

    updateEnemySwarm(swarm, { x: 0, y: 0, z: 0 }, 0, [{ targetId: "enemy:enemy0", damage: 1 }]);

    expect(swarm.destroyedCount).toBe(1);
    expect(swarm.enemies[0].status).toBe("destroyed");
  });
});
