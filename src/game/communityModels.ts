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
  root.userData.communityModelStatus = "intact";
  root.userData.sourceKind = model.sourceKind;

  object.name = `${instanceId}_ldrawRoot`;
  object.userData.communityModelVisualRoot = true;
  root.add(object);
  root.scale.setScalar(model.recommendedScale);
  normalizeModelCenter(root);
  tagLoadedLDrawParts(root, instanceId);
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
