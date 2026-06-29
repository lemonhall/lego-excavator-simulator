# Procedural LEGO Visual System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the scene from generic block art into a LEGO-like procedural part system.

**Architecture:** `src/game/legoParts.ts` owns reusable part factories and materials. `src/game/world.ts` composes those parts into the farm, player, and excavator while keeping existing state and camera contracts stable. Tests assert metadata and visual structure instead of relying only on screenshots.

**Tech Stack:** TypeScript, Three.js, Vitest, Playwright.

---

## Task 1: Brick Factory Red-Green

**Files:**
- Create: `src/game/legoParts.test.ts`
- Create: `src/game/legoParts.ts`

- [ ] Write tests for `createBrickPart`, `createPlatePart`, `createWheelPart`, and `createLegoPlasticMaterial`.
- [ ] Run `npm test -- src/game/legoParts.test.ts`; expected failure is missing `legoParts.ts`.
- [ ] Implement rounded body geometry, stud creation, wheel creation, and metadata.
- [ ] Run `npm test -- src/game/legoParts.test.ts`; expected pass.

## Task 2: World Part-System Red-Green

**Files:**
- Modify: `src/game/world.test.ts`
- Modify: `src/game/world.ts`

- [ ] Add world tests for total procedural LEGO part count, visible stud count, PBR environment, and excavator descendant count.
- [ ] Run `npm test -- src/game/world.test.ts`; expected failure is insufficient part metadata/counts.
- [ ] Rebuild the excavator and farm decoration using `legoParts.ts`.
- [ ] Run `npm test -- src/game/world.test.ts`; expected pass.

## Task 3: Integration Verification

**Files:**
- Modify: `docs/plan/v2-index.md`

- [ ] Run `npm test`; expected pass.
- [ ] Run `npm run build`; expected pass.
- [ ] Run `npm run e2e`; expected pass.
- [ ] Capture desktop on-foot and cab-view screenshots.
- [ ] Update v2 review records with command evidence and residual risks.
