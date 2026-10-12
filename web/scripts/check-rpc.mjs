import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { createPublicClient, http, keccak256 } from "viem";
import { root, dist, readJson } from "./common.mjs";
const m = await readJson(resolve(dist, "imd-deployment.json"));
const rpc = m.network.rpcUrls[0],
  client = createPublicClient({
    transport: http(rpc, { retryCount: 0, timeout: 15000 }),
  });
const chainId = await client.getChainId();
if (chainId !== m.chainId) throw Error("RPC chain mismatch");
const game = m.contracts.find((c) => c.name === "Game"),
  token = m.contracts.find((c) => c.name === "LaunchToken");
const gameAbi = await readJson(resolve(dist, game.abiPath)),
  tokenAbi = await readJson(resolve(dist, token.abiPath));
const block = await client.getBlock();
const result = {
  checkedAt: new Date().toISOString(),
  rpc,
  chainId,
  blockNumber: block.number.toString(),
  blockTimestamp: new Date(Number(block.timestamp) * 1000).toISOString(),
  contracts: [],
  getters: {},
  transactionsBroadcast: 0,
};
for (const c of m.contracts) {
  const code = await client.getCode({
    address: c.address,
    blockNumber: block.number,
  });
  if (!code || code === "0x") throw Error("Empty code");
  result.contracts.push({
    name: c.name,
    address: c.address,
    bytes: (code.length - 2) / 2,
    runtimeKeccak: keccak256(code),
  });
}
for (const name of [
  "owner",
  "token",
  "signer",
  "rulesHash",
  "rewardPerPoint",
  "maxReward",
  "closesAt",
])
  result.getters[name] = await client.readContract({
    address: game.address,
    abi: gameAbi,
    functionName: name,
    blockNumber: block.number,
  });
for (const name of ["symbol", "decimals"])
  result.getters[name] = await client.readContract({
    address: token.address,
    abi: tokenAbi,
    functionName: name,
    blockNumber: block.number,
  });
result.getters.vaultBalance = await client.readContract({
  address: token.address,
  abi: tokenAbi,
  functionName: "balanceOf",
  args: [game.address],
  blockNumber: block.number,
});
if (
  result.getters.rulesHash !==
  keccak256(await readFile(resolve(dist, "sdk/arcade-engine.mjs")))
)
  throw Error("Rules mismatch");
if (result.getters.token.toLowerCase() !== token.address.toLowerCase())
  throw Error("Token mismatch");
await mkdir(resolve(root, "docs/validation"), { recursive: true });
const text =
  JSON.stringify(
    result,
    (_, v) => (typeof v === "bigint" ? v.toString() : v),
    2,
  ) + "\n";
await writeFile(resolve(root, "docs/validation/rpc.json"), text);
console.log(text);
