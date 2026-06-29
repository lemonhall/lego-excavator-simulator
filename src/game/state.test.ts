import { describe, expect, it } from "vitest";
import {
  BOOM_LIMITS,
  BUCKET_LIMITS,
  createInitialGameState,
  STICK_LIMITS,
  updateGameState,
  WORLD_BOUNDS,
  type GameInput
} from "./state";

const idleInput = (): GameInput => ({
  forward: false,
  backward: false,
  left: false,
  right: false,
  jump: false,
  interact: false,
  boomUp: false,
  boomDown: false,
  upperLeft: false,
  upperRight: false,
  stickIn: false,
  stickOut: false,
  bucketCurl: false,
  bucketDump: false
});

describe("game state", () => {
  it("REQ-0001-002 moves the on-foot player forward", () => {
    const state = createInitialGameState();
    const next = updateGameState(state, { ...idleInput(), forward: true }, 1);

    expect(next.mode).toBe("onFoot");
    expect(next.player.position.z).toBeLessThan(state.player.position.z);
    expect(next.excavator.position).toEqual(state.excavator.position);
  });

  it("REQ-0002-004 advances walk animation metadata while moving", () => {
    const state = createInitialGameState();
    const next = updateGameState(state, { ...idleInput(), forward: true }, 0.25);

    expect(next.player.moving).toBe(true);
    expect(next.player.walkPhase).toBeGreaterThan(state.player.walkPhase);
    expect(next.player.facing).toBeCloseTo(Math.PI, 5);
  });

  it("REQ-0002-004 clears moving flag when player is idle", () => {
    const moving = updateGameState(createInitialGameState(), { ...idleInput(), right: true }, 0.25);
    const idle = updateGameState(moving, idleInput(), 0.25);

    expect(idle.player.moving).toBe(false);
    expect(idle.player.walkPhase).toBe(moving.player.walkPhase);
  });

  it("REQ-0001-002 jumps only from grounded state and lands again", () => {
    const jumped = updateGameState(createInitialGameState(), { ...idleInput(), jump: true }, 0.016);
    expect(jumped.player.grounded).toBe(false);
    expect(jumped.player.velocity.y).toBeGreaterThan(0);

    let landed = jumped;
    for (let i = 0; i < 180; i += 1) {
      landed = updateGameState(landed, idleInput(), 0.016);
    }

    expect(landed.player.grounded).toBe(true);
    expect(landed.player.position.y).toBe(0);
  });

  it("REQ-0001-002 clamps player inside world bounds", () => {
    const state = createInitialGameState({
      playerPosition: { x: WORLD_BOUNDS.maxX - 0.1, y: 0, z: WORLD_BOUNDS.minZ + 0.1 }
    });

    const next = updateGameState(state, { ...idleInput(), forward: true, right: true }, 10);

    expect(next.player.position.x).toBe(WORLD_BOUNDS.maxX);
    expect(next.player.position.z).toBe(WORLD_BOUNDS.minZ);
  });

  it("REQ-0001-003 refuses mounting when far from the excavator", () => {
    const state = createInitialGameState({
      playerPosition: { x: -12, y: 0, z: -12 },
      excavatorPosition: { x: 4, y: 0, z: 4 }
    });

    const next = updateGameState(state, { ...idleInput(), interact: true }, 0.016);

    expect(next.mode).toBe("onFoot");
  });

  it("REQ-0001-003 enters and exits the excavator when close", () => {
    const state = createInitialGameState({
      playerPosition: { x: 2.8, y: 0, z: 2.8 },
      excavatorPosition: { x: 3, y: 0, z: 3 }
    });

    const driving = updateGameState(state, { ...idleInput(), interact: true }, 0.016);
    expect(driving.mode).toBe("driving");
    expect(driving.player.visible).toBe(false);

    const exited = updateGameState(driving, { ...idleInput(), interact: true }, 0.016);
    expect(exited.mode).toBe("onFoot");
    expect(exited.player.visible).toBe(true);
    expect(exited.player.position.x).toBeGreaterThan(exited.excavator.position.x);
  });

  it("REQ-0003-002 drives the crawler base forward along its heading while mounted", () => {
    const state = createInitialGameState({
      mode: "driving",
      playerPosition: { x: 3, y: 0, z: 3 },
      excavatorPosition: { x: 3, y: 0, z: 3 }
    });

    const next = updateGameState(state, { ...idleInput(), forward: true }, 1);

    expect(next.excavator.position.z).toBeLessThan(state.excavator.position.z);
    expect(next.player.position).toEqual(state.player.position);
    expect(next.excavator.crawlerHeading).toBe(state.excavator.crawlerHeading);
  });

  it("REQ-0003-002 uses the same WASD planar movement contract while driving", () => {
    const state = createInitialGameState({ mode: "driving" });

    const next = updateGameState(state, { ...idleInput(), right: true }, 1);

    expect(next.excavator.position.x).toBeGreaterThan(state.excavator.position.x);
    expect(next.excavator.position.z).toBe(state.excavator.position.z);
    expect(next.excavator.crawlerHeading).toBeGreaterThan(state.excavator.crawlerHeading);
  });

  it("REQ-0003-002 rotates the upper structure independently from the crawler base", () => {
    const state = createInitialGameState({ mode: "driving" });

    const next = updateGameState(state, { ...idleInput(), upperRight: true }, 1);

    expect(next.excavator.upperRotation).toBeGreaterThan(state.excavator.upperRotation);
    expect(next.excavator.crawlerHeading).toBe(state.excavator.crawlerHeading);
    expect(next.excavator.heading).toBe(next.excavator.crawlerHeading + next.excavator.upperRotation);
  });

  it("REQ-0003-003 clamps boom, stick, and bucket angles inside configured limits", () => {
    let state = createInitialGameState({ mode: "driving" });

    for (let i = 0; i < 200; i += 1) {
      state = updateGameState(state, { ...idleInput(), boomUp: true, stickIn: true, bucketCurl: true }, 0.016);
    }
    expect(state.excavator.boomAngle).toBe(BOOM_LIMITS.max);
    expect(state.excavator.stickAngle).toBe(STICK_LIMITS.max);
    expect(state.excavator.bucketAngle).toBe(BUCKET_LIMITS.max);

    for (let i = 0; i < 400; i += 1) {
      state = updateGameState(state, { ...idleInput(), boomDown: true, stickOut: true, bucketDump: true }, 0.016);
    }
    expect(state.excavator.boomAngle).toBe(BOOM_LIMITS.min);
    expect(state.excavator.stickAngle).toBe(STICK_LIMITS.min);
    expect(state.excavator.bucketAngle).toBe(BUCKET_LIMITS.min);
  });
});
