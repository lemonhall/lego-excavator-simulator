import { describe, expect, it } from "vitest";
import { countLegoStuds } from "./legoParts";
import { createFarmWorld } from "./world";

describe("farm world", () => {
  it("REQ-0001-001 creates required named scene objects", () => {
    const world = createFarmWorld();

    expect(world.scene.getObjectByName("ground")).toBeDefined();
    expect(world.scene.getObjectByName("barn")).toBeDefined();
    expect(world.scene.getObjectByName("player")).toBeDefined();
    expect(world.scene.getObjectByName("excavator")).toBeDefined();
    expect(world.scene.getObjectByName("excavatorBoom")).toBeDefined();
  });

  it("REQ-0001-001 creates at least six decorative farm objects", () => {
    const world = createFarmWorld();
    const farmObjects = world.scene.children.filter((child) => child.userData.farmDecor === true);

    expect(farmObjects.length).toBeGreaterThanOrEqual(6);
  });

  it("REQ-0001-001 exposes key mesh handles for runtime synchronization", () => {
    const world = createFarmWorld();

    expect(world.playerRoot.name).toBe("player");
    expect(world.excavatorRoot.name).toBe("excavator");
    expect(world.excavatorBoom.name).toBe("excavatorBoom");
  });

  it("REQ-0002-004 builds a minifigure-like player with animatable limbs", () => {
    const world = createFarmWorld();

    expect(world.playerRoot.getObjectByName("playerHead")).toBeDefined();
    expect(world.playerRoot.getObjectByName("playerTorso")).toBeDefined();
    expect(world.playerRoot.getObjectByName("playerLeftArm")).toBeDefined();
    expect(world.playerRoot.getObjectByName("playerRightArm")).toBeDefined();
    expect(world.playerRoot.getObjectByName("playerLeftLeg")).toBeDefined();
    expect(world.playerRoot.getObjectByName("playerRightLeg")).toBeDefined();
  });

  it("REQ-0001-001 tags enough glossy LEGO plastic pieces", () => {
    const world = createFarmWorld();
    const plasticPieces: string[] = [];

    world.scene.traverse((object) => {
      if (object.userData.materialKind === "legoPlastic") {
        plasticPieces.push(object.name);
      }
    });

    expect(plasticPieces.length).toBeGreaterThanOrEqual(24);
    expect(plasticPieces.some((name) => name.startsWith("excavatorCab_stud_"))).toBe(true);
    expect(plasticPieces.some((name) => name.startsWith("barnBase_stud_"))).toBe(true);
  });

  it("REQ-0001-001 exposes camera anchors for over-shoulder and driver views", () => {
    const world = createFarmWorld();

    expect(world.scene.getObjectByName("overShoulderCameraAnchor")).toBeDefined();
    expect(world.scene.getObjectByName("driverCameraAnchor")).toBeDefined();
  });

  it("REQ-0002-002 exposes PBR environment and named light rig", () => {
    const world = createFarmWorld();

    expect(world.scene.environment).toBeDefined();
    expect(world.scene.getObjectByName("plasticKeyLight")).toBeDefined();
    expect(world.scene.getObjectByName("plasticHighlightLight")).toBeDefined();
  });

  it("REQ-0002-003 rebuilds excavator from procedural LEGO parts", () => {
    const world = createFarmWorld();
    const excavatorParts: string[] = [];

    world.excavatorRoot.traverse((object) => {
      if (object.userData.partSystem === "procedural-lego") {
        excavatorParts.push(object.name);
      }
    });

    expect(excavatorParts.length).toBeGreaterThanOrEqual(32);
    expect(world.excavatorRoot.getObjectByName