import { MeshPhysicalMaterial } from "three";
import { describe, expect, it } from "vitest";
import {
  createBrickPart,
  createLegoPlasticMaterial,
  createPlatePart,
  createWheelPart,
  countLegoStuds
} from "./legoParts";

describe("procedural lego parts", () => {
  it("REQ-0002-001 creates a rounded brick body with the requested stud grid", () => {
    const brick = createBrickPart({
      name: "testBrick",
      color: "#ffd21f",
      studsX: 2,
      studsZ: 3,
      height: 0.72
    });

    expect(brick.name).toBe("testBrick");
    expect(brick.userData.partSystem).toBe("procedural-lego");
    expect(brick.userData.partKind).toBe("brick");
    expect(brick.userData.studsX).toBe(2);
    expect(brick.userData.studsZ).toBe(3);
    expect(countLegoStuds(brick)).toBe(6);
    expect(brick.getObjectByName("testBrick_body")?.userData.roundedEdges).toBe(true);
  });

  it("REQ-0002-001 creates a plate with lower height and visible studs", () => {
    const plate = createPlatePart({
      name: "testPlate",
      color: "#0057b8",
      studsX: 4,
      studsZ: 1
    });

    expect(plate.userData.partKind).toBe("plate");
    expect(plate.userData.height).toBeLessThan(0.35);
    expect(countLegoStuds(plate)).toBe(4);
  });

  it("REQ-0002-001 creates wheel parts with tire and axle metadata", () => {
    const wheel = createWheelPart("testWheel");

    expect(wheel.userData.partKind).toBe("wheel");
    expect(wheel.userData.hasAxle).toBe(true);
    expect(wheel.getObjectByName("testWheel_tire")).toBeDefined();
    expect(wheel.getObjectByName("testWheel_hub")).toBeDefined();
  });

  it("REQ-0002-002 creates clearcoat plastic material", () => {
    const material = createLegoPlasticMaterial("#b50018");

    expect(material).toBeInstanceOf(MeshPhysicalMaterial);
    expect(material.userData.materialKind).toBe("legoPlastic");
    expect(material.clearcoat).toBeGreaterThan(0.45);
    expect(material.roughness).toBeLessThan(0.38);
  });
});
