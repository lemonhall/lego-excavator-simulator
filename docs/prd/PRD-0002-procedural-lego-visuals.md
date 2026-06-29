# PRD-0002: Procedural LEGO Visual System

## Vision

Upgrade the game from generic block art to a recognizable LEGO-like toy scene using procedural brick parts, rounded edges, stud grids, PBR plastic materials, and environment lighting. The player should read the excavator as a built toy made from parts, not as a set of plain cubes.

## Requirements

### REQ-0002-001: Reusable Brick Part System

- Motivation: LEGO likeness depends on repeated part language, not arbitrary boxes.
- Scope: Provide reusable factory functions for bricks, plates, slopes, wheels, studs, and grouped part metadata.
- Non-goals: No full LDraw import pipeline in v2.
- Acceptance:
  - Unit tests prove `createBrickPart()` creates rounded body geometry plus correct stud count.
  - Unit tests prove parts expose `partKind`, `materialKind`, and stud metadata for scene QA.
  - Unit tests prove wheels use cylindrical tire geometry and axle metadata.

### REQ-0002-002: PBR Plastic And Environment Lighting

- Motivation: Plastic needs clearcoat, highlight response, and environment reflection.
- Scope: Replace simple standard materials with shared plastic materials using `MeshPhysicalMaterial`, clearcoat, low roughness, and generated environment reflections.
- Non-goals: No downloaded HDR files or external texture assets.
- Acceptance:
  - Unit tests prove plastic materials are `MeshPhysicalMaterial` with clearcoat greater than 0.45.
  - World scene exposes `environment` and named light rig objects.
  - E2E screenshot remains nonblank after lighting change.

### REQ-0002-003: Excavator Built From LEGO-Like Parts

- Motivation: The core vehicle must look like an assembled toy.
- Scope: Rebuild excavator using brick parts, plate layers, cab window panels, wheels/treads, boom plates, bucket, and visible studs.
- Non-goals: No exact licensed LEGO set reproduction.
- Acceptance:
  - World tests prove excavator contains at least 32 descendants tagged `partSystem = "procedural-lego"`.
  - World tests prove named `excavatorBoom`, `excavatorBucket`, `excavatorCab`, and `driverCameraAnchor` remain available.
  - Existing driving, boom, and cab camera E2E tests continue passing.

### REQ-0002-004: Farm Scene Uses LEGO Part Language

- Motivation: The whole scene should share a toy construction language.
- Scope: Rebuild barn roof, fence, loose studs, crop rows, and path details with procedural parts and rounded/plate geometry.
- Non-goals: No mission gameplay or terrain deformation.
- Acceptance:
  - World tests prove at least 70 total objects tagged `partSystem = "procedural-lego"`.
  - World tests prove at least 40 visible studs in the scene.
  - Existing canvas render E2E tests continue passing.
