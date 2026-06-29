import { BoxGeometry, Group, Mesh, MeshPhysicalMaterial, MeshStandardMaterial } from "three";
import { describe, expect, it } from "vitest";
import { normalizeOfficialWorkerModel } from "./officialWorkerModel";

describe("official worker model normalization", () => {
  it("creates shoulder and hip pivot animation targets with dependent hand parts attached", () => {
    const source = createWorkerPartTree();

    const model = normalizeOfficialWorkerModel(source);

    const leftArm = model.getObjectByName("playerLeftArm");
    const rightArm = model.getObjectByName("playerRightArm");
    const leftLeg = model.getObjectByName("playerLeftLeg");
    const rightLeg = model.getObjectByName("playerRightLeg");

    expect(leftArm?.userData.animationPivot).toBe("shoulder");
    expect(rightArm?.userData.animationPivot).toBe("shoulder");
    expect(leftLeg?.userData.animationPivot).toBe("hip");
    expect(rightLeg?.userData.animationPivot).toBe("hip");
    expect(leftArm?.getObjectByName("playerLeftHand")).toBeDefined();
    expect(rightArm?.getObjectByName("playerRightHand")).toBeDefined();
    expect(model.getObjectByName("3818_dot_dat")).toBeUndefined();
    expect(model.getObjectByName("3819_dot_dat")).toBeUndefined();
    expect(model.getObjectByName("3820_dot_dat")).toBeUndefined();
  });

  it("converts imported meshes to scene-matching LEGO physical plastic", () => {
    const source = createWorkerPartTree();

    const model = normalizeOfficialWorkerModel(source);
    const importedMesh = model.getObjectByName("torsoMesh");

    expect(importedMesh).toBeInstanceOf(Mesh);
    expect((importedMesh as Mesh).material).toBeInstanceOf(MeshPhysicalMaterial);
    const material = (importedMesh as Mesh).material as MeshPhysicalMaterial;
    expect(material.userData.materialKind).toBe("legoPlastic");
    expect(material.clearcoat).toBeGreaterThanOrEqual(0.84);
    expect(material.clearcoatRoughness).toBeCloseTo(0.12);
    expect(material.roughness).toBeCloseTo(0.2);
    expect(material.envMapIntensity).toBeCloseTo(2.2);
  });

  it("assigns suffixed duplicate hand part names to both arm pivots", () => {
    const source = createWorkerPartTree();

    const model = normalizeOfficialWorkerModel(source);

    expect(model.getObjectByName("playerLeftArm")?.getObjectByName("playerLeftHand")).toBeDefined();
    expect(model.getObjectByName("playerRightArm")?.getObjectByName("playerRightHand")).toBeDefined();
    expect(countObjectsNamed(model, "playerLeftHand")).toBe(1);
    expect(countObjectsNamed(model, "playerRightHand")).toBe(1);
  });
});

function createWorkerPartTree(): Group {
  const root = new Group();
  root.name = "sourceRoot";

  root.add(createPart("973p8g_dot_dat", "torsoMesh", 0, 1.1, 0, 0.8, 0.7, 0.35));
  root.add(createPart("3818_dot_dat", "leftArmMesh", -0.54, 1.05, 0, 0.22, 0.62, 0.24));
  root.add(createPart("3819_dot_dat", "rightArmMesh", 0.54, 1.05, 0, 0.22, 0.62, 0.24));
  root.add(createPart("3816_dot_dat", "leftLegMesh", -0.18, 0.35, 0, 0.26, 0.7, 0.28));
  root.add(createPart("3817_dot_dat", "rightLegMesh", 0.18, 0.35, 0, 0.26, 0.7, 0.28));
  root.add(createPart("3820_dot_dat", "leftHandMesh", -0.62, 0.64, 0, 0.18, 0.18, 0.18));
  root.add(createPart("3820_dot_dat_1", "rightHandMesh", 0.62, 0.64, 0, 0.18, 0.18, 0.18));

  return root;
}

function countObjectsNamed(root: Group, name: string): number {
  let count = 0;
  root.traverse((object) => {
    if (object.name === name) {
      count += 1;
    }
  });
  return count;
}

function createPart(name: string, meshName: string, x: number, y: number, z: number, width: number, height: number, depth: number): Group {
  const part = new Group();
  part.name = name;
  part.position.set(x, y, z);

  const mesh = new Mesh(new BoxGeometry(width, height, depth), new MeshStandardMaterial({ color: "#f47b20" }));
  mesh.name = meshName;
  part.add(mesh);

  return part;
}
