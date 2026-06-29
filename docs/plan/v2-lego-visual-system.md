# v2 Procedural LEGO Visual System Plan

## Goal

Make the scene read as a LEGO-like toy construction by replacing arbitrary box art with procedural brick parts, PBR plastic, and stronger part metadata.

## PRD Trace

- REQ-0002-001
- REQ-0002-002
- REQ-0002-003
- REQ-0002-004

## Scope

Create reusable LEGO-like part factories and rebuild the farm/excavator visuals with those factories. Keep existing player movement, vehicle state, cab camera, HUD, and E2E flows working.

## Acceptance

- `npm test -- src/game/legoParts.test.ts` exits 0.
- `npm test -- src/game/world.test.ts` exits 0.
- `npm test` exits 0.
- `npm run build` exits 0.
- `npm run e2e` exits 0.
- Screenshot QA confirms the excavator shows visible studs, rounded brick edges, glossy plastic highlights, and boom visible from cab view.

## Files

- Create: `src/game/legoParts.ts`
- Create: `src/game/legoParts.test.ts`
- Modify: `src/game/world.ts`
- Modify: `src/game/world.test.ts`
- Modify: `docs/plan/v2-index.md`

## Steps

1. Write failing tests for brick part factories and material metadata.
2. Run `npm test -- src/game/legoParts.test.ts` and confirm red.
3. Implement `legoParts.ts` with rounded bricks, plates, studs, wheels, and plastic materials.
4. Run `npm test -- src/game/legoParts.test.ts` and confirm green.
5. Extend world tests for procedural part counts, environment lighting, excavator part counts, and visible stud counts.
6. Run `npm test -- src/game/world.test.ts` and confirm red.
7. Rebuild world and excavator visuals using `legoParts.ts`.
8. Run `npm test -- src/game/world.test.ts` and confirm green.
9. Run `npm test`, `npm run build`, and `npm run e2e`.
10. Capture screenshot QA and update v2 review records.

## Risks

- Rounded geometry can increase triangle count. Mitigation: use low segment counts and simple generated parts.
- PBR lighting can make colors too dark. Mitigation: generated environment and controlled clearcoat/roughness values.
- Refactoring world visuals can break runtime handles. Mitigation: tests assert named handles remain present.
