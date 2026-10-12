import { chromium } from "playwright";
import { expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import assert from "node:assert/strict";
import { writeFile, mkdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { startServer, testHashes } from "./server.mjs";
import { mockRPC } from "./rpc-fixture.mjs";
import { root } from "../scripts/common.mjs";
const server = await startServer(),
  browser = await chromium.launch({ headless: true });
const evidence = {
  startedAt: new Date().toISOString(),
  browser: browser.version(),
  kind: "Production static export; sandboxed opaque iframe; mocked wallet/host/RPC. No transactions broadcast.",
  tests: [],
  measurements: {},
  consoleErrors: [],
};
const failures = [];
async function newPage(options = {}) {
  const context = await browser.newContext(options);
  return context.newPage();
}
async function run(name, fn) {
  const start = Date.now();
  try {
    await fn();
    evidence.tests.push({ name, passed: true, durationMs: Date.now() - start });
    console.log("PASS", name);
  } catch (e) {
    failures.push(name);
    evidence.tests.push({ name, passed: false, error: e.stack });
    console.error("FAIL", name, e.message);
  }
}
async function pageFor(query = "", opts = {}) {
  const page = await newPage({
    viewport: opts.mobile
      ? { width: 390, height: 844 }
      : { width: 1280, height: 900 },
    hasTouch: !!opts.mobile,
  });
  page.setDefaultTimeout(6000);
  await page.clock.install({ time: new Date() });
  page.on("pageerror", (e) =>
    evidence.consoleErrors.push({ test: query, message: e.message }),
  );
  await mockRPC(page, opts);
  await page.goto(server.url + "/host?" + query);
  const game = page.frameLocator("iframe");
  await game
    .getByRole("heading", { name: "Skyline Heist", exact: true })
    .waitFor();
  await expect(
    game.getByText("Connecting to host", { exact: true }),
  ).toHaveCount(0);
  return { page, game };
}
async function clock(page) {
  await page.clock.pauseAt(new Date(Date.now() + 1000));
}
async function start(page, game, name = "Play review demo") {
  await game.getByRole("button", { name, exact: true }).click();
  await expect(
    game.getByRole("button", { name: "Pause", exact: true }),
  ).toBeVisible();
}
async function close(page) {
  await page.context().close();
}
try {
  await mkdir(resolve(root, "docs/validation/screenshots"), {
    recursive: true,
  });
  await run(
    "standalone: exact hosted link, relative assets, no wallet or query bypass",
    async () => {
      const page = await newPage({ viewport: { width: 1440, height: 1000 } });
      await mockRPC(page);
      const resources = [];
      page.on("response", (r) => {
        if (r.status() >= 400) resources.push(r.url());
      });
      await page.goto(server.url + "/preview/?host=true&preview=true");
      await expect(
        page.getByRole("link", { name: "Play on Pepe2Pepe" }).first(),
      ).toHaveAttribute(
        "href",
        "https://pepe2pepe.fun/games/play/e15a8192-e16e-4e1b-a7e5-01ba58a965a4",
      );
      await expect(
        page.getByRole("button", { name: "Play review demo" }),
      ).toHaveCount(0);
      await page.getByRole("button", { name: "Pause scenery" }).click();
      await expect(
        page.getByRole("button", { name: "Resume scenery" }),
      ).toHaveAttribute("aria-pressed", "true");
      assert.deepEqual(resources, []);
      await close(page);
    },
  );
  await run(
    "desktop/mobile/320px reflow, 200% text, keyboard focus, contrast and accessibility",
    async () => {
      const page = await newPage({ viewport: { width: 1440, height: 1000 } });
      await mockRPC(page);
      await page.goto(server.url + "/preview/");
      await page
        .getByRole("heading", { name: "Skyline Heist", exact: true })
        .waitFor();
      await page.evaluate(() => document.fonts.ready);
      await page.getByRole("button", { name: "Pause scenery" }).click();
      const widths = [1440, 900, 760, 390, 320];
      evidence.measurements.reflow = [];
      for (const width of widths) {
        await page.setViewportSize({ width, height: 900 });
        const measure = await page.evaluate(() => ({
          viewport: innerWidth,
          scroll: document.documentElement.scrollWidth,
        }));
        evidence.measurements.reflow.push(measure);
        assert(measure.scroll <= measure.viewport + 1, `overflow at ${width}`);
      }
      await page.evaluate(
        () => (document.documentElement.style.fontSize = "200%"),
      );
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        "200% text reflow",
      );
      await page.evaluate(() => (document.documentElement.style.fontSize = ""));
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.reload();
      await page
        .getByRole("heading", { name: "Skyline Heist", exact: true })
        .waitFor();
      await page.keyboard.press("Tab");
      await expect(
        page.getByRole("link", { name: "Skip to content" }),
      ).toBeFocused();
      const outline = await page
        .getByRole("link", { name: "Skip to content" })
        .evaluate((e) => getComputedStyle(e).outlineWidth);
      assert.equal(outline, "3px");
      const audit = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      evidence.measurements.landingAxe = audit.violations.map(
        ({ id, impact, nodes }) => ({
          id,
          impact,
          nodes: nodes.map((n) => n.target),
        }),
      );
      assert.deepEqual(
        audit.violations.map((x) => x.id),
        [],
      );
      evidence.measurements.colors = await page.evaluate(() => {
        const samples = [
          ["Body", document.querySelector(".section-intro>p:last-child")],
          ["Muted", document.querySelector(".mission-stats p")],
          ["Primary", document.querySelector(".play-link")],
          ["Card", document.querySelector(".district-copy p")],
        ];
        return samples.map(([name, e]) => {
          const c = getComputedStyle(e);
          let p = e,
            bg = c.backgroundColor;
          while (bg === "rgba(0, 0, 0, 0)" && p.parentElement) {
            p = p.parentElement;
            bg = getComputedStyle(p).backgroundColor;
          }
          const rgb = (s) =>
            s
              .match(/[\d.]+/g)
              .slice(0, 3)
              .map(Number);
          const lum = (a) =>
            a
              .map((x) => {
                x /= 255;
                return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
              })
              .reduce((s, x, i) => s + x * [0.2126, 0.7152, 0.0722][i], 0);
          const a = lum(rgb(c.color)),
            b = lum(rgb(bg));
          return {
            name,
            foreground: c.color,
            background: bg,
            ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05),
          };
        });
      });
      assert(evidence.measurements.colors.every((c) => c.ratio >= 4.5));
      await close(page);
    },
  );
  await run(
    "real parent handshake required; child/window spoof and query parameters ignored",
    async () => {
      const page = await newPage();
      await mockRPC(page);
      await page.route("**/host-no-init", (route) =>
        route.fulfill({
          contentType: "text/html",
          body: '<iframe title="Test" sandbox="allow-scripts" src="/preview/?host=true&preview=true" style="width:100%;height:900px"></iframe>',
        }),
      );
      await page.goto(server.url + "/host-no-init");
      const frame = page.frames().find((f) => f.url().includes("/preview/"));
      await page
        .frameLocator("iframe")
        .getByText("Waiting for the Pepe2Pepe host…")
        .waitFor();
      await frame.evaluate(() =>
        window.postMessage(
          {
            protocol: "pepe-game/1",
            type: "init",
            channel: "spoof",
            preview: true,
          },
          "*",
        ),
      );
      await expect(
        page
          .frameLocator("iframe")
          .getByRole("button", { name: "Play review demo" }),
      ).toHaveCount(0);
      await close(page);
    },
  );
  await run(
    "one-shot parent init survives asynchronous deployment loading",
    async () => {
      const { page, game } = await pageFor("preview=true&once=1");
      await expect(
        game.getByRole("button", { name: "Play review demo" }),
      ).toBeEnabled();
      assert.equal(await page.evaluate(() => window.fixture.ready), true);
      await close(page);
    },
  );
  await run(
    "wrong-channel responses cannot resolve pending wallet authorization",
    async () => {
      const { page, game } = await pageFor();
      await page.evaluate(() => {
        window.fixture.holdStart = true;
      });
      await game.getByRole("button", { name: "Play", exact: true }).click();
      await page.waitForFunction(() => window.fixture.pendingStart);
      await page.evaluate(async () => {
        document.querySelector("iframe").contentWindow.postMessage(
          {
            protocol: "pepe-game/1",
            channel: "wrong-channel",
            type: "chain-result",
            id: window.fixture.pendingStart,
            error: "4001 user rejected",
          },
          "*",
        );
        await new Promise((resolve) => setTimeout(resolve, 40));
      });
      await expect(
        game.getByRole("button", { name: "Waiting for Pepe2Pepe…" }),
      ).toBeDisabled();
      await page.evaluate(() =>
        window.reply(window.fixture.pendingStart, null, "4001 user rejected"),
      );
      await expect(
        game.getByRole("button", { name: "Play", exact: true }),
      ).toBeEnabled();
      await close(page);
    },
  );
  await run(
    "review demo runs with zero public RPC or reward-service requests",
    async () => {
      const page = await newPage({ viewport: { width: 390, height: 844 } });
      let remote = 0;
      await page.route(/^https?:\/\//, async (route) => {
        if (!route.request().url().startsWith(server.url)) {
          remote++;
          await route.abort();
        } else await route.continue();
      });
      await page.goto(server.url + "/host?preview=true");
      const game = page.frameLocator("iframe");
      await start(page, game);
      await page.waitForTimeout(500);
      assert.equal(remote, 0);
      assert.equal(await page.evaluate(() => window.fixture.calls.length), 0);
      await close(page);
    },
  );
  await run(
    "keyboard movement + shots, Escape pause freezes physics, resume, resize and host pause",
    async () => {
      const { page, game } = await pageFor("preview=true");
      await clock(page);
      await start(page, game);
      await page.keyboard.down("d");
      await page.keyboard.down("Space");
      await page.clock.runFor(2100);
      await page.keyboard.up("d");
      await page.keyboard.up("Space");
      const time = await game.locator(".hud-timer strong").innerText();
      assert.notEqual(time, "60SEC");
      await page.keyboard.press("Escape");
      await expect(
        game.getByRole("heading", { name: "Run paused" }),
      ).toBeVisible();
      await page.clock.runFor(5000);
      assert.equal(await game.locator(".hud-timer strong").innerText(), time);
      await game
        .getByRole("button", { name: "Resume run", exact: true })
        .click();
      await page.clock.runFor(1000);
      assert.notEqual(
        await game.locator(".hud-timer strong").innerText(),
        time,
      );
      await page.setViewportSize({ width: 1000, height: 800 });
      await expect(
        game.getByRole("heading", { name: "Run paused" }),
      ).toBeVisible();
      await game
        .getByRole("button", { name: "Resume run", exact: true })
        .click();
      await page.evaluate(() => window.hostPause());
      await expect(
        game.getByRole("heading", { name: "Run paused" }),
      ).toBeVisible();
      await page.evaluate(() => window.hostResume());
      await expect(
        game.getByRole("heading", { name: "Run paused" }),
      ).toBeVisible();
      assert.equal(await page.evaluate(() => window.fixture.calls.length), 0);
      await close(page);
    },
  );
  await run(
    "demo full extraction, loss, retained points and restart use frozen physics",
    async () => {
      const { page, game } = await pageFor("preview=true");
      await clock(page);
      await start(page, game);
      await page.keyboard.down("Space");
      await page.clock.runFor(61000);
      await page.keyboard.up("Space");
      await expect(
        game.getByRole("heading", { name: "Extraction complete" }),
      ).toBeVisible();
      await expect(game.locator(".result-score strong")).toHaveText("07");
      await expect(
        game.getByText("Nice run. No rewards in this demo."),
      ).toBeVisible();
      await page.screenshot({
        path: resolve(root, "docs/validation/screenshots/extraction.jpg"),
        type: "jpeg",
        quality: 85,
      });
      await game.getByRole("button", { name: "Play again" }).click();
      await start(page, game);
      await page.clock.runFor(34000);
      await expect(
        game.getByRole("heading", { name: "Rig down" }),
      ).toBeVisible();
      assert.equal(await page.evaluate(() => window.fixture.calls.length), 0);
      await close(page);
    },
  );
  await run(
    "touch: two pointers steer and fire together; cancellation pauses; thumbs below rig",
    async () => {
      const { page, game } = await pageFor("preview=true", { mobile: true });
      await clock(page);
      await start(page, game);
      const pad = await game.getByTestId("movement-pad").boundingBox(),
        fire = await game.getByTestId("fire-button").boundingBox(),
        arena = await game.getByTestId("game-canvas").boundingBox();
      assert(pad.y >= arena.y + arena.height - 1);
      const cdp = await page.context().newCDPSession(page);
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [
          { x: pad.x + pad.width * 0.84, y: pad.y + pad.height / 2, id: 1 },
          { x: fire.x + fire.width / 2, y: fire.y + fire.height / 2, id: 2 },
        ],
      });
      await page.clock.runFor(1400);
      await expect(game.getByTestId("fire-button")).toHaveClass(/firing/);
      assert(
        await game
          .locator(".thumb")
          .evaluate(
            (e) => getComputedStyle(e).transform !== "matrix(1, 0, 0, 1, 0, 0)",
          ),
      );
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchCancel",
        touchPoints: [],
      });
      await expect(
        game.getByRole("heading", { name: "Run paused" }),
      ).toBeVisible();
      await expect(game.getByTestId("fire-button")).not.toHaveClass(/firing/);
      await close(page);
    },
  );
  await run(
    "settings: focus trap, sound toggle, reduced motion/effects, close returns focus",
    async () => {
      const { page, game } = await pageFor("preview=true");
      await game.getByRole("button", { name: "Game settings" }).click();
      await expect(
        game.getByRole("dialog", { name: "Game settings" }),
      ).toBeVisible();
      await expect(
        game.getByRole("button", { name: "Close settings" }),
      ).toBeFocused();
      await page.keyboard.press("Shift+Tab");
      await expect(
        game.getByRole("button", { name: "Save & close" }),
      ).toBeFocused();
      await page.keyboard.press("Tab");
      await expect(
        game.getByRole("button", { name: "Close settings" }),
      ).toBeFocused();
      await game.getByLabel("Scenery motion", { exact: false }).uncheck();
      await game.getByLabel("Reduced effects", { exact: false }).check();
      await game.getByRole("checkbox", { name: /^Sound/ }).check();
      await game.getByRole("button", { name: "Save & close" }).click();
      await expect(
        game.getByRole("button", { name: "Game settings" }),
      ).toBeFocused();
      await expect(
        game.getByRole("button", { name: "Mute sound" }),
      ).toHaveAttribute("aria-pressed", "true");
      await game.getByRole("button", { name: "Game settings" }).click();
      await page.keyboard.press("Escape");
      await expect(
        game.getByRole("dialog", { name: "Game settings" }),
      ).not.toBeVisible();
      await expect(
        game.getByRole("button", { name: "Game settings" }),
      ).toBeFocused();
      await close(page);
    },
  );
  await run(
    "wallet/session rejection returns cleanly to start; no play before authorization",
    async () => {
      const { page, game } = await pageFor(
        "startError=4001+user+rejected&connected=false",
      );
      await expect(
        game.getByRole("button", { name: "Play", exact: true }),
      ).toBeEnabled();
      await game.getByRole("button", { name: "Play", exact: true }).click();
      await expect(
        game.getByText(
          "Request cancelled. Nothing was sent. You can try again when you’re ready.",
        ),
      ).toBeVisible();
      await expect(
        game.getByRole("button", { name: "Play", exact: true }),
      ).toBeEnabled();
      await expect(
        game.getByRole("button", { name: "Pause", exact: true }),
      ).toHaveCount(0);
      await close(page);
    },
  );
  await run(
    "funded hosted gameplay uploads one replay; queued result polls, then claim confirms",
    async () => {
      const { page, game } = await pageFor();
      await clock(page);
      await expect(
        game.getByRole("button", { name: "Play", exact: true }),
      ).toBeEnabled();
      await start(page, game, "Play");
      await page.keyboard.down("Space");
      await page.clock.runFor(60500);
      await page.keyboard.up("Space");
      await expect(game.getByText("Checking your run…")).toBeVisible();
      await page.clock.runFor(3000);
      await expect(
        game.getByRole("button", { name: "Claim 7 LOOT" }),
      ).toBeEnabled();
      const calls = await page.evaluate(() => window.fixture.calls);
      assert.equal(calls.filter((c) => c.type === "arcade.finish").length, 1);
      assert.equal(
        calls.filter((c) => c.type === "arcade.finish")[0].inputs.length,
        3600,
      );
      assert(calls.filter((c) => c.type === "arcade.status").length <= 2);
      await game.getByRole("button", { name: "Claim 7 LOOT" }).click();
      await expect(
        game.getByRole("heading", { name: "Reward claimed" }),
      ).toBeVisible();
      await expect(
        game.getByRole("link", { name: "View claim transaction" }),
      ).toHaveAttribute(
        "href",
        `https://etherscan.io/tx/${testHashes.transactionHash}`,
      );
      await expect(
        game.getByRole("button", { name: "Play again" }),
      ).toBeEnabled();
      await close(page);
    },
  );
  await run(
    "claim cancellation is recoverable and duplicate clicks stay locked until receipt",
    async () => {
      const { page, game } = await pageFor(
        "state=signed&claimError=4001+user+rejected",
      );
      await game.getByRole("button", { name: "Play", exact: true }).click();
      await expect(
        game.getByRole("button", { name: "Claim 7 LOOT" }),
      ).toBeEnabled();
      await game.getByRole("button", { name: "Claim 7 LOOT" }).click();
      await expect(
        game.getByText(
          "Request cancelled. Nothing was sent. You can try again when you’re ready.",
        ),
      ).toBeVisible();
      await expect(
        game.getByRole("button", { name: "Claim 7 LOOT" }),
      ).toBeEnabled();
      await page.evaluate(() => {
        window.fixture.claimError = "";
        window.fixture.holdClaim = true;
      });
      await game.getByRole("button", { name: "Claim 7 LOOT" }).click();
      await expect(
        game.getByRole("button", { name: "Confirming claim…" }),
      ).toBeDisabled();
      await page.waitForFunction(() => window.fixture.pendingClaim);
      await page.evaluate((tx) => {
        window.fixture.claimed = true;
        window.reply(window.fixture.pendingClaim, tx);
      }, testHashes.transactionHash);
      await expect(
        game.getByRole("heading", { name: "Reward claimed" }),
      ).toBeVisible();
      assert.equal(
        (await page.evaluate(() => window.fixture.calls)).filter(
          (c) => c.type === "arcade.claim",
        ).length,
        2,
      );
      await close(page);
    },
  );
  for (const [query, label] of [
    ["expired=1", "expired"],
    ["wrongWallet=1", "wrong wallet"],
    ["tamper=1", "tampered rules"],
    ["wrongChain=1", "wrong chain"],
  ])
    await run(`claims disabled for ${label}`, async () => {
      const { page, game } = await pageFor("state=signed&" + query);
      await game.getByRole("button", { name: "Play", exact: true }).click();
      if (label === "expired") {
        await expect(
          game.getByRole("button", { name: "Claim 7 LOOT" }),
        ).toHaveCount(0);
        await expect(
          game.getByRole("button", { name: "Play again" }),
        ).toBeEnabled();
      } else
        await expect(
          game.getByRole("button", { name: "Claim 7 LOOT" }),
        ).toBeDisabled();
      assert.equal(
        (await page.evaluate(() => window.fixture.calls)).filter(
          (c) => c.type === "arcade.claim",
        ).length,
        0,
      );
      await close(page);
    });
  await run(
    "empty pool blocks new runs but keeps saved-reward recovery available",
    async () => {
      const { page, game } = await pageFor("state=signed", { empty: true });
      await expect(
        game.getByRole("button", { name: "Play", exact: true }),
      ).toBeDisabled();
      await game
        .getByRole("button", { name: "Recover a run or reward" })
        .click();
      await expect(
        game.getByRole("button", { name: "Claim 7 LOOT" }),
      ).toBeDisabled();
      await expect(
        game.getByText(
          "The reward pool needs a refill. Your reward can be retried before it expires.",
        ),
      ).toBeVisible();
      await close(page);
    },
  );
  await run(
    "RPC failures fail closed with retry and never request a hosted session",
    async () => {
      const { page, game } = await pageFor("", { fail: true });
      await expect(
        game.getByRole("button", { name: "Play", exact: true }),
      ).toBeDisabled();
      await expect(
        game.getByRole("button", { name: "Check reward availability" }),
      ).toBeEnabled({ timeout: 15000 });
      assert.equal(
        (await page.evaluate(() => window.fixture.calls)).filter(
          (c) => c.type === "arcade.start",
        ).length,
        0,
      );
      await close(page);
    },
  );
  await run(
    "signed zero reward resolves without a fake claim or calculated token amount",
    async () => {
      const { page, game } = await pageFor("state=signed&zero=1");
      await game.getByRole("button", { name: "Play", exact: true }).click();
      await expect(
        game.getByText(
          "No token reward on this run. The next escape is waiting.",
        ),
      ).toBeVisible();
      await expect(game.getByRole("button", { name: /^Claim/ })).toHaveCount(0);
      await expect(
        game.getByRole("button", { name: "Play again" }),
      ).toBeEnabled();
      await close(page);
    },
  );
  await run(
    "pending transaction uncertainty requires an explicit status check",
    async () => {
      const { page, game } = await pageFor(
        "state=signed&claimError=receipt+timed+out",
      );
      await game.getByRole("button", { name: "Play", exact: true }).click();
      await expect(
        game.getByRole("button", { name: "Claim 7 LOOT" }),
      ).toBeEnabled();
      await game.getByRole("button", { name: "Claim 7 LOOT" }).click();
      await expect(
        game.getByRole("button", { name: "Check claim status" }),
      ).toBeVisible();
      await expect(
        game.getByRole("button", { name: "Claim 7 LOOT" }),
      ).toHaveCount(0);
      await page.evaluate(() => (window.fixture.claimed = true));
      await game.getByRole("button", { name: "Check claim status" }).click();
      await expect(
        game.getByRole("heading", { name: "Reward claimed" }),
      ).toBeVisible();
      await close(page);
    },
  );
  await run(
    "queued verification stops automatically after 60 seconds and offers retry",
    async () => {
      const { page, game } = await pageFor("state=queued&status=queued");
      await clock(page);
      await game.getByRole("button", { name: "Play", exact: true }).click();
      await expect(game.getByText("Checking your run…")).toBeVisible();
      for (let i = 0; i < 31; i++) {
        await page.clock.runFor(2100);
        await page.waitForTimeout(10);
      }
      await expect(
        game.getByRole("button", { name: "Retry verification" }),
      ).toBeVisible();
      const before = (await page.evaluate(() => window.fixture.calls)).filter(
        (c) => c.type === "arcade.status",
      ).length;
      await page.clock.runFor(10000);
      const after = (await page.evaluate(() => window.fixture.calls)).filter(
        (c) => c.type === "arcade.status",
      ).length;
      assert.equal(after, before);
      assert(before <= 30);
      await close(page);
    },
  );
  await run(
    "five-minute session deadline survives pause and expires plainly",
    async () => {
      const { page, game } = await pageFor();
      await clock(page);
      await start(page, game, "Play");
      await page.clock.runFor(1000);
      await page.keyboard.press("Escape");
      await page.clock.fastForward(301000);
      await game
        .getByRole("button", { name: "Resume run", exact: true })
        .click();
      await page.clock.runFor(100);
      await expect(
        game.getByRole("heading", { name: "Run expired" }),
      ).toBeVisible();
      await expect(
        game.getByRole("button", { name: "Play again" }),
      ).toBeEnabled();
      await close(page);
    },
  );
  await run(
    "iframe menu, pause and settings accessibility; prefers-reduced-motion default",
    async () => {
      const { page, game } = await pageFor("preview=true");
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.reload();
      await game.getByRole("button", { name: "Play review demo" }).waitFor();
      await game.getByRole("button", { name: "Game settings" }).click();
      await expect(
        game.getByLabel("Scenery motion", { exact: false }),
      ).not.toBeChecked();
      await expect(
        game.getByLabel("Reduced effects", { exact: false }),
      ).toBeChecked();
      await game.getByRole("button", { name: "Save & close" }).click();
      const audit = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      evidence.measurements.iframeAxe = audit.violations.map(
        ({ id, impact, nodes }) => ({
          id,
          impact,
          nodes: nodes.map((n) => n.target),
        }),
      );
      assert.deepEqual(
        audit.violations.map((x) => x.id),
        [],
      );
      await close(page);
    },
  );
} finally {
  evidence.finishedAt = new Date().toISOString();
  evidence.passed = evidence.tests.filter((x) => x.passed).length;
  evidence.failed = failures.length;
  await writeFile(
    resolve(root, "docs/validation/browser-tests.json"),
    JSON.stringify(evidence, null, 2) + "\n",
  );
  await browser.close();
  await server.close();
}
if (failures.length) {
  console.error("Failed:", failures.join("; "));
  process.exitCode = 1;
} else
  console.log(`All ${evidence.tests.length} production-browser checks passed.`);
