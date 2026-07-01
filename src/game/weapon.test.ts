import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import {
  createWeaponSystem,
  getWeaponDebugState,
  type ShooterTarget,
  type WeaponProjectile
} from "./weapon";

describe("LEGO shooter weapon system", () => {
  it("REQ-0006-003 emits multiple gatling projectiles while fire is held", () => {
    const weapon = createWeaponSystem({ fireRatePerSecond: 12, projectileLifetime: 1 });

    weapon.update({
      dt: 0.5,
      firing: true,
      origin: new Vector3(0, 1, 0),
      direction: new Vector3(0, 0, -1),
      targets: []
    });

    const debug = getWeaponDebugState(weapon);
    expect(debug.shotsFired).toBeGreaterThanOrEqual(5);
    expect(debug.activeProjectileCount).toBeGreaterThanOrEqual(5);
    expect(debug.muzzleFlashVisible).toBe(true);
  });

  it("REQ-0006-003 removes projectiles after their TTL expires", () => {
    const weapon = createWeaponSystem({ fireRatePerSecond: 10, projectileLifetime: 0.25 });

    weapon.update({
      dt: 0.2,
      firing: true,
      origin: new Vector3(0, 1, 0),
      direction: new Vector3(0, 0, -1),
      targets: []
    });
    expect(getWeaponDebugState(weapon).activeProjectileCount).toBeGreaterThan(0);

    weapon.update({
      dt: 0.5,
      firing: false,
      origin: new Vector3(0, 1, 0),
      direction: new Vector3(0, 0, -1),
      targets: []
    });

    expect(getWeaponDebugState(weapon).activeProjectileCount).toBe(0);
  });

  it("REQ-0006-004 reports hits when a projectile crosses a target radius", () => {
    const weapon = createWeaponSystem({ fireRatePerSecond: 10, projectileLifetime: 1, projectileSpeed: 20, damage: 2 });
    const target: ShooterTarget = {
      id: "targetA",
      center: new Vector3(0, 1, -4),
      radius: 0.8,
      health: 3
    };

    const first = weapon.update({
      dt: 0.1,
      firing: true,
      origin: new Vector3(0, 1, 0),
      direction: new Vector3(0, 0, -1),
      targets: [target]
    });
    const second = weapon.update({
      dt: 0.2,
      firing: false,
      origin: new Vector3(0, 1, 0),
      direction: new Vector3(0, 0, -1),
      targets: [target]
    });

    const hits = [...first.hits, ...second.hits];
    expect(hits).toHaveLength(1);
    expect(hits[0]).toMatchObject({
      targetId: "targetA",
      damage: 2
    });
    expect(getWeaponDebugState(weapon).hitCount).toBe(1);
  });

  it("REQ-0007-002 emits gatling tracer projectiles across rotating barrel lanes", () => {
    const weapon = createWeaponSystem({
      fireRatePerSecond: 36,
      projectileLifetime: 1,
      spreadRadians: 0.035,
      barrelLaneCount: 6
    });

    weapon.update({
      dt: 0.25,
      firing: true,
      origin: new Vector3(0, 1, 0),
      direction: new Vector3(0, 0, -1),
      targets: []
    });

    const projectiles = weapon.getProjectiles() as ReadonlyArray<WeaponProjectile>;
    const lanes = new Set(projectiles.map((projectile) => projectile.barrelLane));
    const directionKeys = new Set(projectiles.map((projectile) => projectile.direction.toArray().map((value) => value.toFixed(3)).join(",")));
    const debug = getWeaponDebugState(weapon);

    expect(debug.projectileVisualKind).toBe("tracer-streak");
    expect(debug.barrelLaneCount).toBe(6);
    expect(lanes.size).toBeGreaterThanOrEqual(3);
    expect(directionKeys.size).toBeGreaterThan(1);
    expect(projectiles.every((projectile) => projectile.tracerStart.distanceTo(projectile.tracerEnd) > 0.15)).toBe(true);
  });
});
