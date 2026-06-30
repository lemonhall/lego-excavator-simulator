import { describe, expect, it } from "vitest";
import { createPhysicsWorldController } from "./physics";

describe("physics world", () => {
  it("REQ-0004-005 initializes Rapier debug state and a fixed ground collider", async () => {
    const physics = await createPhysicsWorldController();

    const debug = physics.getDebugState();

    expect(debug.engine).toBe("rapier");
    expect(debug.fixedColliderCount).toBeGreaterThanOrEqual(1);
    expect(debug.assemblyBodyCount).toBe(0);
  });

  it("REQ-0004-005 creates breakable assembly parts and links", async () => {
    const physics = await createPhysicsWorldController();
    const anchor = physics.addAssemblyPart({
      id: "anchorPart",
      locked: true,
      position: { x: 0, y: 1, z: 0 },
      halfExtents: { x: 0.2, y: 0.1, z: 0.2 }
    });
    const loose = physics.addAssemblyPart({
      id: "loosePart",
      locked: false,
      position: { x: 0.45, y: 1, z: 0 },
      halfExtents: { x: 0.2, y: 0.1, z: 0.2 }
    });
    physics.addBreakableLink({
      id: "testLink",
      partA: anchor.id,
      partB: loose.id,
      breakDistance: 0.35
    });

    const debug = physics.getDebugState();

    expect(debug.assemblyBodyCount).toBe(2);
    expect(debug.activeLinkCount).toBe(1);
    expect(debug.brokenLinkCount).toBe(0);
  });

  it("REQ-0004-005 keeps unbroken assembly links visually stable while idle", async () => {
    const physics = await createPhysicsWorldController();
    physics.addAssemblyPart({
      id: "idleAnchor",
      locked: true,
      position: { x: 0, y: 2, z: 0 },
      halfExtents: { x: 0.2, y: 0.1, z: 0.2 }
    });
    const part = physics.addAssemblyPart({
      id: "idlePart",
      locked: false,
      position: { x: 0.5, y: 2, z: 0 },
      halfExtents: { x: 0.2, y: 0.1, z: 0.2 }
    });
    physics.addBreakableLink({
      id: "idleLink",
      partA: "idleAnchor",
      partB: "idlePart",
      breakDistance: 0.35
    });

    for (let i = 0; i < 120; i += 1) {
      physics.step(1 / 60);
    }

    const after = part.translation();
    const debug = physics.getDebugState();
    expect(debug.brokenLinkCount).toBe(0);
    expect(after.x).toBeCloseTo(0.5, 5);
    expect(after.y).toBeCloseTo(2, 5);
    expect(after.z).toBeCloseTo(0, 5);
  });

  it("REQ-0004-005 breaks assembly links under excavator-like impact and lets parts fall", async () => {
    const physics = await createPhysicsWorldController();
    physics.addAssemblyPart({
      id: "wallAnchor",
      locked: true,
      position: { x: 0, y: 2, z: 0 },
      halfExtents: { x: 0.2, y: 0.08, z: 0.2 }
    });
    const part = physics.addAssemblyPart({
      id: "wallPart",
      locked: false,
      position: { x: 0, y: 2, z: 0 },
      halfExtents: { x: 0.2, y: 0.08, z: 0.2 }
    });
    physics.addBreakableLink({
      id: "wallLink",
      partA: "wallAnchor",
      partB: "wallPart",
      breakDistance: 0.22
    });
    physics.applyPartImpulse("wallPart", { x: 2.4, y: 0, z: 0 });

    const before = part.translation();
    for (let i = 0; i < 30; i += 1) {
      physics.step(1 / 60);
    }
    const after = part.translation();
    const debug = physics.getDebugState();

    expect(debug.brokenLinkCount).toBeGreaterThan(0);
    expect(debug.activeLinkCount).toBe(0);
    expect(Math.abs(after.y - before.y) + Math.abs(after.x - before.x)).toBeGreaterThan(0.25);
    expect(after.x).toBeGreaterThan(before.x);
  });

  it("REQ-0004-005 tracks kinematic excavator colliders separately from assembly parts", async () => {
    const physics = await createPhysicsWorldController();

    physics.setKinematicBox("excavatorBody", {
      position: { x: 1, y: 0.6, z: 2 },
      halfExtents: { x: 1.2, y: 0.5, z: 1.5 },
      rotationY: 0.25
    });
    physics.setKinematicBox("excavatorBucket", {
      position: { x: 1, y: 0.7, z: -1 },
      halfExtents: { x: 0.45, y: 0.2, z: 0.35 },
      rotationY: -0.25
    });

    const debug = physics.getDebugState();

    expect(debug.kinematicColliderCount).toBeGreaterThanOrEqual(2);
    expect(debug.assemblyBodyCount).toBe(0);
  });
});
