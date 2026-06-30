import { describe, expect, it } from "vitest";
import { createInitialGameState, updateGameState, type GameInput } from "./state";
import { deriveSoundState } from "./audio";

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
  bucketDump: false,
  toggleModelBrowser: false,
  lookDeltaX: 0,
  lookDeltaY: 0
});

describe("audio cues", () => {
  it("emits footstep loop while the on-foot player is moving", () => {
    const previous = createInitialGameState();
    const current = updateGameState(previous, { ...idleInput(), forward: true }, 0.016);

    const sound = deriveSoundState(previous, current);

    expect(sound.loops.footsteps).toBe(true);
    expect(sound.loops.engine).toBe(false);
  });

  it("emits a jump one-shot when the player leaves the ground", () => {
    const previous = createInitialGameState();
    const current = updateGameState(previous, { ...idleInput(), jump: true }, 0.016);

    const sound = deriveSoundState(previous, current);

    expect(sound.oneshots).toContain("jump");
  });

  it("emits engine and hydraulic loops while driving and moving the arm", () => {
    let previous = createInitialGameState({ mode: "driving" });
    const current = updateGameState(previous, { ...idleInput(), forward: true, boomUp: true, stickIn: true }, 0.2);
    previous = { ...previous, excavator: { ...previous.excavator, upperRotation: -0.2 } };

    const sound = deriveSoundState(previous, current);

    expect(sound.loops.engine).toBe(true);
    expect(sound.loops.hydraulicBoom).toBe(true);
    expect(sound.loops.hydraulicStick).toBe(true);
  });

  it("emits slew and bucket hydraulic loops for upper rotation and bucket motion", () => {
    const previous = createInitialGameState({ mode: "driving" });
    const current = updateGameState(previous, { ...idleInput(), upperRight: true, bucketCurl: true }, 0.2);

    const sound = deriveSoundState(previous, current);

    expect(sound.loops.slew).toBe(true);
    expect(sound.loops.hydraulicBucket).toBe(true);
  });
});
