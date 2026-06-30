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
    expect(rig.position.y).toBeGreaterThan(1.5);
    expect(rig.position.y).toBeLessThan(3.2);
    expect(rig.position.z).toBeGreaterThan(state.player.position.z);
    expect(rig.target.y).toBeGreaterThan(1);
    expect(rig.lerp).toBeLessThanOrEqual(0.22);
  });

  it("REQ-0006-001 aims the on-foot camera using FPS mouse look yaw and pitch", () => {
    const state = createInitialGameState({
      playerPosition: { x: 2, y: 0, z: -4 }
    });
    state.camera.yaw = Math.PI / 2;
    state.camera.pitch = 0.35;

    const rig = computeCameraRig(state);

    expect(rig.mode).toBe("overShoulder");
    expect(rig.target.x).toBeGreaterThan(state.player.position.x + 2.7);
    expect(rig.target.y).toBeGreaterThan(state.player.position.y + 2.2);
    expect(Math.abs(rig.target.z - state.player.position.z)).toBeLessThan(0.8);
  });

  it("REQ-0003-002 uses an elevated close driver camera while driving", () => {
    const state = createInitialGameState({
      mode: "driving",
      excavatorPosition: { x: 3, y: 0, z: -3 }
    });
    state.excavator.upperRotation = Math.PI / 2;
    state.camera.yaw = Math.PI / 2;

    const rig = computeCameraRig(state);

    expect(rig.mode).toBe("driverCab");
    expect(Math.abs(rig.position.x - state.excavator.position.x)).toBeLessThan(2.3);
    expect(rig.position.y).toBeGreaterThan(2.2);
    expect(rig.position.y).toBeLessThan(2.9);
    expect(Math.abs(rig.target.x - rig.position.x)).toBeGreaterThan(2.4);
    expect(rig.lerp).toBeGreaterThanOrEqual(0.3);
  });

  it("REQ-0003-002 aims the driver camera forward toward the excavator arm", () => {
    const state = createInitialGameState({
      mode: "driving",
      excavatorPosition: { x: 3, y: 0, z: -3 }
    });
    state.excavator.upperRotation = 0;
    state.camera.yaw = Math.PI;

    const rig = computeCameraRig(state);

    expect(rig.mode).toBe("driverCab");
    expect(rig.target.z).toBeLessThan(state.excavator.position.z);
    expect(Math.abs(rig.position.x - state.excavator.position.x)).toBeLessThan(1.4);
  });

  it("REQ-0006-001 keeps mouse look independent from upper slew direction", () => {
    const state = createInitialGameState({
      mode: "driving",
      excavatorPosition: { x: 3, y: 0, z: -3 }
    });
    state.excavator.upperRotation = Math.PI / 4;
    state.camera.yaw = Math.PI;

    const rig = computeCameraRig(state);

    expect(rig.mode).toBe("driverCab");
    expect(rig.target.z).toBeLessThan(rig.position.z);
    expect(Math.abs(rig.target.x - rig.position.x)).toBeLessThan(0.01);
  });

  it("REQ-0003-002 keeps the driver camera independent from WASD crawler heading", () => {
    const leftDrive = createInitialGameState({
      mode: "driving",
      excavatorPosition: { x: 3, y: 0, z: -3 }
    });
    const rightDrive = createInitialGameState({
      mode: "driving",
      excavatorPosition: { x: 3, y: 0, z: -3 }
    });
    leftDrive.excavator.crawlerHeading = -Math.PI / 2;
    rightDrive.excavator.crawlerHeading = Math.PI / 2;
    leftDrive.excavator.upperRotation = 0;
    rightDrive.excavator.upperRotation = 0;

    const leftRig = computeCameraRig(leftDrive);
    const rightRig = computeCameraRig(rightDrive);

    expect(rightRig.position).toEqual(leftRig.position);
    expect(rightRig.target).toEqual(leftRig.target);
  });

  it("REQ-0006-001 aims the driver camera from mouse look without changing excavator slew", () => {
    const state = createInitialGameState({
      mode: "driving",
      excavatorPosition: { x: 3, y: 0, z: -3 }
    });
    state.excavator.upperRotation = 0;
    state.camera.yaw = Math.PI / 2;
    state.camera.pitch = -0.25;

    const rig = computeCameraRig(state);

    expect(rig.mode).toBe("driverCab");
    expect(rig.target.x).toBeGreaterThan(state.excavator.position.x + 2);
    expect(rig.target.y).toBeLessThan(rig.position.y);
    expect(state.excavator.upperRotation).toBe(0);
  });
});
