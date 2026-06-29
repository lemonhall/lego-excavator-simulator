import { Box3, Color, Group, Material, Mesh, MeshPhysicalMaterial, MeshStandardMaterial, Object3D, Vector3 } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import type { FarmWorld } from "./world";

export const OFFICIAL_WORKER_MODEL_PATH = "/models/lego_construction_worker/scene.gltf";

type LimbSide = "left" | "right";
type LimbKind = "arm" | "leg" | "hand";

interface ClassifiedPart {
  object: Object3D;
  side: LimbSide;
  kind: LimbKind;
}

export async function loadOfficialWorkerModel(world: FarmWorld): Promise<Group> {
  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync(OFFICIAL_WORKER_MODEL_PATH);
  const model = normalizeOfficialWorkerModel(gltf.scene);

  const mount = world.playerRoot.getObjectByName("officialWorkerModelMount");
  if (!(mount instanceof Group)) {
    throw new Error("officialWorkerModelMount missing from playerRoot");
  }

  mount.clear();
  mount.add(model);
  mount.visible = true;

  const fallback = world.playerRoot.getObjectByName("playerProceduralFallback");
  if (fallback) {
    fallback.visible = false;
  }

  world.playerRoot.userData.loadedOfficialWorkerModel = true;
  world.playerRoot.userData.officialModelBounds = model.userData.bounds;
  return model;
}

export function normalizeOfficialWorkerModel(source: Object3D): Group {
  const model = new Group();
  model.name = "officialWorkerGltfModel";
  model.userData.source = "sketchfab-uzzi47-cc-by-4";
  model.add(source);

  source.traverse((object) => {
    object.castShadow = true;
    if (object instanceof Mesh) {
      object.receiveShadow = false;
      object.material = Array.isArray(object.material)
        ? object.material.map((material) => createScenePlasticMaterial(material))
        : createScenePlasticMaterial(object.material);
    } else {
      object.receiveShadow = true;
    }
  });

  const bounds = new Box3().setFromObject(model);
  const size = new Vector3();
  bounds.getSize(size);

  const targetHeight = 1.95;
  const scale = targetHeight / Math.max(size.y, 1);
  source.scale.setScalar(scale);

  source.rotation.y = 0;

  const scaledBounds = new Box3().setFromObject(model);
  const scaledCenter = new Vector3();
  scaledBounds.getCenter(scaledCenter);
  source.position.x -= scaledCenter.x;
  source.position.z -= scaledCenter.z;
  source.position.y -= scaledBounds.min.y;

  const finalBounds = new Box3().setFromObject(model);
  const finalSize = new Vector3();
  const finalCenter = new Vector3();
  finalBounds.getSize(finalSize);
  finalBounds.getCenter(finalCenter);

  createOfficialWorkerPivotRig(model, source);

  model.userData.bounds = {
    min: finalBounds.min.toArray(),
    max: finalBounds.max.toArray(),
    size: finalSize.toArray(),
    center: finalCenter.toArray()
  };

  return model;
}

function createScenePlasticMaterial(material: Material): MeshPhysicalMaterial {
  const baseColor = getMaterialColor(material);
  const plastic = new MeshPhysicalMaterial({
    color: baseColor,
    roughness: 0.2,
    metalness: 0.02,
    clearcoat: 0.84,
    clearcoatRoughness: 0.12,
    envMapIntensity: 2.2,
    transparent: material.transparent,
    opacity: material.opacity,
    side: material.side,
    alphaTest: material.alphaTest,
    depthWrite: material.depthWrite,
    depthTest: material.depthTest,
    name: material.name
  });

  if (material instanceof MeshStandardMaterial) {
    plastic.map = material.map;
    plastic.normalMap = material.normalMap;
    plastic.roughnessMap = material.roughnessMap;
    plastic.metalnessMap = material.metalnessMap;
    plastic.emissiveMap = material.emissiveMap;
  }
  const emissiveLift = getImportedPlasticEmissiveLift(material);
  plastic.emissive.copy(baseColor).multiplyScalar(emissiveLift.colorScalar);
  plastic.emissiveIntensity = emissiveLift.intensity;

  plastic.userData = {
    ...material.userData,
    materialKind: "legoPlastic",
    materialTreatment: "scenePhysicalPlastic"
  };
  return plastic;
}

function getImportedPlasticEmissiveLift(material: Material): { colorScalar: number; intensity: number } {
  if (material.name === "SOLID-YELLOW") {
    return { colorScalar: 0.34, intensity: 0.92 };
  }

  return { colorScalar: 0.18, intensity: 0.55 };
}

function getMaterialColor(material: Material): Color {
  if (material.name === "SOLID-YELLOW") {
    return new Color("#ffd21f");
  }

  if (material instanceof MeshStandardMaterial || material instanceof MeshPhysicalMaterial) {
    return material.color.clone();
  }
  return new Color("#ffffff");
}

function createOfficialWorkerPivotRig(model: Group, source: Object3D): void {
  const parts = classifyOfficialWorkerParts(source);
  const root = findCommonParent(parts.map((part) => part.object)) ?? source;
  const arms = parts.filter((part) => part.kind === "arm");
  const hands = parts.filter((part) => part.kind === "hand");
  const legs = parts.filter((part) => part.kind === "leg");

  for (const side of ["left", "right"] as const) {
    const arm = findPart(arms, side);
    if (arm) {
      const hand = assignNearestHandsToArms(arms, hands).get(arm);
      const pivot = createLimbPivot(`player${capitalizeSide(side)}Arm`, "shoulder", [arm, hand].filter(isClassifiedPart), root);
      model.userData[`${side}ArmPivot`] = pivot.position.toArray();
    }

    const leg = findPart(legs, side);
    if (leg) {
      const pivot = createLimbPivot(`player${capitalizeSide(side)}Leg`, "hip", [leg], root);
      model.userData[`${side}LegPivot`] = pivot.position.toArray();
    }
  }
}

function classifyOfficialWorkerParts(source: Object3D): ClassifiedPart[] {
  const candidates: Object3D[] = [];
  source.traverse((object) => {
    if (getPartKind(object.name)) {
      candidates.push(object);
    }
  });

  return candidates.map((object) => ({
    object,
    side: getObjectCenter(object).x < getModelCenterX(source) ? "left" : "right",
    kind: getPartKind(object.name) ?? "leg"
  }));
}

function getPartKind(name: string): LimbKind | undefined {
  if (isLDrawPartName(name, "3818_dot_dat") || isLDrawPartName(name, "3819_dot_dat")) {
    return "arm";
  }
  if (isLDrawPartName(name, "3820_dot_dat")) {
    return "hand";
  }
  if (isLDrawPartName(name, "3816_dot_dat") || isLDrawPartName(name, "3817_dot_dat")) {
    return "leg";
  }
  return undefined;
}

function isLDrawPartName(name: string, partName: string): boolean {
  return name === partName || name.startsWith(`${partName}_`);
}

function getModelCenterX(source: Object3D): number {
  const bounds = new Box3().setFromObject(source);
  const center = new Vector3();
  bounds.getCenter(center);
  return center.x;
}

function createLimbPivot(name: string, pivotKind: "shoulder" | "hip", parts: ClassifiedPart[], root: Object3D): Group {
  const pivot = new Group();
  pivot.name = name;
  pivot.userData.animationPivot = pivotKind;
  pivot.userData.officialRig = "jointPivotGroup";
  root.updateWorldMatrix(true, false);
  pivot.position.copy(root.worldToLocal(getPivotPosition(parts, pivotKind)));
  root.add(pivot);

  for (const part of parts) {
    part.object.name = part.kind === "hand" ? `player${capitalizeSide(part.side)}Hand` : `${name}Part`;
    part.object.userData.officialPart = `${part.side}${capitalizeKind(part.kind)}`;
    pivot.attach(part.object);
  }

  return pivot;
}

function getPivotPosition(parts: ClassifiedPart[], pivotKind: "shoulder" | "hip"): Vector3 {
  const bounds = new Box3();
  for (const part of parts) {
    if (part.kind !== "hand") {
      bounds.union(new Box3().setFromObject(part.object));
    }
  }

  if (bounds.isEmpty()) {
    return new Vector3();
  }

  const center = new Vector3();
  bounds.getCenter(center);
  center.y = bounds.max.y;

  if (pivotKind === "shoulder") {
    center.x = center.x < 0 ? bounds.max.x : bounds.min.x;
  }

  return center;
}

function findCommonParent(objects: Object3D[]): Object3D | undefined {
  const [first] = objects;
  if (!first.parent) {
    return undefined;
  }

  let parent: Object3D | null = first.parent;
  while (parent) {
    const candidate: Object3D = parent;
    if (objects.every((object) => isDescendantOf(object, candidate))) {
      return candidate;
    }
    parent = candidate.parent;
  }

  return first.parent;
}

function isDescendantOf(object: Object3D, parent: Object3D): boolean {
  let current: Object3D | null = object;
  while (current) {
    if (current === parent) {
      return true;
    }
    current = current.parent;
  }
  return false;
}

function findPart(parts: ClassifiedPart[], side: LimbSide): ClassifiedPart | undefined {
  return parts.find((part) => part.side === side);
}

function assignNearestHandsToArms(arms: ClassifiedPart[], hands: ClassifiedPart[]): Map<ClassifiedPart, ClassifiedPart> {
  const assignments = new Map<ClassifiedPart, ClassifiedPart>();
  const orderedArms = [...arms].sort((a, b) => getObjectCenter(a.object).x - getObjectCenter(b.object).x);
  const orderedHands = [...hands].sort((a, b) => getObjectCenter(a.object).x - getObjectCenter(b.object).x);

  for (let index = 0; index < Math.min(orderedArms.length, orderedHands.length); index += 1) {
    const arm = orderedArms[index];
    const hand = orderedHands[index];
    hand.side = arm.side;
    assignments.set(arm, hand);
  }

  return assignments;
}

function getObjectCenter(object: Object3D): Vector3 {
  const bounds = new Box3().setFromObject(object);
  const center = new Vector3();
  bounds.getCenter(center);
  return center;
}

function isClassifiedPart(part: ClassifiedPart | undefined): part is ClassifiedPart {
  return part !== undefined;
}

function capitalizeSide(side: LimbSide): "Left" | "Right" {
  return side === "left" ? "Left" : "Right";
}

function capitalizeKind(kind: LimbKind): "Arm" | "Leg" | "Hand" {
  if (kind === "arm") {
    return "Arm";
  }
  if (kind === "leg") {
    return "Leg";
  }
  return "Hand";
}
