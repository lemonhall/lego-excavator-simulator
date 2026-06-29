import {
  AmbientLight,
  BoxGeometry,
  CircleGeometry,
  Color,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  Fog,
  Group,
  HemisphereLight,
  Mesh,
  MeshPhysicalMaterial,
  Object3D,
  RingGeometry,
  PointLight,
  Scene,
  SphereGeometry,
  SpotLight,
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
import { OFFICIAL_WORKER_MODEL_PATH } from "./officialWorkerModel";

export interface FarmWorld {
  scene: Scene;
  playerRoot: Group;
  excavatorRoot: Group;
  excavatorCrawlerBase: Group;
  excavatorUpper: Group;
  excavatorBoom: Group;
  excavatorStick: Group;
  excavatorBucket: Group;
  destructibleRoots: Group[];
}

const plastic = {
  grass: createLegoPlasticMaterial("#57a342"),
  path: createLegoPlasticMaterial("#bd9050"),
  barnRed: createLegoPlasticMaterial("#b50018"),
  hardHatRed: createLegoPlasticMaterial("#d71920"),
  safetyOrange: createLegoPlasticMaterial("#f47b20"),
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

  const ambient = new AmbientLight("#dbeafe", 0.92);
  ambient.name = "plasticAmbientLight";
  scene.add(ambient);

  const skyBounce = new HemisphereLight("#dbeafe", "#5da044", 1.18);
  skyBounce.name = "plasticSkyBounceLight";
  scene.add(skyBounce);

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

  const cameraFill = new SpotLight("#fff0cf", 38, 8.5, 0.82, 0.78, 1.05);
  cameraFill.name = "cameraPlasticFillLight";
  cameraFill.position.set(1.2, 2.2, 3.2);
  cameraFill.userData.lightRole = "cameraPlasticFill";
  scene.add(cameraFill);
  scene.add(cameraFill.target);

  const ground = createRoundedPanel("ground", 42, 0.25, 42, plastic.grass);
  ground.position.y = -0.15;
  scene.add(ground);

  const path = createPath();
  scene.add(path);

  const barn = createDestructibleBarn();
  scene.add(barn);

  const playerRoot = createPlayer();
  playerRoot.name = "player";
  addPlayerPlasticFillLight(playerRoot);
  scene.add(playerRoot);

  const {
    root: excavatorRoot,
    crawlerBase: excavatorCrawlerBase,
    upper: excavatorUpper,
    boom: excavatorBoom,
    stick: excavatorStick,
    bucket: excavatorBucket
  } = createExcavator();
  excavatorRoot.name = "excavator";
  excavatorRoot.position.set(3, 0, -3);
  scene.add(excavatorRoot);

  const fenceRoots = addFence(scene);
  addCrops(scene);
  const treeRoots = addTrees(scene);
  addLooseStuds(scene);
  addCameraAnchors(scene);

  return {
    scene,
    playerRoot,
    excavatorRoot,
    excavatorCrawlerBase,
    excavatorUpper,
    excavatorBoom,
    excavatorStick,
    excavatorBucket,
    destructibleRoots: [barn, ...treeRoots, ...fenceRoots]
  };
}

function addPlayerPlasticFillLight(playerRoot: Group): void {
  const fill = new PointLight("#fff1c9", 14, 5.5, 1.2);
  fill.name = "playerPlasticFillLight";
  fill.position.set(0.75, 1.65, 1.35);
  fill.userData.lightRole = "playerPlasticFill";
  playerRoot.add(fill);
}

function createPlayer(): Group {
  const root = new Group();
  markPart(root, "playerMinifigure");
  root.userData.minifigureVersion = "official-gltf-v4";
  root.userData.officialModelPath = OFFICIAL_WORKER_MODEL_PATH;

  const modelMount = new Group();
  modelMount.name = "officialWorkerModelMount";
  modelMount.visible = false;
  modelMount.userData.animationTargets = ["playerLeftArm", "playerRightArm", "playerLeftLeg", "playerRightLeg"];
  modelMount.userData.animationTargetMode = "jointPivotGroups";
  modelMount.userData.materialTreatment = "scenePhysicalPlastic";
  modelMount.userData.forwardCorrection = 0;
  root.add(modelMount);

  const fallback = new Group();
  fallback.name = "playerProceduralFallback";
  root.add(fallback);

  const leftLeg = createLeg("playerLeftLeg");
  leftLeg.position.set(-0.14, 0.62, 0);
  fallback.add(leftLeg);

  const rightLeg = createLeg("playerRightLeg");
  rightLeg.position.set(0.14, 0.62, 0);
  fallback.add(rightLeg);

  const hips = createPlatePart({ name: "playerHips", color: "#f47b20", studsX: 2, studsZ: 1 });
  hips.scale.set(0.72, 0.72, 0.52);
  hips.position.y = 0.66;
  fallback.add(hips);

  const torso = createTrapezoidTorso();
  torso.position.y = 0.86;
  fallback.add(torso);
  fallback.add(createChestPanel());

  const leftArm = createArm("playerLeftArm");
  leftArm.position.set(-0.5, 1.3, 0);
  fallback.add(leftArm);

  const rightArm = createArm("playerRightArm");
  rightArm.position.set(0.5, 1.3, 0);
  fallback.add(rightArm);

  const head = new Mesh(new CylinderGeometry(0.24, 0.24, 0.36, 32), plastic.yellow);
  head.name = "playerHead";
  head.position.y = 1.5;
  head.castShadow = true;
  head.receiveShadow = true;
  head.userData.materialKind = "legoPlastic";
  head.userData.headShape = "cylinder";
  markPart(head, "playerHeadCylinder");
  fallback.add(head);
  fallback.add(createPlayerFace());

  fallback.add(createHardHat());

  return root;
}

function createTrapezoidTorso(): Group {
  const torso = new Group();
  torso.name = "playerTorso";
  torso.userData.bodyShape = "minifigureTorso";
  torso.userData.taperedShape = "trapezoidPrint";
  torso.userData.shoulderWidth = 0.72;
  torso.userData.waistWidth = 0.5;
  markPart(torso, "playerTorso");

  const chest = createRoundedPanel("playerTorsoChest", 0.64, 0.46, 0.3, plastic.safetyOrange);
  chest.position.y = 0.14;
  torso.add(chest);

  const waist = createRoundedPanel("playerTorsoWaist", 0.5, 0.18, 0.28, plastic.safetyOrange);
  waist.position.y = -0.2;
  torso.add(waist);

  const shoulderCap = createRoundedPanel("playerTorsoShoulderCap", 0.72, 0.16, 0.3, plastic.safetyOrange);
  shoulderCap.position.y = 0.4;
  torso.add(shoulderCap);

  return torso;
}

function createPlayerFace(): Group {
  const face = new Group();
  face.name = "playerFace";
  face.position.set(0, 1.53, -0.245);
  markPart(face, "playerFace");

  const decal = createRoundedPanel("playerFaceDecal", 0.3, 0.22, 0.01, plastic.yellow);
  decal.position.set(0, -0.005, -0.003);
  decal.userData.printSurface = "flatDecal";
  decal.userData.faceStyle = "officialWorkerSmile";
  decal.visible = false;
  face.add(decal);

  const leftEye = new Mesh(new CylinderGeometry(0.022, 0.022, 0.012, 16), plastic.black);
  leftEye.name = "playerLeftEye";
  leftEye.rotation.x = Math.PI / 2;
  leftEye.position.set(-0.075, 0.055, -0.014);
  leftEye.scale.set(1.25, 1.25, 1);
  markPart(leftEye, "facePrint");
  face.add(leftEye);

  const rightEye = new Mesh(new CylinderGeometry(0.022, 0.022, 0.012, 16), plastic.black);
  rightEye.name = "playerRightEye";
  rightEye.rotation.x = Math.PI / 2;
  rightEye.position.set(0.075, 0.055, -0.014);
  rightEye.scale.set(1.25, 1.25, 1);
  markPart(rightEye, "facePrint");
  face.add(rightEye);

  const smile = createFaceDisc("playerSmile", 0.105, 0.07, plastic.black);
  smile.position.set(0, -0.055, -0.026);
  face.add(smile);

  const teeth = createFaceDisc("playerSmileTeeth", 0.075, 0.022, plastic.white);
  teeth.position.set(0, -0.034, -0.032);
  face.add(teeth);

  const tongue = createFaceDisc("playerSmileTongue", 0.045, 0.016, createLegoPlasticMaterial("#c22b2f"));
  tongue.position.set(0.015, -0.095, -0.035);
  face.add(tongue);

  const legacyMouth = new Mesh(new RingGeometry(0.075, 0.096, 32, 1, Math.PI * 0.12, Math.PI * 0.78), plastic.black);
  legacyMouth.name = "playerMouth";
  legacyMouth.position.set(0, -0.055, -0.04);
  legacyMouth.rotation.z = Math.PI;
  legacyMouth.visible = false;
  markPart(legacyMouth, "facePrint");
  face.add(legacyMouth);

  return face;
}

function createFaceDisc(name: string, radiusX: number, radiusY: number, material: MeshPhysicalMaterial): Mesh {
  const disc = new Mesh(new CircleGeometry(1, 32), material);
  disc.name = name;
  disc.scale.set(radiusX, radiusY, 1);
  disc.material.side = DoubleSide;
  markPart(disc, "facePrint");
  return disc;
}

function createChestPanel(): Group {
  const chest = new Group();
  chest.name = "playerChestPanel";
  chest.position.set(0, 1.02, -0.165);
  markPart(chest, "chestPrint");

  const torsoDecal = createRoundedPanel("playerTorsoDecal", 0.58, 0.55, 0.008, plastic.safetyOrange);
  torsoDecal.position.set(0, 0.04, -0.004);
  torsoDecal.userData.printSurface = "flatDecal";
  torsoDecal.userData.decalStyle = "officialWorkerVest";
  chest.add(torsoDecal);

  const vest = createRoundedPanel("playerSafetyVest", 0.54, 0.42, 0.01, plastic.safetyOrange);
  vest.position.set(0, 0.05, -0.012);
  vest.userData.colorRole = "safetyOrange";
  chest.add(vest);

  const panel = createRoundedPanel("playerChestBluePanel", 0.16, 0.31, 0.012, plastic.blue);
  panel.position.set(0, 0.09, -0.02);
  chest.add(panel);

  const collarLeft = createRoundedPanel("playerLeftBlueCollar", 0.05, 0.22, 0.012, plastic.blue);
  collarLeft.position.set(-0.075, 0.18, -0.026);
  collarLeft.rotation.z = -0.45;
  chest.add(collarLeft);

  const collarRight = createRoundedPanel("playerRightBlueCollar", 0.05, 0.22, 0.012, plastic.blue);
  collarRight.position.set(0.075, 0.18, -0.026);
  collarRight.rotation.z = 0.45;
  chest.add(collarRight);

  const waistNotch = createRoundedPanel("playerWaistNotch", 0.32, 0.055, 0.012, plastic.black);
  waistNotch.position.set(0, -0.16, -0.03);
  chest.add(waistNotch);

  const zipper = createRoundedPanel("playerVestZipper", 0.018, 0.41, 0.014, plastic.black);
  zipper.position.set(0, 0.03, -0.034);
  chest.add(zipper);

  const leftStrap = createRoundedPanel("playerLeftReflectiveStripe", 0.055, 0.38, 0.014, plastic.white);
  leftStrap.name = "playerLeftVestStripe";
  leftStrap.position.set(-0.18, 0.02, -0.038);
  chest.add(leftStrap);

  const rightStrap = createRoundedPanel("playerRightReflectiveStripe", 0.055, 0.38, 0.014, plastic.white);
  rightStrap.name = "playerRightVestStripe";
  rightStrap.position.set(0.18, 0.02, -0.038);
  chest.add(rightStrap);

  const leftCross = createRoundedPanel("playerLeftVestCrossStripe", 0.18, 0.055, 0.014, plastic.white);
  leftCross.position.set(-0.18, 0.05, -0.042);
  chest.add(leftCross);

  const rightCross = createRoundedPanel("playerRightVestCrossStripe", 0.18, 0.055, 0.014, plastic.white);
  rightCross.position.set(0.18, 0.05, -0.042);
  chest.add(rightCross);

  const leftPocket = createRoundedPanel("playerLeftVestPocket", 0.12, 0.06, 0.014, plastic.black);
  leftPocket.position.set(-0.19, -0.09, -0.046);
  chest.add(leftPocket);

  const rightPocket = createRoundedPanel("playerRightVestPocket", 0.12, 0.06, 0.014, plastic.black);
  rightPocket.position.set(0.19, -0.09, -0.046);
  chest.add(rightPocket);

  return chest;
}

function createHardHat(): Group {
  const hat = new Group();
  hat.name = "playerHardHat";
  hat.position.y = 1.66;
  hat.userData.helmetFit = "seated";
  markPart(hat, "hardHat");

  const dome = new Mesh(new SphereGeometry(0.285, 32, 12, 0, Math.PI * 2, 0, Math.PI * 0.52), plastic.hardHatRed);
  dome.name = "playerHardHatDome";
  dome.scale.set(1, 0.58, 1);
  dome.position.y = 0.02;
  dome.castShadow = true;
  dome.receiveShadow = true;
  dome.userData.materialKind = "legoPlastic";
  markPart(dome, "hardHatDome");
  hat.add(dome);

  const brim = new Mesh(new CylinderGeometry(0.33, 0.33, 0.035, 48), plastic.hardHatRed);
  brim.name = "playerHardHatBrim";
  brim.position.y = -0.025;
  brim.scale.z = 0.84;
  brim.castShadow = true;
  brim.receiveShadow = true;
  brim.userData.materialKind = "legoPlastic";
  markPart(brim, "hardHatBrim");
  hat.add(brim);

  const frontBrim = new Mesh(new CylinderGeometry(0.18, 0.2, 0.03, 32), plastic.hardHatRed);
  frontBrim.name = "playerHardHatFrontBrim";
  frontBrim.position.set(0, -0.03, -0.255);
  frontBrim.scale.set(1.45, 1, 0.34);
  frontBrim.castShadow = true;
  frontBrim.receiveShadow = true;
  frontBrim.userData.materialKind = "legoPlastic";
  markPart(frontBrim, "hardHatFrontBrim");
  hat.add(frontBrim);

  const centerRib = createRoundedPanel("playerHardHatCenterRib", 0.035, 0.055, 0.42, plastic.hardHatRed);
  centerRib.position.y = 0.075;
  hat.add(centerRib);

  const leftRib = createRoundedPanel("playerHardHatLeftRib", 0.03, 0.045, 0.36, plastic.hardHatRed);
  leftRib.position.set(-0.11, 0.055, 0);
  leftRib.rotation.z = -0.12;
  hat.add(leftRib);

  const rightRib = createRoundedPanel("playerHardHatRightRib", 0.03, 0.045, 0.36, plastic.hardHatRed);
  rightRib.position.set(0.11, 0.055, 0);
  rightRib.rotation.z = 0.12;
  hat.add(rightRib);

  const leftHair = createRoundedPanel("playerLeftHairPatch", 0.07, 0.16, 0.04, plastic.wood);
  leftHair.position.set(-0.25, -0.13, -0.02);
  hat.add(leftHair);

  const rightHair = createRoundedPanel("playerRightHairPatch", 0.07, 0.16, 0.04, plastic.wood);
  rightHair.position.set(0.25, -0.13, -0.02);
  hat.add(rightHair);

  return hat;
}

function createArm(name: string): Group {
  const pivot = new Group();
  pivot.name = name;
  markPart(pivot, "playerArm");

  const isLeft = name === "playerLeftArm";
  const side = isLeft ? -1 : 1;

  const sleeve = createRoundedPanel(`${isLeft ? "playerLeftSleeve" : "playerRightSleeve"}`, 0.2, 0.42, 0.24, plastic.blue);
  sleeve.position.set(side * 0.02, -0.22, 0);
  sleeve.rotation.z = side * 0.12;
  sleeve.userData.colorRole = "blueSleeve";
  sleeve.userData.limbShape = "roundedSleeve";
  pivot.add(sleeve);

  const cuff = createRoundedPanel(`${isLeft ? "playerLeftCuff" : "playerRightCuff"}`, 0.22, 0.08, 0.24, plastic.yellow);
  cuff.position.set(side * 0.05, -0.46, 0);
  pivot.add(cuff);

  const hand = createClawHand(isLeft ? "playerLeftClawHand" : "playerRightClawHand", side);
  hand.position.set(side * 0.07, -0.56, -0.02);
  hand.userData.colorRole = "yellowHand";
  pivot.add(hand);

  const legacyHandTag = new Group();
  legacyHandTag.name = isLeft ? "playerLeftHand" : "playerRightHand";
  legacyHandTag.userData.colorRole = "yellowHand";
  pivot.add(legacyHandTag);

  return pivot;
}

function createClawHand(name: string, side: number): Group {
  const hand = new Group();
  hand.name = name;
  hand.userData.handShape = "minifigureClaw";
  markPart(hand, "clawHand");

  const palm = new Mesh(new CylinderGeometry(0.065, 0.065, 0.12, 18), plastic.yellow);
  palm.name = `${name}Palm`;
  palm.rotation.z = Math.PI / 2;
  palm.castShadow = true;
  palm.receiveShadow = true;
  palm.userData.materialKind = "legoPlastic";
  markPart(palm, "clawPalm");
  hand.add(palm);

  const hook = new Mesh(new RingGeometry(0.07, 0.095, 24, 1, Math.PI * 0.15, Math.PI * 1.35), plastic.yellow);
  hook.name = `${name}Hook`;
  hook.position.set(side * 0.055, -0.005, -0.005);
  hook.rotation.y = Math.PI / 2;
  hook.rotation.z = side * 0.25;
  hook.castShadow = true;
  hook.receiveShadow = true;
  hook.userData.materialKind = "legoPlastic";
  markPart(hook, "clawHook");
  hand.add(hook);

  return hand;
}

function createLeg(name: string): Group {
  const pivot = new Group();
  pivot.name = name;
  markPart(pivot, "playerLeg");
  const isLeft = name === "playerLeftLeg";

  const leg = createRoundedPanel(`${name}Block`, 0.25, 0.58, 0.28, plastic.safetyOrange);
  leg.position.y = -0.29;
  leg.userData.colorRole = "orangePants";
  pivot.add(leg);

  const foot = createRoundedPanel(`${name}Foot`, 0.28, 0.13, 0.42, plastic.safetyOrange);
  foot.position.set(0, -0.62, -0.06);
  foot.userData.colorRole = "orangePants";
  pivot.add(foot);

  const cavity = createRoundedPanel(`${name}FootCavity`, 0.18, 0.055, 0.16, plastic.black);
  cavity.position.set(0, -0.63, -0.22);
  pivot.add(cavity);

  if (isLeft) {
    const reflector = createRoundedPanel("playerLeftLegReflector", 0.19, 0.055, 0.02, plastic.white);
    reflector.position.set(0, -0.22, -0.15);
    pivot.add(reflector);

    const decal = createRoundedPanel("playerLeftLegDecal", 0.21, 0.09, 0.012, plastic.white);
    decal.position.set(0, -0.24, -0.166);
    decal.userData.printSurface = "flatDecal";
    pivot.add(decal);
  } else {
    const badge = createRoundedPanel("playerRightLegBadge", 0.16, 0.11, 0.02, plastic.black);
    badge.position.set(0, -0.16, -0.15);
    pivot.add(badge);

    const decal = createRoundedPanel("playerRightLegDecal", 0.15, 0.13, 0.012, plastic.black);
    decal.position.set(0, -0.16, -0.166);
    decal.userData.printSurface = "flatDecal";
    pivot.add(decal);
  }

  return pivot;
}

function createExcavator(): { root: Group; crawlerBase: Group; upper: Group; boom: Group; stick: Group; bucket: Group } {
  const root = new Group();
  markPart(root, "excavatorAssembly");

  const crawlerBase = new Group();
  crawlerBase.name = "excavatorCrawlerBase";
  crawlerBase.userData.vehicleRole = "crawlerBase";
  markPart(crawlerBase, "crawlerBaseAssembly");
  root.add(crawlerBase);

  const leftTrack = createTrackAssembly("excavatorLeftTrack");
  leftTrack.position.set(-1.02, 0.1, 0);
  crawlerBase.add(leftTrack);

  const rightTrack = createTrackAssembly("excavatorRightTrack");
  rightTrack.position.set(1.02, 0.1, 0);
  crawlerBase.add(rightTrack);

  const chassis = createPlatePart({ name: "excavatorCrawlerBridge", color: "#171717", studsX: 5, studsZ: 3 });
  chassis.scale.set(0.92, 0.78, 0.88);
  chassis.position.set(0, 0.32, 0);
  crawlerBase.add(chassis);

  const turntable = new Group();
  turntable.name = "excavatorTurntable";
  turntable.userData.vehicleRole = "turntable";
  markPart(turntable, "turntableAssembly");
  turntable.position.y = 0.58;
  root.add(turntable);

  const turntableLower = createPlatePart({ name: "excavatorTurntableLower", color: "#171717", studsX: 4, studsZ: 4 });
  turntableLower.scale.set(0.76, 0.72, 0.76);
  turntable.add(turntableLower);

  const upper = new Group();
  upper.name = "excavatorUpper";
  upper.userData.vehicleRole = "rotatingUpper";
  markPart(upper, "upperAssembly");
  upper.position.y = 0.72;
  root.add(upper);

  const upperDeck = createPlatePart({ name: "excavatorUpperDeck", color: "#ffd21f", studsX: 7, studsZ: 4 });
  upperDeck.scale.set(1.05, 0.84, 0.98);
  upperDeck.position.set(0.08, 0, 0.06);
  upper.add(upperDeck);

  const cab = createBrickPart({ name: "excavatorCab", color: "#ffd21f", studsX: 2, studsZ: 3, height: 0.98 });
  cab.position.set(-0.74, 0.18, -0.32);
  cab.userData.vehicleRole = "cab";
  upper.add(cab);

  const frontWindow = createRoundedPanel("excavatorFrontWindow", 0.52, 0.56, 0.035, plastic.glass);
  frontWindow.position.set(-0.74, 1.0, -1.02);
  upper.add(frontWindow);

  const sideWindow = createRoundedPanel("excavatorSideWindow", 0.035, 0.48, 0.5, plastic.glass);
  sideWindow.position.set(-1.18, 1.02, -0.33);
  upper.add(sideWindow);

  const roof = createPlatePart({ name: "excavatorCabRoof", color: "#ffd21f", studsX: 2, studsZ: 3 });
  roof.position.set(-0.74, 1.18, -0.32);
  roof.scale.set(1.08, 0.72, 1.08);
  upper.add(roof);

  const counterweight = createBrickPart({ name: "excavatorCounterweight", color: "#ffd21f", studsX: 3, studsZ: 2, height: 0.68 });
  counterweight.position.set(0.58, 0.18, 0.82);
  counterweight.scale.set(1.18, 1, 1.08);
  counterweight.userData.vehicleRole = "counterweight";
  upper.add(counterweight);

  const engineCover = createPlatePart({ name: "excavatorEngineCover", color: "#ffd21f", studsX: 4, studsZ: 2 });
  engineCover.position.set(0.48, 0.88, 0.62);
  upper.add(engineCover);

  const boomMount = createBrickPart({ name: "excavatorBoomPivotBlock", color: "#ffd21f", studsX: 2, studsZ: 1, height: 0.56 });
  boomMount.position.set(0.08, 0.45, -1.02);
  upper.add(boomMount);

  const boom = new Group();
  boom.name = "excavatorBoom";
  boom.userData.vehicleRole = "boom";
  markPart(boom, "boomAssembly");
  boom.position.set(0.08, 0.96, -1.05);
  upper.add(boom);

  const boomBeam = createArmBeam("excavatorBoomBeam", 6);
  boomBeam.position.set(0, 0.1, -1.02);
  boom.add(boomBeam);

  const boomCylinder = createRoundedPanel("excavatorBoomHydraulicCylinder", 0.16, 0.16, 1.35, plastic.black);
  boomCylinder.position.set(0.42, -0.18, -0.68);
  boomCylinder.rotation.x = 0.38;
  boom.add(boomCylinder);

  const stick = new Group();
  stick.name = "excavatorStick";
  stick.userData.vehicleRole = "stick";
  markPart(stick, "stickAssembly");
  stick.position.set(0, 0.2, -2.18);
  boom.add(stick);

  const stickBeam = createArmBeam("excavatorStickBeam", 5);
  stickBeam.scale.set(0.86, 0.86, 0.86);
  stickBeam.position.set(0, -0.1, -0.82);
  stick.add(stickBeam);

  const stickCylinder = createRoundedPanel("excavatorStickHydraulicCylinder", 0.13, 0.13, 1.1, plastic.black);
  stickCylinder.position.set(-0.36, 0.0, -0.52);
  stickCylinder.rotation.x = -0.18;
  stick.add(stickCylinder);

  const bucket = new Group();
  bucket.name = "excavatorBucket";
  bucket.userData.vehicleRole = "bucket";
  markPart(bucket, "bucketAssembly");
  bucket.position.set(0, -0.22, -1.62);
  stick.add(bucket);

  const bucketBack = createBrickPart({ name: "excavatorBucketBack", color: "#171717", studsX: 2, studsZ: 1, height: 0.34 });
  bucketBack.position.set(0, 0, 0);
  bucketBack.rotation.x = -0.34;
  bucket.add(bucketBack);

  const bucketLip = createPlatePart({ name: "excavatorBucketLip", color: "#171717", studsX: 3, studsZ: 1 });
  bucketLip.position.set(0, -0.24, -0.34);
  bucketLip.scale.set(0.86, 0.72, 0.58);
  bucket.add(bucketLip);

  const teeth = new Group();
  teeth.name = "excavatorBucketTeeth";
  markPart(teeth, "bucketTeethAssembly");
  teeth.position.set(0, -0.26, -0.58);
  bucket.add(teeth);
  for (let i = 0; i < 4; i += 1) {
    const tooth = createRoundedPanel(`excavatorBucketTooth${i}`, 0.12, 0.08, 0.28, plastic.black);
    tooth.position.set(-0.3 + i * 0.2, 0, 0);
    tooth.rotation.x = -0.5;
    teeth.add(tooth);
  }

  return { root, crawlerBase, upper, boom, stick, bucket };
}

function createTrackAssembly(name: string): Group {
  const track = new Group();
  track.name = name;
  track.userData.vehicleRole = "track";
  markPart(track, "trackAssembly");

  const belt = createRoundedPanel(`${name}RubberBelt`, 0.58, 0.42, 3.05, plastic.black);
  belt.position.y = 0.18;
  track.add(belt);

  for (let i = 0; i < 6; i += 1) {
    const pad = createPlatePart({ name: `${name}Pad${i}`, color: "#171717", studsX: 1, studsZ: 1 });
    pad.position.set(0, 0.42, -1.28 + i * 0.51);
    pad.scale.set(1.3, 0.58, 0.68);
    track.add(pad);
  }

  for (let i = 0; i < 3; i += 1) {
    const wheel = createWheelPart(`${name}Roller${i}`, 0.19, 0.16);
    wheel.position.set(0, 0.18, -0.95 + i * 0.95);
    wheel.rotation.y = Math.PI / 2;
    track.add(wheel);
  }

  return track;
}

function createArmBeam(name: string, studsZ: number): Group {
  const beam = new Group();
  beam.name = name;
  markPart(beam, "armBeamAssembly");

  const left = createPlatePart({ name: `${name}LeftRail`, color: "#ffd21f", studsX: 1, studsZ });
  left.position.set(-0.18, 0, 0);
  left.scale.set(0.72, 0.68, 0.82);
  beam.add(left);

  const right = createPlatePart({ name: `${name}RightRail`, color: "#ffd21f", studsX: 1, studsZ });
  right.position.set(0.18, 0, 0);
  right.scale.set(0.72, 0.68, 0.82);
  beam.add(right);

  const cross = createPlatePart({ name: `${name}CrossBrace`, color: "#ffd21f", studsX: 2, studsZ: 1 });
  cross.position.set(0, 0.08, -studsZ * 0.17);
  cross.scale.set(0.82, 0.62, 0.68);
  beam.add(cross);

  return beam;
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

function addFence(scene: Scene): Group[] {
  const roots: Group[] = [];
  for (let i = 0; i < 12; i += 1) {
    const root = createDestructibleRoot(`destructibleFence${i}`, `fence${i}`);
    root.position.set(-14 + i * 2.2, 0, 9);
    const post = createBrickPart({ name: `fencePost${i}`, color: "#8a5a32", studsX: 1, studsZ: 1, height: 0.7 });
    post.scale.set(0.5, 1, 0.5);
    post.userData.destructibleCore = true;
    post.userData.farmDecor = true;
    root.add(post);
    root.add(createShard(`fenceShard${i}_0`, "#8a5a32", -0.22, 0.04, 0.1));
    root.add(createShard(`fenceShard${i}_1`, "#8a5a32", 0.18, 0.06, -0.08));
    scene.add(root);
    roots.push(root);
  }

  for (let i = 0; i < 5; i += 1) {
    const rail = createPlatePart({ name: `fenceRail${i}`, color: "#8a5a32", studsX: 8, studsZ: 1 });
    rail.scale.set(1.22, 0.45, 0.32);
    rail.position.set(-11.8 + i * 4.4, 0.55, 9);
    rail.userData.farmDecor = true;
    scene.add(rail);
  }

  return roots;
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

function addTrees(scene: Scene): Group[] {
  const positions = [
    { x: -12, z: 6 },
    { x: 13, z: 7 },
    { x: 12, z: -13 }
  ];
  const roots: Group[] = [];

  positions.forEach((position, index) => {
    const root = createDestructibleRoot(`destructibleTree${index}`, `tree${index}`);
    root.position.set(position.x, 0, position.z);
    const trunk = createBrickPart({ name: `treeTrunk${index}`, color: "#8a5a32", studsX: 1, studsZ: 1, height: 1.1 });
    trunk.scale.set(0.7, 1, 0.7);
    trunk.userData.destructibleCore = true;
    trunk.userData.farmDecor = true;
    root.add(trunk);

    const leaves = new Mesh(new SphereGeometry(1.15, 12, 8), plastic.leaf);
    leaves.name = `treeLeaves${index}`;
    leaves.position.set(0, 1.55, 0);
    leaves.castShadow = true;
    leaves.receiveShadow = true;
    leaves.userData.destructibleCore = true;
    leaves.userData.farmDecor = true;
    markPart(leaves, "treeLeaves");
    root.add(leaves);
    root.add(createShard(`treeShard${index}_wood`, "#8a5a32", -0.28, 0.05, 0.1));
    root.add(createShard(`treeShard${index}_leafA`, "#2f9b54", 0.22, 0.65, -0.12));
    root.add(createShard(`treeShard${index}_leafB`, "#2f9b54", 0.02, 0.92, 0.24));
    scene.add(root);
    roots.push(root);
  });

  return roots;
}

function createDestructibleBarn(): Group {
  const root = createDestructibleRoot("destructibleBarn", "barn");
  root.position.set(-9, 0, -8);

  const barn = createBarn();
  barn.name = "barn";
  barn.userData.destructibleCore = true;
  root.add(barn);

  root.add(createShard("barnShardRed0", "#b50018", -0.9, 0.04, -0.35));
  root.add(createShard("barnShardRed1", "#b50018", 0.8, 0.05, 0.22));
  root.add(createShard("barnShardRoof0", "#16283d", -0.42, 1.05, -0.72));
  root.add(createShard("barnShardRoof1", "#16283d", 0.44, 1.08, 0.68));
  root.add(createShard("barnShardDoor", "#f4efe3", 0.08, 0.1, -1.06));

  return root;
}

function createDestructibleRoot(name: string, id: string): Group {
  const root = new Group();
  root.name = name;
  root.userData.destructibleId = id;
  root.userData.farmDecor = true;
  root.userData.intactPosition = root.position.clone();
  root.userData.intactRotation = root.rotation.clone();
  markPart(root, "destructibleAssembly");
  return root;
}

function createShard(name: string, color: string, x: number, y: number, z: number): Group {
  const shard = createPlatePart({ name, color, studsX: 1, studsZ: 1 });
  shard.position.set(x, y, z);
  shard.scale.set(0.78, 0.7, 0.78);
  shard.visible = false;
  shard.userData.destructibleShard = true;
  shard.userData.basePosition = shard.position.clone();
  shard.userData.baseRotation = shard.rotation.clone();
  return shard;
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
