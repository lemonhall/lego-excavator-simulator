import { describe, expect, it } from "vitest";
import { Mesh, BoxGeometry, MeshStandardMaterial, Vector3 } from "three";
import {
  applyDetachedCommunityFallbackPose,
  applyCommunityColorVariant,
  animateCommunityVehicleWheels,
  computeCommunityArenaPopulation,
  computeCommunityModelPlacement,
  computeDefaultCommunitySpawnDelay,
  shouldRefreshDebugState,
  computeCommunityVehiclePatrolDelta,
  computeCommunityVehicleDriveDelta,
  computeWeaponFireDirection,
  DEFAULT_COMMUNITY_TARGET_COUNT,
  isDrivableCommunityModel,
  shouldCastCommunityModelShadow,
  shouldCollectShooterTargets,
  shouldResetCommunityModelParts,
  shouldShowIntactCommunityModelEdges,
  shouldUseCommunityRenderProxy,
  shouldUpdateCommunityModelEdgeVisibility,
  shouldRegisterCommunityModelPhysics,
  selectSpawnableCommunityModels
} from "./app";
import type { CommunityModelCatalog, CommunityModelManifestEntry } from "./communityModels";
import type { GameInput } from "./state";

const idleInput = (): GameInput => ({
  forward: false,
  backward: false,
  left: false,
  right: false,
  jump: false,
  interact: false,
  boomUp: false,
  boomDown: false,
  upperLeft: false,
  upperRight: false,
  stickIn: false,
  stickOut: false,
  bucketCurl: false,
  bucketDump: false,
  toggleModelBrowser: false,
  fire: false,
  lookDeltaX: 0,
  lookDeltaY: 0
});

describe("community model placement", () => {
  it("REQ-0005-003 spaces the first three spawned models far enough apart", () => {
    const placements = [0, 1, 2].map((index) => computeCommunityModelPlacement(index));

    for (let a = 0; a < placements.length; a += 1) {
      for (let b = a + 1; b < placements.length; b += 1) {
        const dx = placements[a].x - placements[b].x;
        const dz = placements[a].z - placements[b].z;
        expect(Math.hypot(dx, dz)).toBeGreaterThanOrEqual(6.8);
      }
    }
  });

  it("REQ-0006-001 spaces default shooter targets across a larger arena", () => {
    const placements = [0, 1, 2].map((index) => computeCommunityModelPlacement(index));

    for (let a = 0; a < placements.length; a += 1) {
      for (let b = a + 1; b < placements.length; b += 1) {
        const dx = placements[a].x - placements[b].x;
        const dz = placements[a].z - placements[b].z;
        expect(Math.hypot(dx, dz)).toBeGreaterThanOrEqual(30);
      }
    }
  });

  it("REQ-0007-003 creates a stable default LDraw arena population with safe spacing", () => {
    const population = computeCommunityArenaPopulation(DEFAULT_COMMUNITY_TARGET_COUNT);

    expect(DEFAULT_COMMUNITY_TARGET_COUNT).toBeGreaterThanOrEqual(27);
    expect(population).toHaveLength(DEFAULT_COMMUNITY_TARGET_COUNT);
    for (let a = 0; a < population.length; a += 1) {
      for (let b = a + 1; b < population.length; b += 1) {
        const dx = population[a].x - population[b].x;
        const dz = population[a].z - population[b].z;
        expect(Math.hypot(dx, dz)).toBeGreaterThanOrEqual(28);
      }
    }
  });

  it("REQ-0007-003 staggers the larger default spawn wave to protect startup input", () => {
    expect(computeDefaultCommunitySpawnDelay(0)).toBeGreaterThanOrEqual(1200);
    expect(computeDefaultCommunitySpawnDelay(26) - computeDefaultCommunitySpawnDelay(0)).toBeGreaterThanOrEqual(2000);
  });

  it("REQ-0007-006 only registers community brick physics after a target detaches", () => {
    expect(shouldRegisterCommunityModelPhysics({ status: "intact" })).toBe(false);
    expect(shouldRegisterCommunityModelPhysics({ status: "detached" })).toBe(true);
  });

  it("REQ-0007-006 throttles expensive community debug traversal", () => {
    expect(shouldRefreshDebugState(0, -1)).toBe(true);
    expect(shouldRefreshDebugState(1.1, 1)).toBe(false);
    expect(shouldRefreshDebugState(1.26, 1)).toBe(true);
  });

  it("REQ-0007-006 skips redundant intact community part and edge work", () => {
    expect(shouldResetCommunityModelParts("intact")).toBe(false);
    expect(shouldResetCommunityModelParts("detached")).toBe(true);
    expect(shouldCastCommunityModelShadow()).toBe(false);
    expect(shouldShowIntactCommunityModelEdges()).toBe(false);
    expect(shouldUseCommunityRenderProxy("intact", false)).toBe(true);
    expect(shouldUseCommunityRenderProxy("intact", true)).toBe(false);
    expect(shouldUseCommunityRenderProxy("detached", false)).toBe(false);
    expect(shouldUpdateCommunityModelEdgeVisibility(true, true)).toBe(false);
    expect(shouldUpdateCommunityModelEdgeVisibility(true, false)).toBe(true);
  });

  it("REQ-0007-007 only collects shooter targets while firing or projectiles are active", () => {
    expect(shouldCollectShooterTargets(false, 0)).toBe(false);
    expect(shouldCollectShooterTargets(true, 0)).toBe(true);
    expect(shouldCollectShooterTargets(false, 1)).toBe(true);
  });

  it("REQ-0007-003 only exposes radar trucks as spawnable community targets", () => {
    const catalog = {
      schemaVersion: 2,
      models: [
        { id: "mini-construction", category: "Vehicle" },
        { id: "lighthouse", category: "Building" },
        { id: "radar-truck", category: "Vehicle" }
      ]
    } as CommunityModelCatalog;

    expect(selectSpawnableCommunityModels(catalog).map((model) => model.id)).toEqual(["radar-truck"]);
  });

  it("REQ-0007-003 applies deterministic color variants to repeated radar trucks", () => {
    const first = new Mesh(new BoxGeometry(1, 1, 1), new MeshStandardMaterial({ color: "#38bdf8" }));
    const second = new Mesh(new BoxGeometry(1, 1, 1), new MeshStandardMaterial({ color: "#38bdf8" }));

    applyCommunityColorVariant(first, 0);
    applyCommunityColorVariant(second, 1);

    expect((first.material as MeshStandardMaterial).color.getHexString()).not.toBe(
      (second.material as MeshStandardMaterial).color.getHexString()
    );
    expect(first.userData.colorVariantIndex).toBe(0);
    expect(second.userData.colorVariantIndex).toBe(1);
  });

  it("REQ-0007-002 uses camera direction directly without assisted aiming", () => {
    const cameraDirection = new Vector3(0.2, 0, -1).normalize();

    const fireDirection = computeWeaponFireDirection(cameraDirection);

    expect(fireDirection.distanceTo(cameraDirection)).toBeLessThan(0.00001);
  });

  it("REQ-0005-004 keeps fallback detached community part poses stable across frames", () => {
    const part = new Mesh(new BoxGeometry(1, 1, 1), new MeshStandardMaterial());
    part.name = "communityFallbackPart";
    part.userData.basePosition = new Vector3(1, 0, 2);

    applyDetachedCommunityFallbackPose(part);
    const firstPosition = part.position.clone();
    const firstRotationX = part.rotation.x;

    part.position.set(10, 10, 10);
    part.rotation.x = 3;
    applyDetachedCommunityFallbackPose(part);

    expect(part.position.toArray()).toEqual(firstPosition.toArray());
    expect(part.rotation.x).toBe(firstRotationX);
  });

  it("REQ-0007-001 drives community vehicles along the FPS camera yaw", () => {
    const delta = computeCommunityVehicleDriveDelta({ ...idleInput(), forward: true }, Math.PI / 2, 1);

    expect(delta.x).toBeGreaterThan(2);
    expect(Math.abs(delta.z)).toBeLessThan(0.01);
    expect(delta.heading).toBeCloseTo(Math.PI / 2, 5);
  });

  it("REQ-0007-001 treats only community vehicle catalog entries as drivable", () => {
    const model = {
      category: "Vehicle"
    } as CommunityModelManifestEntry;
    const building = {
      category: "Building"
    } as CommunityModelManifestEntry;

    expect(isDrivableCommunityModel(model)).toBe(true);
    expect(isDrivableCommunityModel(building)).toBe(false);
  });

  it("REQ-0007-002 spins marked community vehicle wheels only while driving", () => {
    const wheel = new Mesh(new BoxGeometry(1, 1, 1), new MeshStandardMaterial());
    wheel.userData.communityModelWheel = true;
    wheel.userData.communityWheelAxis = "x";
    const nonWheel = new Mesh(new BoxGeometry(1, 1, 1), new MeshStandardMaterial());
    const instance = {
      parts: [wheel, nonWheel]
    };

    animateCommunityVehicleWheels(instance, 1.2);

    expect(wheel.rotation.x).not.toBe(0);
    expect(nonWheel.rotation.x).toBe(0);
    const firstRotation = wheel.rotation.x;

    wheel.rotation.x = 0;
    animateCommunityVehicleWheels(instance, 0);

    expect(wheel.rotation.x).toBe(firstRotation);
  });

  it("REQ-0007-002 spins community vehicle wheels around their detected axle axis", () => {
    const wheel = new Mesh(new BoxGeometry(1, 1, 1), new MeshStandardMaterial());
    wheel.userData.communityModelWheel = true;
    wheel.userData.communityWheelAxis = "z";
    const instance = {
      parts: [wheel]
    };

    animateCommunityVehicleWheels(instance, 1);

    expect(wheel.rotation.z).not.toBe(0);
    expect(wheel.rotation.x).toBe(0);
    expect(wheel.rotation.y).toBe(0);
  });

  it("REQ-0007-005 computes patrol movement for idle community vehicles", () => {
    const delta = computeCommunityVehiclePatrolDelta(2, 0, 1);

    expect(Math.hypot(delta.x, delta.z)).toBeGreaterThan(0.5);
    expect(delta.heading).not.toBe(0);
    expect(delta.travelDistance).toBeGreaterThan(0.5);
  });
});
