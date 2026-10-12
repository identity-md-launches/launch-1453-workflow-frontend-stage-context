import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { resolve } from "node:path";
import { readFile } from "node:fs/promises";
import { root } from "../scripts/common.mjs";
import { testHashes } from "./server.mjs";
const moduleFrom = async (path) => {
  const code = await build({
    entryPoints: [resolve(root, path)],
    bundle: true,
    write: false,
    format: "esm",
    platform: "node",
    target: "es2022",
  });
  return import(
    "data:text/javascript;base64," +
      Buffer.from(code.outputFiles[0].contents).toString("base64")
  );
};
const { voucherProblem, expiryMs, amount } = await moduleFrom(
  "web/src/lib/chain.ts",
);
const { friendlyError } = await moduleFrom("web/src/lib/errors.ts");
const { inputBits } = await moduleFrom("web/src/components/GameCanvas.tsx");
const p = JSON.parse(await readFile(resolve(root, "web/config/product.json"))),
  h = JSON.parse(await readFile(resolve(root, "web/config/deployment.json")));
const now = Date.now(),
  rulesHash = h.manifest.contracts[0].constructorArgs[3],
  account = { address: p.creator, chainId: 1 };
const chain = {
  rulesHash,
  closesAt: Math.floor(now / 1000) + 300,
  decimals: 18,
  maxReward: 100n * 10n ** 18n,
  vaultBalance: 1000n * 10n ** 18n,
};
const v = {
  session: testHashes.session,
  player: p.creator,
  releaseHash: testHashes.releaseHash,
  rulesHash,
  amount: "7000000000000000000",
  deadline: Math.floor(now / 1000) + 120,
};
test("only a valid, funded, wallet-bound, unexpired voucher is claimable", () => {
  assert.equal(voucherProblem(v, chain, account, now), null);
  assert.match(voucherProblem(v, chain, null, now), /Connect/);
  assert.match(voucherProblem(v, null, account, now), /Refresh/);
  assert.match(
    voucherProblem(
      { ...v, player: h.contracts[0].address },
      chain,
      account,
      now,
    ),
    /wallet/,
  );
  assert.match(
    voucherProblem(
      { ...v, rulesHash: testHashes.session },
      chain,
      account,
      now,
    ),
    /match/,
  );
  assert.match(
    voucherProblem({ ...v, releaseHash: "0x0" }, chain, account, now),
    /match/,
  );
  assert.match(
    voucherProblem(
      { ...v, deadline: Math.floor(now / 1000) - 1 },
      chain,
      account,
      now,
    ),
    /expired/,
  );
  assert.match(
    voucherProblem({ ...v, deadline: chain.closesAt + 1 }, chain, account, now),
    /expired/,
  );
  assert.match(
    voucherProblem(v, { ...chain, vaultBalance: 0n }, account, now),
    /refill/,
  );
  for (const raw of ["0", "-1", "abc", (chain.maxReward + 1n).toString()])
    assert(voucherProblem({ ...v, amount: raw }, chain, account, now));
});
test("amount and date formatting never assumes raw units are display units", () => {
  assert.equal(amount("7000000000000000000"), "7");
  assert.equal(amount("12500", 6), "0.0125");
  assert.equal(expiryMs(1800000000), 1800000000000);
  assert.equal(
    expiryMs("2026-10-12T00:00:00Z"),
    Date.parse("2026-10-12T00:00:00Z"),
  );
  assert.equal(expiryMs("invalid"), null);
});
test("combined thumb, keyboard and fire inputs produce legal engine bits", () => {
  assert.equal(
    inputBits({ keys: new Set(["w", "d", " "]), x: 0, y: 0, fire: false }),
    22,
  );
  assert.equal(inputBits({ keys: new Set(), x: -0.9, y: 0.6, fire: true }), 25);
  assert.equal(
    inputBits({ keys: new Set(["a"]), x: 0.9, y: 0, fire: true }),
    19,
  );
  assert.equal(inputBits({ keys: new Set(), x: 0.1, y: 0.1, fire: false }), 0);
});
test("actionable errors cover rejection, chain, funding, expiry and uncertain transactions", () => {
  for (const [message, match] of [
    ["4001 user rejected", /cancelled/],
    ["4902 unknown chain", /Ethereum/],
    ["insufficient funding", /funding/],
    ["session_expired", /expired/],
    ["receipt timed out", /Check My reward/],
    ["duplicate claim", /already/],
    ["invalid signature", /verified/],
    ["unknown technical selector 0xabcdef", /connection/],
  ])
    assert.match(friendlyError(Error(message)), match);
});
