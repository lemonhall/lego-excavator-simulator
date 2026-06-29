# ECN-0003: Player Face And Minifigure Torso

## Basic Info

- ECN ID: ECN-0003
- Related PRD: PRD-0002
- Related Req IDs: REQ-0002-004
- Discovered in: v2 player screenshot review
- Date: 2026-06-29

## Change Reason

The player has separate limbs after ECN-0002 but still lacks a readable face and front direction. The torso is still too close to a plain rectangular block instead of a LEGO minifigure-style chest and waist.

## Change Content

### Original Design

ECN-0002 required named limbs and walk animation.

### New Design

- Player head must include a named `playerFace` group with two eyes and a mouth placed on the forward side.
- Player torso must include a named `playerChestPanel` and be marked `bodyShape = "minifigureTorso"`.
- Player must read as a construction worker: red hard hat, orange safety vest, blue sleeves, yellow hands, and orange pants.
- Player front direction must remain readable from the camera through face placement and chest detail.

## Impact Scope

- Affected Req IDs: REQ-0002-004
- Affected tests: `src/game/world.test.ts`
- Affected code: `src/game/world.ts`

## Disposition

- [x] Tests updated and passing
