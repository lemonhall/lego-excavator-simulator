export interface PhysicsVec3 {
  x: number;
  y: number;
  z: number;
}

export interface AssemblyPartOptions {
  id: string;
  locked: boolean;
  position: PhysicsVec3;
  halfExtents: PhysicsVec3;
  colliderOffset?: PhysicsVec3;
}

export interface BreakableLinkOptions {
  id: string;
  partA: string;
  partB: string;
  breakDistance: number;
}

export interface KinematicBoxOptions {
  position: PhysicsVec3;
  halfExtents: PhysicsVec3;
  rotationY: number;
}

export interface PhysicsBodyHandle {
  id: string;
  translation: () => PhysicsVec3;
  rotation: () => QuaternionLike;
}

export interface QuaternionLike {
  x: number;
  y: number;
  z: number;
  w: number;
}

export interface PhysicsDebugState {
  engine: "rapier" | "loading";
  ready: boolean;
  fixedColliderCount: number;
  assemblyBodyCount: number;
  activeLinkCount: number;
  brokenLinkCount: number;
  kinematicColliderCount: number;
  movingPartSample?: PhysicsVec3;
}

export interface PhysicsWorldController {
  addAssemblyPart: (options: AssemblyPartOptions) => PhysicsBodyHandle;
  addBreakableLink: (options: BreakableLinkOptions) => void;
  applyPartImpulse: (id: string, impulse: PhysicsVec3) => void;
  setPartTransform: (id: string, position: PhysicsVec3, rotation?: QuaternionLike) => void;
  setKinematicBox: (id: string, options: KinematicBoxOptions) => void;
  step: (dt: number) => void;
  getDebugState: () => PhysicsDebugState;
}

type RapierModule = typeof import("@dimforge/rapier3d-compat");
type RapierWorld = import("@dimforge/rapier3d-compat").World;
type RapierRigidBody = import("@dimforge/rapier3d-compat").RigidBody;
type RapierCollider = import("@dimforge/rapier3d-compat").Collider;

interface AssemblyPartRecord {
  id: string;
  locked: boolean;
  body: RapierRigidBody;
  collider: RapierCollider;
}

interface BreakableLinkRecord {
  id: string;
  partA: string;
  partB: string;
  initialOffset: PhysicsVec3;
  breakDistance: number;
  broken: boolean;
}

const GRAVITY: PhysicsVec3 = { x: 0, y: -9.81, z: 0 };

export async function createPhysicsWorldController(): Promise<PhysicsWorldController> {
  const Rapier = await import("@dimforge/rapier3d-compat");
  await Rapier.init();

  return new RapierPhysicsWorldController(Rapier);
}

class RapierPhysicsWorldController implements PhysicsWorldController {
  private readonly world: RapierWorld;
  private readonly assemblyParts = new Map<string, AssemblyPartRecord>();
  private readonly breakableLinks = new Map<string, BreakableLinkRecord>();
  private readonly kinematicBodies = new Map<string, RapierRigidBody>();
  private readonly kinematicColliders = new Map<string, RapierCollider>();
  private fixedColliderCount = 0;

  constructor(private readonly Rapier: RapierModule) {
    this.world = new Rapier.World(GRAVITY);
    this.addGround();
  }

  addAssemblyPart(options: AssemblyPartOptions): PhysicsBodyHandle {
    const existing = this.assemblyParts.get(options.id)?.body;
    if (existing) {
      return this.createBodyHandle(options.id, existing);
    }

    const bodyDesc = (options.locked ? this.Rapier.RigidBodyDesc.fixed() : this.Rapier.RigidBodyDesc.dynamic())
      .setTranslation(options.position.x, options.position.y, options.position.z);
    const body = this.world.createRigidBody(bodyDesc);
    const colliderDesc = this.Rapier.ColliderDesc.cuboid(
      options.halfExtents.x,
      options.halfExtents.y,
      options.halfExtents.z
    )
      .setRestitution(0.18)
      .setFriction(0.72);
    if (options.colliderOffset) {
      colliderDesc.setTranslation(options.colliderOffset.x, options.colliderOffset.y, options.colliderOffset.z);
    }
    const collider = this.world.createCollider(colliderDesc, body);

    this.assemblyParts.set(options.id, {
      id: options.id,
      locked: options.locked,
      body,
      collider
    });
    return this.createBodyHandle(options.id, body);
  }

  addBreakableLink(options: BreakableLinkOptions): void {
    if (this.breakableLinks.has(options.id)) {
      return;
    }

    const partA = this.requireAssemblyPart(options.partA);
    const partB = this.requireAssemblyPart(options.partB);
    const a = partA.body.translation();
    const b = partB.body.translation();

    this.breakableLinks.set(options.id, {
      id: options.id,
      partA: options.partA,
      partB: options.partB,
      initialOffset: { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z },
      breakDistance: options.breakDistance,
      broken: false
    });
  }

  applyPartImpulse(id: string, impulse: PhysicsVec3): void {
    const part = this.requireAssemblyPart(id);
    if (part.locked) {
      return;
    }

    this.breakLinksForImpulse(id, impulse);
    part.body.applyImpulse(impulse, true);
    part.body.applyTorqueImpulse(
      {
        x: impulse.z * 0.18,
        y: impulse.x * 0.1,
        z: -impulse.x * 0.18
      },
      true
    );
  }

  setPartTransform(id: string, position: PhysicsVec3, rotation?: QuaternionLike): void {
    const part = this.requireAssemblyPart(id);
    if (part.locked) {
      return;
    }

    part.body.setTranslation(position, true);
    if (rotation) {
      part.body.setRotation(rotation, true);
    }
    part.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    part.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
  }

  private breakLinksForImpulse(id: string, impulse: PhysicsVec3): void {
    const impulseMagnitude = Math.hypot(impulse.x, impulse.y, impulse.z);
    this.breakableLinks.forEach((link) => {
      if (link.broken || (link.partA !== id && link.partB !== id)) {
        return;
      }

      if (impulseMagnitude > link.breakDistance * 4) {
        link.broken = true;
      }
    });
  }

  setKinematicBox(id: string, options: KinematicBoxOptions): void {
    let body = this.kinematicBodies.get(id);
    if (!body) {
      body = this.world.createRigidBody(this.Rapier.RigidBodyDesc.kinematicPositionBased());
      const collider = this.world.createCollider(
        this.Rapier.ColliderDesc.cuboid(options.halfExtents.x, options.halfExtents.y, options.halfExtents.z)
          .setFriction(0.85)
          .setRestitution(0.05),
        body
      );
      this.kinematicBodies.set(id, body);
      this.kinematicColliders.set(id, collider);
    }

    body.setNextKinematicTranslation(options.position);
    body.setNextKinematicRotation(rotationYToQuaternion(options.rotationY));
  }

  step(dt: number): void {
    this.world.timestep = Math.min(1 / 30, Math.max(1 / 120, dt));
    this.enforceActiveLinks();
    this.world.step();
    this.updateBrokenLinks();
    this.enforceActiveLinks();
  }

  getDebugState(): PhysicsDebugState {
    const brokenLink = [...this.breakableLinks.values()].find((link) => link.broken);
    const preferredSampleId = brokenLink?.partB;
    const sampleRecord = preferredSampleId
      ? this.assemblyParts.get(preferredSampleId)
      : [...this.assemblyParts.values()].find((part) => !part.locked);
    const sample = sampleRecord?.body.translation();
    const activeLinkCount = [...this.breakableLinks.values()].filter((link) => !link.broken).length;
    const brokenLinkCount = [...this.breakableLinks.values()].filter((link) => link.broken).length;

    return {
      engine: "rapier",
      ready: true,
      fixedColliderCount: this.fixedColliderCount,
      assemblyBodyCount: this.assemblyParts.size,
      activeLinkCount,
      brokenLinkCount,
      kinematicColliderCount: this.kinematicColliders.size,
      movingPartSample: sample ? { x: sample.x, y: sample.y, z: sample.z } : undefined
    };
  }

  private enforceActiveLinks(): void {
    this.breakableLinks.forEach((link) => {
      if (link.broken) {
        return;
      }

      const partA = this.requireAssemblyPart(link.partA);
      const partB = this.requireAssemblyPart(link.partB);
      if (partB.locked) {
        return;
      }

      const a = partA.body.translation();
      const b = partB.body.translation();
      const expected = {
        x: a.x + link.initialOffset.x,
        y: a.y + link.initialOffset.y,
        z: a.z + link.initialOffset.z
      };
      const drift = distance(b, expected);
      if (drift <= link.breakDistance) {
        partB.body.setTranslation(expected, true);
        partB.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
        partB.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
      }
    });
  }

  private updateBrokenLinks(): void {
    this.breakableLinks.forEach((link) => {
      if (link.broken) {
        return;
      }

      const partA = this.requireAssemblyPart(link.partA);
      const partB = this.requireAssemblyPart(link.partB);
      const a = partA.body.translation();
      const b = partB.body.translation();
      const expected = {
        x: a.x + link.initialOffset.x,
        y: a.y + link.initialOffset.y,
        z: a.z + link.initialOffset.z
      };

      if (distance(b, expected) > link.breakDistance) {
        link.broken = true;
      }
    });
  }

  private addGround(): void {
    const ground = this.Rapier.ColliderDesc.cuboid(24, 0.12, 24)
      .setTranslation(0, -0.12, 0)
      .setFriction(0.92)
      .setRestitution(0.02);
    this.world.createCollider(ground);
    this.fixedColliderCount += 1;
  }

  private createBodyHandle(id: string, body: RapierRigidBody): PhysicsBodyHandle {
    return {
      id,
      translation: () => {
        const translation = body.translation();
        return { x: translation.x, y: translation.y, z: translation.z };
      },
      rotation: () => {
        const rotation = body.rotation();
        return { x: rotation.x, y: rotation.y, z: rotation.z, w: rotation.w };
      }
    };
  }

  private requireAssemblyPart(id: string): AssemblyPartRecord {
    const part = this.assemblyParts.get(id);
    if (!part) {
      throw new Error(`Unknown physics assembly part: ${id}`);
    }
    return part;
  }
}

function rotationYToQuaternion(rotationY: number): QuaternionLike {
  const half = rotationY / 2;
  return {
    x: 0,
    y: Math.sin(half),
    z: 0,
    w: Math.cos(half)
  };
}

function distance(a: PhysicsVec3, b: PhysicsVec3): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}
