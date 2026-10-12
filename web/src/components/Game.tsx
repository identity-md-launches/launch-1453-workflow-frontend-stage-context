import { useEffect, useRef, useState } from "react";
import { useArcade } from "../game/useArcade";
import { GameAudio } from "../game/audio";
import { HOSTED_PLAY } from "../lib/config";
import { amount, expiryMs, shortAddress, voucherProblem } from "../lib/chain";
import type { Config, Effects } from "../lib/types";
import { load, save } from "../lib/storage";
import { Brand, Icon } from "./Icons";
import { GameCanvas } from "./GameCanvas";
import { HeroArt } from "./HeroArt";
import { DeploymentPanel } from "./DeploymentPanel";
export function Game({ config }: { config: Config }) {
  const game = useArcade(config),
    { view: v, chain } = game;
  const [audio] = useState(() => new GameAudio());
  const [effects, setEffects] = useState<Effects>(() =>
    load("effects", {
      motion: !matchMedia("(prefers-reduced-motion: reduce)").matches,
      reduced: matchMedia("(prefers-reduced-motion: reduce)").matches,
      muted: true,
    }),
  );
  const [now, setNow] = useState(Date.now());
  const settings = useRef<HTMLDialogElement>(null),
    heading = useRef<HTMLHeadingElement>(null),
    gear = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    save("effects", effects);
    audio.setMuted(effects.muted);
  }, [effects, audio]);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearInterval(timer);
      audio.destroy();
    };
  }, [audio]);
  useEffect(() => {
    if (v.phase === "paused" || v.phase === "result" || v.phase === "menu")
      heading.current?.focus({ preventScroll: true });
  }, [v.phase]);
  const launch = () => {
    void audio.unlock().catch(() => {});
    void game.start();
  };
  const mute = () => {
    void audio.unlock().catch(() => {});
    setEffects((e) => ({ ...e, muted: !e.muted }));
  };
  const active = v.phase === "playing" || v.phase === "paused";
  const run = v.run,
    points = run?.score ?? v.session?.result?.score ?? v.session?.score;
  const voucher = v.session?.voucher,
    expires = expiryMs(voucher?.deadline),
    problem = voucherProblem(voucher, chain, v.account, now);
  const wrongChain =
    v.account?.address && v.account.chainId !== config.deployment.chainId;
  const signed = v.verification === "signed",
    paid = v.verification === "paid";
  const rewardExpired =
    signed &&
    !!voucher &&
    expires !== null &&
    (now > expires || (chain !== null && now > chain.closesAt * 1000));
  const resolved =
    v.preview ||
    ["expired", "rejected", "paid"].includes(v.verification) ||
    (signed && !voucher) ||
    rewardExpired;
  const runBlocked =
    !v.preview &&
    (!chain ||
      (chain.vaultBalance < chain.maxReward &&
        v.session?.state !== "playing") ||
      now > chain.closesAt * 1000);
  const openSettings = () => {
    game.pause("Settings opened. Your run is paused.");
    settings.current?.showModal();
  };
  return (
    <div className={`game-shell phase-${v.phase}`}>
      <header className="game-header">
        <Brand small />
        <span className="game-mode">
          {v.preview
            ? "Review demo · no rewards"
            : v.ready
              ? "Hosted play"
              : "Connecting to host"}
        </span>
        <div className="game-toolbar">
          <button
            className="icon-button"
            aria-label={effects.muted ? "Unmute sound" : "Mute sound"}
            aria-pressed={!effects.muted}
            onClick={mute}
          >
            <Icon name={effects.muted ? "mute" : "sound"} />
          </button>
          <button
            ref={gear}
            className="icon-button"
            aria-label="Game settings"
            onClick={openSettings}
          >
            <Icon name="settings" />
          </button>
          {active && (
            <button
              className="button secondary compact pause-button"
              onClick={() =>
                v.phase === "playing" ? game.pause() : game.resume()
              }
            >
              <Icon name={v.phase === "playing" ? "pause" : "play"} size={16} />
              {v.phase === "playing" ? "Pause" : "Resume"}
            </button>
          )}
        </div>
      </header>
      <main className="game-main" aria-label="Skyline Heist game">
        <div className="game-hud" aria-label="Run instruments">
          <div className="hud-timer">
            <span className="eyebrow">Extraction</span>
            <strong>
              {String(
                Math.max(0, Math.ceil((1800 - (run?.tick ?? 0)) / 30)),
              ).padStart(2, "0")}
              <small>SEC</small>
            </strong>
          </div>
          <div className="hud-hull">
            <span className="eyebrow">
              Hull <span className="sr-only">{run?.hp ?? 3} of 3</span>
            </span>
            <div aria-hidden="true">
              {[0, 1, 2].map((i) => (
                <span key={i} className={i < (run?.hp ?? 3) ? "full" : ""} />
              ))}
            </div>
            <small>
              {run?.invulnerable
                ? "Damage grace active"
                : "Three hits. No reset."}
            </small>
          </div>
          <div className="hud-cargo">
            <span className="eyebrow">
              Cargo <Icon name="core" size={12} />
            </span>
            <strong>{String(run?.score ?? 0).padStart(2, "0")}</strong>
          </div>
        </div>
        <div className="game-arena">
          <GameCanvas
            game={game}
            config={config}
            effects={effects}
            audio={audio}
          />
          {(v.phase === "menu" || v.phase === "starting") && (
            <section
              className="game-overlay start-overlay"
              aria-labelledby="start-title"
            >
              <div className="start-panel">
                <p className="eyebrow location">Neon Harbor · After dark</p>
                <h1
                  ref={heading}
                  tabIndex={-1}
                  id="start-title"
                  className="wordmark"
                >
                  Skyline
                  <br />
                  <span>Heist</span>
                  <i aria-hidden="true" />
                </h1>
                <p className="start-instruction">
                  Move. Shoot drones.
                  <br />
                  Survive 60 seconds.
                </p>
                {v.ready ? (
                  <>
                    <button
                      className="button primary start-button"
                      disabled={v.phase === "starting" || runBlocked}
                      onClick={launch}
                    >
                      <Icon name="play" />
                      {v.phase === "starting"
                        ? "Waiting for Pepe2Pepe…"
                        : v.preview
                          ? "Play review demo"
                          : "Play"}
                    </button>
                    <p className="fine-print">
                      {v.preview
                        ? "Review demo · no rewards. Local scores are not verified."
                        : v.phase === "starting"
                          ? "Confirm the free session in Pepe2Pepe. No transaction is needed to start."
                          : runBlocked
                            ? game.chainError ||
                              (!chain
                                ? "Checking the deployed game…"
                                : now > chain.closesAt * 1000
                                  ? "The reward season has closed."
                                  : "The reward pool needs a refill. Check again later.")
                            : "Free entry. Your wallet connects before the action."}
                    </p>
                    {!v.preview && runBlocked && (
                      <button
                        className="text-button"
                        disabled={game.chainLoading}
                        onClick={() => void game.refresh().catch(() => {})}
                      >
                        {game.chainLoading
                          ? "Checking…"
                          : "Check reward availability"}
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <p role="status">Waiting for the Pepe2Pepe host…</p>
                    <p className="fine-print">
                      Open the game from its hosted page to connect.
                    </p>
                    <a
                      className="button secondary"
                      href={HOSTED_PLAY}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open hosted play <Icon name="arrow" />
                    </a>
                  </>
                )}
                {v.ready && !v.preview && v.phase !== "starting" && (
                  <button
                    className="text-button recover-run"
                    disabled={!!v.pendingAction}
                    onClick={() => void game.recover()}
                  >
                    {v.pendingAction
                      ? "Finding your run…"
                      : "Recover a run or reward"}
                  </button>
                )}
                <p className="notice" role="status">
                  {v.error}
                </p>
                <div className="start-controls">
                  <span>
                    <kbd>WASD</kbd> move
                  </span>
                  <span>
                    <kbd>Space</kbd> fire
                  </span>
                  <span>
                    <kbd>Esc</kbd> pause
                  </span>
                </div>
                {v.best > 0 && (
                  <p className="best">
                    Personal best <strong>{v.best}</strong> cargo · this browser
                  </p>
                )}
              </div>
            </section>
          )}
          {v.phase === "paused" && (
            <section
              className="game-overlay pause-overlay"
              aria-labelledby="pause-title"
            >
              <div className="overlay-card">
                <p className="eyebrow">Hold position</p>
                <h1 id="pause-title" ref={heading} tabIndex={-1}>
                  Run paused
                </h1>
                <p>{v.pauseReason}</p>
                <button
                  className="button primary"
                  disabled={!v.ready}
                  onClick={() => game.resume()}
                >
                  <Icon name="play" />
                  Resume run
                </button>
                <p className="fine-print">
                  {v.preview
                    ? "Demo physics and the countdown are frozen."
                    : `Physics are frozen. Your session still expires ${expiryMs(v.session?.expiresAt) ? new Date(expiryMs(v.session?.expiresAt)!).toLocaleTimeString() : "in five minutes from its start"}.`}
                </p>
                <p className="fine-print">
                  Your score stays here. Keep this tab open to continue.
                  {!v.preview
                    ? " Use My reward in Pepe2Pepe to recover a verified result."
                    : ""}
                </p>
              </div>
            </section>
          )}
          {v.phase === "result" && (
            <section
              className="game-overlay result-overlay"
              aria-labelledby="result-title"
            >
              <HeroArt motion={false} mode="result" />
              <div className="result-panel">
                <p className="eyebrow">
                  {v.preview ? "Review demo · no rewards" : "Run complete"}
                </p>
                <div className="result-score">
                  <strong>
                    {points === undefined
                      ? "—"
                      : String(points).padStart(2, "0")}
                  </strong>
                  <span>Cargo points</span>
                </div>
                <h1 id="result-title" ref={heading} tabIndex={-1}>
                  {run
                    ? run.hp <= 0
                      ? "Rig down"
                      : run.done
                        ? "Extraction complete"
                        : "Run expired"
                    : "Your saved result"}
                </h1>
                <p>
                  {run?.hp === 0
                    ? "The rig is gone. Your points aren’t."
                    : run?.done
                      ? "The core is clear. You made it out."
                      : "Your reward is kept by Pepe2Pepe."}
                </p>
                <div className="result-still">
                  <HeroArt motion={false} mode="result" />
                </div>
                {run && (
                  <div className="result-breakdown">
                    <div>
                      <span>Drones destroyed</span>
                      <strong>{run.score}</strong>
                    </div>
                    <div>
                      <span>Time survived</span>
                      <strong>{(run.tick / 30).toFixed(1)}s</strong>
                    </div>
                    <div>
                      <span>Hull remaining</span>
                      <strong>{run.hp}/3</strong>
                    </div>
                  </div>
                )}
                <div className="reward-result" aria-live="polite">
                  {v.preview ? (
                    <>
                      <h2>Nice run. No rewards in this demo.</h2>
                      <p>
                        Preview uses the same movement, shooting and collision
                        rules. Scores here are local.
                      </p>
                    </>
                  ) : (
                    <>
                      {(v.verification === "checking" ||
                        v.verification === "queued") && (
                        <>
                          <h2>
                            <span className="status-dot" />
                            Checking your run…
                          </h2>
                          <p>
                            Your inputs are being verified. A pending result is
                            not a payment.
                          </p>
                        </>
                      )}
                      {signed && voucher && !rewardExpired && (
                        <>
                          <span className="eyebrow">
                            Verified reward · not yet paid
                          </span>
                          <h2 className="token-amount">
                            {amount(voucher.amount, chain?.decimals ?? 18)} LOOT
                          </h2>
                          <p>
                            {expires
                              ? `Claim by ${new Date(expires).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}.`
                              : "Reward expiry is unavailable."}{" "}
                            You pay Ethereum gas; your wallet shows the fee
                            before confirmation.
                          </p>
                          <p className="fine-print">
                            USD context is unavailable.
                          </p>
                        </>
                      )}
                      {signed && !voucher && (
                        <>
                          <h2>Run verified</h2>
                          <p>
                            No token reward on this run. The next escape is
                            waiting.
                          </p>
                        </>
                      )}
                      {paid && (
                        <>
                          <h2>
                            <Icon name="check" />
                            Reward claimed
                          </h2>
                          <p>
                            The vault confirms this session was claimed. Your
                            LOOT is in the playing wallet.
                          </p>
                        </>
                      )}
                      {v.verification === "uncertain" && (
                        <>
                          <h2>Check your claim</h2>
                          <p>
                            The payment is not confirmed here yet. Check your
                            wallet or My reward in Pepe2Pepe before retrying.
                          </p>
                        </>
                      )}
                      {(v.verification === "expired" || rewardExpired) && (
                        <>
                          <h2>Reward window expired</h2>
                          <p>
                            Your score is kept. This run can no longer be
                            claimed.
                          </p>
                        </>
                      )}
                      {v.verification === "rejected" && (
                        <>
                          <h2>Run could not be verified</h2>
                          <p>
                            Your local score is kept. Try a new run when you’re
                            ready.
                          </p>
                        </>
                      )}
                      {v.verification === "error" && <h2>Result saved here</h2>}
                    </>
                  )}
                </div>
                <p className="notice" role="status">
                  {v.error}
                </p>
                {signed && voucher && !paid && !rewardExpired && (
                  <>
                    {(wrongChain || problem) && (
                      <p className="notice">
                        {wrongChain
                          ? "Switch to Ethereum using the wallet controls in Pepe2Pepe, then refresh your wallet."
                          : problem}
                      </p>
                    )}
                    <button
                      className="button primary"
                      disabled={
                        v.claimPending ||
                        !!problem ||
                        !!wrongChain ||
                        game.chainLoading
                      }
                      onClick={() => void game.claim()}
                    >
                      {v.claimPending
                        ? "Confirming claim…"
                        : `Claim ${amount(voucher.amount, chain?.decimals ?? 18)} LOOT`}
                      <Icon name="arrow" />
                    </button>
                    {(wrongChain || problem) && (
                      <button
                        className="button secondary"
                        disabled={!!v.pendingAction}
                        onClick={() => void game.recover()}
                      >
                        {v.pendingAction
                          ? "Refreshing…"
                          : "Refresh wallet & reward"}
                      </button>
                    )}
                  </>
                )}
                {["error", "uncertain"].includes(v.verification) ||
                (v.verification === "queued" && !v.pendingAction) ? (
                  <button
                    className="button primary"
                    disabled={!!v.pendingAction || v.claimPending}
                    onClick={() => void game.recover()}
                  >
                    {v.pendingAction
                      ? "Checking…"
                      : v.verification === "uncertain"
                        ? "Check claim status"
                        : "Retry verification"}
                  </button>
                ) : null}
                {resolved && (
                  <button className="button primary" onClick={game.reset}>
                    Play again <Icon name="play" />
                  </button>
                )}
                {!resolved && !v.preview && (
                  <p className="fine-print">
                    Resolve this reward before your next run. You can also find
                    it in Pepe2Pepe’s My reward control.
                  </p>
                )}
                {v.txHash && (
                  <a
                    className="tx-link"
                    target="_blank"
                    rel="noreferrer"
                    href={`${config.deployment.network.explorer}/tx/${v.txHash}`}
                  >
                    View claim transaction <Icon name="arrow" size={14} />
                  </a>
                )}
                <p className="best">
                  Personal best <strong>{v.best}</strong> cargo · this browser
                </p>
              </div>
            </section>
          )}
        </div>
        <p className="sr-only" role="status">
          {active
            ? `Hull ${run?.hp ?? 3} of 3. Cargo ${run?.score ?? 0}. ${run?.invulnerable ? "Damage grace active." : ""}`
            : ""}
        </p>
      </main>
      {!active && v.ready && !v.preview && (
        <aside className="game-contracts">
          <div className="wallet-line">
            {v.account?.address ? (
              <>
                <span>
                  Playing wallet <bdi>{shortAddress(v.account.address)}</bdi>
                </span>
                <span>
                  {wrongChain
                    ? "Wrong network — switch in Pepe2Pepe"
                    : config.deployment.network.name}
                </span>
                <button
                  className="text-button"
                  onClick={() =>
                    void game
                      .account()
                      .then((a) => game.refresh(a))
                      .catch(() => {})
                  }
                >
                  Refresh wallet
                </button>
              </>
            ) : (
              <span>
                Wallet connection and network switching are handled by
                Pepe2Pepe.
              </span>
            )}
          </div>
          <DeploymentPanel
            config={config}
            chain={chain}
            error={game.chainError}
            loading={game.chainLoading}
            onRefresh={() => void game.refresh().catch(() => {})}
          />
        </aside>
      )}
      <dialog
        ref={settings}
        aria-labelledby="settings-heading"
        className="settings-dialog"
        onKeyDown={(event) => {
          if (event.key !== "Tab") return;
          const controls = [
            ...event.currentTarget.querySelectorAll<HTMLElement>(
              'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex="0"]',
            ),
          ];
          const first = controls[0],
            last = controls[controls.length - 1];
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last?.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
          }
        }}
        onClose={() => gear.current?.focus()}
      >
        <div className="dialog-heading">
          <h2 id="settings-heading">Game settings</h2>
          <button
            className="icon-button"
            aria-label="Close settings"
            onClick={() => settings.current?.close()}
          >
            <Icon name="close" />
          </button>
        </div>
        <p>Keep the chase comfortable.</p>
        <label className="setting-row">
          <span>
            <strong>Sound</strong>
            <small>Engine, shots and an original synth pulse.</small>
          </span>
          <input type="checkbox" checked={!effects.muted} onChange={mute} />
        </label>
        <label className="setting-row">
          <span>
            <strong>Scenery motion</strong>
            <small>
              Scrolling city, parallax and visual banking. Turn off to reduce
              motion.
            </small>
          </span>
          <input
            type="checkbox"
            checked={effects.motion}
            onChange={(e) =>
              setEffects((f) => ({ ...f, motion: e.target.checked }))
            }
          />
        </label>
        <label className="setting-row">
          <span>
            <strong>Reduced effects</strong>
            <small>
              Fewer sparks. No glow, rain or moving trains. Hit and grace-period
              cues stay visible.
            </small>
          </span>
          <input
            type="checkbox"
            checked={effects.reduced}
            onChange={(e) =>
              setEffects((f) => ({ ...f, reduced: e.target.checked }))
            }
          />
        </label>
        <button
          className="button primary"
          onClick={() => settings.current?.close()}
        >
          Save & close
        </button>
      </dialog>
    </div>
  );
}
