import { readFile, readdir, stat } from "node:fs/promises";
import { resolve, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { keccak256, toHex } from "viem";
export const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
export const dist = resolve(root, "dist");
export const canonical = (v) =>
  Array.isArray(v)
    ? `[${v.map(canonical).join(",")}]`
    : v && typeof v === "object"
      ? `{${Object.keys(v)
          .sort()
          .map((k) => `${JSON.stringify(k)}:${canonical(v[k])}`)
          .join(",")}}`
      : JSON.stringify(v);
export const abiHash = (abi) => keccak256(toHex(canonical(abi))).slice(2);
export const sha256 = (bytes) =>
  createHash("sha256").update(bytes).digest("hex");
export const readJson = async (path) =>
  JSON.parse(await readFile(path, "utf8"));
export async function files(dir) {
  let result = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = resolve(dir, entry.name);
    if (entry.isSymbolicLink()) throw Error(`Symlink not allowed: ${path}`);
    if (entry.isDirectory()) result.push(...(await files(path)));
    else result.push(path);
  }
  return result.sort();
}
export async function inventory() {
  return Promise.all(
    (await files(dist))
      .filter((p) => relative(dist, p) !== "imd-deployment.json")
      .map(async (path) => ({
        path: relative(dist, path).split("\\").join("/"),
        sha256: sha256(await readFile(path)),
      })),
  );
}
export async function limits() {
  const list = await files(dist);
  let total = 0;
  for (const file of list) {
    const size = (await stat(file)).size;
    if (size > 8388608) throw Error(`File exceeds 8 MiB: ${file}`);
    total += size;
  }
  if (list.length - 1 > 128) throw Error("Too many assets");
  if (total > 16 * 1024 * 1024)
    throw Error("Export exceeds conservative response budget");
  return { assets: list.length - 1, bytes: total };
}
