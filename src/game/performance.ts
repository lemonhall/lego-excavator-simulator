export const MAX_RENDERER_PIXEL_RATIO = 1.5;
export const RENDERER_OPTIONS = { antialias: true, preserveDrawingBuffer: false } as const;

export interface FrameTimingTracker {
  maxSamples: number;
  lastTimestampMs?: number;
  frameDurationsMs: number[];
}

export interface FrameTimingSnapshot {
  fps: number;
  averageFrameMs: number;
  maxFrameMs: number;
  sampleCount: number;
}

export function selectRendererPixelRatio(devicePixelRatio: number): number {
  const ratio = Number.isFinite(devicePixelRatio) && devicePixelRatio > 0 ? devicePixelRatio : 1;
  return Math.min(ratio, MAX_RENDERER_PIXEL_RATIO);
}

export function createFrameTimingTracker(maxSamples = 300): FrameTimingTracker {
  return {
    maxSamples: Math.max(1, Math.floor(maxSamples)),
    frameDurationsMs: []
  };
}

export function recordFrameTimestamp(tracker: FrameTimingTracker, timestampMs: number): void {
  if (!Number.isFinite(timestampMs)) {
    return;
  }

  const previous = tracker.lastTimestampMs;
  if (previous !== undefined && timestampMs > previous) {
    tracker.frameDurationsMs.push(timestampMs - previous);
    while (tracker.frameDurationsMs.length > tracker.maxSamples) {
      tracker.frameDurationsMs.shift();
    }
  }
  if (previous === undefined || timestampMs > previous) {
    tracker.lastTimestampMs = timestampMs;
  }
}

export function getFrameTimingSnapshot(tracker: FrameTimingTracker): FrameTimingSnapshot {
  const samples = tracker.frameDurationsMs;
  const averageFrameMs = samples.length === 0
    ? 0
    : samples.reduce((sum, value) => sum + value, 0) / samples.length;

  return {
    fps: averageFrameMs > 0 ? 1000 / averageFrameMs : 0,
    averageFrameMs,
    maxFrameMs: samples.length === 0 ? 0 : Math.max(...samples),
    sampleCount: samples.length
  };
}
