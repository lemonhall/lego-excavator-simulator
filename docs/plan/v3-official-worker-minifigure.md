# v3 Plan: Official Worker Minifigure

## Goal

Replace the abstract block-worker player with the downloaded construction-worker glTF model, keeping the procedural construction worker only as a fallback if loading fails.

## PRD Trace

- REQ-0002-004: Farm Scene Uses LEGO Part Language
- ECN-0004: Official Worker Minifigure Rebuild

## Scope

In scope:

- Load the player minifigure from `public/models/lego_construction_worker/scene.gltf`.
- Keep `src/game/world.ts` procedural player as fallback anchors and loading fallback.
- Preserve runtime object handles used by animation: `playerLeftArm`, `playerRightArm`, `playerLeftLeg`, `playerRightLeg`.
- Add testable model mount markers for official-worker glTF integration.
- Capture screenshot after implementation for visual comparison.

Out of scope:

- No Blender mesh editing and no runtime network dependency.
- No gameplay, camera, excavator, or farm redesign.
- No new external image downloads.

## Official Model Matrix

| Area | Required behavior | Named parts / metadata |
|---|---|---|
| Asset | Local copied glTF/bin/license, no runtime external fetch | `/models/lego_construction_worker/scene.gltf` |
| Attribution | CC-BY license is retained | `public/models/lego_construction_worker/license.txt` |
| Runtime mount | Official model loads under player root | `officialWorkerModelMount`, `officialWorkerGltfModel` |
| Fallback | Procedural model visible before load and hidden after load | `playerProceduralFallback` |
| Scale/position | Loaded model bounds centered near player origin and height about 1.95 | `officialModelBounds` debug metadata |
| Gameplay | Existing player root movement/camera still drives the model | `playerRoot` remains the sync target |

## Acceptance

- `npm test -- src/game/world.test.ts` first fails after official glTF integration assertions are added.
- `npm test -- src/game/world.test.ts` passes after implementation.
- `npm test` passes all unit tests.
- `npm run build` exits 0.
- `npm run e2e` exits 0.
- Screenshot QA must confirm:
  - fallback disappears after glTF load;
  - the visible player is the downloaded construction worker model;
  - the model is centered near the player origin and visible in over-shoulder camera;
  - no failed glTF/bin network requests appear.

## Steps

1. TDD Red: add tests in `src/game/world.test.ts` for official model path, mount, and fallback separation.
2. Run `npm test -- src/game/world.test.ts`; expected failure is missing glTF metadata and mount.
3. TDD Green:
   - copy `scene.gltf`, `scene.bin`, and `license.txt` into `public/models/lego_construction_worker`;
   - convert deprecated required spec-gloss extension to core PBR fields in the local glTF copy;
   - add `src/game/officialWorkerModel.ts` using `GLTFLoader`;
   - normalize the model bounds to player origin and height;
   - hide fallback only after model load succeeds.
4. Run `npm test -- src/game/world.test.ts`; expected exit 0.
5. Run `npm test`, `npm run build`, `npm run e2e`.
6. Capture screenshot and compare against official reference checklist.
7. Update `docs/plan/v3-index.md` Review Log and Difference List.

## Risks

- GLTFLoader may not support the downloaded spec-gloss extension. Mitigation: local glTF copy is converted to core PBR material fields.
- Model may load off-origin because of nested Sketchfab transforms. Mitigation: normalize with final `Box3` bounds and expose `officialModelBounds`.
- The downloaded model is CC-BY. Mitigation: keep `license.txt` in public assets and mention attribution in docs.
