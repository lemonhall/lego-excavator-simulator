# PRD-0003: Excavator Simulation And Vehicle Model

## Vision

Upgrade the vehicle from a simple block prop into a recognizable LEGO-style tracked excavator. The player should enter the cab, drive the crawler base like a tracked machine, rotate the upper structure, and articulate boom, stick, and bucket from a close driver view where the front attachment remains visible.

## Requirements

### REQ-0003-001: Excavator Scale And Proportions

- Motivation: The excavator must read as a usable construction vehicle beside the minifigure, not as an undersized cart.
- Scope: Define vehicle dimensions relative to the player and expose enough metadata/tests to prevent scale regressions.
- Non-goals: No exact licensed LEGO set reproduction and no real-world metric scale simulation.
- Acceptance:
  - World tests prove the excavator bounding box is at least 2.0 times the player width and at least 1.05 times the player height.
  - World tests prove the crawler base is wider than the cab and the boom reach extends in front of the upper structure.
  - The model keeps named runtime handles for lower crawler base, rotating upper, boom, stick, and bucket.

### REQ-0003-002: Unified Driving And Slew Controls

- Motivation: The player should not relearn movement after entering the excavator; driving movement should match on-foot WASD while retaining excavator upper slew controls.
- Scope: Driving mode supports WASD planar movement, crawler heading follows movement direction, independent upper slew rotation, and 60% body transparency for cab visibility. [Changed by ECN-0005]
- Non-goals: No soil interaction, slipping, suspension, track animation, or hydraulic latency simulation.
- Acceptance:
  - State tests prove `WASD` moves the excavator with the same planar movement contract used by the player. [Changed by ECN-0005]
  - State tests prove crawler heading updates to match the driving movement direction. [Changed by ECN-0005]
  - State tests prove upper slew rotates independently from crawler heading and wraps/clamps safely through 360-degree motion.
  - E2E proves the player can enter driving mode, use remapped arm controls, see Chinese HUD instructions, and get transparent vehicle-body debug evidence. [Changed by ECN-0005]

### REQ-0003-003: Articulated Excavator Arm

- Motivation: The boom, stick, and bucket are the recognizable working parts of an excavator.
- Scope: Add independently controlled boom, stick, and bucket joints with named scene groups and clamped limits. Boom uses `U/O`, stick uses `N/M`, and bucket uses `Y/H`. [Changed by ECN-0005]
- Non-goals: No inverse kinematics, digging collision, or payload simulation.
- Acceptance:
  - State tests prove boom, stick, and bucket each move independently and remain inside configured angle limits.
  - World tests prove the arm is built as nested named groups: `excavatorBoom`, `excavatorStick`, and `excavatorBucket`.
  - App sync applies state angles to the correct groups without moving the entire vehicle arm as one rigid prop.

### REQ-0003-004: LEGO Excavator Visual Rebuild

- Motivation: The vehicle must look like a LEGO excavator: tracks, turntable, cab, counterweight, segmented arm, bucket, studs, and glossy plastic.
- Scope: Rebuild the excavator from procedural LEGO parts with yellow plastic body, black rubber tracks, blue glass, visible studs, cab side/front windows, counterweight, turntable, and bucket teeth.
- Non-goals: No external excavator model download in v4.
- Acceptance:
  - World tests prove at least 70 procedural LEGO descendants under `excavatorRoot`.
  - World tests prove named parts exist for left/right tracks, turntable, cab, counterweight, boom, stick, bucket, and bucket teeth.
  - World tests prove the excavator uses glossy plastic metadata for visible yellow body pieces.
  - E2E canvas remains nonblank after the rebuild.

### REQ-0003-005: Verification And Traceability

- Motivation: This iteration is visual and behavioral; regressions must be caught by automated checks and review records.
- Scope: Maintain Vitest, Playwright, build verification, Tashan review log, and traceability matrix.
- Non-goals: No remote CI setup in v4.
- Acceptance:
  - `npm test`, `npm run build`, and `npm run e2e` exit 0 locally.
  - `docs/plan/v4-index.md` maps every REQ-0003 requirement to tests or commands.
  - Review log records verdict, severity counts, trigger audit, and residual risks.
