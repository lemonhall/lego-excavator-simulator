# ECN-0002: Player Minifigure And Walk Animation

## Basic Info

- ECN ID: ECN-0002
- Related PRD: PRD-0002
- Related Req IDs: REQ-0002-004
- Discovered in: v2 user screenshot review
- Date: 2026-06-29

## Change Reason

The player still reads as stacked bricks rather than a LEGO-like minifigure. On-foot movement also lacks visible arm and leg motion, so third-person control feels static.

## Change Content

### Original Design

The visual system required procedural LEGO-like part language but did not define player anatomy or locomotion animation.

### New Design

- Player must expose named head, torso, left/right arm, and left/right leg objects.
- Game state must expose player movement metadata: `moving`, `facing`, and `walkPhase`.
- On-foot movement must animate opposite arm/leg swing from `walkPhase`.
- Driving mode keeps player hidden and does not animate visible limbs.

## Impact Scope

- Affected Req IDs: REQ-0002-004
- Affected tests: `src/game/state.test.ts`, `src/game/world.test.ts`
- Affected code: `src/game/state.ts`, `src/game/world.ts`, `src/game/app.ts`

## Disposition

- [x] Tests updated and passing
