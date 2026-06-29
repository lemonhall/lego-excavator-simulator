# v3 Index: Official Worker Minifigure

## Vision

Source: [PRD-0002](../prd/PRD-0002-procedural-lego-visuals.md), changed by [ECN-0004](../ecn/ECN-0004-official-worker-minifigure.md).

Rebuild the player so the first read is "official LEGO construction worker minifigure", not "generic block character". The primary path now uses a downloaded CC-BY glTF model of a construction worker minifigure, with the procedural figure kept only as a loading fallback.

## Milestones

| Milestone | Scope | DoD | Verification | Status |
|---|---|---|---|---|
| M1 | Reference/model selection and hard acceptance | CC-BY construction-worker glTF is copied into `public/models`; attribution is retained | `public/models/lego_construction_worker/license.txt` exists | done |
| M2 | TDD model integration | World tests fail first, then pass for official model path, model mount, and fallback metadata | `npm test -- src/game/world.test.ts` exits 0 after red evidence | done |
| M3 | Integration and visual QA | Full unit tests, build, E2E, and screenshot inspection pass; review records any remaining mismatch | `npm test`; `npm run build`; `npm run e2e`; screenshot capture | done |

## Plan Index

- [v3-official-worker-minifigure.md](./v3-official-worker-minifigure.md)

## Traceability Matrix

| Req ID | PRD | v3 Plan | Unit/Integration Tests | E2E Tests | Evidence | Status |
|---|---|---|---|---|---|---|
| REQ-0002-004 | PRD-0002 + ECN-0004 | v3 M1/M2/M3 | `src/game/world.test.ts` official-worker model tests | `tests/e2e/game.spec.ts` render and interaction tests | `npm test`; `npm run build`; `npm run e2e`; screenshot QA | done |

## ECN Index

- ECN-0004: User review rejected the abstract block-worker model; rebuild player from official construction-worker minifigure part language.

## DoD Hardness Self-Check

- Each DoD binds to a command or named screenshot artifact.
- Anti-cheat clause: v3 cannot pass by color-only tweaks. Tests must assert the official glTF model path, runtime mount point, fallback separation, and legacy procedural anchors.
- Scope excludes editing the downloaded mesh in Blender, new gameplay systems, and external network loading at runtime.

## Doc QA Gate

- PRD requirement REQ-0002-004 remains the trace anchor.
- ECN-0004 records the design correction.
- v3 plan contains explicit part matrix, tests, implementation steps, and visual review gate.

## Review Log

## Tashan Review - v3 / M3

- reviewer_context: same-model + browser screenshot
- round: 1
- cost_profile: standard
- verdict: pass
- blocker_count: 0
- major_count: 0
- stuck_signatures: none
- regression_signatures: none
- commands_checked: `npm test`; `npm run build`; `npm run e2e`; browser screenshot and debug state
- residual_risks: The downloaded model is static geometry, so limb animation rotates imported part groups rather than a rigged skeleton. Material treatment now boosts glossy plastic, but exact scene-wide color matching may need a future color remap table.

### Findings

| severity | signature | evidence | disposition |
|---|---|---|---|
| BLOCKER | player::REQ-0002-004::gltf-off-origin | Browser debug showed loaded model centered around x=20, z=-35 and invisible to camera | Fixed by final `Box3` normalization in `officialWorkerModel.ts` |
| MAJOR | player::REQ-0002-004::ws-facing-reversed | User reported W/S orientation reversed | Fixed by removing extra `Math.PI` source rotation; W now shows back in over-shoulder forward movement |
| MAJOR | player::REQ-0002-004::static-imported-limbs | User reported imported model limbs did not animate | Fixed by mapping glTF part nodes to `playerLeftArm`, `playerRightArm`, `playerLeftLeg`, `playerRightLeg`; browser debug shows nonzero rotations while moving |
| MAJOR | player::REQ-0002-004::dull-imported-material | User reported model was gray/dull against glossy LEGO scene | Mitigated by applying scene plastic roughness/clearcoat/color boost to imported Standard/Physical materials |

## Difference List

- v2 screenshot review failed for the player: the hard hat floated, face was stiff, torso print was missing/abstract, and silhouette was still too block-like.
- v3 prioritizes the player only; excavator/farm/driving changes are out of scope unless regressions appear.
- Procedural fallback remains available but should not be the visible path after glTF loads.
- v3 uses CC-BY glTF attribution from `public/models/lego_construction_worker/license.txt`.

## Tashan Trigger Audit

- expected_review_triggers: v3 doc writing, M2 implementation, M3 visual QA
- actual_review_runs: 1
- skipped_triggers: 0
- skip_reasons: none
- mitigation: No completion signal will be emitted until M3 review is recorded.
