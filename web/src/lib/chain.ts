import {
  createPublicClient,
  defineChain,
  fallback,
  http,
  formatUnits,
  getAddress,
  type Address,
  type Hex,
} from "viem";
import type { Account, ChainState, Config, Voucher } from "./types";
import { getEngineHash } from "./config";
export const contract = (c: Config, name: string) => {
  const found = c.deployment.contracts.find((x) => x.name === name);
  if (!found) throw new Error("A required contract is missing.");
  return { address: found.address, abi: c.abis[name] };
};
export function clientFor(config: Config) {
  const { deployment: d } = config;
  return createPublicClient({
    chain: defineChain({
      id: d.chainId,
      name: d.network.name,
      nativeCurrency: d.network.nativeCurrency,
      rpcUrls: { default: { http: d.network.rpcUrls } },
    }),
    transport: fallback(
      d.network.rpcUrls.map((url) =>
        http(url, { timeout: 9000, retryCount: 0 }),
      ),
      { retryCount: 0 },
    ),
  });
}
export async function readChain(
  c: Config,
  account?: Account | null,
): Promise<ChainState> {
  const client = clientFor(c),
    game = contract(c, "Game"),
    token = contract(c, "LaunchToken");
  const chainId = await client.getChainId();
  if (chainId !== c.deployment.chainId)
    throw new Error(
      "The network returned a different chain. Reward play is paused.",
    );
  const code = await Promise.all(
    c.deployment.contracts.map((x) => client.getCode({ address: x.address })),
  );
  if (code.some((x) => !x || x === "0x"))
    throw new Error(
      "Deployed contracts could not be verified. Reward play is paused.",
    );
  const block = await client.getBlock();
  const read = (functionName: string) =>
    client.readContract({ ...game, functionName, blockNumber: block.number });
  const [
    owner,
    boundToken,
    signer,
    rulesHash,
    closesAt,
    rewardPerPoint,
    maxReward,
    vaultBalance,
    decimals,
    symbol,
    walletBalance,
  ] = await Promise.all([
    read("owner"),
    read("token"),
    read("signer"),
    read("rulesHash"),
    read("closesAt"),
    read("rewardPerPoint"),
    read("maxReward"),
    client.readContract({
      ...token,
      functionName: "balanceOf",
      args: [game.address],
      blockNumber: block.number,
    }),
    client.readContract({
      ...token,
      functionName: "decimals",
      blockNumber: block.number,
    }),
    client.readContract({
      ...token,
      functionName: "symbol",
      blockNumber: block.number,
    }),
    account?.address
      ? client.readContract({
          ...token,
          functionName: "balanceOf",
          args: [account.address],
          blockNumber: block.number,
        })
      : Promise.resolve(undefined),
  ]);
  if (
    String(boundToken).toLowerCase() !== token.address.toLowerCase() ||
    String(rulesHash).toLowerCase() !== getEngineHash()
  )
    throw new Error(
      "This release does not match the deployed game rules. Reward play is paused.",
    );
  return {
    checkedAt: Date.now(),
    blockNumber: block.number.toString(),
    timestamp: Number(block.timestamp),
    owner: owner as Address,
    token: boundToken as Address,
    signer: signer as Address,
    rulesHash: rulesHash as Hex,
    closesAt: Number(closesAt),
    rewardPerPoint: rewardPerPoint as bigint,
    maxReward: maxReward as bigint,
    vaultBalance: vaultBalance as bigint,
    decimals: Number(decimals),
    symbol: String(symbol),
    walletBalance: walletBalance as bigint | undefined,
  };
}
export function amount(raw: bigint | string, decimals = 18) {
  try {
    const v = formatUnits(BigInt(raw), decimals);
    const [whole, frac] = v.split(".");
    return `${Number(whole).toLocaleString("en-US")}${frac ? `.${frac.slice(0, 4).replace(/0+$/, "") || "0"}` : ""}`;
  } catch {
    return "Unavailable";
  }
}
export const shortAddress = (value: string) =>
  `${value.slice(0, 6)}…${value.slice(-4)}`;
export const checksum = (value: Address) => getAddress(value);
export function expiryMs(value?: number | string): number | null {
  if (value === undefined || value === null) return null;
  const numeric = Number(value);
  const ms = Number.isFinite(numeric)
    ? numeric * (numeric < 1e12 ? 1000 : 1)
    : Date.parse(String(value));
  return Number.isFinite(ms) && ms > 0 ? ms : null;
}
export function voucherProblem(
  v: Voucher | null | undefined,
  chain: ChainState | null,
  account: Account | null,
  now = Date.now(),
): string | null {
  if (!v) return "This run has no token reward.";
  if (!chain) return "Refresh the reward pool before claiming.";
  if (!account?.address)
    return "Connect your wallet in Pepe2Pepe, then refresh the reward.";
  if (v.player?.toLowerCase() !== account.address.toLowerCase())
    return "Switch to the wallet that played this run in Pepe2Pepe.";
  if (
    !/^0x[0-9a-fA-F]{64}$/.test(v.session) ||
    /^0x0+$/.test(v.session) ||
    !/^0x[0-9a-fA-F]{64}$/.test(v.releaseHash) ||
    /^0x0+$/.test(v.releaseHash) ||
    v.rulesHash?.toLowerCase() !== chain.rulesHash.toLowerCase()
  )
    return "The reward does not match this release. Check My reward in Pepe2Pepe.";
  const expires = expiryMs(v.deadline);
  if (
    !expires ||
    now > expires ||
    expires > chain.closesAt * 1000 ||
    now > chain.closesAt * 1000
  )
    return "This reward has expired. Your score is kept; start another run.";
  let tokens: bigint;
  try {
    if (!/^\d+$/.test(String(v.amount))) throw Error();
    tokens = BigInt(v.amount);
  } catch {
    return "The reward amount could not be verified.";
  }
  if (tokens <= 0n || tokens > chain.maxReward)
    return "This run has no valid token reward.";
  if (chain.vaultBalance < tokens)
    return "The reward pool needs a refill. Your reward can be retried before it expires.";
  return null;
}
