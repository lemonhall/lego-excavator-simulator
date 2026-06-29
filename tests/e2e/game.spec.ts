import { expect, test } from "@playwright/test";

test.describe("lego excavator game", () => {
  test("REQ-0001-001 renders a nonblank 3D farm canvas", async ({ page }, testInfo) => {
    await page.goto("/");

    const canvas = page.getByTestId("game-canvas");
    await expect(canvas).toBeVisible();
    await expect(page.getByTestId("hud")).toContainText("LEGO EXCAVATOR FARM");
    await expect(page.getByTestId("mode")).toContainText("ON FOOT");
    await expect(page.getByTestId("camera-mode")).toContainText("OVER-SHOULDER");

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

    await expect(page.getByTestId("mode")).toContainText("DRIVING");
    await expect(page.getByTestId("camera-mode")).toContainText("CAB VIEW");

    await page.keyboard.down("KeyW");
    await page.waitForTimeout(250);
    await page.keyboard.up("KeyW");
    await page.keyboard.down("KeyR");
    await page.waitForTimeout(250);
    await page.keyboard.up("KeyR");
    await page.keyboard.press("KeyE");

    await expect(page.getByTestId("mode")).toContainText("ON FOOT");
    await expect(page.getByTestId("camera-mode")).toContainText("OVER-SHOULDER");
  });
});
