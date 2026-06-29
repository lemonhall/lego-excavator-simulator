import {
  AmbientLight,
  BoxGeometry,
  Color,
  DirectionalLight,
  Fog,
  Group,
  Mesh,
  MeshPhysicalMaterial,
  Object3D,
  PointLight,
  Scene,
  SphereGeometry,
  Texture,
  Vector3
} from "three";
import {
  createBrickPart,
  createLegoPlasticMaterial,
  createPlatePart,
  createWheelPart,
  markPart
} from "./legoParts";

export interface FarmWorld {
  scene: Scene;
  playerRoot: Group;
  excavatorRoot: Group;
  excavatorBoom: Group;
}

const plastic = {
  grass: createLegoPlasticMaterial("#57a342"),
  path: createLegoPlasticMaterial("#bd9050"),
  barnRed: createLegoPlasticMaterial("#b50018"),
  roof: createLegoPlasticMaterial("#16283d"),
  yellow: createLegoPlasticMaterial("#ffd21f"),
  blue: createLegoPlasticMaterial("#0057b8"),
  black: createLegoPlasticMaterial("#171717"),
  crop: createLegoPlasticMaterial("#d8c04b"),
  leaf: createLegoPlasticMaterial("#2f9b54"),
  wood: createLegoPlasticMaterial("#8a5a32"),
  white: createLegoPlasticMaterial("#f4efe3"),
  glass: new MeshPhysicalMaterial({
    color: "#64b5ff",
    roughness: 0.08,
    metalness: 0,
    clearcoat: 0.8,
    clearcoatRoughness: 0.12,
    transparent: true,
    opacity: 0.68
  })
};
plastic.glass.userData.materialKind = "legoPlastic";

export function createFarmWorld(): FarmWorld {
  const scene = new Scene();
  scene.background = new Color("#8fd0ff");
  scene.environment = new Texture();
  scene.fog = new Fog("#8fd0ff", 30, 82);

  const ambient = new AmbientLight("#dbeafe", 0.78);
  ambient.name = "plasticAmbientLight";
  scene.add(ambient);

  const sun = new DirectionalLight("#fff7db", 2.45);
  sun.name = "plasticKeyLight";
  sun.position.set(7, 12, 5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 45;
  sun.shadow.camera.left = -18;
  sun.shadow.camera.right = 18;
  sun.shadow.camera.top = 18;
  sun.shadow.camera.bottom = -18;
  scene.add(sun);

  const toyFill = new PointLight("#fff1b8", 46, 26, 1.8);
  toyFill.name = "plasticHighlightLight";
  toyFill.position.set(-5, 5, 6);
  scene.add(toyFill);

  const ground = createRoundedPanel("ground", 42, 0.25, 42, plastic.grass);
  ground.position.y = -0.15;
  scene.add(ground);

  const path = createPath();
  scene.add(path);

  const barn = createBarn();
  barn.name = "barn";
  barn.position.set(-9, 0, -8);
  barn.userData.farmDecor = true;
  scene.add(barn);

  const playerRoot = createPlayer();
  playerRoot.name = "player";
  scene.add(playerRoot);

  const { root: excavatorRoot, boom: excavatorBoom } = createExcavator();
  excavatorRoot.name = "excavator";
  excavatorRoot.position.set(3, 0, -3);
  scene.add(excavatorRoot);

  addFence(scene);
  addCrops(scene);
  addTrees(scene);
  addLooseStuds(scene);
  addCameraAnchors(scene);

  return {
    scene,
    playerRoot,
    excavatorRoot,
    excavatorBoom
  };
}

function createPlayer(): Group {
  const root = new Group();

  const legs = createBrickPart({ name: "playerLegs", color: "#0057b8", studsX: 1, studsZ: 1, height: 0.48 });
  legs.scale.set(0.85, 1, 0.62);
  legs.position.y = 0.02;
  root.add(legs);

  const torso = createBrickPart({ name: "playerTorso", color: "#ffd21f", studsX: 2, studsZ: 1, height: 0.58 });
  torso.scale.set(0.84, 1, 0.62);
  torso.position.y = 0.55;
  root.add(torso);

  const head = createBrickPart({ name: "playerHeadBrick", color: "#ffd21f", studsX: 1, studsZ: 1, height: 0.34 });
  head.name = "playerHead";
  head.scale.set(0.72, 1, 0.72);
  head.position.y = 1.22;
  root.add(head);

  const cap = createPlatePart({ name: "playerCap", color: "#0057b8", studsX: 1, studsZ: 1 });
  cap.scale.set(0.78, 1, 0.78);
  cap.position.y = 1.62;
  root.add(cap);

  return root;
}

function createExcavator(): { root: Group; boom: Group } {
  const root = new Group();
  markPart(root, "excavatorAssembly");

  const lowerDeck = createPlatePart({ name: "excavatorLowerDeck", color: "#ffd21f", studsX: 6, studsZ: 3 });
  lowerDeck.position.y = 0.26;
  root.add(lowerDeck);

  const upperDeck = createPlatePart({ name: "excavatorUpperDeck", color: "#ffd21f", studsX: 5, studsZ: 2 });
  upperDeck.position.set(-0.18, 0.5, -0.05);
  root.add(upperDeck);

  const cab = createBrickPart({ name: "excavatorCab", color: "#ffd21f", studsX: 2, studsZ: 2, height: 0.95 });
  cab.position.set(-0.62, 0.72, -0.12);
  root.add(cab);

  const window = createRoundedPanel("excavatorWindow", 0.64, 0.52, 0.05, plastic.glass);
  window.position.set(-0.62, 1.34, -0.56);
  root.add(window);

  const rearCounterweight = createBrickPart({ name: "excavatorCounterweight", color: "#ffd21f", studsX: 2, studsZ: 2, height: 0.5 });
  rearCounterweight.position.set(-1.12, 0.72, 0.38);
  root.add(rearCounterweight);

  const boom = new Group();
  boom.name = "excavatorBoom";
  markPart(boom, "boomAssembly");
  boom.position.set(0.75, 1.16, -0.22);

  const boomBase = createPlatePart({ name: "excavatorBoomBase", color: "#ffd21f", studsX: 4, studsZ: 1 });
  boomBase.scale.set(1.2, 0.8, 0.66);
  boomBase.position.set(0.58, 0, 0);
  boom.add(boomBase);

  const boomUpper = createPlatePart({ name: "excavatorBoomUpper", color: "#ffd21f", studsX: 4, studsZ: 1 });
  boomUpper.scale.set(1.15, 0.8, 0.5);
  boomUpper.position.set(0.98, 0.18, 0);
  boomUpper.rotation.z = -0.08;
  boom.add(boomUpper);

  const bucket = createBrickPart({ name: "excavatorBucket", color: "#171717", studsX: 1, studsZ: 2, height: 0.26 });
  bucket.position.set(2.05, -0.2, 0);
  bucket.scale.set(0.82, 0.9, 1.08);
  boom.add(bucket);
  root.add(boom);

  for (const x of [-0.82, 0.82]) {
    const wheel = createWheelPart(`excavatorWheel${x}`);
    wheel.position.set(x, 0.28, 0.78);
    root.add(wheel);
  }

  const treadLeft = createPlatePart({ name: "excavatorLeftTreadPlate", color: "#171717", studsX: 5, studsZ: 1 });
  treadLeft.position.set(0, 0.07, 0.82);
  treadLeft.scale.set(1.04, 0.7, 0.66);
  root.add(treadLeft);

  const treadRight = createPlatePart({ name: "excavatorRightTreadPlate", color: "#171717", studsX: 5, studsZ: 1 });
  treadRight.position.set(0, 0.07, -0.82);
  treadRight.scale.set(1.04, 0.7, 0.66);
  root.add(treadRight);

  return { root, boom };
}

function createBarn(): Group {
  const barn = new Group();
  markPart(barn, "barnAssembly");

  const base = createBrickPart({ name: "barnBase", color: "#b50018", studsX: 8, studsZ: 6, height: 1.25 });
  base.position.y = 0;
  barn.add(base);

  const upper = createBrickPart({ name: "barnUpper", color: "#b50018", studsX: 7, studsZ: 5, height: 0.9 });
  upper.position.y = 1.24;
  barn.add(upper);

  const roofA = createPlatePart({ name: "barnRoofA", color: "#16283d", studsX: 9, studsZ: 3 });
  roofA.position.set(0, 2.26, -0.72);
  roofA.rotation.x = -0.22;
  barn.add(roofA);

  const roofB = createPlatePart({ name: "barnRoofB", color: "#16283d", studsX: 9, studsZ: 3 });
  roofB.position.set(0, 2.26, 0.72);
  roofB.rotation.x = 0.22;
  barn.add(roofB);

  const door = createPlatePart({ name: "barnDoor", color: "#f4efe3", studsX: 3, studsZ: 1 });
  door.rotation.x = Math.PI / 2;
  door.position.set(0, 0.56, -1.3);
  door.scale.set(1, 2.4, 1);
  barn.add(door);

  barn.scale.set(1.05, 1, 1.05);
  return barn;
}

function createPath(): Group {
  const path = new Group();
  path.name = "farmPath";
  path.userData.farmDecor = true;
  markPart(path, "pathAssembly");

  for (let i = 0; i < 12; i += 1) {
    const tile = createPlatePart({ name: `pathTile${i}`, color: "#bd9050", studsX: 6, studsZ: 2 });
    tile.position.set(0, 0.02, -16 + i * 2.8);
    tile.scale.set(1.7, 0.55, 1.15);
    path.add(tile);
  }

  return path;
}

function addFence(scene: Scene): void {
  for (let i = 0; i < 12; i += 1) {
    const post = createBrickPart({ name: `fencePost${i}`, color: "#8a5a32", studsX: 1, studsZ: 1, height: 0.7 });
    post.scale.set(0.5, 1, 0.5);
    post.position.set(-14 + i * 2.2, 0, 9);
    post.userData.farmDecor = true;
    scene.add(post);
  }

  for (let i = 0; i < 5; i += 1) {
    const rail = createPlatePart({ name: `fenceRail${i}`, color: "#8a5a32", studsX: 8, studsZ: 1 });
    rail.scale.set(1.22, 0.45, 0.32);
    rail.position.set(-11.8 + i * 4.4, 0.55, 9);
    rail.userData.farmDecor = true;
    scene.add(rail);
  }
}

function addCrops(scene: Scene): void {
  for (let row = 0; row < 4; row += 1) {
    for (let col = 0; col < 4; col += 1) {
      const crop = createPlatePart({ name: `cropRow${row}_${col}`, color: "#d8c04b", studsX: 3, studsZ: 1 });
      crop.position.set(5.8 + col * 1.25, 0.08, -10 + row * 1.2);
      crop.userData.farmDecor = true;
      scene.add(crop);
    }
  }
}

function addTrees(scene: Scene): void {
  const positions = [
    { x: -12, z: 6 },
    { x: 13, z: 7 },
    { x: 12, z: -13 }
  ];

  positions.forEach((position, index) => {
    const trunk = createBrickPart({ name: `treeTrunk${index}`, color: "#8a5a32", studsX: 1, studsZ: 1, height: 1.1 });
    trunk.position.set(position.x, 0, position.z);
    trunk.scale.set(0.7, 1, 0.7);
    trunk.userData.farmDecor = true;
    scene.add(trunk);

    const leaves = new Mesh(new SphereGeometry(1.15, 12, 8), plastic.leaf);
    leaves.name = `treeLeaves${index}`;
    leaves.position.set(position.x, 1.55, position.z);
    leaves.castShadow = true;
    leaves.receiveShadow = true;
    leaves.userData.farmDecor = true;
    markPart(leaves, "treeLeaves");
    scene.add(leaves);
  });
}

function addLooseStuds(scene: Scene): void {
  for (let i = 0; i < 8; i += 1) {
    const stud = createPlatePart({ name: `looseStudDisc${i}`, color: i % 2 === 0 ? "#ffd21f" : "#0057b8", studsX: 1, studsZ: 1 });
    stud.scale.set(0.72, 0.7, 0.72);
    stud.position.set(-4 + i * 0.55, 0.08, 4.5 + (i % 2) * 0.45);
    stud.userData.farmDecor = true;
    scene.add(stud);
  }
}

function addCameraAnchors(scene: Scene): void {
  const overShoulder = new Object3D();
  overShoulder.name = "overShoulderCameraAnchor";
  overShoulder.position.copy(new Vector3(1.05, 2.15, 3.1));
  scene.add(overShoulder);

  const driver = new Object3D();
  driver.name = "driverCameraAnchor";
  driver.position.copy(new Vector3(-0.48, 1.65, -0.35));
  scene.add(driver);
}

function createRoundedPanel(name: string, width: number, height: number, depth: number, material: MeshPhysicalMaterial): Mesh {
  const mesh = new Mesh(new BoxGeometry(width, height, depth, 4, 1, 4), material);
  mesh.name = name;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.roundedEdges = true;
  mesh.userData.materialKind = material.userData.materialKind ?? "legoPlastic";
  markPart(mesh, "roundedPanel");
  return mesh;
}
