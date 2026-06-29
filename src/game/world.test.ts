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

  it("REQ-0002-004 gives the player a readable face and minifigure torso", () => {
    const world = createFarmWorld();
    const torso = world.playerRoot.getObjectByName("playerTorso");

    expect(world.playerRoot.getObjectByName("playerFace")).toBeDefined();
    expect(world.playerRoot.getObjectByName("playerLeftEye")).toBeDefined();
    expect(world.playerRoot.getObjectByName("playerRightEye")).toBeDefined();
    expect(world.playerRoot.getObjectByName("playerMouth")).toBeDefined();
    expect(world.playerRoot.getObjectByName("playerChestPanel")).toBeDefined();
    expect(torso?.userData.bodyShape).toBe("minifigureTorso");
  });

  it("REQ-0002-004 styles the player as a construction worker minifigure", () => {
    const world = createFarmWorld();

    expect(world.playerRoot.getObjectByName("playerHardHat")).toBeDefined();
    expect(world.playerRoot.getObjectByName("playerSafetyVest")).toBeDefined();
    expect(world.playerRoot.getObjectByName("playerLeftSleeve")?.userData.colorRole).toBe("blueSleeve");
    expect(world.playerRoot.getObjectByName("playerRightSleeve")?.userData.colorRole).toBe("blueSleeve");
    expect(world.playerRoot.getObjectByName("playerLeftHand")?.userData.colorRole).toBe("yellowHand");
    expect(world.playerRoot.getObjectByName("playerRightHand")?.userData.colorRole).toBe("yellowHand");
    expect(world.playerRoot.getObjectByName("playerLeftLegBlock")?.userData.colorRole).toBe("orangePants");
    expect(world.playerRoot.getObjectByName("playerRightLegBlock")?.userData.colorRole).toBe("orangePants");
  });

  it("REQ-0002-004 includes official construction minifigure print details", () => {
    const world = createFarmWorld();

    expect(world.playerRoot.getObjectByName("playerHardHatFrontBrim")).toBeDefined();
    expect(world.playerRoot.getObjectByName("playerHardHatCenterRib")).toBeDefined();
    expect(world.playerRoot.getObjectByName("playerHardHatLeftRib")).toBeDefined();
    expect(world.playerRoot.getObjectByName("playerHardHatRightRib")).toBeDefined();
    expect(world.playerRoot.getObjectByName("playerSmile")).toBeDefined();
    expect(world.playerRoot.getObjectByName("playerSmileTeeth")).toBeDefined();
    expect(world.playerRoot.getObjectByName("playerLeftVestStripe")).toBeDefined();
    expect(world.playerRoot.getObjectByName("playerRightVestStripe")).toBeDefined();
    expect(world.playerRoot.getObjectByName("playerVestZipper")).toBeDefined();
    expect(world.playerRoot.getObjectByName("playerLeftLegReflector")).toBeDefined();
    expect(world.playerRoot.getObjectByName("playerRightLegBadge")).toBeDefined();
  });

  it("REQ-0002-004 uses claw hands and tapered minifigure proportions", () => {
    const world = createFarmWorld();

    expect(world.playerRoot.getObjectByName("playerLeftClawHand")?.userData.handShape).toBe("minifigureClaw");
    expect(world.playerRoot.getObjectByName("playerRightClawHand")?.userData.handShape).toBe("minifigureClaw");
    expect(world.playerRoot.getObjectByName("playerTorso")?.userData.taperedShape).toBe("trapezoidPrint");
    expect(world.playerRoot.getObjectByName("playerLeftLegFootCavity")).toBeDefined();
    expect(world.playerRoot.getObjectByName("playerRightLegFootCavity")).toBeDefined();
  });

  it("REQ-0002-004 marks the player as a v3 official-worker minifigure", () => {
    const world = createFarmWorld();
    const torso = world.playerRoot.getObjectByName("playerTorso");

    expect(world.playerRoot.userData.minifigureVersion).toBe("official-gltf-v4");
    expect(world.playerRoot.userData.officialModelPath).toBe("/models/lego_construction_worker/scene.gltf");
    expect(world.playerRoot.getObjectByName("officialWorkerModelMount")).toBeDefined();
    expect(world.playerRoot.getObjectByName("playerProceduralFallback")?.visible).toBe(true);
    expect(world.playerRoot.getObjectByName("playerHead")?.userData.headShape).toBe("cylinder");
    expect(world.playerRoot.getObjectByName("playerHardHat")?.userData.helmetFit).toBe("seated");
    expect(world.playerRoot.getObjectByName("playerFaceDecal")?.userData.faceStyle).toBe("officialWorkerSmile");
    expect(world.playerRoot.getObjectByName("playerTorsoDecal")?.userData.decalStyle).toBe("officialWorkerVest");
    expect(torso?.userData.shoulderWidth).toBeGreaterThan(torso?.userData.waistWidth);
  });

  it("REQ-0002-004 decomposes official worker reference parts into decals and molded details", () => {
    const world = createFarmWorld();

    expect(world.playerRoot.getObjectByName("playerLeftHairPatch")).toBeDefined();
    expect(world.playerRoot.getObjectByName("playerRightHairPatch")).toBeDefined();
    expect(world.playerRoot.getObjectByName("playerLeftLegDecal")).toBeDefined();
    expect(world.playerRoot.getObjectByName("playerRightLegDecal")).toBeDefined();
    expect(world.playerRoot.getObjectByName("playerTorsoDecal")?.userData.printSurface).toBe("flatDecal");
    expect(world.playerRoot.getObjectByName("playerFaceDecal")?.userData.printSurface).toBe("flatDecal");
    expect(world.playerRoot.getObjectByName("playerLeftSleeve")?.userData.limbShape).toBe("roundedSleeve");
    expect(world.playerRoot.getObjectByName("playerRightSleeve")?.userData.limbShape).toBe("roundedSleeve");
  });

  it("REQ-0002-004 keeps the helmet above the eyes and avoids visible yellow face patches", () => {
    const world = createFarmWorld();
    const brim = world.playerRoot.getObjectByName("playerHardHatBrim");
    const leftEye = world.playerRoot.getObjectByName("playerLeftEye");
    const faceDecal = world.playerRoot.getObjectByName("playerFaceDecal");

    expect(brim?.position.y).toBeGreaterThan(-0.035);
    expect(leftEye?.position.y).toBeGreaterThan(0.03);
    expect(faceDecal?.visible).toBe(false);
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
    expect(world.excavatorRoot.getObjectByName("excavatorBucket")).toBeDefined();
    expect(world.excavatorRoot.getObjectByName("excavatorCab")).toBeDefined();
  });

  it("REQ-0002-004 uses procedural LEGO parts across the full farm scene", () => {
    const world = createFarmWorld();
    const proceduralParts: string[] = [];

    world.scene.traverse((object) => {
      if (object.userData.partSystem === "procedural-lego") {
        proceduralParts.push(object.name);
      }
    });

    expect(proceduralParts.length).toBeGreaterThanOrEqual(70);
    expect(countLegoStuds(world.scene)).toBeGreaterThanOrEqual(40);
  });
});
