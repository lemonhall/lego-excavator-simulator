import { describe, expect, it } from "vitest";
import { Mesh, BoxGeometry, MeshStandardMaterial, Vector3 } from "three";
import {
  applyDetachedCommunityFallbackPose,
  animateCommunityVehicleWheels,
  computeCommunityArenaPopulation,
  computeCommunityModelPlacement,
  computeCommunityVehiclePatrolDelta,
  computeCommunityVehicleDriveDelta,
  isDrivableCommunityModel
} from "./app";
import type { CommunityModelManifestEntry } from "./communityModels";
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
    const population = computeCommunityArenaPopulation(9);

    expect(population).toHaveLength(9);
    for (let a = 0; a < population.length; a += 1) {
      for (let b = a + 1; b < population.length; b += 1) {
        const dx = population[a].x - population[b].x;
        const dz = population[a].z - population[b].z;
        expect(Math.hypot(dx, dz)).toBeGreaterThanOrEqual(12);
      }
    }
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
