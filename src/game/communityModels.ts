import {
  Box3,
  BoxGeometry,
  Group,
  LineSegments,
  Mesh,
  MeshStandardMaterial,
  MeshPhysicalMaterial,
  Object3D,
  Quaternion,
  Vector3
} from "three";
import { LDrawLoader } from "three/examples/jsm/loaders/LDrawLoader.js";
import { LDrawConditionalLineMaterial } from "three/examples/jsm/materials/LDrawConditionalLineMaterial.js";

export type CommunityModelSourceKind = "ldraw-packed" | "ldraw-omr" | "user-provided-ldraw";

export interface CommunityModelManifestEntry {
  id: string;
  name: string;
  category: string;
  sourceKind: CommunityModelSourceKind;
  format: "ldraw";
  file: string;
  sourceUrl: string;
  license: string;
  attribution: string;
  recommendedScale: number;
  thumbnailColor: string;
}

export interface CommunityModelCatalog {
  schemaVersion: 2;
  models: CommunityModelManifestEntry[];
}

export interface CatalogValidationResult {
  valid: boolean;
  errors: string[];
}

export interface LDrawPartReference {
  colorCode: string;
  fileName: string;
  position: [number, number, number];
}

export interface LDrawModelSummary {
  fileCount: number;
  partReferenceCount: number;
  uniquePartFiles: string[];
  hasEmbeddedFiles: boolean;
}

export interface CommunityModelInstance {
  id: string;
  modelId: string;
  sourceKind: CommunityModelSourceKind;
  root: Group;
  status: "intact" | "detached";
  parts: Object3D[];
}

export type CommunityWheelAxis = "x" | "y" | "z";

export interface CommunityWheelCandidate {
  object: Object3D;
  size: Vector3;
  center: Vector3;
}

export async function loadCommunityModelCatalog(basePath = "/community-models/manifest.json"): Promise<CommunityModelCatalog> {
  const response = await fetch(basePath);
  if (!response.ok) {
    throw new Error(`Failed to load community model manifest: ${response.status}`);
  }
  return (await response.json()) as CommunityModelCatalog;
}

export function validateCommunityModelCatalog(catalog: CommunityModelCatalog): CatalogValidationResult {
  const errors: string[] = [];
  if (catalog.schemaVersion !== 2) {
    errors.push("Catalog schemaVersion must be 2 for LDraw community models.");
  }
  if (!Array.isArray(catalog.models) || catalog.models.length < 3) {
    errors.push("Catalog must include at least 3 real LDraw models.");
  }

  for (const model of catalog.models ?? []) {
    validateManifestEntry(model, errors);
  }

  return { valid: errors.length === 0, errors };
}

export function validateManifestEntry(model: CommunityModelManifestEntry, errors: string[] = []): string[] {
  if (!model.id || !model.name || !model.category) {
    errors.push(`Model ${model.id || "(missing id)"} must include id, name, and category.`);
  }
  if (model.format !== "ldraw") {
    errors.push(`Model ${model.id} must use format "ldraw".`);
  }
  if (!["ldraw-packed", "ldraw-omr", "user-provided-ldraw"].includes(model.sourceKind)) {
    errors.push(`Model ${model.id} must use a supported LDraw sourceKind.`);
  }
  if (!model.file || !/\.(ldr|mpd)$/i.test(model.file)) {
    errors.push(`Model ${model.id} must reference a .ldr or .mpd file.`);
  }
  if (!model.sourceUrl || !/^https?:\/\//i.test(model.sourceUrl)) {
    errors.push(`Model ${model.id} must include a traceable sourceUrl.`);
  }
  if (!model.license || !model.attribution) {
    errors.push(`Model ${model.id} must include license and attribution.`);
  }
  if (!Number.isFinite(model.recommendedScale) || model.recommendedScale <= 0) {
    errors.push(`Model ${model.id} must include a positive recommendedScale.`);
  }
  return errors;
}

export function analyzeLDrawText(text: string): LDrawModelSummary {
  const partReferences = extractTopLevelLDrawPartReferences(text);
  const fileCount = text
    .split(/\r?\n/)
    .filter((line) => /^0\s+FILE\s+/i.test(line.trim()))
    .length;
  return {
    fileCount,
    partReferenceCount: partReferences.length,
    uniquePartFiles: [...new Set(partReferences.map((part) => part.fileName.toLowerCase()))].sort(),
    hasEmbeddedFiles: fileCount > 0
  };
}

export function extractTopLevelLDrawPartReferences(text: string): LDrawPartReference[] {
  const references: LDrawPartReference[] = [];
  let inEmbeddedFile = false;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line.length === 0) {
      continue;
    }
    if (/^0\s+FILE\s+/i.test(line)) {
      inEmbeddedFile = true;
      continue;
    }
    if (inEmbeddedFile) {
      continue;
    }
    if (!line.startsWith("1 ")) {
      continue;
    }

    const tokens = line.split(/\s+/);
    if (tokens.length < 15) {
      continue;
    }
    const x = Number(tokens[2]);
    const y = Number(tokens[3]);
    const z = Number(tokens[4]);
    const fileName = tokens.slice(14).join(" ");
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z) || !/\.(dat|ldr|mpd)$/i.test(fileName)) {
      continue;
    }
    references.push({
      colorCode: tokens[1] ?? "",
      fileName,
      position: [x, y, z]
    });
  }

  return references;
}

export async function loadLDrawCommunityModel(model: CommunityModelManifestEntry, instanceId: string): Promise<CommunityModelInstance> {
  const loader = new LDrawLoader();
  loader.setConditionalLineMaterial(LDrawConditionalLineMaterial);
  const object = await loader.loadAsync(model.file);
  const root = normalizeLoadedLDrawModel(object, model, instanceId);
  return {
    id: instanceId,
    modelId: model.id,
    sourceKind: model.sourceKind,
    root,
    status: "intact",
    parts: collectCommunityModelParts(root)
  };
}

export function normalizeLoadedLDrawModel(object: Group, model: CommunityModelManifestEntry, instanceId: string): Group {
  const root = new Group();
  root.name = `communityModel_${instanceId}`;
  root.userData.communityModelInstanceId = instanceId;
  root.userData.communityModelId = model.id;
  root.userData.communityModelCategory = model.category;
  root.userData.communityModelStatus = "intact";
  root.userData.sourceKind = model.sourceKind;

  object.name = `${instanceId}_ldrawRoot`;
  object.userData.communityModelVisualRoot = true;
  object.rotation.x = Math.PI;
  root.add(object);
  normalizeModelCenter(root);
  root.scale.setScalar(model.recommendedScale);
  tagLoadedLDrawParts(root, instanceId);
  tagCommunityVehicleWheels(root, model);
  return root;
}

export function collectCommunityModelParts(root: Object3D): Object3D[] {
  const parts: Object3D[] = [];
  root.traverse((object) => {
    if (object.userData.communityModelPart === true) {
      parts.push(object);
    }
  });
  return parts;
}

export function setCommunityModelEdgeVisibility(root: Object3D, visible: boolean): void {
  root.traverse((object) => {
    if (object.userData.communityModelEdge === true) {
      object.visible = visible;
    }
  });
}

function normalizeModelCenter(root: Group): void {
  root.updateMatrixWorld(true);
  const bounds = new Box3().setFromObject(root);
  if (bounds.isEmpty()) {
    return;
  }

  const center = bounds.getCenter(new Vector3());
  const size = bounds.getSize(new Vector3());
  root.children.forEach((child) => {
    child.position.x -= center.x;
    child.position.z -= center.z;
    child.position.y -= bounds.min.y;
  });
  root.userData.normalizedBounds = {
    width: size.x,
    height: size.y,
    depth: size.z
  };
}

function tagLoadedLDrawParts(root: Group, instanceId: string): void {
  let index = 0;
  root.traverse((object) => {
    if (!(object instanceof Mesh) && !(object instanceof LineSegments)) {
      return;
    }
    if (object instanceof LineSegments) {
      object.userData.communityModelEdge = true;
      return;
    }

    object.name = `${instanceId}_ldrawPart${index}`;
    object.userData.communityModelPart = true;
    object.userData.destructiblePhysicsPart = true;
    object.userData.partSystem = "ldraw";
    object.userData.partKind = "ldrawPart";
    object.userData.communityPartIndex = index;
    object.userData.basePosition = object.position.clone();
    object.userData.baseQuaternion = object.quaternion.clone();
    object.castShadow = true;
    object.receiveShadow = true;
    applyScenePlasticTreatment(object);
    index += 1;
  });
}

function tagCommunityVehicleWheels(root: Group, model: CommunityModelManifestEntry): void {
  if (model.category.toLowerCase() !== "vehicle") {
    return;
  }

  root.updateMatrixWorld(true);
  const rootBounds = new Box3().setFromObject(root);
  const candidates: CommunityWheelCandidate[] = [];
  root.traverse((object) => {
    if (!(object instanceof Mesh) || object.userData.communityModelPart !== true) {
      return;
    }

    object.userData.communityModelWheel = false;
    const size = new Vector3();
    const center = new Vector3();
    const bounds = new Box3().setFromObject(object);
    bounds.getSize(size);
    bounds.getCenter(center);
    if (isWheelLikeLDrawPartSize(size)) {
      candidates.push({ object, size, center });
    }
  });

  const selected = selectCommunityVehicleWheelCandidates(candidates, rootBounds, getExpectedWheelCounts(model));
  selected.forEach((candidate) => {
    candidate.object.userData.communityModelWheel = true;
    candidate.object.userData.communityWheelAxis = inferCommunityWheelAxisFromObject(candidate.object, candidate.size);
  });
}

export function isWheelLikeLDrawPartSize(size: Vector3): boolean {
  const dimensions = [size.x, size.y, size.z].sort((a, b) => a - b);
  const thin = dimensions[0] ?? 0;
  const diameterA = dimensions[1] ?? 0;
  const diameterB = dimensions[2] ?? 0;
  if (thin <= 0 || diameterA <= 0 || diameterB <= 0) {
    return false;
  }

  const diameterRatio = diameterA / diameterB;
  const thicknessRatio = thin / diameterB;
  return diameterRatio >= 0.72 && thicknessRatio <= 0.5 && diameterB >= 0.12;
}

export function inferCommunityWheelAxis(size: Vector3): CommunityWheelAxis {
  const dimensions: Array<{ axis: CommunityWheelAxis; value: number }> = [
    { axis: "x", value: size.x },
    { axis: "y", value: size.y },
    { axis: "z", value: size.z }
  ];
  dimensions.sort((a, b) => a.value - b.value);
  return dimensions[0]?.axis ?? "x";
}

export function inferCommunityWheelAxisFromObject(object: Object3D, fallbackWorldSize: Vector3): CommunityWheelAxis {
  if (object instanceof Mesh) {
    const geometry = object.geometry;
    if (!geometry.boundingBox) {
      geometry.computeBoundingBox();
    }
    const localBounds = geometry.boundingBox;
    if (localBounds && !localBounds.isEmpty()) {
      const localSize = localBounds.getSize(new Vector3());
      if (isWheelLikeLDrawPartSize(localSize)) {
        return inferCommunityWheelAxis(localSize);
      }
    }
  }

  return inferCommunityWheelAxis(fallbackWorldSize);
}

export function selectCommunityVehicleWheelCandidates<T extends CommunityWheelCandidate>(
  candidates: T[],
  rootBounds: Box3,
  expectedWheelCounts = [4, 6]
): T[] {
  if (rootBounds.isEmpty() || candidates.length === 0) {
    return [];
  }

  const rootSize = rootBounds.getSize(new Vector3());
  const bottomLimit = rootBounds.min.y + rootSize.y * 0.42;
  const bottomCandidates = candidates.filter(
    (candidate) => isWheelLikeLDrawPartSize(candidate.size) && candidate.center.y <= bottomLimit
  );
  const groups: T[][] = [];

  for (const candidate of bottomCandidates) {
    const group = groups.find((existing) => areWheelSizesSimilar(existing[0]?.size, candidate.size));
    if (group) {
      group.push(candidate);
    } else {
      groups.push([candidate]);
    }
  }

  const allowedCounts = new Set(expectedWheelCounts);
  const matchingGroups = groups.filter((group) => allowedCounts.has(group.length));
  matchingGroups.sort((a, b) => {
    const averageYDelta = averageWheelCenterY(a) - averageWheelCenterY(b);
    if (Math.abs(averageYDelta) > 0.01) {
      return averageYDelta;
    }
    return averageWheelDiameter(b) - averageWheelDiameter(a);
  });

  return matchingGroups[0] ?? [];
}

function getExpectedWheelCounts(model: CommunityModelManifestEntry): number[] {
  const id = model.id.toLowerCase();
  if (id.includes("radar-truck")) {
    return [4];
  }
  if (id.includes("mini-construction")) {
    return [6];
  }
  return [4, 6];
}

function areWheelSizesSimilar(a: Vector3 | undefined, b: Vector3): boolean {
  if (!a) {
    return false;
  }
  const first = sortedVectorDimensions(a);
  const second = sortedVectorDimensions(b);
  return first.every((value, index) => {
    const other = second[index] ?? 0;
    const tolerance = Math.max(0.035, Math.max(value, other) * 0.08);
    return Math.abs(value - other) <= tolerance;
  });
}

function sortedVectorDimensions(size: Vector3): number[] {
  return [size.x, size.y, size.z].sort((a, b) => a - b);
}

function averageWheelCenterY(candidates: CommunityWheelCandidate[]): number {
  return candidates.reduce((sum, candidate) => sum + candidate.center.y, 0) / Math.max(1, candidates.length);
}

function averageWheelDiameter(candidates: CommunityWheelCandidate[]): number {
  return (
    candidates.reduce((sum, candidate) => {
      const dimensions = sortedVectorDimensions(candidate.size);
      return sum + ((dimensions[1] ?? 0) + (dimensions[2] ?? 0)) / 2;
    }, 0) / Math.max(1, candidates.length)
  );
}

function applyScenePlasticTreatment(mesh: Mesh): void {
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  for (const material of materials) {
    if (!(material instanceof MeshPhysicalMaterial) && !(material instanceof MeshStandardMaterial)) {
      continue;
    }
    material.roughness = Math.min(material.roughness, 0.26);
    material.metalness = Math.max(material.metalness, 0.02);
    if (material instanceof MeshPhysicalMaterial) {
      material.clearcoat = Math.max(material.clearcoat, 0.72);
      material.clearcoatRoughness = Math.min(material.clearcoatRoughness, 0.18);
    }
    material.envMapIntensity = Math.max(material.envMapIntensity, 1.9);
    material.userData.materialKind = "legoPlastic";
    material.needsUpdate = true;
  }
}

export function createFallbackColliderMesh(name: string, halfExtents: Vector3): Mesh {
  const geometry = new BoxGeometry(halfExtents.x * 2, halfExtents.y * 2, halfExtents.z * 2);
  const material = new MeshPhysicalMaterial({
    color: "#facc15",
    transparent: true,
    opacity: 0
  });
  const mesh = new Mesh(geometry, material);
  mesh.name = name;
  return mesh;
}

export function resetCommunityPartToBase(object: Object3D): void {
  const basePosition = object.userData.basePosition;
  const baseQuaternion = object.userData.baseQuaternion;
  if (basePosition instanceof Vector3) {
    object.position.copy(basePosition);
  }
  if (baseQuaternion instanceof Quaternion) {
    object.quaternion.copy(baseQuaternion);
  }
}
