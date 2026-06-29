# ECN-0005: Unified Driving Controls And Cab Visibility

## Basic Info

- **ECN ID**: ECN-0005
- **Related PRD**: PRD-0003
- **Related Req IDs**: REQ-0003-002, REQ-0003-003
- **Discovery Phase**: Post-v4 user feedback
- **Date**: 2026-06-30

## Change Reason

User feedback after v4 confirmed that on-foot WASD works, but driving WASD should use the same planar movement contract as the player instead of differential track pivot controls. The user also requested remapped arm keys, Chinese HUD instructions, and a 60% transparent vehicle body while driving to prevent the cab view from being blocked by the excavator mesh.

## Change Content

### Original Design

REQ-0003-002 specified tracked/differential movement with `A`/`D` rotating the crawler base in place. REQ-0003-003 used `Q/R` for boom and `T/G` for stick.

### New Design

- `WASD` uses the same planar movement contract on foot and while driving.
- Driving movement updates crawler heading to face the current movement direction.
- `J/L` remains upper slew.
- Boom controls change to `U/O`.
- Stick controls change to `N/M`.
- Bucket remains `Y/H`.
- HUD instructions are shown in Chinese.
- While in driving mode, excavator body materials use opacity `0.6`; exiting restores opacity `1`.

## Impact Scope

- Affected Req IDs: REQ-0003-002, REQ-0003-003
- Affected plan: v4 controls follow-up
- Affected tests: `src/game/state.test.ts`, `tests/e2e/game.spec.ts`
- Affected code: `src/game/state.ts`, `src/game/input.ts`, `src/game/app.ts`

## Disposition

- [x] PRD updated with ECN marker
- [x] Tests updated before implementation
- [x] Implementation updated
- [x] Verification commands rerun
