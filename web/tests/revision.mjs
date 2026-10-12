import { chromium } from "playwright";
import { expect } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { startServer, testHashes } from "./server.mjs";
import { mockRPC } from "./rpc-fixture.mjs";
import { root, sha256 } from "../scripts/common.mjs";

// Regression coverage for the independent review. All wallet/RPC traffic is mocked.
const server = await startServer(),
  browser = await chromium.launch();
const out = resolve(root, "docs/validation/revision");
const report = {
  browser: browser.version(),
  manifestSha256: sha256(await readFile(resolve(root, "dist/imd-deployment.json"))),
  checkedAt: new Date().toISOString(),
  tests: [],
  measurements: {},
  errors: [],
};
await mkdir(out, { recursive: true });
async function run(name, fn) {
  try {
    await fn();
    report.tests.push({ name, passed: true });
    console.log("PASS", name);
  } catch (e) {
    report.tests.push({ name, passed: false, error: e.stack });
    console.error("FAIL", name, e.message);
  }
}
async function open(query, viewport) {
  const context = await browser.newContext({ viewport, hasTouch: true });
  const page = await context.newPage();
  page.setDefaultTimeout(8000);
  page.on("pageerror", (e) => report.errors.push(e.message));
  await page.clock.install({ time: new Date() });
  await mockRPC(page);
  await page.goto(server.url + "/host?" + query);
  const game = page.frameLocator("iframe");
  await game
    .getByRole("heading", { name: "Skyline Heist", exact: true })
    .waitFor();
  await expect(
    game.getByText("Connecting to host", { exact: true }),
  ).toHaveCount(0);
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  return { page, game, context };
}
async function geometry(game) {
  return game.locator("body").evaluate(() => ({
    width: innerWidth,
    height: innerHeight,
    scrollHeight: document.documentElement.scrollHeight,
    scrollWidth: document.documentElement.scrollWidth,
    scrollY,
    boxes: Object.fromEntries(
      [
        ".game-header",
        ".game-hud",
        ".canvas-stage",
        ".touch-controls",
        ".movement-pad",
        ".fire-button",
        ".pause-button",
      ].map((s) => {
        const e = document.querySelector(s),
          r = e.getBoundingClientRect();
        return [
          s,
          {
            x: r.x,
            y: r.y,
            width: r.width,
            height: r.height,
            bottom: r.bottom,
            right: r.right,
          },
        ];
      }),
    ),
  }));
}
function fits(m) {
  assert(
    m.scrollHeight <= m.height + 1,
    `page scrolls: ${m.scrollHeight} > ${m.height}`,
  );
  assert(m.scrollWidth <= m.width + 1, "horizontal overflow");
  assert.equal(m.scrollY, 0);
  for (const [s, b] of Object.entries(m.boxes)) {
    assert(
      b.y >= -1 &&
        b.bottom <= m.height + 1 &&
        b.x >= -1 &&
        b.right <= m.width + 1,
      `${s} outside viewport: ${JSON.stringify(b)}`,
    );
  }
  assert(
    m.boxes[".canvas-stage"].height >= 120,
    "arena must retain usable height on short phones",
  );
  assert(
    m.boxes[".movement-pad"].y >= m.boxes[".canvas-stage"].bottom,
    "thumbs must stay below arena",
  );
  assert(m.boxes[".fire-button"].height >= 44);
  assert(m.boxes[".pause-button"].height >= 44);
}
try {
  report.measurements.landscape = [];
  for (const [width, height] of [
    [844, 390],
    [667, 375],
    [740, 360],
    [568, 320],
    [932, 430],
  ]) {
    await run(
      `landscape ${width}×${height}: HUD, arena, pause, dual touch and no scroll`,
      async () => {
        const { page, game, context } = await open("preview=true", {
          width,
          height,
        });
        try {
          await game.getByRole("button", { name: "Play review demo" }).click();
          await page.clock.runFor(200);
          const m = await geometry(game);
          fits(m);
          report.measurements.landscape.push(m);
          const pad = m.boxes[".movement-pad"],
            fire = m.boxes[".fire-button"];
          const cdp = await context.newCDPSession(page);
          await cdp.send("Input.dispatchTouchEvent", {
            type: "touchStart",
            touchPoints: [
              { x: pad.x + pad.width * 0.82, y: pad.y + pad.height / 2, id: 1 },
              {
                x: fire.x + fire.width / 2,
                y: fire.y + fire.height / 2,
                id: 2,
              },
            ],
          });
          await page.clock.runFor(2100);
          await expect(game.getByTestId("fire-button")).toHaveClass(/firing/);
          assert(
            await game
              .locator(".thumb")
              .evaluate(
                (e) =>
                  getComputedStyle(e).transform !== "matrix(1, 0, 0, 1, 0, 0)",
              ),
          );
          assert(
            parseInt(
              await game.locator(".hud-timer strong").textContent(),
              10,
            ) < 60,
            "gameplay advances while both touches are held",
          );
          fits(await geometry(game));
          await page.screenshot({
            path: resolve(out, `landscape-${width}.jpg`),
            quality: 80,
          });
          await cdp.send("Input.dispatchTouchEvent", {
            type: "touchEnd",
            touchPoints: [],
          });
          await game
            .getByRole("button", { name: "Pause", exact: true })
            .click();
          await expect(
            game.getByRole("heading", { name: "Run paused" }),
          ).toBeVisible();
          const timer = await game.locator(".hud-timer strong").textContent();
          await page.clock.runFor(2000);
          assert.equal(
            await game.locator(".hud-timer strong").textContent(),
            timer,
          );
          await game.getByRole("button", { name: "Resume run" }).click();
          fits(await geometry(game));
        } finally {
          await context.close();
        }
      },
    );
  }
  await run(
    "portrait to landscape rotation pauses safely and resumes without losing instruments",
    async () => {
      const { page, game, context } = await open("preview=true", {
        width: 390,
        height: 844,
      });
      try {
        await game.getByRole("button", { name: "Play review demo" }).click();
        await page.clock.runFor(1100);
        const timer = await game.locator(".hud-timer strong").textContent();
        await page.setViewportSize({ width: 844, height: 390 });
        await page.clock.runFor(100);
        await expect(
          game.getByRole("heading", { name: "Run paused" }),
        ).toBeVisible();
        assert.equal(
          await game.locator(".hud-timer strong").textContent(),
          timer,
        );
        await game.getByRole("button", { name: "Resume run" }).click();
        fits(await geometry(game));
        await page.setViewportSize({ width: 390, height: 844 });
        await page.clock.runFor(100);
        await expect(
          game.getByRole("heading", { name: "Run paused" }),
        ).toBeVisible();
        await game.getByRole("button", { name: "Resume run" }).click();
        const m = await geometry(game);
        // Portrait toolbar keeps the accepted compact 40px pause target.
        assert(m.scrollHeight <= m.height + 1);
        await page.screenshot({
          path: resolve(out, "portrait-resumed.jpg"),
          quality: 80,
        });
      } finally {
        await context.close();
      }
    },
  );
  for (const outcome of ["confirmed", "cancelled", "uncertain"]) {
    await run(
      `voucher expiry during pending claim: ${outcome} outcome`,
      async () => {
        const { page, game, context } = await open("state=signed", {
          width: 390,
          height: 844,
        });
        let releaseReceipt;
        try {
          await game.getByRole("button", { name: "Play", exact: true }).click();
          await expect(
            game.getByRole("button", { name: "Claim 7 LOOT" }),
          ).toBeEnabled();
          await page.clock.fastForward(235000);
          await page.evaluate(() => (window.fixture.holdClaim = true));
          await game.getByRole("button", { name: "Claim 7 LOOT" }).click();
          await page.waitForFunction(() => window.fixture.pendingClaim);
          await page.clock.fastForward(7000);
          await expect(
            game.getByRole("heading", { name: "Claim confirmation pending" }),
          ).toBeVisible();
          await expect(
            game.getByRole("button", { name: "Confirming claim…" }),
          ).toBeDisabled();
          await expect(
            game.getByRole("button", { name: "Play again" }),
          ).toHaveCount(0);
          await expect(
            game.getByRole("heading", { name: "Reward window expired" }),
          ).toHaveCount(0);
          await page.screenshot({
            path: resolve(out, `expired-pending-${outcome}.jpg`),
            quality: 80,
          });
          if (outcome === "confirmed") {
            let receiptStarted;
            const started = new Promise(
              (resolve) => (receiptStarted = resolve),
            );
            const pending = new Promise(
              (resolve) => (releaseReceipt = resolve),
            );
            await page.route("https://**/*", async (route) => {
              const req = route.request();
              if (
                req.method() === "POST" &&
                req.postDataJSON()?.method === "eth_getTransactionReceipt"
              ) {
                receiptStarted();
                await pending;
              }
              await route.fallback();
            });
            await page.evaluate((hash) => {
              window.fixture.claimed = true;
              window.reply(window.fixture.pendingClaim, hash);
            }, testHashes.transactionHash);
            await started;
            await page.clock.fastForward(3000);
            await expect(
              game.getByRole("button", { name: "Confirming claim…" }),
            ).toBeDisabled();
            await expect(
              game.getByRole("button", { name: "Play again" }),
            ).toHaveCount(0);
            releaseReceipt();
            await expect(
              game.getByRole("heading", { name: "Reward claimed" }),
            ).toBeVisible();
            await expect(
              game.getByRole("button", { name: "Play again" }),
            ).toBeEnabled();
          } else if (outcome === "cancelled") {
            await page.evaluate(() =>
              window.reply(
                window.fixture.pendingClaim,
                null,
                "4001 user rejected",
              ),
            );
            await expect(
              game.getByRole("heading", { name: "Reward window expired" }),
            ).toBeVisible();
            await expect(
              game.getByRole("button", { name: "Play again" }),
            ).toBeEnabled();
            await game.getByRole("button", { name: "Play again" }).click();
            await expect(
              game.getByRole("button", { name: "Play", exact: true }),
            ).toBeVisible();
          } else {
            await page.evaluate(() =>
              window.reply(window.fixture.pendingClaim, {}),
            );
            await expect(
              game.getByRole("button", { name: "Check claim status" }),
            ).toBeEnabled();
            await expect(
              game.getByRole("button", { name: "Play again" }),
            ).toHaveCount(0);
            await page.evaluate(() => (window.fixture.claimed = true));
            await game
              .getByRole("button", { name: "Check claim status" })
              .click();
            await expect(
              game.getByRole("heading", { name: "Reward claimed" }),
            ).toBeVisible();
            await expect(
              game.getByRole("button", { name: "Play again" }),
            ).toBeEnabled();
          }
          assert.equal(
            (await page.evaluate(() => window.fixture.calls)).filter(
              (c) => c.type === "arcade.claim",
            ).length,
            1,
          );
        } finally {
          releaseReceipt?.();
          await context.close();
        }
      },
    );
  }
  await run(
    "public typography uses six sizes, three weights and concise headings at phone and desktop widths",
    async () => {
      const page = await browser.newPage();
      await mockRPC(page);
      report.measurements.typography = [];
      try {
        for (const width of [390, 1440]) {
          await page.setViewportSize({
            width,
            height: width === 390 ? 844 : 900,
          });
          await page.goto(server.url + "/preview/");
          await page
            .getByRole("heading", { name: "Skyline Heist", exact: true })
            .waitFor();
          await page.evaluate(() => document.fonts.ready);
          await page.getByRole("button", { name: "Pause scenery" }).click();
          const m = await page.evaluate(() => {
            const sizes = {},
              weights = new Set();
            for (const e of document.querySelectorAll("body *")) {
              if (
                !e.checkVisibility() ||
                ![...e.childNodes].some(
                  (n) => n.nodeType === Node.TEXT_NODE && n.textContent.trim(),
                )
              )
                continue;
              const c = getComputedStyle(e);
              (sizes[c.fontSize] ??= []).push(
                e.textContent.trim().slice(0, 60),
              );
              weights.add(c.fontWeight);
            }
            return {
              width: innerWidth,
              sizes,
              weights: [...weights],
              scrollWidth: document.documentElement.scrollWidth,
            };
          });
          report.measurements.typography.push(m);
          assert(
            Object.keys(m.sizes).length <= 6,
            `too many sizes: ${Object.keys(m.sizes)}`,
          );
          assert(Object.keys(m.sizes).every((s) => parseFloat(s) >= 12));
          assert(m.weights.every((w) => ["400", "600", "800"].includes(w)));
          assert(m.scrollWidth <= width);
          await expect(
            page.locator(
              ".hero-caption, .section-intro > .eyebrow, #controls > div > .eyebrow, .reward-heading .eyebrow, .closing > .eyebrow",
            ),
          ).toHaveCount(0);
          await expect(
            page.getByRole("heading", { name: "Move. Fire. Survive." }),
          ).toBeVisible();
          await expect(
            page.getByRole("heading", { name: "Claim your LOOT" }),
          ).toBeVisible();
          await expect(page.locator(".tagline")).toContainText(
            "Sixty seconds. Three hull bars.",
          );
          await expect(page.locator(".hero-instruction")).toHaveText(
            "Move. Shoot drones. Survive 60 seconds.",
          );
          await page.screenshot({
            path: resolve(out, `landing-${width}.jpg`),
            fullPage: true,
            quality: 80,
          });
        }
      } finally {
        await page.close();
      }
    },
  );
} finally {
  await browser.close();
  await server.close();
  report.passed = report.tests.filter((t) => t.passed).length;
  report.failed = report.tests.length - report.passed;
  await writeFile(
    resolve(out, "regressions.json"),
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(`${report.passed} passed; ${report.failed} failed`);
  if (report.failed || report.errors.length) process.exitCode = 1;
}
