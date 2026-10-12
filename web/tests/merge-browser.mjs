import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { root, sha256 } from "../scripts/common.mjs";

const reports = await Promise.all([1, 2].map(async (part) => JSON.parse(
  await readFile(resolve(root, `docs/validation/browser-tests-${part}.json`)),
)));
const manifestSha256 = sha256(await readFile(resolve(root, "dist/imd-deployment.json")));
for (const report of reports) assert.equal(report.manifestSha256, manifestSha256);
const tests = reports.flatMap(report => report.tests);
assert.equal(tests.length, 24);
assert.equal(new Set(tests.map(test => test.name)).size, 24);
const combined = {
  ...reports[0],
  startedAt: reports.map(r => r.startedAt).sort()[0],
  finishedAt: reports.map(r => r.finishedAt).sort().at(-1),
  tests,
  measurements: Object.assign({}, ...reports.map(r => r.measurements)),
  consoleErrors: reports.flatMap(r => r.consoleErrors),
  passed: tests.filter(test => test.passed).length,
  failed: tests.filter(test => !test.passed).length,
};
await writeFile(resolve(root, "docs/validation/browser-tests.json"), JSON.stringify(combined, null, 2) + "\n");
assert.equal(combined.failed, 0);
assert.equal(combined.consoleErrors.length, 0);
console.log("All 24 production-browser checks passed across two shards of the same export.");
