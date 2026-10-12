import { keccak256, toHex, type Abi } from "viem";
import type { Config, Deployment, Engine } from "./types";
// Product URLs contain no wallet, RPC or deployed contract configuration.
export const HOSTED_PLAY =
  "https://pepe2pepe.fun/games/play/e15a8192-e16e-4e1b-a7e5-01ba58a965a4";
export const CREATOR_CONSOLE = "https://pepe2pepe.fun/games/creator";
export const SDK_COMMIT = "3df067d1ab5c82481f27e9d4e2dc17ecb1ea93aa";
export const localUrl = (path: string) =>
  new URL(path, new URL("./", window.location.href)).href;
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.keys(value)
      .sort()
      .map(
        (k) =>
          `${JSON.stringify(k)}:${canonical((value as Record<string, unknown>)[k])}`,
      )
      .join(",")}}`;
  return JSON.stringify(value);
}
export function abiHash(abi: unknown) {
  return keccak256(toHex(canonical(abi))).slice(2);
}
async function get(path: string) {
  const r = await fetch(localUrl(path), { signal: AbortSignal.timeout(15000) });
  if (!r.ok)
    throw new Error("Release files could not be loaded. Reload to try again.");
  return r;
}
function safePath(path: string) {
  return (
    typeof path === "string" &&
    path.length > 0 &&
    !path.startsWith("/") &&
    !path.includes("..") &&
    !/[\\:?#]/.test(path)
  );
}
export async function loadConfig(): Promise<Config> {
  const deployment = (await (
    await get("imd-deployment.json")
  ).json()) as Deployment;
  if (
    deployment.version !== 1 ||
    !deployment.network ||
    deployment.chainId !== deployment.network.chainId ||
    !Array.isArray(deployment.contracts)
  )
    throw new Error(
      "The release configuration is incomplete. Please return to Pepe2Pepe.",
    );
  const abis: Record<string, Abi> = {};
  await Promise.all(
    deployment.contracts.map(async (c) => {
      if (!safePath(c.abiPath)) throw new Error("Invalid release file.");
      const abi = await (await get(c.abiPath)).json();
      if (!Array.isArray(abi) || abiHash(abi) !== c.abiHash)
        throw new Error(
          "Contract details failed verification. Reload this release.",
        );
      abis[c.name] = abi;
    }),
  );
  if (!abis.Game || !abis.LaunchToken)
    throw new Error("Game contracts are missing from this release.");
  const engineBytes = await (await get("sdk/arcade-engine.mjs")).arrayBuffer();
  const engineHash = keccak256(new Uint8Array(engineBytes));
  const engine = (await import(
    /* @vite-ignore */ localUrl("sdk/arcade-engine.mjs")
  )) as Engine;
  // The hash is checked against the deployed rulesHash in readChain before rewarded play.
  Object.defineProperty(engineHashes, "current", {
    value: engineHash,
    configurable: true,
  });
  return { deployment, abis, engine };
}
const engineHashes: { current?: string } = {};
export const getEngineHash = () => engineHashes.current;
