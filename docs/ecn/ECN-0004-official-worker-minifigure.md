# ECN-0004: Official Worker Minifigure Rebuild

## Basic Info

- ECN ID: ECN-0004
- Related PRD: PRD-0002
- Related Req IDs: REQ-0002-004
- Discovered in: v2 player screenshot review, second user review
- Date: 2026-06-29

## Change Reason

The v2/v3-in-progress player still reads as an abstract block figure. The hard hat floats and has a toy-brick stack silhouette, the face is too rigid, the torso print is either missing or made from protruding blocks, and the arms/hands/legs do not match official LEGO minifigure part language.

The fix must stop adding color markers to the old block model. The player must be rebuilt from explicit minifigure parts and printed surfaces.

## Official Reference Breakdown

- Head: yellow short cylinder, readable front face, large black dot eyes, open smiling mouth with white teeth and dark mouth.
- Helmet: red construction hard hat seated on the head, continuous brim, rounded dome, raised vertical ribs, optional brown side hair/ear pieces.
- Torso: orange trapezoid torso shell, wider shoulders than waist, blue shirt/collar print, white safety vest print, black zipper, pockets, belt blocks.
- Arms: blue rounded sleeves attached at shoulders, yellow C-claw hands, hands rotated forward/down like a LEGO minifigure.
- Hips and legs: orange hip block, two separate orange legs, front white reflector on one leg, black badge/print on the other, foot blocks with forward toe shape.
- Rendering: glossy plastic material remains; printed details should be flat decals/texture planes, not thick raised bricks.

## New Design

- Add a `playerMinifigureV3` root metadata marker.
- Replace the torso with a dedicated official-worker torso group using a trapezoid body and flat printed front decal.
- Replace the face and torso detail geometry with canvas-based decal textures where that gives a closer official minifigure look.
- Rebuild the hard hat as a seated helmet: brim and dome must be attached around the head, with named ribs.
- Keep animation handles stable: `playerLeftArm`, `playerRightArm`, `playerLeftLeg`, `playerRightLeg`.
- Keep previous gameplay, walking, camera, excavator, and farm behavior unchanged.

## Impact Scope

- Affected Req IDs: REQ-0002-004
- Affected plan: `docs/plan/v3-index.md`, `docs/plan/v3-official-worker-minifigure.md`
- Affected tests: `src/game/world.test.ts`
- Affected code: `src/game/world.ts`

## Disposition

- [ ] PRD updated
- [ ] v3 plan written
- [ ] Tests updated with red phase evidence
- [ ] Implementation updated
- [ ] Screenshot QA reviewed against official worker reference
