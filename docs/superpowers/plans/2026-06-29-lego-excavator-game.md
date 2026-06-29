# Lego Excavator Game Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build v1 of a playable LEGO-style third-person farm game with an enterable and drivable excavator.

**Architecture:** Pure gameplay state lives in `src/game/state.ts` and is tested without WebGL. Three.js object construction lives in `src/game/world.ts`. Browser wiring in `src/game/app.ts` reads keyboard input, advances state, updates meshes, camera, and HUD.

**Tech Stack:** Vite, TypeScript, Three.js, Vitest, Playwright with system Chrome.

---

## File Structure

- `package.json`: scripts and dependencies.
- `index.html`: app shell.
- `src/game/state.ts`: deterministic game state and update functions.
- `src/game/world.ts`: Three.js farm scene construction with named objects.
- `src/game/input.ts`: keyboard input snapshot.
- `src/game/app.ts`: renderer, camera, loop, HUD, and mesh synchronization.
- `src/main.ts`: browser entry.
- `src/style.css`: full viewport layout and HUD styling.
- `src/game/*.test.ts`: unit tests.
- `tests/e2e/game.spec.ts`: Playwright flow and rendering checks.

## Task 1: Scaffold Tooling

**Files:**
- Create: `package.json`
- Create: `index.html`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `playwright.config.ts`

- [ ] Create the package and config files with Vite, TypeScript, Vitest, Three.js, and Playwright.
- [ ] Run `npm install`.
- [ ] Run `npm test` and expect no test files or source imports yet.

## Task 2: Game State Red-Green

**Files:**
- Create: `src/game/state.test.ts`
- Create: `src/game/state.ts`

- [ ] Write tests for movement, jump, bounds, mount, drive, and boom clamp.
- [ ] Run `npm test -- src/game/state.test.ts` and expect missing module failure.
- [ ] Implement `createInitialGameState`, `updateGameState`, and helper constants.
- [ ] Run `npm test -- src/game/state.test.ts` and expect pass.

## Task 3: World Metadata Red-Green

**Files:**
- Create: `src/game/world.test.ts`
- Create: `src/game/world.ts`

- [ ] Write tests proving required named objects and decorative farm objects exist.
- [ ] Run `npm test -- src/game/world.test.ts` and expect missing module failure.
- [ ] Implement simple LEGO-style Three.js scene construction.
- [ ] Run `npm test -- src/game/world.test.ts` and expect pass.

## Task 4: Browser App

**Files:**
- Create: `src/game/input.ts`
- Create: `src/game/app.ts`
- Create: `src/main.ts`
- Create: `src/style.css`

- [ ] Wire keyboard input, renderer, camera follow, state update, mesh sync, and HUD.
- [ ] Run `npm test` and expect pass.
- [ ] Run `npm run build` and expect pass.

## Task 5: E2E Red-Green

**Files:**
- Create: `tests/e2e/game.spec.ts`

- [ ] Write Playwright tests for nonblank canvas, HUD mode, screenshots, and enter/exit flow.
- [ ] Run `npm run e2e` and fix only implementation issues that block the test.
- [ ] Run `npm test`, `npm run build`, and `npm run e2e` as final verification.

## Task 6: Tashan Review And Ship

**Files:**
- Modify: `docs/plan/v1-index.md`

- [ ] Record evidence and Review Loop findings.
- [ ] Ensure no unresolved BLOCKER and no unassigned MAJOR remain.
- [ ] Commit and push if a remote is configured.
