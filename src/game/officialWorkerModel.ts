import { Box3, Group, Mesh, MeshPhysicalMaterial, Object3D, Vector3 } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import type { FarmWorld } from "./world";

export const OFFICIAL_WORKER_MODEL_PATH = "/models/lego_construction_worker/scene.gltf";

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

function normalizeOfficialWorkerModel(source: Object3D): Group {
  const model = new Group();
  model.name = "officialWorkerGltfModel";
  model.userData.source = "sketchfab-uzzi47-cc-by-4";
  model.add(source);

  source.traverse((object) => {
    object.castShadow = true;
    object.receiveShadow = true;
    if (object instanceof Mesh) {
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((material) => {
        if (material instanceof MeshPhysicalMaterial) {
          material.clearcoat = 0.82;
          material.clearcoatRoughness = 0.12;
          material.roughness = Math.min(material.roughness, 0.34);
          material.color.multiplyScalar(1.12);
        }
      });
    }
  });

  const bounds = new Box3().setFromObject(model);
  const size = new Vector3();
  bounds.getSize(size);

  const targetHeight = 1.95;
  const scale = targetHeight / Math.max(size.y, 1);
  source.scale.setScalar(scale);

  source.rotation.y = Math.PI;

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
  model.userData.bounds = {
    min: finalBounds.min.toArray(),
    max: finalBounds.max.toArray(),
    size: finalSize.toArray(),
    center: finalCenter.toArray()
  };

  return model;
}
