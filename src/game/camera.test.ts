import { describe, expect, it } from "vitest";
import { computeCameraRig } from "./camera";
import { createInitialGameState } from "./state";

describe("camera rig", () => {
  it("REQ-0001-002 uses an over-shoulder camera while on foot", () => {
    const state = createInitialGameState({
      playerPosition: { x: 2, y: 0, z: -4 }
    });

    const rig = computeCameraRig(state);

    expect(rig.mode).toBe("overShoulder");
    expect(rig.position.x).toBeGreaterThan(state.player.position.x);
    expect(rig.position.y).toBeGreaterThan(1.6);
    expect(rig.position.y).toBeLessThan(3.2);
    expect(rig.position.z).toBeGreaterThan(state.player.position.z);
    expect(rig.target.y).toBeGreaterThan(1);
    expect(rig.lerp).toBeLessThanOrEqual(0.22);
  });

  it("REQ-0001-003 uses a close cab camera while driving", () => {
    const state = createInitialGameState({
      mode: "driving",
      excavatorPosition: { x: 3, y: 0, z: -3 }
    });
    state.excavator.heading = Math.PI / 2;

    const rig = computeCameraRig(state);

    expect(rig.mode).toBe("driverCab");
    expect(Math.abs(rig.position.x - state.excavator.position.x)).toBeLessThan(1.6);
    expect(rig.position.y).toBeGreaterThan(1.2);
    expect(rig.position.y).toBeLessThan(2.4);
    expect(rig.target.x).toBeGreaterThan(rig.position.x);
    expect(rig.lerp).toBeGreaterThanOrEqual(0.3);
  });

  it("REQ-0001-003 aims the driver camera at the excavator boom side", () => {
    const state = createInitialGameState({
      mode: "driving",
      excavatorPosition: { x: 3, y: 0, z: -3 }
    });
    state.excavator.heading = 0;

    const rig = computeCameraRig(state);

    expect(rig.mode).toBe("driverCab");
    expect(rig.target.x - rig.position.x).toBeGreaterThan(2.4);
    expect(Math.abs(rig.target.z - state.excavator.position.z)).toBeLessThan(1.2);
    expect(rig.position.x).toBeLessThan(state.excavator.position.x);
  });
});
