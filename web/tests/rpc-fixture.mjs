import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { decodeFunctionData, encodeFunctionResult, toHex } from "viem";
import { dist, root } from "../scripts/common.mjs";
import { testHashes } from "./server.mjs";
const m = JSON.parse(await readFile(resolve(dist, "imd-deployment.json"))),
  p = JSON.parse(await readFile(resolve(root, "web/config/product.json")));
const audit = JSON.parse(
  await readFile(resolve(root, "docs/validation/rpc.json")),
);
const abis = {};
for (const c of m.contracts)
  abis[c.address.toLowerCase()] = JSON.parse(
    await readFile(resolve(dist, c.abiPath)),
  );
export async function mockRPC(
  page,
  { empty = false, fail = false, wrongRpc = false } = {},
) {
  await page.route(
    (url) => m.network.rpcUrls.some((r) => url.href.startsWith(r)),
    async (route) => {
      if (fail) {
        await route.abort("failed");
        return;
      }
      const request = route.request().postDataJSON();
      let state = {};
      try {
        state = await page.evaluate(() => window.fixture || {});
      } catch {}
      const response = async (req) => {
        const { method, params = [] } = req;
        let result;
        if (method === "eth_chainId") result = wrongRpc ? "0x2" : "0x1";
        else if (method === "eth_getCode") result = "0x6080604052";
        else if (method === "eth_blockNumber") result = toHex(26178131);
        else if (method === "eth_getBlockByNumber")
          result = {
            number: toHex(26178131),
            hash: testHashes.blockHash,
            parentHash: testHashes.blockHash,
            timestamp: toHex(Math.floor(Date.now() / 1000)),
            nonce: "0x0000000000000000",
            sha3Uncles: testHashes.blockHash,
            logsBloom: "0x" + "00".repeat(256),
            transactionsRoot: testHashes.blockHash,
            stateRoot: testHashes.blockHash,
            receiptsRoot: testHashes.blockHash,
            miner: p.creator,
            difficulty: "0x0",
            totalDifficulty: "0x0",
            extraData: "0x",
            size: "0x100",
            gasLimit: "0x1c9c380",
            gasUsed: "0x1",
            baseFeePerGas: "0x1",
            transactions: [],
            uncles: [],
            mixHash: testHashes.blockHash,
          };
        else if (method === "eth_call") {
          const abi = abis[params[0].to.toLowerCase()];
          const { functionName, args } = decodeFunctionData({
            abi,
            data: params[0].data,
          });
          const values = {
            owner: p.creator,
            token: m.contracts.find((c) => c.name === "LaunchToken").address,
            signer: audit.getters.signer,
            rulesHash: audit.getters.rulesHash,
            closesAt: BigInt(Math.floor(Date.now() / 1000) + 86400),
            rewardPerPoint: 10n ** 18n,
            maxReward: 100n * 10n ** 18n,
            symbol: "LOOT",
            decimals: 18,
            claimed: !!state.claimed,
          };
          if (functionName === "balanceOf")
            values.balanceOf = empty || state.empty ? 0n : 1000n * 10n ** 18n;
          if (!(functionName in values))
            throw Error("Unexpected mock read " + functionName);
          result = encodeFunctionResult({
            abi,
            functionName,
            result: values[functionName],
          });
        } else if (method === "eth_getTransactionReceipt")
          result = {
            transactionHash: testHashes.transactionHash,
            transactionIndex: "0x0",
            blockHash: testHashes.blockHash,
            blockNumber: toHex(26178131),
            from: p.creator,
            to: m.contracts.find((c) => c.name === "Game").address,
            cumulativeGasUsed: "0x10000",
            gasUsed: "0x10000",
            contractAddress: null,
            logs: [],
            logsBloom: "0x" + "00".repeat(256),
            status: "0x1",
            effectiveGasPrice: "0x1",
            type: "0x2",
          };
        else throw Error("Unexpected RPC method: " + method);
        return { jsonrpc: "2.0", id: req.id, result };
      };
      try {
        const data = Array.isArray(request)
          ? await Promise.all(request.map(response))
          : await response(request);
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          headers: { "Access-Control-Allow-Origin": "*" },
          body: JSON.stringify(data),
        });
      } catch (e) {
        console.error(e);
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: request.id,
            error: { code: -32000, message: e.message },
          }),
        });
      }
    },
  );
}
