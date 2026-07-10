import { expect, test } from "@playwright/test";

test.describe("lego excavator game", () => {
  test("REQ-0001-001 renders a nonblank 3D farm canvas", async ({ page }, testInfo) => {
    await page.goto("/");

    const canvas = page.getByTestId("game-canvas");
    await expect(canvas).toBeVisible();
    await expect(page.getByTestId("hud")).toContainText("LEGO EXCAVATOR FARM");
    await expect(page.getByTestId("mode")).toContainText("步行");
    await expect(page.getByTestId("camera-mode")).toContainText("第三人称过肩");
    await expect(page.getByTestId("audio-mode")).toContainText("声音：按任意控制键启用");

    const canvasScreenshot = await canvas.screenshot();
    const screenshotDataUrl = `data:image/png;base64,${canvasScreenshot.toString("base64")}`;
    const nonBackgroundPixels = await page.evaluate(async (dataUrl) => {
      const image = new Image();
      image.src = dataUrl;
      await image.decode();
      const probe = document.createElement("canvas");
      probe.width = 96;
      probe.height = 64;
      const context = probe.getContext("2d", { willReadFrequently: true });
      if (!context) {
        return 0;
      }

      context.drawImage(image, 0, 0, probe.width, probe.height);
      const data = context.getImageData(0, 0, probe.width, probe.height).data;
      let count = 0;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i] ?? 0;
        const g = data[i + 1] ?? 0;
        const b = data[i + 2] ?? 0;
        const alpha = data[i + 3] ?? 0;
        const notSky = Math.abs(r - 143) + Math.abs(g - 208) + Math.abs(b - 255) > 30;
        if (alpha > 0 && notSky) {
          count += 1;
        }
      }
      return count;
    }, screenshotDataUrl);

    expect(nonBackgroundPixels).toBeGreaterThan(20);
    await testInfo.attach("farm-canvas", {
      body: canvasScreenshot,
      contentType: "image/png"
    });
  });

  test("REQ-0001-002 and REQ-0001-003 enters, drives, and exits excavator", async ({ page }) => {
    await page.goto("/");

    await page.keyboard.down("KeyD");
    await page.waitForTimeout(520);
    await page.keyboard.up("KeyD");
    await page.keyboard.down("KeyW");
    await page.waitForTimeout(520);
    await page.keyboard.up("KeyW");
    await page.keyboard.press("KeyE");

    await expect(page.getByTestId("mode")).toContainText("驾驶挖掘机");
    await expect(page.getByTestId("camera-mode")).toContainText("驾驶室视角");

    await page.keyboard.down("KeyW");
    await page.waitForTimeout(250);
    const engineAudioDebug = await page.evaluate(() => window.__legoGameDebug?.audio);
    expect(engineAudioDebug).toMatchObject({
      enabled: true
    });
    expect(engineAudioDebug?.activeLoops).toContain("engine");
    await page.keyboard.up("KeyW");
    await page.keyboard.down("KeyU");
    await page.waitForTimeout(250);
    const boomAudioDebug = await page.evaluate(() => window.__legoGameDebug?.audio);
    expect(boomAudioDebug?.activeLoops).toContain("hydraulicBoom");
    await page.keyboard.up("KeyU");
    await page.keyboard.down("KeyD");
    await page.waitForTimeout(180);
    await page.keyboard.up("KeyD");
    await page.keyboard.down("KeyL");
    await page.waitForTimeout(180);
    await page.keyboard.up("KeyL");
    await page.keyboard.down("KeyN");
    await page.waitForTimeout(180);
    await page.keyboard.up("KeyN");
    await page.keyboard.down("KeyY");
    await page.waitForTimeout(180);
    await page.keyboard.up("KeyY");

    const excavatorDebug = await page.evaluate(() => window.__legoGameDebug?.excavator);
    expect(excavatorDebug).toMatchObject({
      hasCrawlerBase: true,
      hasUpper: true,
      hasStick: true,
      hasBucket: true,
      transparentBody: true,
      bodyOpacity: 0.3
    });
    expect(Number(excavatorDebug?.crawlerHeading)).not.toBe(0);
    expect(Number(excavatorDebug?.upperRotation)).not.toBe(0);
    expect(Number(excavatorDebug?.boomAngle)).not.toBe(0.15);
    expect(Number(excavatorDebug?.stickAngle)).not.toBe(0);
    expect(Number(excavatorDebug?.bucketAngle)).not.toBe(0);
    await expect(page.getByTestId("hud")).toContainText("WASD 行走/开车");
    await expect(page.getByTestId("hud")).toContainText("U/O 大臂");
    await expect(page.getByTestId("hud")).toContainText("N/M 小臂");
    await expect(page.getByTestId("audio-mode")).toContainText("声音：已启用");
    await page.keyboard.press("KeyE");

    await expect(page.getByTestId("mode")).toContainText("步行");
    await expect(page.getByTestId("camera-mode")).toContainText("第三人称过肩");
  });

  test("REQ-0006-001 mouse movement steers FPS-style camera look after canvas click", async ({ page }) => {
    await page.goto("/");

    const before = await page.evaluate(() => window.__legoGameDebug?.controls as Record<string, unknown>);
    await page.getByTestId("game-canvas").click();
    await page.mouse.move(500, 300);
    await page.mouse.move(650, 300);
    await page.waitForTimeout(120);
    const after = await page.evaluate(() => window.__legoGameDebug?.controls as Record<string, unknown>);

    expect(Number(after.cameraYaw)).not.toBe(Number(before.cameraYaw));
    await expect(page.getByTestId("hud")).toContainText("点击画面锁定鼠标");
  });

  test("REQ-0004-002 and REQ-0004-004 drives into a destructible farm prop", async ({ page }) => {
    await page.goto("/");

    await page.evaluate(() => {
      const debug = window.__legoGameDebug as
        | ({ teleport?: (options: { mode: "driving"; excavatorPosition: { x: number; y: number; z: number } }) => void })
        | undefined;
      debug?.teleport?.({ mode: "driving", excavatorPosition: { x: -12, y: 0, z: 2.4 } });
    });
    await expect(page.getByTestId("mode")).toContainText("驾驶挖掘机");

    await page.keyboard.down("KeyS");
    await page.waitForTimeout(1400);
    await page.keyboard.up("KeyS");
    await page.waitForFunction(() => {
      const destructibles = window.__legoGameDebug?.destructibles as Record<string, unknown> | undefined;
      return Number(destructibles?.detachedCount ?? 0) > 0;
    });

    const destructibleDebug = await page.evaluate(() => window.__legoGameDebug?.destructibles);
    expect(Number(destructibleDebug?.detachedCount)).toBeGreaterThan(0);
    expect(Number(destructibleDebug?.shardCount)).toBeGreaterThan(0);
    await expect(page.getByTestId("hud")).toContainText("拆卸");
  });

  test("REQ-0004-005 keeps intact tree and barn pieces stable before impact", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(1200);

    const destructibleDebug = await page.evaluate(() => window.__legoGameDebug?.destructibles as Record<string, unknown>);
    const positions = destructibleDebug.visiblePartPositions as Record<string, number[]>;

    expect(positions.treeTrunk0?.[1]).toBeCloseTo(0, 5);
    expect(positions.treeLeaves0?.[1]).toBeCloseTo(1.55, 5);
    expect(positions.barnBase?.[1]).toBeCloseTo(0, 5);
    expect(Number(destructibleDebug.detachedCount)).toBe(0);
  });

  test("REQ-0004-005 breaks Rapier LEGO assemblies into moving parts", async ({ page }) => {
    await page.goto("/");

    await page.evaluate(() => {
      const debug = window.__legoGameDebug as
        | ({ teleport?: (options: { mode: "driving"; excavatorPosition: { x: number; y: number; z: number } }) => void })
        | undefined;
      debug?.teleport?.({ mode: "driving", excavatorPosition: { x: -12, y: 0, z: 2.4 } });
    });
    await expect(page.getByTestId("mode")).toContainText("驾驶挖掘机");

    await page.keyboard.down("KeyS");
    await page.waitForTimeout(1400);
    await page.keyboard.up("KeyS");
    await page.waitForFunction(() => {
      const physics = window.__legoGameDebug?.physics as Record<string, unknown> | undefined;
      return Number(physics?.assemblyBodyCount ?? 0) > 0 && Number(physics?.brokenLinkCount ?? 0) > 0;
    });

    const firstPhysics = await page.evaluate(() => window.__legoGameDebug?.physics as Record<string, unknown> | undefined);
    await page.waitForTimeout(450);
    const secondPhysics = await page.evaluate(() => window.__legoGameDebug?.physics as Record<string, unknown> | undefined);

    expect(firstPhysics?.engine).toBe("rapier");
    expect(Number(firstPhysics?.assemblyBodyCount)).toBeGreaterThan(0);
    expect(Number(firstPhysics?.brokenLinkCount)).toBeGreaterThan(0);
    expect(Number(firstPhysics?.kinematicColliderCount)).toBeGreaterThanOrEqual(2);
    expect(secondPhysics?.movingPartSample).toBeDefined();
    expect(secondPhysics?.movingPartSample).not.toEqual(firstPhysics?.movingPartSample);
  });

  test("REQ-0004-005 breaks the visible tree assembly when driven into tree0", async ({ page }) => {
    await page.goto("/");

    await page.evaluate(() => {
      const debug = window.__legoGameDebug as
        | ({ teleport?: (options: { mode: "driving"; excavatorPosition: { x: number; y: number; z: number } }) => void })
        | undefined;
      debug?.teleport?.({ mode: "driving", excavatorPosition: { x: -12, y: 0, z: 2.4 } });
    });
    await expect(page.getByTestId("mode")).toContainText("驾驶挖掘机");

    await page.keyboard.down("KeyS");
    await page.waitForTimeout(1400);
    await page.keyboard.up("KeyS");
    await page.waitForFunction(() => {
      const destructibles = window.__legoGameDebug?.destructibles as Record<string, unknown> | undefined;
      const physics = window.__legoGameDebug?.physics as Record<string, unknown> | undefined;
      const statuses = destructibles?.statuses as Record<string, unknown> | undefined;
      return statuses?.tree0 === "detached" && Number(physics?.brokenLinkCount ?? 0) > 0;
    });

    const destructibleDebug = await page.evaluate(() => window.__legoGameDebug?.destructibles as Record<string, unknown>);
    const physicsDebug = await page.evaluate(() => window.__legoGameDebug?.physics as Record<string, unknown>);
    const statuses = destructibleDebug.statuses as Record<string, unknown>;

    expect(statuses.tree0).toBe("detached");
    expect(Number(destructibleDebug.visiblePhysicsPartCount)).toBeGreaterThan(0);
    expect(Number(physicsDebug.brokenLinkCount)).toBeGreaterThan(0);
  });

  test("REQ-0004-005 breaks the visible barn assembly after repeated impacts", async ({ page }) => {
    await page.goto("/");

    await page.evaluate(() => {
      const debug = window.__legoGameDebug as
        | ({ teleport?: (options: { mode: "driving"; excavatorPosition: { x: number; y: number; z: number } }) => void })
        | undefined;
      debug?.teleport?.({ mode: "driving", excavatorPosition: { x: -9, y: 0, z: -5.5 } });
    });
    await expect(page.getByTestId("mode")).toContainText("驾驶挖掘机");

    for (let i = 0; i < 3; i += 1) {
      await page.keyboard.down("KeyW");
      await page.waitForTimeout(450);
      await page.keyboard.up("KeyW");
      await page.keyboard.down("KeyS");
      await page.waitForTimeout(450);
      await page.keyboard.up("KeyS");
    }
    await page.waitForFunction(() => {
      const destructibles = window.__legoGameDebug?.destructibles as Record<string, unknown> | undefined;
      const physics = window.__legoGameDebug?.physics as Record<string, unknown> | undefined;
      const statuses = destructibles?.statuses as Record<string, unknown> | undefined;
      return statuses?.barn === "detached" && Number(physics?.brokenLinkCount ?? 0) > 0;
    });

    const destructibleDebug = await page.evaluate(() => window.__legoGameDebug?.destructibles as Record<string, unknown>);
    const statuses = destructibleDebug.statuses as Record<string, unknown>;

    expect(statuses.barn).toBe("detached");
    expect(Number(destructibleDebug.visiblePhysicsPartCount)).toBeGreaterThan(0);
  });

  test("REQ-0005-002 opens the LDraw community model browser", async ({ page }) => {
    await page.goto("/");

    await page.keyboard.press("KeyB");

    const panel = page.getByTestId("community-model-panel");
    await expect(panel).toBeVisible();
    await expect(panel).toContainText("LDraw 模型库");
    await expect(panel).toContainText("Radar Truck");
    await expect(panel).not.toContainText("Mini Construction");
    await expect(panel).not.toContainText("Lighthouse");
    await expect(panel).toContainText("许可证");
    await expect(panel.locator("[data-testid='community-model-card']")).toHaveCount(1);

    await page.keyboard.press("KeyB");
    await expect(panel).toBeHidden();
  });

  test("REQ-0005-003 and REQ-0005-004 spawns and breaks a loaded LDraw community model", async ({ page }) => {
    await page.goto("/");
    const initialInstanceCount = await page.evaluate(() => {
      const communityModels = window.__legoGameDebug?.communityModels as Record<string, unknown> | undefined;
      return Number(communityModels?.instanceCount ?? 0);
    });

    await page.keyboard.press("KeyB");
    await page.getByTestId("spawn-community-model-radar-truck").click();

    await page.waitForFunction(() => {
      const communityModels = window.__legoGameDebug?.communityModels as Record<string, unknown> | undefined;
      return Number(communityModels?.instanceCount ?? 0) > 0 && Number(communityModels?.visiblePartCount ?? 0) > 0;
    });

    const spawnedDebug = await page.evaluate(() => window.__legoGameDebug?.communityModels as Record<string, unknown>);
    expect(Number(spawnedDebug.instanceCount)).toBeGreaterThan(initialInstanceCount);
    expect(spawnedDebug.modelFormat).toBe("ldraw");
    expect(spawnedDebug.sourceKinds).toContain("ldraw-packed");
    expect(Number(spawnedDebug.visiblePartCount)).toBeGreaterThan(0);

    const spawnedInstancePosition = await page.evaluate((countBefore) => {
      const communityModels = window.__legoGameDebug?.communityModels as Record<string, unknown>;
      const instances = communityModels.instances as Array<{ position: number[] }>;
      return instances[countBefore]?.position ?? instances[instances.length - 1]?.position;
    }, initialInstanceCount);
    await page.evaluate((position) => {
      const debug = window.__legoGameDebug as
        | ({ teleport?: (options: { mode: "driving"; excavatorPosition: { x: number; y: number; z: number } }) => void })
        | undefined;
      debug?.teleport?.({ mode: "driving", excavatorPosition: { x: position[0], y: 0, z: position[2] + 2.8 } });
    }, spawnedInstancePosition);
    await expect(page.getByTestId("mode")).toContainText("驾驶挖掘机");

    await page.keyboard.down("KeyW");
    await page.waitForTimeout(1200);
    await page.keyboard.up("KeyW");
    await page.waitForFunction(() => {
      const communityModels = window.__legoGameDebug?.communityModels as Record<string, unknown> | undefined;
      const physics = window.__legoGameDebug?.physics as Record<string, unknown> | undefined;
      return communityModels?.statuses && Object.values(communityModels.statuses as Record<string, unknown>).includes("detached") && Number(physics?.brokenLinkCount ?? 0) > 0;
    });

    const firstPhysics = await page.evaluate(() => window.__legoGameDebug?.physics as Record<string, unknown>);
    await page.waitForTimeout(450);
    const secondPhysics = await page.evaluate(() => window.__legoGameDebug?.physics as Record<string, unknown>);
    const detachedDebug = await page.evaluate(() => window.__legoGameDebug?.communityModels as Record<string, unknown>);

    expect(Object.values(detachedDebug.statuses as Record<string, unknown>)).toContain("detached");
    expect(Number(firstPhysics.brokenLinkCount)).toBeGreaterThan(0);
    expect(secondPhysics.movingPartSample).not.toEqual(firstPhysics.movingPartSample);
  });

  test("REQ-0007-001 enters and drives spawned community vehicle models", async ({ page }) => {
    await page.goto("/");

    await page.waitForFunction(() => {
      const communityModels = window.__legoGameDebug?.communityModels as Record<string, unknown> | undefined;
      return Number(communityModels?.instanceCount ?? 0) >= 3;
    });

    const spawnedVehicles = await page.evaluate(() => {
      const communityModels = window.__legoGameDebug?.communityModels as Record<string, unknown>;
      const instances = communityModels.instances as Array<{ modelId: string; position: number[]; wheelCount: number; colorVariantIndex: number }>;
      return instances.map((instance) => ({
        modelId: instance.modelId,
        position: instance.position,
        wheelCount: instance.wheelCount,
        colorVariantIndex: instance.colorVariantIndex
      }));
    });
    expect(spawnedVehicles.every((instance) => instance.modelId === "radar-truck")).toBe(true);
    expect(spawnedVehicles.every((instance) => instance.wheelCount === 4)).toBe(true);
    expect(new Set(spawnedVehicles.map((instance) => instance.colorVariantIndex)).size).toBeGreaterThan(1);
    const firstVehiclePosition = spawnedVehicles[0].position;
    await page.evaluate((position) => {
      const debug = window.__legoGameDebug as
        | ({ teleport?: (options: { mode: "onFoot"; playerPosition?: { x: number; y: number; z: number } }) => void })
        | undefined;
      debug?.teleport?.({ mode: "onFoot", playerPosition: { x: position[0], y: 0, z: position[2] + 1.2 } });
    }, firstVehiclePosition);
    await page.keyboard.press("KeyE");
    await expect(page.getByTestId("mode")).toContainText("驾驶社区车辆");

    const before = await page.evaluate(() => {
      const communityModels = window.__legoGameDebug?.communityModels as Record<string, unknown>;
      const instances = communityModels.instances as Array<{ id: string; position: number[]; wheelCount: number }>;
      const activeId = (window.__legoGameDebug?.controls as Record<string, unknown>).communityVehicleDriving as string;
      return {
        position: instances.find((instance) => instance.id === activeId)?.position,
        wheelRotation: Number(communityModels.wheelRotationSample ?? 0),
        wheelCount: Number(instances.find((instance) => instance.id === activeId)?.wheelCount ?? 0)
      };
    });
    await page.keyboard.down("KeyW");
    await page.waitForTimeout(550);
    await page.keyboard.up("KeyW");
    const after = await page.evaluate(() => {
      const communityModels = window.__legoGameDebug?.communityModels as Record<string, unknown>;
      const instances = communityModels.instances as Array<{ id: string; position: number[]; wheelCount: number }>;
      const activeId = (window.__legoGameDebug?.controls as Record<string, unknown>).communityVehicleDriving as string;
      return {
        position: instances.find((instance) => instance.id === activeId)?.position,
        wheelRotation: Number(communityModels.wheelRotationSample ?? 0),
        wheelCount: Number(instances.find((instance) => instance.id === activeId)?.wheelCount ?? 0)
      };
    });

    expect(after.position?.[2]).toBeLessThan((before.position?.[2] ?? 0) - 0.8);
    expect(after.wheelCount).toBe(4);
    expect(after.wheelRotation).not.toBe(before.wheelRotation);
    await page.keyboard.press("KeyE");
    await expect(page.getByTestId("mode")).toContainText("步行");
  });

  test("REQ-0005-003 spaces and grounds loaded radar truck community models", async ({ page }) => {
    await page.goto("/");

    await page.waitForFunction(() => {
      const communityModels = window.__legoGameDebug?.communityModels as Record<string, unknown> | undefined;
      return Number(communityModels?.instanceCount ?? 0) >= 3;
    });

    const debug = await page.evaluate(() => window.__legoGameDebug?.communityModels as Record<string, unknown>);
    const instances = debug.instances as Array<{ position: number[]; boundsMin: number[] }>;
    expect(instances.length).toBeGreaterThanOrEqual(3);

    for (const instance of instances) {
      expect(instance.boundsMin[1]).toBeGreaterThanOrEqual(-0.02);
      expect(instance.boundsMin[1]).toBeLessThan(0.05);
    }
    for (let a = 0; a < instances.length; a += 1) {
      for (let b = a + 1; b < instances.length; b += 1) {
        const dx = instances[a].position[0] - instances[b].position[0];
        const dz = instances[a].position[2] - instances[b].position[2];
        expect(Math.hypot(dx, dz)).toBeGreaterThanOrEqual(28);
      }
    }
  });

  test("REQ-0006-001 REQ-0006-003 REQ-0006-004 LEGO shooter default targets and gatling fire", async ({ page }) => {
    await page.goto("/");

    await page.waitForFunction(() => {
      const communityModels = window.__legoGameDebug?.communityModels as Record<string, unknown> | undefined;
      return Number(communityModels?.instanceCount ?? 0) >= 3;
    });
    await expect(page.getByTestId("hud")).toContainText("左键 射击");

    const before = await page.evaluate(() => {
      const debug = window.__legoGameDebug as Record<string, unknown>;
      return {
        worldBounds: debug.worldBounds,
        weapon: debug.weapon,
        communityModels: debug.communityModels
      };
    });
    const worldBounds = before.worldBounds as { width: number; depth: number };
    expect(worldBounds.width).toBeGreaterThanOrEqual(300);
    expect(worldBounds.depth).toBeGreaterThanOrEqual(300);

    await page.getByTestId("game-canvas").click();
    await page.mouse.down();
    await page.waitForTimeout(750);
    await page.mouse.up();

    const fired = await page.evaluate(() => window.__legoGameDebug?.weapon as Record<string, unknown>);
    expect(Number(fired.shotsFired)).toBeGreaterThan(5);
    expect(Number(fired.activeProjectileCount)).toBeGreaterThan(0);

    await page.waitForFunction(() => {
      const weapon = window.__legoGameDebug?.weapon as Record<string, unknown> | undefined;
      return Number(weapon?.activeProjectileCount ?? -1) === 0;
    });

    const cleaned = await page.evaluate(() => window.__legoGameDebug?.weapon as Record<string, unknown>);
    expect(Number(cleaned.activeProjectileCount)).toBe(0);

    await page.waitForFunction(() => {
      const communityModels = window.__legoGameDebug?.communityModels as Record<string, unknown> | undefined;
      const physics = window.__legoGameDebug?.physics as Record<string, unknown> | undefined;
      const statuses = communityModels?.statuses as Record<string, unknown> | undefined;
      return Object.values(statuses ?? {}).includes("detached") && Number(physics?.brokenLinkCount ?? 0) > 0;
    });
  });

  test("REQ-0007-001 REQ-0007-002 REQ-0007-003 REQ-0007-005 REQ-0007-006 REQ-0007-007 v9 shooter swarm", async ({ page }) => {
    await page.goto("/");

    await page.waitForFunction(() => {
      const communityModels = window.__legoGameDebug?.communityModels as Record<string, unknown> | undefined;
      return Number(communityModels?.instanceCount ?? 0) >= 27;
    }, undefined, { timeout: 30000 });

    const initial = await page.evaluate(() => {
      const debug = window.__legoGameDebug as Record<string, unknown>;
      return {
        communityModels: debug.communityModels as Record<string, unknown>,
        vehicles: debug.vehicles as Record<string, unknown>,
        weapon: debug.weapon as Record<string, unknown>,
        performance: debug.performance as Record<string, unknown>
      };
    });
    expect(Number(initial.communityModels.instanceCount)).toBeGreaterThanOrEqual(27);
    expect(initial.communityModels.modelFormat).toBe("ldraw");
    expect(Number(initial.vehicles.patrolCount)).toBeGreaterThanOrEqual(2);
    expect(initial.weapon.hasGatlingGun).toBe(true);
    expect(Number(initial.weapon.barrelCount)).toBe(6);
    expect(Number(initial.performance.fps)).toBeGreaterThan(0);
    expect(Number(initial.performance.sampleCount)).toBeGreaterThan(0);
    expect(Number(initial.performance.targetCacheEntryCount)).toBeGreaterThanOrEqual(27);
    expect(Number(initial.performance.communitySteadyStateTraversalCount)).toBe(0);
    expect(Number(initial.performance.pixelRatioCap)).toBe(1.5);
    expect(Number(initial.performance.activePixelRatio)).toBeLessThanOrEqual(1.5);
    expect(initial.performance.preserveDrawingBuffer).toBe(false);
    expect(Number(initial.performance.drawCalls)).toBeGreaterThan(0);
    expect(Number(initial.performance.triangles)).toBeGreaterThan(0);

    const beforeVehicle = await page.evaluate(() => {
      const communityModels = window.__legoGameDebug?.communityModels as Record<string, unknown>;
      const instances = communityModels.instances as Array<{ modelId: string; position: number[] }>;
      return instances.find((instance) => instance.modelId === "radar-truck")?.position;
    });
    await page.waitForTimeout(750);
    const afterVehicle = await page.evaluate(() => {
      const communityModels = window.__legoGameDebug?.communityModels as Record<string, unknown>;
      const instances = communityModels.instances as Array<{ modelId: string; position: number[] }>;
      return instances.find((instance) => instance.modelId === "radar-truck")?.position;
    });
    expect(afterVehicle).toBeDefined();
    expect(Math.hypot((afterVehicle?.[0] ?? 0) - (beforeVehicle?.[0] ?? 0), (afterVehicle?.[2] ?? 0) - (beforeVehicle?.[2] ?? 0))).toBeGreaterThan(0.1);

    await page.evaluate(() => {
      const debug = window.__legoGameDebug as
        | ({ teleport?: (options: { mode: "onFoot"; playerPosition?: { x: number; y: number; z: number } }) => void })
        | undefined;
      debug?.teleport?.({ mode: "onFoot", playerPosition: { x: 0, y: 0, z: -30 } });
    });
    await page.getByTestId("game-canvas").click();
    await page.mouse.down();
    await page.waitForTimeout(900);
    const firing = await page.evaluate(() => window.__legoGameDebug?.weapon as Record<string, unknown>);
    expect(firing.projectileVisualKind).toBe("tracer-streak");
    expect(Number(firing.tracerVisualCount)).toBeGreaterThan(0);
    await page.mouse.up();

    await page.waitForFunction(() => {
      const communityModels = window.__legoGameDebug?.communityModels as Record<string, unknown> | undefined;
      const statuses = communityModels?.statuses as Record<string, unknown> | undefined;
      return Object.values(statuses ?? {}).includes("detached");
    }, undefined, { timeout: 10000 });

    await page.waitForFunction(() => {
      const cleanup = window.__legoGameDebug?.cleanup as Record<string, unknown> | undefined;
      return Number(cleanup?.removedDebrisCount ?? 0) > 0;
    }, undefined, { timeout: 12000 });

    const cleanup = await page.evaluate(() => window.__legoGameDebug?.cleanup as Record<string, unknown>);
    expect(Number(cleanup.removedDebrisCount)).toBeGreaterThan(0);
  });
});
