import { chromium } from "playwright";
import { startServer } from "./server.mjs";
import { mockRPC } from "./rpc-fixture.mjs";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { root } from "../scripts/common.mjs";
const server = await startServer(),
  browser = await chromium.launch({ headless: true });
try {
  await mkdir(resolve(root, "docs/validation/screenshots"), {
    recursive: true,
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 1,
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await mockRPC(page);
  await page.goto(server.url + "/preview/");
  await page
    .getByRole("heading", { name: "Skyline Heist", exact: true })
    .waitFor();
  await page.evaluate(() => document.fonts.ready);
  await page.getByRole("button", { name: "Pause scenery" }).click();
  await page.screenshot({
    path: resolve(root, "docs/validation/screenshots/desktop.jpg"),
    type: "jpeg",
    fullPage: true,
    quality: 80,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: resolve(root, "docs/validation/screenshots/mobile.jpg"),
    type: "jpeg",
    fullPage: true,
    quality: 80,
  });
  await page.goto(server.url + "/host?preview=true");
  const game = page.frameLocator("iframe");
  await game.getByRole("button", { name: "Play review demo" }).waitFor();
  await page.screenshot({
    path: resolve(root, "docs/validation/screenshots/game-menu.jpg"),
    type: "jpeg",
    quality: 85,
  });
  await game.getByRole("button", { name: "Play review demo" }).click();
  await page.keyboard.down("Space");
  await page.waitForTimeout(2500);
  await page.keyboard.up("Space");
  await page.screenshot({
    path: resolve(root, "docs/validation/screenshots/gameplay-mobile.jpg"),
    type: "jpeg",
    quality: 85,
  });
  await page.keyboard.press("Escape");
  console.log(JSON.stringify({ url: server.url, errors }, null, 2));
} finally {
  await browser.close();
  await server.close();
}
