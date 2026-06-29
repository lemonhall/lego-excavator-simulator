# v4 Index: Excavator Simulation And Vehicle Model

## Vision

Source: [PRD-0003](../prd/PRD-0003-excavator-simulation.md).

Rebuild the excavator so it behaves and reads like a tracked LEGO excavator: correctly scaled beside the minifigure, crawler base movement with differential steering, independent upper slew, articulated boom/stick/bucket, and a recognizable plastic LEGO construction vehicle model.

## Milestones

| Milestone | Scope | DoD | Verification | Status |
|---|---|---|---|---|
| M1 | Hard vehicle state model | State exposes crawler heading, upper slew, boom, stick, and bucket; tests cover travel, pivot, slew, and limits | `npm test -- src/game/state.test.ts` failed first on missing v4 fields, then exited 0 | done |
| M2 | LEGO excavator world rebuild | World exposes crawler base, upper, boom, stick, bucket; bounding-box and part-count tests pass | `npm test -- src/game/world.test.ts` failed first on missing v4 handles/parts, then exited 0 | done |
| M3 | App integration and E2E | Keyboard controls, HUD, camera, and sync drive the new state and scene groups | `npm test`; `npm run build`; `npm run e2e` exit 0 | done |
| M4 | Review and closure | Tashan review records blocker/major counts, trigger audit, and residual visual risks | Review log in this file has verdict `pass` | done |

## Plan Index

- [v4-excavator-control-and-model.md](./v4-excavator-control-and-model.md)

## Traceability Matrix

| Req ID | PRD | v4 Plan | Unit/Integration Tests | E2E Tests | Evidence | Status |
|---|---|---|---|---|---|---|
| REQ-0003-001 | PRD-0003 | v4 M2 | `src/game/world.test.ts` scale/proportion tests | Canvas screenshot in `tests/e2e/game.spec.ts` | `npm test` 39 passed; `test-results/v4-excavator-qa-2.png` | done |
| REQ-0003-002 | PRD-0003 | v4 M1/M3 | `src/game/state.test.ts` tracked driving tests; `src/game/camera.test.ts` driver camera tests | `tests/e2e/game.spec.ts` excavator controls flow | `npm test` 39 passed; `npm run e2e` 4 passed | done |
| REQ-0003-003 | PRD-0003 | v4 M1/M2/M3 | `src/game/state.test.ts`; `src/game/world.test.ts` articulated arm tests | `tests/e2e/game.spec.ts` control flow | `npm test` 39 passed; Playwright debug shows nonzero upper/boom/stick/bucket angles | done |
| REQ-0003-004 | PRD-0003 | v4 M2 | `src/game/world.test.ts` part count and named part tests | Nonblank canvas E2E | `npm test` 39 passed; `npm run e2e` 4 passed | done |
| REQ-0003-005 | PRD-0003 | v4 M3/M4 | All unit tests | All E2E tests | `npm test`; `npm run build`; `npm run e2e`; encoding scan | done |

## ECN Index

- None at v4 start.

## DoD Hardness Self-Check

- Each DoD has a repeatable command and binary pass/fail result.
- Anti-cheat clause: v4 cannot pass by color tweaks or renaming objects. State tests must prove independent crawler/upper/arm motion, and world tests must prove nested handles, bounding-box proportions, part counts, and named excavator parts.
- Scope excludes digging physics, external downloaded excavator assets, track tread animation, and exact LEGO set reproduction.

## Doc QA Gate

- PRD-0003 contains Req IDs, scope, non-goals, and binary acceptance criteria.
- v4 plan traces every PRD requirement to tests or commands.
- Terms are fixed: `crawlerHeading`, `upperRotation`, `boomAngle`, `stickAngle`, `bucketAngle`, `excavatorCrawlerBase`, `excavatorUpper`, `excavatorBoom`, `excavatorStick`, `excavatorBucket`.

## Review Log

## Tashan Review - v4 / M4

- reviewer_context: same-model + Playwright screenshot
- round: 1
- cost_profile: standard
- verdict: pass
- blocker_count: 0
- major_count: 0
- stuck_signatures: none
- regression_signatures: none
- commands_checked: `npm test`; `npm run build`; `npm run e2e`; Playwright screenshot `test-results/v4-excavator-qa-2.png`; encoding scan
- residual_risks: Track treads are static visual pieces and do not animate. The excavator now reads as a tracked LEGO excavator and the controls are articulated, but exact LEGO set fidelity and digging physics remain out of v4 scope.

### Findings

| severity | signature | evidence | disposition |
|---|---|---|---|
| BLOCKER | camera::REQ-0003-002::driver-view-inside-body | First v4 screenshot `test-results/v4-excavator-qa.png` showed the camera clipped into large yellow body pieces, hiding most of the arm | Fixed by raising and offsetting the driver camera; verified by `test-results/v4-excavator-qa-2.png` |
| MAJOR | debug::REQ-0003-002::upper-rotation-ambiguous | Initial debug exposed upper world rotation under `upperRotation`, which could mask independent slew evidence | Fixed by exposing state `upperRotation` plus separate `upperWorldRotation` |
| NOTE | visuals::REQ-0003-004::static-tracks | Tracks are rebuilt as recognizable rubber belt/pad assemblies but are not animated | Accepted as out of v4 scope |

## Difference List

- v3 intentionally focused on the minifigure. v4 closes the excavator structure/control gap with tracked base, rotating upper, articulated arm, and larger vehicle proportions.
- Remaining difference: no terrain deformation, digging collision, hydraulic latency, or track animation. These remain outside PRD-0003/v4 scope unless opened in a later version.

## Tashan Trigger Audit

- expected_review_triggers: v4 doc writing, M1 state implementation, M2 world rebuild, M3 E2E integration, M4 closure
- actual_review_runs: 1
- skipped_triggers: 0
- skip_reasons: none
- mitigation: Review record is present before v4 completion signal.
