# v2 Index: Procedural LEGO Visual System

## Vision

Source: [PRD-0002: Procedural LEGO Visual System](../prd/PRD-0002-procedural-lego-visuals.md)

Replace generic cubes with a reusable procedural LEGO-like part system, then rebuild the excavator and farm scene with rounded bricks, plates, studs, PBR plastic, and environment lighting.

## Milestones

| Milestone | Scope | DoD | Verification | Status |
|---|---|---|---|---|
| M1 | Brick factory and plastic materials | Brick/plate/wheel/stud factories are tested and expose metadata | `npm test -- src/game/legoParts.test.ts` exits 0 | done |
| M2 | World rebuild using part system | Excavator and farm contain required procedural LEGO part counts while keeping named handles | `npm test -- src/game/world.test.ts` exits 0 | done |
| M3 | Integration and visual QA | Build and E2E pass; screenshot shows cab view with boom visible and LEGO part language | `npm test`; `npm run build`; `npm run e2e` exit 0 | done |

## Plan Index

- [v2-lego-visual-system.md](./v2-lego-visual-system.md)
- [superpowers implementation plan](../superpowers/plans/2026-06-29-procedural-lego-visual-system.md)

## Traceability Matrix

| Req ID | PRD | v2 Plan | Unit/Integration Tests | E2E Tests | Evidence | Status |
|---|---|---|---|---|---|---|
| REQ-0002-001 | PRD-0002 | v2 M1 | `src/game/legoParts.test.ts` | none | `npm test` passed 2026-06-29 | done |
| REQ-0002-002 | PRD-0002 | v2 M1/M3 | `src/game/legoParts.test.ts`; `src/game/world.test.ts` | `tests/e2e/game.spec.ts` | `npm test`; `npm run build`; `npm run e2e` passed 2026-06-29 | done |
| REQ-0002-003 | PRD-0002 | v2 M2/M3 | `src/game/world.test.ts` | `tests/e2e/game.spec.ts` | `npm test`; screenshot QA passed 2026-06-29 | done |
| REQ-0002-004 | PRD-0002 | v2 M2/M3 | `src/game/world.test.ts` | `tests/e2e/game.spec.ts` | `npm test`; user screenshot QA rejected player minifigure fidelity 2026-06-29 | superseded by v3 |

## ECN Index

No ECN records for v2 at plan start.

## DoD Hardness Self-Check

- Each DoD binds to a command with exit code 0.
- Anti-cheat clause: v2 cannot pass with color-only tweaks because tests assert procedural part metadata, stud counts, `MeshPhysicalMaterial` clearcoat, world environment, and named part handles.
- Scope excludes exact licensed set reproduction, full LDraw import, remote HDR files, and new gameplay systems.

## Doc QA Gate

- Every PRD-0002 requirement has scope, non-goals, and binary acceptance.
- Every v2 milestone traces to Req IDs.
- Verification commands are listed.

## Review Log

## Tashan Review - v2 / M3

- reviewer_context: same-model
- round: 1
- cost_profile: standard
- verdict: pass
- blocker_count: 0
- major_count: 0
- stuck_signatures: none
- regression_signatures: none
- commands_checked: `npm test`; `npm run build`; `npm run e2e`; screenshot QA through Playwright/Chrome
- residual_risks: No `.git` directory is available in this workspace, so commit and push remain unavailable.

### Findings

| severity | signature | evidence | disposition |
|---|---|---|---|
| NOTE | git::workspace::metadata-unavailable | `git status` previously reported no repository metadata | Recorded; does not block local implementation verification |
| NOTE | visuals::v2::not-ldraw-exact | v2 uses procedural LEGO-like parts, not exact LDraw/BrickLink assets | Accepted by v2 scope; LDraw remains a future option |
| MAJOR | player::REQ-0002-004::not-minifigure-no-walk | User screenshot review reported stacked-block player and no arm/leg walking animation | Fixed by ECN-0002; state exposes `moving/facing/walkPhase`, player has named limbs, screenshot QA captured walking pose |
| MAJOR | player::REQ-0002-004::no-face-box-torso | User screenshot review reported no face/front cue and torso unlike a minifigure | Fixed by ECN-0003; player has face group, eyes, mouth, chest panel, and minifigure torso metadata |
| BLOCKER | player::REQ-0002-004::abstract-worker-not-official-minifigure | User second screenshot review rejected the player as too abstract versus official worker reference | Escalated to ECN-0004 and v3 official-worker minifigure rebuild |

## Difference List

- LDraw/BrickLink import was not implemented in v2; this remains the path for exact part accuracy if procedural parts are still insufficient.
- Player walk animation is simple sinusoidal limb swing, not a full animation rig.
- Player face and torso geometry details were insufficient; v3 will rebuild the player with official-worker part decomposition and flat decal surfaces.

## Tashan Trigger Audit

- expected_review_triggers: v2 doc writing, M1 completion, M2 completion, M3 completion
- actual_review_runs: 1
- skipped_triggers: 0
- skip_reasons: none
- mitigation: Review record appended; no Tashan completion signal emitted because commit/push is not closed.
