import { BoxGeometry, Group, Mesh, MeshStandardMaterial, Object3D } from "three";
import { describe, expect, it } from "vitest";
import {
  createCommunityRuntimeCache,
  getCachedCommunityTarget,
  getCommunityRuntimeEntry,
  setCachedCommunityRenderMode,
  spinCachedCommunityWheels
} from "./communityRuntime";
import type { CommunityModelInstance } from "./communityModels";

function makeInstance(): CommunityModelInstance {
  const root = new Group();
  const body = new Mesh(new BoxGeometry(2, 1, 4), new MeshStandardMaterial());
  body.userData.communityModelPart = true;
  const wheel = new Mesh(new BoxGeometry(1, 1, 0.4), new MeshStandardMaterial());
  wheel.userData.communityModelPart = true;
  wheel.userData.communityModelWheel = true;
  wheel.userData.communityWheelAxis = "x";
  const proxy = new Group();
  proxy.name = "communityRenderProxy";
  root.add(body, wheel, proxy);

  return {
    id: "community0",
    modelId: "radar-truck",
    sourceKind: "ldraw-packed",
    root,
    status: "intact",
    parts: [body, wheel]
  };
}

describe("community runtime cache", () => {
  it("REQ-0007-007 projects cached local target after movement without traversal", () => {
    const instance = makeInstance();
    const originalTraverse = instance.root.traverse.bind(instance.root);
    let traversals = 0;
    instance.root.traverse = ((callback: (object: Object3D) => void) => {
      traversals += 1;
      originalTraverse(callback);
    }) as typeof instance.root.traverse;
    const cache = createCommunityRuntimeCache();
    getCommunityRuntimeEntry(cache, instance);
    const traversalsAfterBuild = traversals;

    instance.root.position.set(8, 0, -5);
    instance.root.rotation.y = Math.PI / 2;
    const first = getCachedCommunityTarget(cache, instance);
    const second = getCachedCommunityTarget(cache, instance);

    expect(first.center.x).toBeCloseTo(8, 5);
    expect(first.center.y).toBeCloseTo(0, 5);
    expect(first.center.z).toBeCloseTo(-5, 5);
    expect(second.center.toArray()).toEqual(first.center.toArray());
    expect(first.radius).toBeGreaterThan(0);
    expect(traversals).toBe(traversalsAfterBuild);
    expect(cache.stats.entryCount).toBe(1);
    expect(cache.stats.hitCount).toBe(2);
    expect(cache.stats.steadyStateTraversalCount).toBe(0);
  });

  it("REQ-0007-007 changes proxy mode once and spins only cached wheels", () => {
    const instance = makeInstance();
    const cache = createCommunityRuntimeCache();
    const entry = getCommunityRuntimeEntry(cache, instance);
    const body = instance.parts[0];

    expect(setCachedCommunityRenderMode(entry, instance, false)).toBe(true);
    expect(setCachedCommunityRenderMode(entry, instance, false)).toBe(false);
    spinCachedCommunityWheels(entry, 1);

    expect(entry.wheels).toHaveLength(1);
    expect(entry.wheels[0].rotation.x).not.toBe(0);
    expect(body.rotation.x).toBe(0);
    expect(entry.proxy?.visible).toBe(false);
  });

  it("REQ-0007-007 uses a stable fallback for an empty model", () => {
    const instance = makeInstance();
    instance.root.clear();
    instance.parts = [];
    instance.root.position.set(-3, 2, 7);
    const cache = createCommunityRuntimeCache();

    const target = getCachedCommunityTarget(cache, instance);

    expect(target.center.toArray()).toEqual([-3, 2, 7]);
    expect(target.radius).toBe(1.2);
    expect(cache.stats.rebuildCount).toBe(1);
  });

  it("REQ-0007-007 counts unexpected model-tree traversal after cache registration", () => {
    const instance = makeInstance();
    const cache = createCommunityRuntimeCache();
    getCommunityRuntimeEntry(cache, instance);

    instance.root.traverse(() => undefined);

    expect(cache.stats.steadyStateTraversalCount).toBe(1);
  });
});
