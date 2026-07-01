export interface DebrisCleanupTarget {
  id: string;
  detached: boolean;
  visiblePartCount: number;
}

export interface DebrisCleanupDebugState {
  activeDebrisCount: number;
  removedDebrisCount: number;
}

export interface DebrisCleanupTracker {
  getDebugState: () => DebrisCleanupDebugState;
  isRemoved: (id: string) => boolean;
}

interface MutableDebrisCleanupTracker extends DebrisCleanupTracker {
  ttlSeconds: number;
  timers: Map<string, number>;
  partCounts: Map<string, number>;
  removed: Set<string>;
}

export function createDebrisCleanupTracker(options: { ttlSeconds?: number } = {}): DebrisCleanupTracker {
  const tracker: MutableDebrisCleanupTracker = {
    ttlSeconds: Math.max(0.1, options.ttlSeconds ?? 10),
    timers: new Map(),
    partCounts: new Map(),
    removed: new Set(),
    getDebugState: () => {
      let activeDebrisCount = 0;
      for (const [id, count] of tracker.partCounts) {
        if (!tracker.removed.has(id)) {
          activeDebrisCount += count;
        }
      }
      let removedDebrisCount = 0;
      for (const id of tracker.removed) {
        removedDebrisCount += tracker.partCounts.get(id) ?? 0;
      }
      return { activeDebrisCount, removedDebrisCount };
    },
    isRemoved: (id: string) => tracker.removed.has(id)
  };
  return tracker;
}

export function updateDebrisCleanup(
  cleanup: DebrisCleanupTracker,
  targets: DebrisCleanupTarget[],
  dt: number
): void {
  const tracker = cleanup as MutableDebrisCleanupTracker;
  const step = Math.max(0, dt);
  for (const target of targets) {
    if (!target.detached || tracker.removed.has(target.id)) {
      continue;
    }
    tracker.partCounts.set(target.id, target.visiblePartCount);
    const age = (tracker.timers.get(target.id) ?? 0) + step;
    tracker.timers.set(target.id, age);
    if (age >= tracker.ttlSeconds) {
      tracker.removed.add(target.id);
    }
  }
}
