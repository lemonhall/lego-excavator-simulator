# PRD-0001: Lego Excavator Game

## Vision

Create a playable browser-based LEGO-style rural excavator game slice. A user can load the page, recognize a toy farm scene, control a third-person player, jump, approach an excavator, enter it, drive it, move its boom, and exit it again.

## Requirements

### REQ-0001-001: Browser 3D Farm Scene

- Motivation: The first screen must communicate a LEGO-style rural farm game, not a blank tech demo.
- Scope: Render a medium farm scene with ground, paths, fences, barn, crops, trees, dense studs, player, and excavator. [Changed by ECN-0001]
- Non-goals: No remote art packs, no procedural terrain deformation, no photorealistic assets.
- Acceptance:
  - Playwright can find a `canvas[data-testid="game-canvas"]`.
  - Canvas pixel sampling detects more than 20 non-background pixels after load.
  - `createFarmWorld()` exposes named objects for `ground`, `barn`, `excavator`, `player`, and at least six decorative farm objects.
  - `createFarmWorld()` exposes at least 24 meshes tagged as LEGO plastic, including studs on the excavator and barn. [Added by ECN-0001]
  - The scene exposes named `overShoulderCameraAnchor` and `driverCameraAnchor` objects. [Added by ECN-0001]

### REQ-0001-002: Third-Person Player Run And Jump

- Motivation: The game must feel directly controllable before vehicle interaction.
- Scope: WASD movement, Space jump, gravity, over-shoulder third-person camera follow, and rectangular world bounds. [Changed by ECN-0001]
- Non-goals: No character animation rig, no gamepad, no mobile touch controls.
- Acceptance:
  - Unit tests prove forward movement changes player position.
  - Unit tests prove jumping changes vertical state and returns to grounded state.
  - Unit tests prove bounds clamp player position.
  - Unit tests prove on-foot camera position is behind and offset over the player's shoulder. [Added by ECN-0001]

### REQ-0001-003: Excavator Enter, Drive, Boom, Exit

- Motivation: The excavator is the core vehicle fantasy of v1.
- Scope: Press E near the excavator to enter; WASD drives vehicle; boom controls change boom angle; driving camera moves near the cab; press E again to exit. [Changed by ECN-0001]
- Non-goals: No digging physics, no bucket collision gameplay, no fuel or damage systems.
- Acceptance:
  - Unit tests prove mounting fails when far and succeeds when near.
  - Unit tests prove driving mode moves the excavator instead of the player.
  - Unit tests prove boom angle is clamped inside configured limits.
  - Unit tests prove driving camera is close to the cab and looks forward from the excavator. [Added by ECN-0001]
  - Playwright proves HUD changes to driving mode and back to on-foot mode.

### REQ-0001-004: Automated Verification And Traceability

- Motivation: The slice must be regression-testable and auditable.
- Scope: Vitest unit tests, Playwright E2E tests, build verification, and Tashan review records.
- Non-goals: No CI provider setup in v1.
- Acceptance:
  - `npm test`, `npm run build`, and `npm run e2e` exit 0 locally.
  - `docs/plan/v1-index.md` maps every Req ID to tests or commands.
  - Review log records verdict, severity counts, trigger audit, and residual risks.
