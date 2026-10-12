import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  root,
  dist,
  readJson,
  abiHash,
  canonical,
  inventory,
  limits,
} from "./common.mjs";
const h = await readJson(resolve(root, "web/config/deployment.json")),
  n = await readJson(resolve(root, "web/config/network.json")),
  m = await readJson(resolve(dist, "imd-deployment.json"));
assert.deepEqual(
  Object.keys(m).sort(),
  [
    "version",
    "launchId",
    "chainId",
    "sourceCommit",
    "attestationHash",
    "contracts",
    "assets",
    "network",
    ...(h.poolKey ? ["poolKey"] : []),
    ...(n.walletAddChain ? ["walletAddChain"] : []),
  ].sort(),
);
assert.equal(m.version, 1);
for (const key of ["launchId", "chainId", "sourceCommit", "attestationHash"])
  assert.equal(m[key], h[key], key);
assert.equal(JSON.stringify(m.network), JSON.stringify(n.network));
assert.equal(
  JSON.stringify(m.walletAddChain),
  JSON.stringify(n.walletAddChain),
);
assert.equal(JSON.stringify(m.poolKey), JSON.stringify(h.poolKey));
assert.deepEqual(
  m.contracts.map(({ name, address, abiHash }) => ({ name, address, abiHash })),
  h.contracts.map(({ name, address, abiHash }) => ({ name, address, abiHash })),
);
const safe = (path) =>
  typeof path === "string" &&
  path.length > 0 &&
  !path.startsWith("/") &&
  !path.includes("..") &&
  !/[\\:?#]/.test(path);
for (const c of m.contracts) {
  assert(safe(c.abiPath));
  const abi = await readJson(resolve(dist, c.abiPath));
  assert(Array.isArray(abi));
  assert.equal(abiHash(abi), c.abiHash);
}
for (const a of m.assets) {
  assert(safe(a.path));
  assert.match(a.sha256, /^[a-f0-9]{64}$/);
}
assert.equal(new Set(m.assets.map((a) => a.path)).size, m.assets.length);
assert.deepEqual(m.assets, await inventory());
assert(m.assets.some((a) => a.path === "index.html"));
assert(m.assets.some((a) => a.path === "cover.webp"));
const html = await readFile(resolve(dist, "index.html"), "utf8");
assert(!/(?:src|href)="\/(?!\/)/.test(html));
console.log("Export verification passed:", await limits());
