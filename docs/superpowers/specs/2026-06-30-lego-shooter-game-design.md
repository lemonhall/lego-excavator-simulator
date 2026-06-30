# LEGO Shooter Game Design

## Context

The game is evolving from a farm excavator sandbox into a LEGO shooter sandbox. The core differentiator is that imported LDraw LEGO assemblies already break apart into convincing brick pieces. v8 should make that destruction loop playable with a minifigure-held gatling gun and a larger box arena.

## Player Fantasy

The player controls a LEGO construction worker minifigure with a gatling gun. Holding the left mouse button fires a dense stream of glowing projectiles through a large toy-box arena. Community LDraw models start in the scene as destructible targets. Sustained fire drains target health; when health reaches zero, the target enters the existing detached physics state and bursts into loose LEGO parts.

The intended feel is closer to a simple Contra-style mowing shooter than a simulation: high fire rate, visible muzzle flash, visible projectile streaks, hit flashes, and quick target destruction.

## Scope

v8 does:

- Add a gatling/minigun weapon to the player.
- Add continuous left-mouse firing while on foot.
- Add visible projectiles with TTL cleanup, muzzle flash, and hit feedback.
- Add target health for farm destructibles and community LDraw models.
- Trigger existing physical LEGO breakup when health reaches zero.
- Spawn the three existing community models automatically at startup.
- Expand the arena, bounds, fog/camera/light ranges, and model spacing by about 10x.
- Add debug state and E2E coverage for firing, health reduction, projectile cleanup, default targets, and breakup.

v8 does not:

- Add enemy AI, waves, pathfinding, or damage to the player.
- Add multiple weapons beyond gatling.
- Add online community search/download.
- Replace the existing excavator or vehicle gameplay.
- Make all LDraw meshes exact LEGO clutch-physics bodies.

## Asset Strategy

Preferred source is a traceable LEGO community model such as BrickLink Studio's "Minigun (Minifig Scale)" or "Minifig scale minigun". If a directly downloadable machine-readable model is not available during implementation, v8 may build a small local LDraw/brick assembly from the public part vocabulary, but it must record the BrickLink/Rebrickable inspiration source in documentation and manifest metadata. It must not be represented as an official LEGO asset.

## Architecture

- `input.ts`: add a `fire` boolean from primary mouse button state.
- `weapon.ts`: own projectile state, firing cadence, projectile motion, TTL cleanup, hit tests, and debug summaries.
- `world.ts`: expose a named weapon root and muzzle object mounted near the player right hand.
- `state.ts`: expand world bounds and add target health semantics where state already owns destructible status.
- `app.ts`: wire input, camera direction, player muzzle transform, projectile visuals, target damage, and existing detached physics transitions.
- `communityModels.ts`: keep model loading and instance metadata; app-level shooter logic can assign runtime health to instances.
- `tests`: unit tests for projectile cadence/TTL/hit math; E2E for default spawn and the shooting-destruction loop.

## Data Flow

Each tick:

1. Input captures `fire`.
2. App asks weapon system to emit projectiles from the player muzzle along the camera aim direction.
3. Weapon system advances projectiles and reports hit events against target hit spheres/boxes.
4. App applies damage to destructible or community model health.
5. Health reaching zero switches the target to the existing detached state and applies impulses through the existing physics path.
6. Debug exposes projectile count, shots fired, hit count, target health, detached count, and default community model count.

## Testing

- Unit tests verify fire cadence, projectile TTL cleanup, and hit detection.
- Existing state/world tests verify larger bounds and stable named weapon nodes.
- E2E verifies startup has three community models without pressing `B`.
- E2E holds the mouse button long enough to create projectiles, reduce target health, detach a target, and then observe projectile cleanup.

## Open Risk

The exact imported gatling model availability depends on third-party download behavior. The fallback is a traceable local brick-built minigun assembly, explicitly documented as inspired by community models rather than downloaded from them.
