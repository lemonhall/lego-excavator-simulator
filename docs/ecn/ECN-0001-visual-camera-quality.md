# ECN-0001: Visual And Camera Quality Upgrade

## Basic Info

- ECN ID: ECN-0001
- Related PRD: PRD-0001
- Related Req IDs: REQ-0001-001, REQ-0001-002, REQ-0001-003
- Discovered in: v1 user visual review
- Date: 2026-06-29

## Change Reason

The first implementation met functional tests but did not meet the intended feel. The scene read as simple colored blocks instead of glossy LEGO-like plastic bricks, and the camera read as elevated chase view instead of third-person over-shoulder view. Driving also needed a closer cockpit-like camera to make the excavator feel directly controlled.

## Change Content

### Original Design

The PRD required a LEGO-style farm scene and third-person control, but did not define the visual material bar or third-person camera geometry tightly enough.

### New Design

- REQ-0001-001 acceptance adds LEGO plastic material metadata, glossy material settings, higher density studs, stronger shadows, and named camera anchor objects.
- REQ-0001-002 acceptance adds an over-shoulder camera rig for on-foot mode.
- REQ-0001-003 acceptance adds a close cab/driver camera rig for driving mode.

## Impact Scope

- Affected Req IDs: REQ-0001-001, REQ-0001-002, REQ-0001-003
- Affected plan: v1-game-slice
- Affected tests: `src/game/world.test.ts`, `src/game/camera.test.ts`, `tests/e2e/game.spec.ts`
- Affected code: `src/game/world.ts`, `src/game/app.ts`, `src/game/camera.ts`

## Disposition

- [x] PRD updated with ECN note
- [x] v1 plan updated through this ECN record
- [x] Traceability remains mapped through existing Req IDs
- [x] Tests updated and passing
