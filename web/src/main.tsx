import "./lib/host";
import { Component, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { createRoot } from "react-dom/client";
import "./fonts.css";
import "./styles.css";
import { loadConfig, HOSTED_PLAY } from "./lib/config";
import type { Config } from "./lib/types";
import { Landing } from "./components/Landing";
import { Game } from "./components/Game";
import { Brand } from "./components/Icons";
class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <main className="load-screen">
        <Brand />
        <h1>The game could not continue</h1>
        <p>
          Reopen the hosted game. Use My reward in Pepe2Pepe to recover a
          verified result.
        </p>
        <a
          className="button primary"
          href={HOSTED_PLAY}
          target="_blank"
          rel="noreferrer"
        >
          Open Pepe2Pepe
        </a>
      </main>
    ) : (
      this.props.children
    );
  }
}
function App() {
  const [config, setConfig] = useState<Config | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    void loadConfig()
      .then(setConfig)
      .catch((e) =>
        setError(
          e instanceof Error ? e.message : "Release files could not load.",
        ),
      );
  }, []);
  if (!config)
    return (
      <main className="load-screen">
        <Brand />
        <h1>{error ? "Release unavailable" : "Entering Neon Harbor"}</h1>
        <p role="status">
          {error || "Loading the game and verified contract details…"}
        </p>
        {error && (
          <button className="button primary" onClick={() => location.reload()}>
            Reload release
          </button>
        )}
      </main>
    );
  return window.parent !== window ? (
    <Game config={config} />
  ) : (
    <Landing config={config} />
  );
}
createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
