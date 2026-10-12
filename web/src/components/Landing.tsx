import { useEffect, useState } from "react";
import { HOSTED_PLAY } from "../lib/config";
import { readChain } from "../lib/chain";
import type { ChainState, Config } from "../lib/types";
import { HeroArt } from "./HeroArt";
import { Brand, Icon } from "./Icons";
import { DeploymentPanel } from "./DeploymentPanel";
export function Landing({ config }: { config: Config }) {
  const [motion, setMotion] = useState(
      !matchMedia("(prefers-reduced-motion: reduce)").matches,
    ),
    [chain, setChain] = useState<ChainState | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false);
  const refresh = async () => {
    setLoading(true);
    setError("");
    try {
      setChain(await readChain(config));
    } catch {
      setChain(null);
      setError("Live reward details are unavailable. Refresh to try again.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void refresh();
  }, [config]);
  return (
    <div className="landing">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <header className="site-header wrap">
        <a className="brand-link" href="#main" aria-label="Skyline Heist home">
          <Brand />
        </a>
        <nav aria-label="Main navigation">
          <a href="#mission">The mission</a>
          <a href="#controls">How to play</a>
          <a href="#rewards">LOOT rewards</a>
        </nav>
        <span className="release-label">
          <span /> A NEON GETAWAY ARCADE
        </span>
      </header>
      <main id="main">
        <section className="hero wrap" aria-labelledby="hero-title">
          <HeroArt motion={motion} />
          <div className="hero-border" aria-hidden="true" />
          <div className="hero-content">
            <p className="eyebrow location">
              <span className="signal" /> Neon Harbor · After dark
            </p>
            <h1 id="hero-title" className="wordmark">
              Skyline
              <br />
              <span>Heist</span>
              <i aria-hidden="true" />
            </h1>
            <p className="tagline">
              Sixty seconds. Three hull bars.
              <br />
              One way out.
            </p>
            <p className="hero-instruction">
              Move. Shoot drones. Survive 60 seconds.
            </p>
            <a className="button primary play-link" href={HOSTED_PLAY}>
              Play on Pepe2Pepe <Icon name="arrow" />
            </a>
            <p className="play-note">
              Free entry. Connect your wallet on Pepe2Pepe.
            </p>
          </div>
          <button
            className="motion-button"
            onClick={() => setMotion((v) => !v)}
            aria-pressed={!motion}
          >
            <Icon name={motion ? "pause" : "play"} size={14} />
            {motion ? "Pause scenery" : "Resume scenery"}
          </button>
          <div className="hero-bottom" aria-hidden="true">
            <span>01 / NEON HARBOR</span>
            <span>EXTRACTION IN 00:60</span>
          </div>
        </section>
        <section
          className="mission wrap"
          id="mission"
          aria-labelledby="mission-title"
        >
          <div className="section-intro">
            <h2 id="mission-title">
              Make your
              <br />
              <em>exit count.</em>
            </h2>
            <p>
              You have the city’s master data-core. The security drones want it
              back. Thread the gaps, line up your shots, and keep three hull
              bars between you and the harbor.
            </p>
          </div>
          <div className="mission-stats">
            <div>
              <strong>
                60<span>SEC</span>
              </strong>
              <p>Hold out for extraction.</p>
            </div>
            <div>
              <strong>
                03<span>HULL</span>
              </strong>
              <p>Make every near miss count.</p>
            </div>
            <div>
              <strong>
                01<span>WAY OUT</span>
              </strong>
              <p>Keep the points. Even if you go down.</p>
            </div>
          </div>
        </section>
        <section
          className="district-section wrap"
          aria-labelledby="district-title"
        >
          <div className="section-heading">
            <h2 id="district-title">One district. Three stretches.</h2>
            <span className="eyebrow">Your route to extraction</span>
          </div>
          <div className="district-cards">
            <article className="district-card waterfront">
              <div className="mini-scene scene-water" aria-hidden="true">
                <span className="mini-water" />
                <span className="mini-road" />
                <span className="mini-lamps" />
                <span className="mini-rig" />
              </div>
              <div className="district-copy">
                <span className="eyebrow">00—20 SEC</span>
                <h3>Waterfront lanes</h3>
                <p>
                  Amber lamps. Ink-blue canals.
                  <br />
                  Find your opening.
                </p>
              </div>
              <span className="chapter" aria-hidden="true">
                01
              </span>
            </article>
            <article className="district-card canyon">
              <div className="mini-scene scene-city" aria-hidden="true">
                <span className="mini-road" />
                <span className="mini-tower one" />
                <span className="mini-tower two" />
                <span className="mini-sign">NH</span>
              </div>
              <div className="district-copy">
                <span className="eyebrow">20—40 SEC</span>
                <h3>Billboard canyon</h3>
                <p>
                  Cold light. Close calls.
                  <br />
                  Stay on target.
                </p>
              </div>
              <span className="chapter" aria-hidden="true">
                02
              </span>
            </article>
            <article className="district-card extraction">
              <div className="mini-scene scene-exit" aria-hidden="true">
                <span className="mini-road" />
                <span className="mini-gate" />
                <span className="mini-rig" />
              </div>
              <div className="district-copy">
                <span className="eyebrow">40—60 SEC</span>
                <h3>The last approach</h3>
                <p>
                  The harbor falls away.
                  <br />
                  Bring the core home.
                </p>
              </div>
              <span className="chapter" aria-hidden="true">
                03
              </span>
            </article>
          </div>
        </section>
        <section
          className="controls-section wrap"
          id="controls"
          aria-labelledby="controls-title"
        >
          <div>
            <h2 id="controls-title">Move. Fire. Survive.</h2>
            <p>
              Every drone destroyed adds one cargo point. The core burst comes
              to you. Keep moving; there’s nothing to collect.
            </p>
          </div>
          <div className="control-guide">
            <div>
              <Icon name="keys" size={24} />
              <h3>Keyboard</h3>
              <p>
                <kbd>W</kbd>
                <kbd>A</kbd>
                <kbd>S</kbd>
                <kbd>D</kbd> <span>or arrow keys to move</span>
              </p>
              <p>
                <kbd className="wide-key">Space</kbd> fire <kbd>Esc</kbd> pause
              </p>
            </div>
            <div>
              <span className="touch-symbol" aria-hidden="true">
                ⊕
              </span>
              <h3>Touch</h3>
              <p>
                Left thumb steers.
                <br />
                Right thumb fires.
              </p>
              <p className="fine-print">
                Both controls work together. Keep firing as you move.
              </p>
            </div>
          </div>
        </section>
        <section
          className="reward-section wrap"
          id="rewards"
          aria-labelledby="rewards-title"
        >
          <div className="reward-heading">
            <span className="reward-core">
              <Icon name="core" size={32} />
            </span>
            <div>
              <h2 id="rewards-title">Claim your LOOT</h2>
            </div>
          </div>
          <div className="reward-steps">
            <div>
              <span>01</span>
              <h3>Play a free run</h3>
              <p>
                Pepe2Pepe connects your wallet and checks reward availability
                before the chase.
              </p>
            </div>
            <div>
              <span>02</span>
              <h3>Get your run verified</h3>
              <p>
                One LOOT per verified point, up to 100 per run. Both endings
                keep the points you earned.
              </p>
            </div>
            <div>
              <span>03</span>
              <h3>Claim after the action</h3>
              <p>
                Confirm the amount, expiry and wallet gas fee. Claiming is
                always your choice.
              </p>
            </div>
          </div>
          <DeploymentPanel
            config={config}
            chain={chain}
            error={error}
            loading={loading}
            onRefresh={() => void refresh()}
          />
        </section>
        <section className="closing wrap">
          <h2>Ready for another run?</h2>
          <a className="button primary" href={HOSTED_PLAY}>
            Play on Pepe2Pepe <Icon name="arrow" />
          </a>
        </section>
      </main>
      <footer className="site-footer wrap">
        <Brand small />
        <p>
          An original arcade escape.
          <br />
          Built for a clean shot and one more run.
        </p>
        <a href="./pepe-game.json">
          Release manifest <Icon name="arrow" size={14} />
        </a>
        <span>NEON HARBOR / RELEASE 01</span>
      </footer>
    </div>
  );
}
