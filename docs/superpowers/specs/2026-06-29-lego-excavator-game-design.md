# Lego Excavator Game Design

## Summary

Build v1 of a browser game using Vite, TypeScript, Three.js, Vitest, and Playwright. The player controls a LEGO-style minifigure in a medium rural farm scene, can run and jump in third person, and can enter, drive, and exit a LEGO-style excavator.

## Scope

In scope for v1:

- A rendered 3D farm scene with a ground plane, paths, fences, barn, crops, trees, and LEGO-like block proportions.
- A third-person player controller with WASD movement, Space jump, gravity, camera follow, and world bounds.
- An excavator vehicle placed in the world.
- Enter and exit behavior when the player is close to the excavator and presses E.
- Vehicle driving with WASD while mounted.
- Basic excavator boom controls that visibly change boom pose.
- HUD text that exposes current mode and controls.
- Automated unit tests for player movement, jump, vehicle state, and world creation metadata.
- Automated Playwright E2E tests for page load, canvas rendering, and enter/exit flow.

Out of scope for v1:

- Real terrain deformation or physics excavation.
- Multiplayer, persistence, missions, inventory, or downloadable assets.
- Complex collision meshes beyond simple bounds and proximity checks.
- Mobile touch controls.

## Architecture

The implementation separates pure gameplay logic from Three.js rendering.

- `src/game/state.ts` owns deterministic state transitions for player movement, jump, mounting, vehicle driving, boom pose, and bounds.
- `src/game/world.ts` owns Three.js object creation and stable names used by tests and diagnostics.
- `src/game/input.ts` maps keyboard events into an input snapshot.
- `src/game/app.ts` wires state, input, camera, renderer, HUD, and animation loop.
- `src/main.ts` is the browser entry point.

This keeps the game testable without WebGL and leaves Three.js integration focused on presentation.

## Gameplay Rules

- Initial mode is `onFoot`.
- Player starts near the farm center and moves on the X/Z plane.
- Pressing Space while grounded creates a jump impulse; gravity returns the player to ground height.
- Player cannot move outside the configured world bounds.
- Pressing E within excavator interaction distance switches to `driving`.
- Pressing E while driving exits to an offset beside the excavator.
- In driving mode, movement input drives the excavator, not the player.
- Boom controls adjust boom angle within configured limits.

## Visual Direction

The scene should read as a toy farm: bright but not monochrome, blocky modular geometry, visible studs on key surfaces, simple shadows, and a low camera following behind the player. The excavator should be the strongest object signal in the first viewport.

## Testing

Unit tests:

- Player movement changes position and respects bounds.
- Jump changes vertical velocity and returns to ground.
- Mounting requires proximity and toggles mode.
- Driving moves the excavator while mounted.
- World creation includes required named objects.

E2E tests:

- Home page displays HUD and a non-empty WebGL canvas.
- Keyboard flow moves near the excavator, enters driving mode, and exits driving mode.
- Screenshot and canvas pixel checks prove the 3D scene renders.

## Acceptance

The v1 slice is complete only when:

- `npm test` exits 0.
- `npm run build` exits 0.
- `npm run e2e` exits 0 using system Chrome.
- Playwright captures nonblank desktop and mobile screenshots.
- Tashan review records no unresolved BLOCKER and no unassigned MAJOR.
