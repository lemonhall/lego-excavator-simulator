# v1 Game Slice Plan

## Goal

Implement the approved v1 LEGO-style excavator farm game slice.

## PRD Trace

- REQ-0001-001
- REQ-0001-002
- REQ-0001-003
- REQ-0001-004

## Scope

Build a Vite + TypeScript + Three.js browser game with pure state tests and Playwright E2E verification. Do not implement real digging, multiplayer, persistence, missions, remote art packs, or mobile touch controls.

## Acceptance

- `npm test` exits 0 and covers game state plus world metadata.
- `npm run build` exits 0.
- `npm run e2e` exits 0 and verifies canvas rendering plus enter/exit flow.
- Review log records no unresolved BLOCKER and no unassigned MAJOR.

## Files

- Create: `package.json`
- Create: `index.html`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `playwright.config.ts`
- Create: `src/main.ts`
- Create: `src/style.css`
- Create: `src/game/state.ts`
- Create: `src/game/state.test.ts`
- Create: `src/game/world.ts`
- Create: `src/game/world.test.ts`
- Create: `src/game/input.ts`
- Create: `src/game/app.ts`
- Create: `tests/e2e/game.spec.ts`

## Steps

1. Write failing unit tests for deterministic state and world metadata.
2. Run `npm test` and confirm failures caused by missing source files.
3. Implement minimal state, world, app, input, and styles.
4. Run `npm test` and confirm pass.
5. Run `npm run build` and confirm pass.
6. Write Playwright E2E test for canvas rendering and enter/exit flow.
7. Run `npm run e2e` and confirm pass.
8. Perform Review Loop and update `docs/plan/v1-index.md`.
9. Commit and push if remote is configured.

## Risks

- WebGL may render differently in headless mode. Mitigation: use simple geometry, lights, and pixel sampling with tolerance.
- Keyboard path to reach the excavator can be flaky. Mitigation: start player within a predictable distance and support deterministic E key interaction.
- Three.js code can become hard to test. Mitigation: pure state in `state.ts`, render object names in `world.ts`.
