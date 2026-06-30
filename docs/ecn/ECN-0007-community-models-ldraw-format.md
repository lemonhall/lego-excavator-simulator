# ECN-0007: v7 community models must be brick-level LDraw assets

## Basic Info

- **ECN ID**: ECN-0007
- **Related PRD**: PRD-0005
- **Related Req ID**: REQ-0005-001, REQ-0005-003, REQ-0005-005
- **Discovered In**: v7-community-model-browser plan correction
- **Date**: 2026-06-30

## Reason

The previous v7 wording allowed hand-authored procedural brick JSON to pass as "community models". That does not match the user requirement. The accepted model format must be a LEGO community brick-level format with explicit part references, such as packed LDraw `.mpd` / `.ldr`.

## Change

### Old Design

The manifest could contain local procedural LEGO `parts` arrays. The first attempted implementation used project-authored sample models.

### New Design

The manifest must reference real `.ldr` or `.mpd` LDraw assets, with `format: "ldraw"`, `sourceKind`, `sourceUrl`, `license`, and `attribution`. A model is accepted only if the file is a brick-level LDraw text asset containing type-1 part references and embedded or resolvable `.dat` part data.

## Impact

- Affects PRD-0005 REQ-0005-001, REQ-0005-003, REQ-0005-005.
- Affects `docs/plan/v7-index.md` and `docs/plan/v7-community-model-browser.md`.
- Affects `src/game/communityModels.ts` and `src/game/communityModels.test.ts`.

## Disposition

- [x] PRD updated.
- [x] v7 plan updated.
- [x] Tests updated to reject authored procedural samples.
