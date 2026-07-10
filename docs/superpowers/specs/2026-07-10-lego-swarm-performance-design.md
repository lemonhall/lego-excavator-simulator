# LEGO Swarm Performance Design

Date: 2026-07-10
Status: Approved for planning

## Context

The default arena contains 27 real `radar-truck` LDraw models. One parsed truck contains 178 scene nodes, 42 meshes, 84 line-segment objects, and about 25,184 triangles. The raw 27-model population therefore represents about 4,806 nodes and 680,000 triangles before the existing intact-model render proxies are considered.

The current v9 work already merges each intact truck into a small material-group proxy, hides LDraw edges, disables community-model shadow casting, delays community physics registration until detachment, and throttles debug synchronization. Those changes reduce draw calls and physics work, but steady-state code still traverses model trees and recomputes bounds repeatedly each frame.

## Goal

Keep all 27 real LDraw vehicles, their color variants, patrol movement, driving transition, shooting, and brick destruction while reaching a stable 55 FPS or higher on the user's current machine after the full population has loaded.

The renderer may cap device pixel ratio at 1.5. Enemy count, asset provenance, and destruction behavior must not be reduced to meet the target.

## Non-goals

- Replacing real LDraw vehicles with handcrafted low-detail enemies.
- Reducing the default target count below 27.
- Rebuilding the intact population with `InstancedMesh` in this change.
- Changing Rapier destruction behavior or projectile gameplay.
- Adding a general dynamic-resolution controller.

## Root Cause

The performance loss has both CPU and GPU components:

1. `collectShooterTargets` recomputes visible bounds for every intact community instance every frame, including frames where no new projectile is fired.
2. proxy synchronization aligns an already-active proxy before checking whether its mode changed, causing another full model-tree traversal per instance per frame.
3. patrol wheel animation scans every LDraw mesh to find the small wheel subset.
4. the renderer combines antialiasing, a device-pixel-ratio cap of 2, soft shadows, and `preserveDrawingBuffer`, increasing full-screen GPU and buffer-management cost.

## Architecture

### Community Runtime Cache

`app.ts` will own a cache keyed by `CommunityModelInstance`. Each entry contains:

- the intact proxy object;
- target center in instance-local coordinates;
- target radius;
- the selected wheel objects;
- the last applied render mode;
- whether proxy ground alignment has completed.

The cache is built once after model normalization, color treatment, and proxy construction. Cached target geometry is derived from the final intact visual representation, so shooting remains aligned with what the player sees.

The cache is built once for the lifetime of an instance. Root translation, root rotation, and proxy/real-brick visibility changes do not invalidate local bounds; the cached local center is transformed to world space from the current root matrix. Replacing or disposing the instance also replaces or removes its cache entry.

### Steady-state Frame Path

For an intact, non-driven vehicle, each frame may update only:

- root position and yaw for patrol movement;
- cached wheel objects when real bricks are visible;
- cached target center in world space;
- proxy visibility when the render mode actually changes.

Steady-state frames must not call `traverse`, `Box3.setFromObject`, geometry merging, or physics registration for intact community instances.

Proxy ground alignment runs once when a proxy is created. Re-entering proxy mode reuses its existing local offset. The function checks the current render mode before changing visibility.

### Shooting Targets

The weapon system continues receiving the same `ShooterTarget` protocol. Community targets are produced from cached local center and radius values. Movement updates only the world-space center; no model-tree scan is required.

Detached instances are removed from the intact target path and use the existing destruction and physics flow.

### Wheel Animation

Wheel selection remains based on the existing LDraw wheel tagging logic. The resulting wheel list is cached once per instance. Patrol and player driving animate only that list.

When an intact proxy is visible, hidden real wheels do not need animation. Their accumulated rotation may be updated when switching to real-brick driving mode so the transition remains coherent.

### Renderer Configuration

The renderer will:

- retain WebGL antialiasing;
- remove `preserveDrawingBuffer: true`;
- cap pixel ratio at `Math.min(window.devicePixelRatio, 1.5)`;
- retain the current tone mapping and world shadow behavior;
- continue disabling community-model shadow casting while allowing existing world objects to cast shadows.

Playwright screenshots do not require a preserved drawing buffer because capture occurs through the browser compositor.

## Observability

The existing `window.__legoGameDebug` contract will gain a `performance` section refreshed with the existing throttled debug cadence. It will expose:

- rolling FPS over a bounded recent window;
- average and maximum frame time in milliseconds;
- renderer draw calls, triangles, lines, geometries, and textures;
- community steady-state traversal count;
- target-cache hit and rebuild counts;
- configured pixel-ratio cap and active renderer pixel ratio.

Counters are diagnostic only and must not trigger additional scene traversal. Frame timing uses real `requestAnimationFrame` timestamps, not the fixed simulation step.

## Error Handling

If cache construction cannot derive non-empty bounds, the instance receives the existing conservative fallback hit radius and its root position as the target center. A cache miss rebuilds one instance once and increments the rebuild counter; it must not silently fall back to per-frame traversal.

If a proxy cannot be created, that instance remains in real-brick mode and still uses cached target bounds and wheels.

## Testing

Unit tests will cover:

- cached local target geometry producing correct world centers after translation and rotation;
- unchanged proxy mode skipping alignment and traversal work;
- render-mode transitions reusing the existing instance cache and changing only visibility;
- wheel animation iterating only cached wheel objects;
- renderer policy selecting a maximum pixel ratio of 1.5;
- performance aggregation using real frame timestamps and a bounded sample window.

Existing community-model, weapon, destruction, cleanup, and driving tests must remain green. Existing desktop E2E behavior remains the functional regression gate.

FPS is a hardware-sensitive acceptance measurement, not a flaky CI assertion. After 27 models load, the debug performance window must show at least 55 FPS during a five-second idle patrol sample on the user's current machine. Steady-state community traversal count must be zero.

## Risks

- A stale cache could make bullets miss a moved vehicle. Storing local-space target geometry and transforming it from the current root matrix avoids this.
- Switching from proxy to real bricks could expose stale wheel transforms. Render-mode transition code applies the accumulated wheel rotation before revealing real parts.
- Lowering DPR may soften edges on high-density displays. The 1.5 cap preserves antialiasing and is an explicitly accepted visual tradeoff.
- Removing `preserveDrawingBuffer` could affect direct canvas pixel reads. The application does not use them, and browser-compositor screenshots remain supported.

## Acceptance Criteria

1. The default population remains at least 27 real manifest-backed LDraw vehicles.
2. Patrol, driving, shooting, detachment, Rapier breakup, and debris cleanup retain their current behavior.
3. Intact community vehicles use the existing merged proxy unless actively driven.
4. Steady-state intact community processing performs zero model-tree traversals per frame.
5. Debug output exposes frame timing, renderer statistics, cache counts, and traversal counts without scene scans.
6. Renderer DPR is capped at 1.5 and `preserveDrawingBuffer` is disabled.
7. The full unit suite and production build pass.
8. The user-machine five-second sample reaches stable 55 FPS or higher after all 27 vehicles load.
