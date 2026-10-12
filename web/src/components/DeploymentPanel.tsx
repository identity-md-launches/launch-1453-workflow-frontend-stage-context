import { useState } from "react";
import { amount, checksum, shortAddress } from "../lib/chain";
import { CREATOR_CONSOLE } from "../lib/config";
import type { ChainState, Config } from "../lib/types";
import { Icon } from "./Icons";
export function DeploymentPanel({
  config,
  chain,
  error,
  loading,
  onRefresh,
}: {
  config: Config;
  chain: ChainState | null;
  error: string;
  loading: boolean;
  onRefresh: () => void;
}) {
  const [copied, setCopied] = useState(""),
    [copyError, setCopyError] = useState("");
  const copy = async (name: string, address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(name);
      setCopyError("");
    } catch {
      setCopyError(
        "Copy is unavailable in this browser. Select the address to copy it.",
      );
    }
  };
  return (
    <details className="deployment-panel">
      <summary>
        Live reward pool & contract details <span aria-hidden="true">＋</span>
      </summary>
      <div className="deployment-content">
        <div className="contract-readout">
          <div>
            <span className="eyebrow">
              Reward pool · {config.deployment.network.name}
            </span>
            <strong>
              {chain
                ? `${amount(chain.vaultBalance, chain.decimals)} ${chain.symbol}`
                : loading
                  ? "Reading the pool…"
                  : "Unavailable"}
            </strong>
            <p>
              {chain
                ? chain.timestamp > chain.closesAt
                  ? "The reward season is closed."
                  : chain.vaultBalance < chain.maxReward
                    ? "Reward runs need a pool refill. Play resumes when the host can reserve a run."
                    : "Pool balance includes reserved rewards. Pepe2Pepe checks availability before every run."
                : "Live contract details use the configured public RPC."}
            </p>
          </div>
          <button
            className="button secondary compact"
            disabled={loading}
            onClick={onRefresh}
          >
            {loading ? "Refreshing…" : "Refresh state"}
          </button>
        </div>
        <p className="notice" role="status">
          {error || copyError || (copied ? `${copied} address copied.` : "")}
        </p>
        {chain && (
          <dl className="facts">
            <div>
              <dt>Reward rate</dt>
              <dd>
                {amount(chain.rewardPerPoint, chain.decimals)} {chain.symbol} /
                verified point
              </dd>
            </div>
            <div>
              <dt>Run cap</dt>
              <dd>
                {amount(chain.maxReward, chain.decimals)} {chain.symbol}
              </dd>
            </div>
            <div>
              <dt>Season closes</dt>
              <dd>
                {new Date(chain.closesAt * 1000).toLocaleString("en-US", {
                  dateStyle: "medium",
                  timeStyle: "short",
                  timeZone: "UTC",
                })}{" "}
                UTC
              </dd>
            </div>
            <div>
              <dt>State read at block</dt>
              <dd>{chain.blockNumber}</dd>
            </div>
            {chain.walletBalance !== undefined && (
              <div>
                <dt>Connected wallet balance</dt>
                <dd>
                  {amount(chain.walletBalance, chain.decimals)} {chain.symbol}
                </dd>
              </div>
            )}
          </dl>
        )}
        <div className="addresses">
          {config.deployment.contracts.map((c) => (
            <div className="address-row" key={c.name}>
              <span>{c.name === "Game" ? "Reward vault" : "LOOT token"}</span>
              <a
                href={`${config.deployment.network.explorer}/address/${c.address}`}
                target="_blank"
                rel="noreferrer"
                title={checksum(c.address)}
              >
                <bdi>{shortAddress(checksum(c.address))}</bdi>
                <Icon name="arrow" size={14} />
              </a>
              <code>{checksum(c.address)}</code>
              <button
                className="icon-button"
                aria-label={`Copy ${c.name} address`}
                onClick={() => void copy(c.name, checksum(c.address))}
              >
                <Icon name={copied === c.name ? "check" : "copy"} size={17} />
              </button>
            </div>
          ))}
        </div>
        <p className="fine-print">
          USD context is unavailable. Entry is free; claiming costs Ethereum
          gas. Rewards require a funded pool, a verified run and an unexpired
          voucher. A trusted service verifies inputs and signs rewards.
        </p>
        <div className="creator-row">
          <span>Creator operations</span>
          <a href={CREATOR_CONSOLE} target="_blank" rel="noreferrer">
            Fund the vault <Icon name="arrow" size={14} />
          </a>
          <a href={CREATOR_CONSOLE} target="_blank" rel="noreferrer">
            Recover expired funds <Icon name="arrow" size={14} />
          </a>
        </div>
        <p className="fine-print">
          Funding uses a LOOT transfer in Pepe2Pepe’s creator console. Only the
          deployed owner can recover unused funds, strictly after the season
          closes. This game has no editable on-chain settings.
        </p>
      </div>
    </details>
  );
}
