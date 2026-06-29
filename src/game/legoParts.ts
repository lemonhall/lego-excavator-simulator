import {
  BufferGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshPhysicalMaterial,
  Object3D
} from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

export interface BrickPartOptions {
  name: string;
  color: string;
  studsX: number;
  studsZ: number;
  height?: number;
}

export const LEGO_UNIT = 0.42;
export const LEGO_STUD_RADIUS = 0.13;
export const LEGO_STUD_HEIGHT = 0.09;

export function createBrickPart(options: BrickPartOptions): Group {
  return createRectangularPart({
    ...options,
    partKind: "brick",
    height: options.height ?? 0.72
  });
}

export function createPlatePart(options: Omit<BrickPartOptions, "height">): Group {
  return createRectangularPart({
    ...options,
    partKind: "plate",
    height: 0.22
  });
}

export function createWheelPart(name: string, tireRadius = 0.34, width = 0.22): Group {
  const group = new Group();
  group.name = name;
  markPart(group, "wheel");
  group.userData.hasAxle = true;

  const tire = new Mesh(new CylinderGeometry(tireRadius, tireRadius, width, 32), createRubberMaterial());
  tire.name = `${name}_tire`;
  tire.rotation.z = Math.PI / 2;
  tire.castShadow = true;
  tire.receiveShadow = true;
  markPart(tire, "wheelTire");
  group.add(tire);

  const hub = new Mesh(new CylinderGeometry(tireRadius * 0.5, tireRadius * 0.5, width + 0.02, 24), createLegoPlasticMaterial("#cfd6dc"));
  hub.name = `${name}_hub`;
  hub.rotation.z = Math.PI / 2;
  hub.castShadow = true;
  hub.receiveShadow = true;
  markPart(hub, "wheelHub");
  group.add(hub);

  return group;
}

export function createLegoPlasticMaterial(color: string): MeshPhysicalMaterial {
  const material = new MeshPhysicalMaterial({
    color,
    roughness: 0.26,
    metalness: 0.02,
    clearcoat: 0.72,
    clearcoatRoughness: 0.18,
    envMapIntensity: 1.9
  });
  material.userData.materialKind = "legoPlastic";
  return material;
}

export function countLegoStuds(root: Object3D): number {
  let count = 0;
  root.traverse((object) => {
    if (object.userData.partKind === "stud") {
      count += 1;
    }
  });
  return count;
}

export function markPart(object: Object3D, partKind: string): void {
  object.userData.partSystem = "procedural-lego";
  object.userData.partKind = partKind;
}

function createRectangularPart(options: BrickPartOptions & { partKind: "brick" | "plate"; height: number }): Group {
  const group = new Group();
  group.name = options.name;
  group.userData.studsX = options.studsX;
  group.userData.studsZ = options.studsZ;
  group.userData.height = options.height;
  markPart(group, options.partKind);

  const width = options.studsX * LEGO_UNIT;
  const depth = options.studsZ * LEGO_UNIT;
  const material = createLegoPlasticMaterial(options.color);
  const body = new Mesh(createRoundedBox(width, options.height, depth), material);
  body.name = `${options.name}_body`;
  body.position.y = options.height / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  body.userData.roundedEdges = true;
  markPart(body, `${options.partKind}Body`);
  group.add(body);

  const startX = -width / 2 + LEGO_UNIT / 2;
  const startZ = -depth / 2 + LEGO_UNIT / 2;
  for (let x = 0; x < options.studsX; x += 1) {
    for (let z = 0; z < options.studsZ; z += 1) {
      const stud = createStud(`${options.name}_stud_${x}_${z}`, material);
      stud.position.set(startX + x * LEGO_UNIT, options.height + LEGO_STUD_HEIGHT / 2, startZ + z * LEGO_UNIT);
      group.add(stud);
    }
  }

  return group;
}

function createStud(name: string, material: MeshPhysicalMaterial): Mesh {
  const stud = new Mesh(new CylinderGeometry(LEGO_STUD_RADIUS, LEGO_STUD_RADIUS, LEGO_STUD_HEIGHT, 24), material);
  stud.name = name;
  stud.castShadow = true;
  stud.receiveShadow = true;
  markPart(stud, "stud");
  stud.userData.materialKind = "legoPlastic";
  return stud;
}

function createRoundedBox(width: number, height: number, depth: number): BufferGeometry {
  return new RoundedBoxGeometry(width, height, depth, 3, 0.055);
}

function createRubberMaterial(): MeshPhysicalMaterial {
  const material = new MeshPhysicalMaterial({
    color: "#121212",
    roughness: 0.52,
    metalness: 0.04,
    clearcoat: 0.18,
    clearcoatRoughness: 0.42
  });
  material.userData.materialKind = "rubber";
  return material;
}
