import { describe, expect, it } from "vitest";
import { createDebrisCleanupTracker, updateDebrisCleanup } from "./cleanup";

describe("debris cleanup", () => {
  it("REQ-0007-006 removes detached debris after a fixed TTL", () => {
    const cleanup = createDebrisCleanupTracker({ ttlSeconds: 1 });

    updateDebrisCleanup(cleanup, [{ id: "targetA", detached: true, visiblePartCount: 8 }], 0.5);
    expect(cleanup.getDebugState()).toMatchObject({
      activeDebrisCount: 8,
      removedDebrisCount: 0
    });

    updateDebrisCleanup(cleanup, [{ id: "targetA", detached: true, visiblePartCount: 8 }], 0.6);
    expect(cleanup.getDebugState()).toMatchObject({
      activeDebrisCount: 0,
      removedDebrisCount: 8
    });
    expect(cleanup.isRemoved("targetA")).toBe(true);
  });

  it("REQ-0007-006 defaults debris cleanup to three seconds", () => {
    const cleanup = createDebrisCleanupTracker();

    updateDebrisCleanup(cleanup, [{ id: "targetA", detached: true, visiblePartCount: 4 }], 2.9);
    expect(cleanup.isRemoved("targetA")).toBe(false);

    updateDebrisCleanup(cleanup, [{ id: "targetA", detached: true, visiblePartCount: 4 }], 0.2);
    expect(cleanup.isRemoved("targetA")).toBe(true);
  });
});
