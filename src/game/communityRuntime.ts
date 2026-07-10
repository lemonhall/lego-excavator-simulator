import { Box3, Mesh, Object3D, Vector3 } from "three";
import type { CommunityModelInstance, CommunityWheelAxis } from "./communityModels";

const DEFAULT_TARGET_RADIUS = 1.2;
const COMMUNITY_WHEEL_SPIN_PER_METER = 7.5;

export interface CommunityRuntimeCacheStats {
  entryCount: number;
  hitCount: number;
  rebuildCount: number;
  buildTraversalCount: number;
  steadyStateTraversalCount: number;
}

export interface CommunityRuntimeEntry {
  localTargetCenter: Vector3;
  targetRadius: number;
  localBoundsMinY: number;
  localBoundsMaxY: number;
  proxy?: Object3D;
  proxyParts: Object3D[];
  parts: Object3D[];
  edges: Object3D[];
  wheels: Object3D[];
  useProxy: boolean;
}

export interface CommunityRuntimeCache {
  entries: WeakMap<CommunityModelInstance, CommunityRuntimeEntry>;
  stats: CommunityRuntimeCacheStats;
}

export function createCommunityRuntimeCache(): CommunityRuntimeCache {
  return {
    entries: new WeakMap(),
    stats: {
      entryCount: 0,
      hitCount: 0,
      rebuildCount: 0,
      buildTraversalCount: 0,
      steadyStateTraversalCount: 0
    }
  };
}

export function getCommunityRuntimeEntry(
  cache: CommunityRuntimeCache,
  instance: CommunityModelInstance
): CommunityRuntimeEntry {
  const existing = cache.entries.get(instance);
  if (existing) {
    cache.stats.hitCount += 1;
    return existing;
  }

  return buildCommunityRuntimeEntry(cache, instance);
}

export function getCachedCommunityTarget(
  cache: CommunityRuntimeCache,
  instance: CommunityModelInstance
): { center: Vector3; radius: number } {
  const entry = getCommunityRuntimeEntry(cache, instance);
  instance.root.updateWorldMatrix(true, false);
  return {
    center: entry.localTargetCenter.clone().applyMatrix4(instance.root.matrixWorld),
    radius: entry.targetRadius
  };
}

export function setCachedCommunityRenderMode(
  entry: CommunityRuntimeEntry,
  instance: CommunityModelInstance,
  useProxy: boolean
): boolean {
  if (entry.useProxy === useProxy) {
    return false;
  }

  if (entry.proxy) {
    entry.proxy.visible = useProxy;
  }
  entry.parts.forEach((part) => {
    part.visible = !useProxy;
  });
  entry.edges.forEach((edge) => {
    edge.visible = false;
  });
  entry.useProxy = useProxy;
  instance.root.userData.communityRenderProxyActive = useProxy;
  instance.root.userData.communityModelEdgesVisible = false;
  return true;
}

export function spinCachedCommunityWheels(entry: Pick<CommunityRuntimeEntry, "wheels">, travelDistance: number): void {
  const spin = travelDistance * COMMUNITY_WHEEL_SPIN_PER_METER;
  entry.wheels.forEach((wheel) => {
    const axis = getCommunityWheelAxis(wheel);
    const baseRotationKey = `communityWheelBaseRotation${axis.toUpperCase()}`;
    const currentBaseRotation = wheel.userData[baseRotationKey];
    const baseRotation = typeof currentBaseRotation === "number" ? currentBaseRotation : wheel.rotation[axis];
    wheel.userData[baseRotationKey] = baseRotation;
    const previousSpin = typeof wheel.userData.communityWheelSpin === "number" ? wheel.userData.communityWheelSpin : 0;
    const nextSpin = previousSpin - spin;
    wheel.userData.communityWheelSpin = nextSpin;
    wheel.rotation[axis] = baseRotation + nextSpin;
  });
}

function buildCommunityRuntimeEntry(
  cache: CommunityRuntimeCache,
  instance: CommunityModelInstance
): CommunityRuntimeEntry {
  const bounds = new Box3();
  const edges: Object3D[] = [];
  const proxyParts: Object3D[] = [];
  let proxy: Object3D | undefined;
  instance.root.updateMatrixWorld(true);
  cache.stats.buildTraversalCount += 1;
  instance.root.traverse((object) => {
    if (object.name === "communityRenderProxy") {
      proxy = object;
    }
    if (object.userData.communityModelEdge === true) {
      edges.push(object);
    }
    if (object.userData.communityModelProxyPart === true) {
      proxyParts.push(object);
    }
    if (object instanceof Mesh && isObjectVisibleInHierarchy(object)) {
      bounds.expandByObject(object);
    }
  });

  const localTargetCenter = new Vector3();
  let targetRadius = DEFAULT_TARGET_RADIUS;
  let localBoundsMinY = 0;
  let localBoundsMaxY = 0;
  if (bounds.isEmpty()) {
    localTargetCenter.set(0, 0, 0);
  } else {
    const worldCenter = bounds.getCenter(new Vector3());
    instance.root.worldToLocal(worldCenter);
    localTargetCenter.copy(worldCenter);
    const size = bounds.getSize(new Vector3());
    targetRadius = Math.max(0.85, Math.min(3.6, Math.max(size.x, size.y, size.z) * 0.55));
    localBoundsMinY = instance.root.worldToLocal(bounds.min.clone()).y;
    localBoundsMaxY = instance.root.worldToLocal(bounds.max.clone()).y;
  }

  const entry: CommunityRuntimeEntry = {
    localTargetCenter,
    targetRadius,
    localBoundsMinY,
    localBoundsMaxY,
    proxy,
    proxyParts,
    parts: instance.parts,
    edges,
    wheels: instance.parts.filter((part) => part.userData.communityModelWheel === true),
    useProxy: proxy?.visible === true
  };
  cache.entries.set(instance, entry);
  cache.stats.entryCount += 1;
  cache.stats.rebuildCount += 1;
  instrumentSteadyStateTraversal(cache, instance.root);
  return entry;
}

function instrumentSteadyStateTraversal(cache: CommunityRuntimeCache, root: Object3D): void {
  const traverse = root.traverse.bind(root);
  root.traverse = ((callback: (object: Object3D) => void) => {
    cache.stats.steadyStateTraversalCount += 1;
    traverse(callback);
  }) as typeof root.traverse;
}

function isObjectVisibleInHierarchy(object: Object3D): boolean {
  let cursor: Object3D | null = object;
  while (cursor) {
    if (!cursor.visible) {
      return false;
    }
    cursor = cursor.parent;
  }
  return true;
}

function getCommunityWheelAxis(part: Object3D): CommunityWheelAxis {
  const axis = part.userData.communityWheelAxis;
  return axis === "x" || axis === "y" || axis === "z" ? axis : "x";
}
