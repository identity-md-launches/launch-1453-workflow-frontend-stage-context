import { chromium } from "playwright";
import { startServer } from "./server.mjs";
import { writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { root } from "../scripts/common.mjs";
const server = await startServer(),
  browser = await chromium.launch({ headless: true });
const observations = {
  browser: browser.version(),
  environment:
    "Headless Chromium on this worker; not physical phone performance",
  viewports: [],
  framePacing: {},
};
try {
  await mkdir(resolve(root, "docs/validation/screenshots"), {
    recursive: true,
  });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
  });
  const page = await context.newPage();
  await page.clock.install({ time: new Date() });
  await page.goto(server.url + "/host?preview=true");
  const game = page.frameLocator("iframe");
  await game.getByRole("button", { name: "Play review demo" }).waitFor();
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  await game.getByRole("button", { name: "Play review demo" }).click();
  await page.keyboard.down("Space");
  await page.clock.runFor(23000);
  await page.screenshot({
    path: resolve(root, "docs/validation/screenshots/billboard-canyon.jpg"),
    type: "jpeg",
    quality: 85,
  });
  await page.clock.runFor(38000);
  await page.keyboard.up("Space");
  await game.getByRole("heading", { name: "Extraction complete" }).waitFor();
  await page.screenshot({
    path: resolve(root, "docs/validation/screenshots/result-mobile.jpg"),
    type: "jpeg",
    quality: 85,
  });
  await game
    .locator(".result-overlay")
    .evaluate((e) => (e.scrollTop = e.scrollHeight));
  await page.screenshot({
    path: resolve(
      root,
      "docs/validation/screenshots/result-mobile-actions.jpg",
    ),
    type: "jpeg",
    quality: 85,
  });
  for (const width of [320, 390, 760, 900, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    observations.viewports.push(
      await page
        .frames()
        .find((f) => f.url().includes("/preview/"))
        .evaluate(() => ({
          width: innerWidth,
          scrollWidth: document.documentElement.scrollWidth,
          resultScrolls:
            document.querySelector(".result-overlay").scrollHeight >
            document.querySelector(".result-overlay").clientHeight,
        })),
    );
  }
  await context.close();
  const live = await browser.newContext({
      viewport: { width: 1280, height: 900 },
    }),
    p = await live.newPage();
  await p.goto(server.url + "/host?preview=true");
  await p
    .frameLocator("iframe")
    .getByRole("button", { name: "Play review demo" })
    .click();
  observations.framePacing = await p
    .frames()
    .find((f) => f.url().includes("/preview/"))
    .evaluate(
      () =>
        new Promise((resolve) => {
          const intervals = [];
          let last = performance.now(),
            start = last;
          function frame(t) {
            if (t > last) intervals.push(t - last);
            last = t;
            if (t - start < 3000) requestAnimationFrame(frame);
            else {
              intervals.sort((a, b) => a - b);
              resolve({
                durationMs: t - start,
                frames: intervals.length,
                medianMs: intervals[Math.floor(intervals.length * 0.5)],
                p95Ms: intervals[Math.floor(intervals.length * 0.95)],
                maximumMs: Math.max(...intervals),
              });
            }
          }
          requestAnimationFrame(frame);
        }),
    );
  await writeFile(
    resolve(root, "docs/validation/visual-review.json"),
    JSON.stringify(observations, null, 2) + "\n",
  );
  console.log(JSON.stringify(observations, null, 2));
} finally {
  await browser.close();
  await server.close();
}
