import type { Abi, Address, Hex } from "viem";
export type Run = {
  rng: number;
  tick: number;
  x: number;
  y: number;
  hp: number;
  score: number;
  enemies: { x: number; y: number; speed: number; hit?: boolean }[];
  shots: { x: number; y: number; hit?: boolean }[];
  invulnerable: number;
  done: boolean;
};
export type RewardState =
  | "playing"
  | "queued"
  | "signed"
  | "rejected"
  | "expired";
export type Voucher = {
  session: Hex;
  player: Address;
  releaseHash: Hex;
  rulesHash: Hex;
  amount: string;
  deadline: number | string;
  signature?: Hex;
};
export type Session = {
  state: RewardState;
  seed?: number;
  rulesHash?: Hex;
  tickRate?: number;
  hz?: number;
  maxTicks?: number;
  expiresAt?: string | number;
  id?: string;
  sessionId?: string;
  run?: Run;
  score?: number;
  result?: { score?: number; ticks?: number; hp?: number };
  voucher?: Voucher | null;
  claimed?: boolean;
  transactionHash?: Hex;
};
export type BridgeRequest = { type: string; [key: string]: unknown };
export type Bridge = {
  embedded: boolean;
  request: <T = unknown>(r: BridgeRequest) => Promise<T>;
  destroy: () => void;
};
export type Arcade = {
  embedded: boolean;
  account: () => Promise<unknown>;
  start: () => Promise<Session>;
  tick: (n: number) => Run;
  finish: () => Promise<Session>;
  status: () => Promise<Session>;
  claim: () => Promise<Hex | { transactionHash?: Hex; hash?: Hex }>;
  destroy: () => void;
};
export type Engine = {
  RULES_ID: string;
  HZ: number;
  TICKS: number;
  MAX_POINTS: number;
  createRun: (seed: number) => Run;
  step: (run: Run, input: number) => Run;
  verifyRun: (
    seed: number,
    inputs: string,
  ) => { score: number; ticks: number; hp: number };
};
export type Deployment = {
  version: 1;
  launchId: string;
  chainId: number;
  sourceCommit: string;
  attestationHash: string;
  contracts: {
    name: string;
    address: Address;
    abiHash: string;
    abiPath: string;
  }[];
  assets: { path: string; sha256: string }[];
  poolKey?: {
    currency0: Address;
    currency1: Address;
    fee: number;
    tickSpacing: number;
    hooks: Address;
  };
  network: {
    chainId: number;
    name: string;
    testnet: boolean;
    rpcUrls: string[];
    explorer: string;
    nativeCurrency: { name: string; symbol: string; decimals: number };
    [key: string]: unknown;
  };
  walletAddChain?: Record<string, unknown>;
};
export type Config = {
  deployment: Deployment;
  abis: Record<string, Abi>;
  engine: Engine;
};
export type ChainState = {
  checkedAt: number;
  blockNumber: string;
  timestamp: number;
  owner: Address;
  token: Address;
  signer: Address;
  rulesHash: Hex;
  closesAt: number;
  rewardPerPoint: bigint;
  maxReward: bigint;
  vaultBalance: bigint;
  decimals: number;
  symbol: string;
  walletBalance?: bigint;
};
export type Account = { address: Address | null; chainId: number | null };
export type Effects = { motion: boolean; reduced: boolean; muted: boolean };
