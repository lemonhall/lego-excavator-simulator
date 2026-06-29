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

    const nonBackgroundPixels = await page.evaluate(() => {
      const gameCanvas = document.querySelector<HTMLCanvasElement>('[data-testid="game-canvas"]');
      if (!gameCanvas) {
        return 0;
      }

      const probe = document.createElement("canvas");
      probe.width = 96;
      probe.height = 64;
      const context = probe.getContext("2d", { willReadFrequently: true });
      if (!context) {
        return 0;
      }

      context.drawImage(gameCanvas, 0, 0, probe.width, probe.height);
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
    });

    expect(nonBackgroundPixels).toBeGreaterThan(20);
    await testInfo.attach("farm-canvas", {
      body: await page.screenshot({ fullPage: true }),
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

  test("REQ-0004-002 and REQ-0004-004 drives into a destructible farm prop", async ({ page }) => {
    await page.goto("/");

    await page.keyboard.down("KeyD");
    await page.waitForTimeout(520);
    await page.keyboard.up("KeyD");
    await page.keyboard.down("KeyW");
    await page.waitForTimeout(520);
    await page.keyboard.up("KeyW");
    await page.keyboard.press("KeyE");

    await expect(page.getByTestId("mode")).toContainText("驾驶挖掘机");

    await page.keyboard.down("KeyA");
    await page.waitForTimeout(5000);
    await page.keyboard.up("KeyA");
    await page.keyboard.down("KeyS");
    await page.waitForTimeout(3700);
    await page.keyboard.up("KeyS");

    const destructibleDebug = await page.evaluate(() => window.__legoGameDebug?.destructibles);
    expect(Number(destructibleDebug?.detachedCount)).toBeGreaterThan(0);
    expect(Number(destructibleDebug?.shardCount)).toBeGreaterThan(0);
    await expect(page.getByTestId("hud")).toContainText("拆卸");
  });
});
