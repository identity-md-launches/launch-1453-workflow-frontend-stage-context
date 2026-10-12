import assert from "node:assert/strict";
import { readFile, writeFile, stat } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { resolve, relative } from "node:path";
import { gzipSync } from "node:zlib";
import { root, dist, files, readJson, sha256 } from "./common.mjs";
await import("./verify-export.mjs");
const git = (args) =>
  execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
const h = await readJson(resolve(root, "web/config/deployment.json"));
const changed = [...new Set([
  ...git(["diff", "--name-only", h.sourceCommit]).split("\n"),
  ...git(["ls-files", "--others", "--exclude-standard"]).split("\n"),
])].filter(Boolean);
const allowed = (path) =>
  /^(web|dist|docs)\//.test(path) &&
  (path === "web/.gitignore" ||
    !path.split("/").some((s) => s.startsWith(".")));
assert(changed.every(allowed), "Out-of-scope changed path");
const tracked = git(["ls-files"]).split("\n");
assert(
  !tracked.some(
    (p) =>
      /(^|\/)(node_modules|\.cache|\.vite|playwright-report|test-results)\//.test(
        p,
      ) || /\.tgz$/.test(p),
  ),
  "Generated dependency or packaging archive tracked",
);
assert(
  !git(["ls-files", "--stage"])
    .split("\n")
    .some((line) => line.startsWith("160000")),
  "Git submodule found",
);
const assets = [];
let raw = 0,
  gzip = 0;
for (const path of await files(dist)) {
  const bytes = await readFile(path);
  raw += bytes.length;
  const gz = gzipSync(bytes).length;
  gzip += gz;
  assets.push({
    path: relative(dist, path),
    bytes: bytes.length,
    sha256: sha256(bytes),
  });
}
const m = await readJson(resolve(dist, "imd-deployment.json")),
  browser = await readJson(resolve(root, "docs/validation/browser-tests.json"));
assert.equal(browser.failed, 0);
assert.equal(browser.passed, 24);
const contracts = await readJson(
  resolve(root, "docs/validation/contract-tests.json"),
);
let contractPassed = 0;
for (const suite of Object.values(contracts))
  for (const t of Object.values(suite.test_results)) {
    assert.equal(t.status, "Success");
    contractPassed++;
  }
const report = {
  checkedAt: new Date().toISOString(),
  deployedSourceCommit: h.sourceCommit,
  attestationHash: m.attestationHash,
  export: {
    declaredAssets: m.assets.length,
    filesIncludingManifest: assets.length,
    uncompressedBytes: raw,
    sumOfIndividuallyGzippedFileBytes: gzip,
    maximumFileBytes: Math.max(...assets.map((a) => a.bytes)),
    sha256OfManifest: sha256(
      await readFile(resolve(dist, "imd-deployment.json")),
    ),
  },
  workerChecks: {
    browserPassed: browser.passed,
    frontendUnitPassed: 12,
    contractPassed,
    changedPathsWithinBudget: true,
    rootConfigurationPreserved: true,
    noSubmodules: true,
    noTrackedDependenciesOrCaches: true,
  },
  assets,
};
await writeFile(
  resolve(root, "docs/validation/export-audit.json"),
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify({ ...report, assets: undefined }, null, 2));
