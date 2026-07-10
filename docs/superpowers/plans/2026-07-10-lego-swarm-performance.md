# LEGO Swarm Performance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep 27 real patrol-capable LDraw radar trucks while eliminating steady-state community model-tree traversal, capping renderer DPR at 1.5, exposing trustworthy performance telemetry, and reaching 55+ FPS on the user's machine.

**Architecture:** Extract two focused modules from the 65 KB app orchestrator. `communityRuntime.ts` owns one-time per-instance bounds/proxy/edge/wheel caches and traversal-free hot-path reads; `performance.ts` owns renderer policy and bounded real-rAF timing aggregation. `app.ts` wires those protocols into spawn, patrol, shooting, render-mode transition, and debug paths without changing gameplay contracts.

**Tech Stack:** TypeScript 5.8, Three.js 0.177, Vitest 3, Playwright 1.54, Vite 7

**Trace:** PRD-0007 REQ-0007-003, REQ-0007-005, REQ-0007-006, REQ-0007-007; ECN-0008; approved design `docs/superpowers/specs/2026-07-10-lego-swarm-performance-design.md`.

**Execution:** Inline execution in the current worktree is required because the approved optimization builds on uncommitted v9 proxy work. Do not create an isolated worktree that omits those changes.

---

## File Map

- Create `src/game/communityRuntime.ts`: one-time community instance cache, cached target projection, cached render-mode visibility, cached wheel animation, cache diagnostics.
- Create `src/game/communityRuntime.test.ts`: real Three.js hierarchy tests proving hot-path reads do not call `traverse` and transforms stay correct.
- Create `src/game/performance.ts`: renderer DPR policy, bounded frame timestamp tracker, performance debug assembly types.
- Create `src/game/performance.test.ts`: normal, invalid-input, and sample-window boundary tests.
- Modify `src/game/app.ts`: renderer policy, timestamped tick, cache registration and usage, performance debug wiring; retain orchestration responsibilities.
- Modify `src/game/app.test.ts`: preserve public wrapper behavior and add renderer/debug policy integration assertions only where app owns the contract.
- Modify `tests/e2e/game.spec.ts`: verify 27-target performance debug contract without a flaky CI FPS threshold.
- Modify `docs/plan/v9-index.md`: record M6 evidence, Review Loop, trigger audit, and residual user-machine FPS verification.
- Modify `docs/plan/v9-shooter-swarm-feel.md`: record commands and evidence after implementation.
- Modify `docs/ecn/ECN-0008-swarm-performance-budget.md`: mark test synchronization complete.

### Task 1: Renderer Policy and Real Frame Timing

**Files:**
- Create: `src/game/performance.ts`
- Create: `src/game/performance.test.ts`
- Modify: `src/game/app.ts:114-188,254-312,332-381`

- [x] **Step 1: Write the failing renderer and timing tests**

```ts
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

  it("REQ-0007-007 ignores invalid and non-forward timestamps", () => {
    const tracker = createFrameTimingTracker(4);
    [100, Number.NaN, 90, 116].forEach((value) => recordFrameTimestamp(tracker, value));
    expect(getFrameTimingSnapshot(tracker).sampleCount).toBe(1);
    expect(getFrameTimingSnapshot(tracker).averageFrameMs).toBe(16);
  });
});
```

- [x] **Step 2: Run the focused test and verify RED**

Run: `npm test -- src/game/performance.test.ts`

Expected: FAIL because `./performance` does not exist.

- [x] **Step 3: Implement the minimal pure performance module**

```ts
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

export function createFrameTimingTracker(maxSamples = 120): FrameTimingTracker {
  return { maxSamples: Math.max(1, Math.floor(maxSamples)), frameDurationsMs: [] };
}

export function recordFrameTimestamp(tracker: FrameTimingTracker, timestampMs: number): void {
  if (!Number.isFinite(timestampMs)) return;
  const previous = tracker.lastTimestampMs;
  if (previous !== undefined && timestampMs > previous) {
    tracker.frameDurationsMs.push(timestampMs - previous);
    while (tracker.frameDurationsMs.length > tracker.maxSamples) tracker.frameDurationsMs.shift();
  }
  if (previous === undefined || timestampMs > previous) tracker.lastTimestampMs = timestampMs;
}

export function getFrameTimingSnapshot(tracker: FrameTimingTracker): FrameTimingSnapshot {
  const samples = tracker.frameDurationsMs;
  const averageFrameMs = samples.length === 0 ? 0 : samples.reduce((sum, value) => sum + value, 0) / samples.length;
  return {
    fps: averageFrameMs > 0 ? 1000 / averageFrameMs : 0,
    averageFrameMs,
    maxFrameMs: samples.length === 0 ? 0 : Math.max(...samples),
    sampleCount: samples.length
  };
}
```

- [x] **Step 4: Run the focused test and verify GREEN**

Run: `npm test -- src/game/performance.test.ts`

Expected: 3 tests pass.

- [x] **Step 5: Wire renderer and tick policy into app**

Use `new WebGLRenderer(RENDERER_OPTIONS)`, `renderer.setPixelRatio(selectRendererPixelRatio(window.devicePixelRatio))`, a `FrameTimingTracker`, and `tick(timestampMs: number)` that calls `recordFrameTimestamp` before game work. Initial scheduling must use `requestAnimationFrame(tick)` instead of invoking a timestamp-free simulation frame.

- [x] **Step 6: Run type and focused regression checks**

Run: `npm test -- src/game/performance.test.ts src/game/app.test.ts; npm run build`

Expected: focused tests pass; TypeScript and Vite build exit 0; the existing Rapier chunk-size warning is allowed.

### Task 2: One-time Community Runtime Cache

**Files:**
- Create: `src/game/communityRuntime.ts`
- Create: `src/game/communityRuntime.test.ts`
- Modify: `src/game/app.ts:726-793,982-1065,1199-1369,1520-1612`

- [x] **Step 1: Write failing cache tests using real Three.js objects**

```ts
import { BoxGeometry, Group, Mesh, MeshStandardMaterial } from "three";
import { describe, expect, it } from "vitest";
import {
  createCommunityRuntimeCache,
  getCommunityRuntimeEntry,
  getCachedCommunityTarget,
  setCachedCommunityRenderMode,
  spinCachedCommunityWheels
} from "./communityRuntime";

function makeInstance() {
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
  return { id: "community0", modelId: "radar-truck", sourceKind: "ldraw-packed" as const, root, status: "intact" as const, parts: [body, wheel] };
}

it("REQ-0007-007 projects cached local target after root movement without traversal", () => {
  const instance = makeInstance();
  const originalTraverse = instance.root.traverse.bind(instance.root);
  let traversals = 0;
  instance.root.traverse = (callback) => { traversals += 1; originalTraverse(callback); };
  const cache = createCommunityRuntimeCache();
  getCommunityRuntimeEntry(cache, instance);
  const afterBuild = traversals;
  instance.root.position.set(8, 0, -5);
  instance.root.rotation.y = Math.PI / 2;
  const first = getCachedCommunityTarget(cache, instance);
  const second = getCachedCommunityTarget(cache, instance);
  expect(first.center.toArray()).toEqual(second.center.toArray());
  expect(traversals).toBe(afterBuild);
  expect(cache.stats.steadyStateTraversalCount).toBe(0);
});

it("REQ-0007-007 changes proxy mode once and spins only cached wheels", () => {
  const instance = makeInstance();
  const cache = createCommunityRuntimeCache();
  const entry = getCommunityRuntimeEntry(cache, instance);
  expect(setCachedCommunityRenderMode(entry, instance, false)).toBe(true);
  expect(setCachedCommunityRenderMode(entry, instance, false)).toBe(false);
  spinCachedCommunityWheels(entry, 1);
  expect(entry.wheels).toHaveLength(1);
  expect(entry.wheels[0].rotation.x).not.toBe(0);
});
```

- [x] **Step 2: Run the focused test and verify RED**

Run: `npm test -- src/game/communityRuntime.test.ts`

Expected: FAIL because `./communityRuntime` does not exist.

- [x] **Step 3: Implement cache contracts**

Implement these exact public contracts in `communityRuntime.ts`:

```ts
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
  proxy?: Object3D;
  parts: Object3D[];
  edges: Object3D[];
  wheels: Object3D[];
  useProxy: boolean;
}

export interface CommunityRuntimeCache {
  entries: WeakMap<CommunityModelInstance, CommunityRuntimeEntry>;
  stats: CommunityRuntimeCacheStats;
}

export function createCommunityRuntimeCache(): CommunityRuntimeCache;
export function getCommunityRuntimeEntry(cache: CommunityRuntimeCache, instance: CommunityModelInstance): CommunityRuntimeEntry;
export function getCachedCommunityTarget(cache: CommunityRuntimeCache, instance: CommunityModelInstance): { center: Vector3; radius: number };
export function setCachedCommunityRenderMode(entry: CommunityRuntimeEntry, instance: CommunityModelInstance, useProxy: boolean): boolean;
export function spinCachedCommunityWheels(entry: CommunityRuntimeEntry, travelDistance: number): void;
```

Cache construction may traverse once to collect visible mesh bounds and edges. `getCachedCommunityTarget`, unchanged `setCachedCommunityRenderMode`, and `spinCachedCommunityWheels` must not call `traverse` or `Box3.setFromObject`.

- [x] **Step 4: Run cache tests and verify GREEN**

Run: `npm test -- src/game/communityRuntime.test.ts`

Expected: all cache tests pass and the explicit traversal counter remains unchanged after cache construction.

### Task 3: Replace App Hot-path Traversal with Cache Reads

**Files:**
- Modify: `src/game/app.ts`
- Modify: `src/game/app.test.ts`

- [x] **Step 1: Add failing app-level behavior tests**

Extend the existing REQ-0007-007 section to assert that renderer configuration is not preserved-buffer mode, unchanged render mode reports no work, and the public wheel wrapper retains the existing four-wheel behavior. Use pure/exported policies rather than mounting WebGL in Node.

- [x] **Step 2: Run app and runtime tests to verify RED**

Run: `npm test -- src/game/app.test.ts src/game/communityRuntime.test.ts src/game/performance.test.ts`

Expected: new app integration assertions fail because the cache is not wired into app hot paths.

- [x] **Step 3: Register every spawned instance exactly once**

Create one `CommunityRuntimeCache` beside `communityInstances`. After `applyCommunityRenderProxy`, call `getCommunityRuntimeEntry(cache, instance)` before adding the instance to steady-state processing.

- [x] **Step 4: Replace shooter target bounds scans**

Change `collectShooterTargets` to call `getCachedCommunityTarget(cache, instance)`. Delete steady-state calls to `getVisibleCommunityModelBounds`; retain a one-time/fallback bounds helper only inside cache construction.

- [x] **Step 5: Replace proxy and edge traversal in sync**

Change `syncCommunityModels` to resolve the cache entry and call `setCachedCommunityRenderMode`. Perform physics registration and physics-part synchronization only for detached instances. The unchanged proxy path must return before any part, edge, bounds, or alignment work.

- [x] **Step 6: Replace patrol wheel scans**

Pass the runtime cache into patrol/drive animation and call `spinCachedCommunityWheels(getCommunityRuntimeEntry(cache, instance), distance)`. Keep `animateCommunityVehicleWheels` as a compatibility wrapper for existing tests and non-hot external callers.

- [x] **Step 7: Run focused and full unit suites**

Run: `npm test -- src/game/communityRuntime.test.ts src/game/performance.test.ts src/game/app.test.ts src/game/weapon.test.ts src/game/communityModels.test.ts; npm test`

Expected: focused tests pass, then all test files pass with no new warnings beyond the known Rapier initialization warning.

### Task 4: Performance Debug Contract and E2E Gate

**Files:**
- Modify: `src/game/app.ts:332-381`
- Modify: `tests/e2e/game.spec.ts` in the existing `v9 shooter swarm` test

- [x] **Step 1: Add failing E2E assertions**

After waiting for 27 models, assert:

```ts
const performanceDebug = await page.evaluate(() => window.__legoGameDebug?.performance as Record<string, unknown>);
expect(Number(performanceDebug.fps)).toBeGreaterThan(0);
expect(Number(performanceDebug.sampleCount)).toBeGreaterThan(0);
expect(Number(performanceDebug.targetCacheEntryCount)).toBeGreaterThanOrEqual(27);
expect(Number(performanceDebug.communitySteadyStateTraversalCount)).toBe(0);
expect(Number(performanceDebug.pixelRatioCap)).toBe(1.5);
expect(Number(performanceDebug.activePixelRatio)).toBeLessThanOrEqual(1.5);
expect(performanceDebug.preserveDrawingBuffer).toBe(false);
expect(Number(performanceDebug.drawCalls)).toBeGreaterThan(0);
expect(Number(performanceDebug.triangles)).toBeGreaterThan(0);
```

Do not assert 55 FPS in CI; that threshold belongs to the specified five-second user-machine acceptance sample.

- [x] **Step 2: Run the v9 E2E and verify RED**

Run: `npm run e2e -- tests/e2e/game.spec.ts --project=desktop-chrome --grep "v9 shooter swarm"`

Expected: FAIL because `window.__legoGameDebug.performance` is absent or incomplete.

- [x] **Step 3: Add debug performance assembly without scene traversal**

At the existing 0.25-second debug cadence, combine `getFrameTimingSnapshot`, `renderer.info`, renderer context attributes, active pixel ratio, and cache stats. Do not derive any metric through `scene.traverse` or `Box3.setFromObject`.

- [x] **Step 4: Run the v9 E2E and verify GREEN**

Run: `npm run e2e -- tests/e2e/game.spec.ts --project=desktop-chrome --grep "v9 shooter swarm"`

Expected: the existing gameplay assertions and all new performance debug assertions pass.

### Task 5: Verification, Review, Documentation, and Ship

**Files:**
- Modify: `docs/ecn/ECN-0008-swarm-performance-budget.md`
- Modify: `docs/plan/v9-index.md`
- Modify: `docs/plan/v9-shooter-swarm-feel.md`

- [x] **Step 1: Run complete verification**

Run in order:

```powershell
npm test
npm run build
npm run e2e -- tests/e2e/game.spec.ts --project=desktop-chrome
git diff --check
rg -a -P -n '\x{951B}|\x{20AC}|\x{4FD9}|\x{FFFD}|\?\?\?' docs src tests
```

Expected: 0 failed unit/E2E tests, build exit 0, diff check exit 0, and no corruption matches. The known Rapier deprecation and bundle-size warnings are residual notes, not new failures.

- [ ] **Step 2: Capture the user-machine five-second sample**

Open `http://127.0.0.1:5173/`, wait for `targetCacheEntryCount >= 27`, leave patrol idle for five seconds, and read `window.__legoGameDebug.performance`. Acceptance requires FPS >= 55, cache entries >= 27, and steady-state traversal count 0.

- [x] **Step 3: Run a fresh-context standard Tashan Review**

Review the approved design, ECN-0008, REQ-0007-007, current diff, test output, E2E output, and performance sample. Record BLOCKER/MAJOR/MINOR/NOTE findings with stable signatures. Fix all BLOCKER findings and either fix or explicitly disposition MAJOR findings, with at most three rounds.

- [x] **Step 4: Update traceability and completion evidence**

Mark ECN test synchronization complete. Update M6 and M7 evidence/status, REQ-0007-007 evidence/status, Review record, difference list, and Tashan Trigger Audit. Do not mark v9 fully done if any earlier v9 milestone remains incomplete.

- [ ] **Step 5: Verify only intended files are staged, then commit and push**

```powershell
git status --short
git diff --cached --stat
git commit -m "v9: fix: cache swarm hot paths"
git push
```

Stage only files belonging to the approved v9/performance work. Preserve unrelated user changes. If push fails, record the exact reason in `docs/plan/v9-index.md` and do not emit a completion signal.
