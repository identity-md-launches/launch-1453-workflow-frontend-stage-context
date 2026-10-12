import { chromium } from "playwright";
import ts from "typescript";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { root } from "./common.mjs";
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 1,
  });
  const fonts = await Promise.all(
    [
      "barlow-condensed/files/barlow-condensed-latin-800-normal.woff2",
      "dm-sans/files/dm-sans-latin-600-normal.woff2",
    ].map((f) => readFile(resolve(root, "web/node_modules/@fontsource", f))),
  );
  await page.setContent(
    `<style>body{margin:0} @font-face{font-family:'Barlow Condensed';font-weight:800;src:url(data:font/woff2;base64,${fonts[0].toString("base64")})} @font-face{font-family:'DM Sans';font-weight:600;src:url(data:font/woff2;base64,${fonts[1].toString("base64")})}</style><canvas width="1200" height="630"></canvas>`,
  );
  const source = ts
    .transpileModule(
      await readFile(resolve(root, "web/src/game/render.ts"), "utf8"),
      {
        compilerOptions: {
          target: ts.ScriptTarget.ES2022,
          module: ts.ModuleKind.ESNext,
        },
      },
    )
    .outputText.replace(/^export /gm, "");
  await page.addScriptTag({
    content: source + "\nwindow.renderCover = drawHero;",
  });
  await page.evaluate(async () => {
    await document.fonts.load('800 152px "Barlow Condensed"');
    await document.fonts.load('600 23px "DM Sans"');
    window.renderCover(
      document.querySelector("canvas").getContext("2d"),
      1200,
      630,
      1.3,
      false,
      "cover",
    );
  });
  const cover = await page.evaluate(
    () =>
      document
        .querySelector("canvas")
        .toDataURL("image/webp", 0.94)
        .split(",")[1],
  );
  await writeFile(
    resolve(root, "web/public/cover.webp"),
    Buffer.from(cover, "base64"),
  );
  const thumb = await page.evaluate(() => {
    const small = document.createElement("canvas");
    small.width = 240;
    small.height = 126;
    small
      .getContext("2d")
      .drawImage(document.querySelector("canvas"), 0, 0, 240, 126);
    return small.toDataURL("image/webp", 0.94).split(",")[1];
  });
  await mkdir(resolve(root, "docs/validation"), { recursive: true });
  await writeFile(
    resolve(root, "docs/validation/cover-thumbnail.webp"),
    Buffer.from(thumb, "base64"),
  );
  console.log("Original 1200 × 630 cover rendered from the game art.");
} finally {
  await browser.close();
}
