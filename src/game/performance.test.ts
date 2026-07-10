import { describe, expect, it } from "vitest";
import {
  MAX_RENDERER_PIXEL_RATIO,
  RENDERER_OPTIONS,
  createFrameTimingTracker,
  getFrameTimingSnapshot,
  recordFrameTimestamp,
  selectRendererPixelRatio
} from "./performance";

describe("performance policy", () => {
  it("REQ-0007-007 caps renderer pixel ratio at 1.5", () => {
    expect(MAX_RENDERER_PIXEL_RATIO).toBe(1.5);
    expect(RENDERER_OPTIONS).toEqual({ antialias: true, preserveDrawingBuffer: false });
    expect(selectRendererPixelRatio(1)).toBe(1);
    expect(selectRendererPixelRatio(2)).toBe(1.5);
    expect(selectRendererPixelRatio(Number.NaN)).toBe(1);
  });

  it("REQ-0007-007 derives FPS from real bounded frame timestamps", () => {
    const tracker = createFrameTimingTracker(3);
    [0, 20, 40, 60, 80].forEach((value) => recordFrameTimestamp(tracker, value));

    expect(tracker.frameDurationsMs).toEqual([20, 20, 20]);
    expect(getFrameTimingSnapshot(tracker)).toEqual({
      fps: 50,
      averageFrameMs: 20,
      maxFrameMs: 20,
      sampleCount: 3
    });
  });

  it("REQ-0007-007 keeps a five-second default sample window at 60 FPS", () => {
    expect(createFrameTimingTracker().maxSamples).toBe(300);
  });

  it("REQ-0007-007 ignores invalid and non-forward timestamps", () => {
    const tracker = createFrameTimingTracker(4);
    [100, Number.NaN, 90, 116].forEach((value) => recordFrameTimestamp(tracker, value));

    expect(getFrameTimingSnapshot(tracker).sampleCount).toBe(1);
    expect(getFrameTimingSnapshot(tracker).averageFrameMs).toBe(16);
  });
});
