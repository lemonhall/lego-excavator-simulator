# v4 Plan: Excavator Control And Model

## Goal

Deliver the v4 excavator overhaul: correct scale, tracked driving controls, independent upper slew, articulated boom/stick/bucket, and a rebuilt procedural LEGO excavator body.

## PRD Trace

- REQ-0003-001: Excavator Scale And Proportions
- REQ-0003-002: Tracked Driving And Slew Controls
- REQ-0003-003: Articulated Excavator Arm
- REQ-0003-004: LEGO Excavator Visual Rebuild
- REQ-0003-005: Verification And Traceability

## Scope

In scope:

- Extend game state with crawler heading, upper rotation, boom, stick, and bucket angles.
- Map driving input to track-style movement and independent upper/arm controls.
- Rebuild the excavator as nested scene groups:
  - `excavatorCrawlerBase`
  - `excavatorUpper`
  - `excavatorBoom`
  - `excavatorStick`
  - `excavatorBucket`
- Update app sync, camera/HUD debug state, and Playwright coverage.
- Keep the farm scene and official worker model behavior intact.

Out of scope:

- No digging physics, terrain deformation, mission system, external excavator asset import, or exact licensed LEGO set copy.
- No gamepad/mobile controls in v4.

## Control Contract

| Key | Driving behavior |
|---|---|
| `W` | Both tracks forward; move along crawler heading |
| `S` | Both tracks backward |
| `A` | Differential left turn: right track drives forward and left track is locked/reversed enough to pivot left |
| `D` | Differential right turn |
| `J` | Rotate upper structure left |
| `L` | Rotate upper structure right |
| `R` | Raise boom |
| `Q` | Lower boom |
| `T` | Curl/raise stick |
| `G` | Extend/lower stick |
| `Y` | Curl bucket inward |
| `H` | Dump bucket outward |
| `E` | Enter/exit cab |

## Acceptance

- `npm test -- src/game/state.test.ts` first fails after new control tests are added.
- `npm test -- src/game/world.test.ts` first fails after new scale/model tests are added.
- `npm run e2e -- tests/e2e/game.spec.ts` first fails after new driving-control assertions are added.
- After implementation:
  - `npm test` exits 0.
  - `npm run build` exits 0.
  - `npm run e2e` exits 0.
  - Encoding scan exits 0 for source/docs/json/gltf/license files.
- Anti-cheat: tests must assert independent numeric state changes for crawler heading, upper rotation, boom, stick, and bucket, plus world object handles and excavator part count.

## Files

- `docs/prd/PRD-0003-excavator-simulation.md`
- `docs/plan/v4-index.md`
- `docs/plan/v4-excavator-control-and-model.md`
- `src/game/state.ts`
- `src/game/input.ts`
- `src/game/camera.ts`
- `src/game/world.ts`
- `src/game/app.ts`
- `src/game/state.test.ts`
- `src/game/world.test.ts`
- `tests/e2e/game.spec.ts`

## Steps

1. TDD Red: add state tests for crawler travel, differential pivot, upper slew, and boom/stick/bucket limits.
2. Run `npm test -- src/game/state.test.ts`; expected failures are missing fields and controls.
3. TDD Red: add world tests for excavator bounding-box ratios, named groups, LEGO part count, and recognizable parts.
4. Run `npm test -- src/game/world.test.ts`; expected failures are missing groups/proportions/parts.
5. TDD Red: add E2E assertions for driving debug state and HUD control text.
6. Run `npm run e2e -- tests/e2e/game.spec.ts`; expected failure is missing debug/control behavior.
7. TDD Green: implement state constants, input fields, tracked drive math, angle limits, and state cloning.
8. TDD Green: rebuild excavator scene graph and expose handles in `FarmWorld`.
9. TDD Green: update app sync, debug state, HUD, and driver camera to use crawler plus upper rotation.
10. Run targeted tests until green, then run `npm test`, `npm run build`, and `npm run e2e`.
11. Review diff against PRD/DoD, update `v4-index.md` Review Log, Difference List, and Trigger Audit.

## Risks

- Driver view may hide the boom if camera targets crawler heading instead of upper rotation. Mitigation: camera uses combined crawler + upper heading for driver view and targets forward arm space.
- Large `world.ts` edits can regress player/farm objects. Mitigation: existing world tests remain in place and v4 changes are scoped to excavator construction and returned handles.
- Controls can conflict with on-foot movement. Mitigation: new arm/slew keys only affect driving mode; `E` remains the only interaction latch.
