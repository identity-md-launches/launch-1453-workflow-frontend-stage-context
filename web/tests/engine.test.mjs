import test from "node:test";
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { keccak256 } from "viem";
import {
  createRun,
  step,
  verifyRun,
  HZ,
  TICKS,
  RULES_ID,
} from "../public/sdk/arcade-engine.mjs";
import { root } from "../scripts/common.mjs";
const handoff = JSON.parse(
  await readFile(resolve(root, "web/config/deployment.json")),
);
const fixtures = [
  { seed: 20261012, input: 0, expected: { score: 0, ticks: 973, hp: 0 } },
  { seed: 20261012, input: 16, expected: { score: 7, ticks: 1800, hp: 2 } },
  { seed: 20261012, input: 18, expected: { score: 6, ticks: 1800, hp: 3 } },
];
test("frozen engine bytes match the approved rulesHash exactly", async () => {
  assert.equal(
    keccak256(
      await readFile(resolve(root, "web/public/sdk/arcade-engine.mjs")),
    ),
    handoff.manifest.contracts[0].constructorArgs[3],
  );
  assert.equal(HZ, 30);
  assert.equal(TICKS, 1800);
  assert.equal(RULES_ID, "pepe-arcade-run/1");
});
for (const f of fixtures)
  test(`deterministic replay: seed ${f.seed}, input ${f.input}`, () => {
    let inputs = "";
    const s = createRun(f.seed);
    while (!s.done) {
      step(s, f.input);
      inputs += f.input.toString(16).padStart(2, "0");
    }
    assert.deepEqual({ score: s.score, ticks: s.tick, hp: s.hp }, f.expected);
    assert.deepEqual(verifyRun(f.seed, inputs), f.expected);
    assert.throws(
      () => verifyRun(f.seed, inputs + "00"),
      /invalid_(input|transcript)/,
    );
  });
test("malformed, oversized, illegal and unfinished transcripts fail closed", () => {
  for (const value of [
    "",
    null,
    [],
    1,
    "0",
    "GG",
    "1F",
    "ff",
    "20",
    "00",
    "00".repeat(1801),
  ])
    assert.throws(() => verifyRun(20261012, value));
  for (const seed of [0, -1, 1.5, 2 ** 32, NaN])
    assert.throws(() => createRun(seed));
});
test("movement and firing preserve the engine coordinate system", () => {
  const r = createRun(1);
  step(r, 2 | 4 | 16);
  assert.equal(r.x, 507);
  assert.equal(r.y, 843);
  assert.equal(r.shots.length, 1);
  assert.equal(r.shots[0].x, r.x);
  for (let i = 0; i < 100; i++) step(r, 2);
  assert.equal(r.x, 980);
  for (let i = 0; i < 150; i++) step(r, 1);
  assert.equal(r.x, 20);
});
test("collision removes one hull and gives the actual 45-tick damage grace", () => {
  const r = createRun(1);
  r.enemies = [{ x: r.x, y: r.y - 4, speed: 4 }];
  step(r, 0);
  assert.equal(r.hp, 2);
  assert.equal(r.invulnerable, 44);
  for (let i = 0; i < 44; i++) {
    r.enemies = [{ x: r.x, y: r.y - 4, speed: 4 }];
    step(r, 0);
    assert.equal(r.hp, 2);
  }
  r.enemies = [{ x: r.x, y: r.y - 4, speed: 4 }];
  step(r, 0);
  assert.equal(r.hp, 1);
});
test("a destruction scores automatically; there is no pickup or entitlement in the engine", () => {
  const r = createRun(1);
  r.enemies = [{ x: 500, y: 815, speed: 4 }];
  step(r, 16);
  assert.equal(r.score, 1);
  assert.equal(r.enemies.filter((e) => e.hit).length, 0);
  assert.equal(r.amount, undefined);
  assert.equal(r.pickups, undefined);
});
await writeFile(
  resolve(root, "docs/validation/replay-fixtures.json"),
  JSON.stringify(
    {
      kind: "deterministic engine evidence; no real rewards",
      rulesHash: handoff.manifest.contracts[0].constructorArgs[3],
      fixtures: fixtures.map((f) => ({
        ...f,
        transcript: f.input
          .toString(16)
          .padStart(2, "0")
          .repeat(f.expected.ticks),
      })),
    },
    null,
    2,
  ) + "\n",
);
