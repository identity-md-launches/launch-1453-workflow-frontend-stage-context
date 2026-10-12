import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { keccak256 } from "viem";
import { root, dist, readJson, abiHash, inventory, limits } from "./common.mjs";
const handoff = await readJson(resolve(root, "web/config/deployment.json"));
const network = await readJson(resolve(root, "web/config/network.json"));
const product = await readJson(resolve(root, "web/config/product.json"));
await mkdir(resolve(dist, "abi"), { recursive: true });
const contracts = [];
for (const { name, address, abiHash: expected } of handoff.contracts) {
  if (!/^[A-Za-z][A-Za-z0-9]*$/.test(name))
    throw Error("Invalid contract name");
  const sourcePath = `docs/abi/${name}.json`;
  const pinned = execFileSync(
    "git",
    ["show", `${handoff.sourceCommit}:${sourcePath}`],
    { cwd: root },
  );
  const local = await readFile(resolve(root, sourcePath));
  if (!pinned.equals(local))
    throw Error(`${sourcePath} differs from deployed source commit`);
  const abi = JSON.parse(pinned);
  if (!Array.isArray(abi) || abiHash(abi) !== expected)
    throw Error(`ABI hash mismatch: ${name}`);
  const abiPath = `abi/${name}.json`;
  await writeFile(resolve(dist, abiPath), pinned);
  contracts.push({ name, address, abiHash: expected, abiPath });
}
const policy = handoff.manifest.contracts.find((c) => c.contract === "Game");
const signer = policy.constructorArgs[2],
  rulesHash = policy.constructorArgs[3];
const engineHash = keccak256(
  await readFile(resolve(dist, "sdk/arcade-engine.mjs")),
);
if (engineHash !== rulesHash)
  throw Error("Frozen engine hash does not match approved rules");
// Generated publication descriptor. The application does not use this as a second address map.
const descriptor = {
  schemaVersion: "pepe-onchain-game/1",
  title: product.title,
  version: "1.0.0",
  summary: "Sixty seconds. Three hull bars. One way out.",
  description:
    "Pilot an ivory hover-rig through Neon Harbor. Dodge security drones, fire forward and survive sixty seconds to extraction. Destroyed drones add cargo points automatically; either ending keeps your score. Hosted verified play pays from a funded LOOT vault.",
  controls:
    "WASD or arrows move. Hold Space to fire. Escape pauses. Touch: left thumb pad moves, right button fires.",
  genre: "arcade",
  players: 1,
  mobile: true,
  entry: "index.html",
  cover: "cover.webp",
  onchain: {
    chainId: handoff.chainId,
    launchId: handoff.launchId,
    creator: product.creator,
    game: contracts.find((c) => c.name === "Game").address,
    token: contracts.find((c) => c.name === "LaunchToken").address,
    allocation: product.allocation,
    trading: product.trading,
    splitFactory: product.splitFactory,
    platform: product.platform,
    maxActionValueWei: "0",
    maxTokenApproval: "0",
    rewards: {
      protocol: "pepe-arcade/1",
      rulesId: "pepe-arcade-run/1",
      rulesHash,
      signer,
      rewardPerPoint: "1000000000000000000",
      hostedOnly: true,
    },
  },
};
await writeFile(
  resolve(dist, "pepe-game.json"),
  JSON.stringify(descriptor, null, 2) + "\n",
);
const manifest = {
  version: 1,
  launchId: handoff.launchId,
  chainId: handoff.chainId,
  sourceCommit: handoff.sourceCommit,
  attestationHash: handoff.attestationHash,
  contracts,
  assets: await inventory(),
  ...(handoff.poolKey ? { poolKey: handoff.poolKey } : {}),
  network: network.network,
  ...(network.walletAddChain ? { walletAddChain: network.walletAddChain } : {}),
};
await writeFile(
  resolve(dist, "imd-deployment.json"),
  JSON.stringify(manifest, null, 2) + "\n",
);
console.log(
  JSON.stringify(
    {
      export: await limits(),
      engineHash,
      abiHashes: contracts.map(({ name, abiHash }) => ({ name, abiHash })),
    },
    null,
    2,
  ),
);
await import("./verify-export.mjs");
