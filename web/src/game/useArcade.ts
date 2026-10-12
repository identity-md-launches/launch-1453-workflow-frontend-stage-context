import { deliverBufferedHostInit } from "../lib/host";
import { useCallback, useEffect, useRef, useState } from "react";
import { isAddress, type Address, type Hex } from "viem";
import { localUrl, getEngineHash } from "../lib/config";
import {
  clientFor,
  contract,
  expiryMs,
  readChain,
  voucherProblem,
} from "../lib/chain";
import { friendlyError } from "../lib/errors";
import { load, remove, save } from "../lib/storage";
import type {
  Account,
  Arcade,
  ChainState,
  Config,
  Run,
  Session,
} from "../lib/types";
export type Phase = "menu" | "starting" | "playing" | "paused" | "result";
export type Verification =
  | "none"
  | "demo"
  | "checking"
  | "queued"
  | "signed"
  | "rejected"
  | "expired"
  | "error"
  | "paid"
  | "uncertain";
export type Model = {
  phase: Phase;
  ready: boolean;
  preview: boolean;
  run: Run | null;
  previous: Run | null;
  session: Session | null;
  inputs: string;
  verification: Verification;
  error: string;
  pauseReason: string;
  best: number;
  account: Account | null;
  claimPending: boolean;
  txHash: Hex | null;
  pendingAction: "finish" | "status" | null;
};
export function useArcade(config: Config) {
  const model = useRef<Model>({
    phase: "menu",
    ready: false,
    preview: false,
    run: null,
    previous: null,
    session: null,
    inputs: "",
    verification: "none",
    error: "",
    pauseReason: "",
    best: load("best", 0),
    account: null,
    claimPending: false,
    txHash: null,
    pendingAction: null,
  });
  const [view, setView] = useState({ ...model.current });
  const [chain, setChain] = useState<ChainState | null>(null),
    [chainError, setChainError] = useState(""),
    [chainLoading, setChainLoading] = useState(false);
  const api = useRef<Arcade | null>(null),
    alive = useRef(true),
    pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null),
    pollStart = useRef(0),
    generation = useRef(0),
    refreshPromise = useRef<Promise<ChainState> | null>(null);
  const publish = useCallback(() => {
    if (alive.current)
      setView({
        ...model.current,
        run: model.current.run ? { ...model.current.run } : null,
      });
  }, []);
  const stopPoll = () => {
    if (pollTimer.current) clearTimeout(pollTimer.current);
    pollTimer.current = null;
  };
  const refresh = useCallback(
    async (account = model.current.account) => {
      if (refreshPromise.current) return refreshPromise.current;
      setChainLoading(true);
      setChainError("");
      const promise = readChain(config, account);
      refreshPromise.current = promise;
      try {
        const data = await promise;
        if (alive.current) setChain(data);
        return data;
      } catch (e) {
        if (alive.current) {
          setChain(null);
          setChainError(
            e instanceof Error &&
              /release|rules|deployed|network/i.test(e.message)
              ? e.message
              : "Live reward details are unavailable. Refresh to try again.",
          );
        }
        throw e;
      } finally {
        refreshPromise.current = null;
        if (alive.current) setChainLoading(false);
      }
    },
    [config],
  );
  const account = useCallback(async () => {
    if (!api.current || model.current.preview) return null;
    try {
      const raw = (await api.current.account()) as
        | { address?: unknown; account?: unknown; chainId?: unknown }
        | string
        | null;
      const addr =
        typeof raw === "string" ? raw : (raw?.address ?? raw?.account);
      const id = typeof raw === "object" && raw ? Number(raw.chainId) : null;
      const next = {
        address:
          typeof addr === "string" && isAddress(addr)
            ? (addr as Address)
            : null,
        chainId: id && Number.isSafeInteger(id) ? id : null,
      };
      model.current.account = next;
      publish();
      return next;
    } catch {
      return model.current.account;
    }
  }, [publish]);
  const checkpoint = () => {
    const m = model.current;
    if (!m.preview && m.session && m.inputs)
      save("unfinished", {
        seed: m.session.seed,
        id: m.session.id ?? m.session.sessionId,
        expiresAt: m.session.expiresAt,
        inputs: m.inputs,
      });
  };
  const pause = useCallback(
    (reason = "Run paused. Take a breath.") => {
      const m = model.current;
      if (m.phase !== "playing") return;
      m.phase = "paused";
      m.pauseReason = reason;
      checkpoint();
      publish();
    },
    [publish],
  );
  const applyResult = async (session: Session) => {
    const m = model.current;
    m.session = session;
    if (
      !["playing", "queued", "signed", "rejected", "expired"].includes(
        session.state,
      )
    )
      throw Error("Invalid reward response");
    m.verification = session.state === "playing" ? "error" : session.state;
    if (session.state === "signed" && session.claimed)
      m.verification = "uncertain"; // An on-chain read establishes payment, never a client flag.
    if (session.state === "rejected")
      m.error =
        "The service could not verify this run. Your local score is kept. You can start another run.";
    if (session.state === "expired")
      m.error = "This run’s reward window has expired. Your score is kept.";
    publish();
    if (session.state === "queued") {
      if (Date.now() - pollStart.current >= 60000) {
        m.error =
          "Verification is taking longer than expected. Retry checking, or use My reward in Pepe2Pepe.";
        m.pendingAction = null;
        publish();
        return;
      }
      stopPoll();
      pollTimer.current = setTimeout(() => void check("status", false), 2100);
    } else {
      stopPoll();
      m.pendingAction = null;
      publish();
      void account()
        .then((a) => refresh(a))
        .catch(() => {});
    }
  };
  const check = async (action: "finish" | "status", restart = true) => {
    const m = model.current;
    if (m.preview || !api.current) return;
    stopPoll();
    if (restart) pollStart.current = Date.now();
    m.pendingAction = action;
    m.error = "";
    m.verification = "checking";
    publish();
    try {
      const session = await api.current[action]();
      if (alive.current) await applyResult(session);
    } catch (e) {
      m.pendingAction = null;
      m.verification = "error";
      m.error = friendlyError(e);
      publish();
    }
  };
  const finish = () => {
    const m = model.current;
    if (!m.run?.done || m.phase === "result") return;
    m.phase = "result";
    m.best = Math.max(m.best, m.run.score);
    save("best", m.best);
    checkpoint();
    m.error = "";
    if (m.preview) {
      m.verification = "demo";
      publish();
    } else {
      publish();
      void check("finish");
    }
  };
  const start = async () => {
    const m = model.current;
    if (!m.ready || m.phase === "starting" || m.claimPending) return;
    stopPoll();
    m.error = "";
    m.txHash = null;
    m.verification = "none";
    m.phase = "starting";
    publish();
    const current = ++generation.current;
    try {
      if (m.preview) {
        m.run = config.engine.createRun(20261012);
        m.session = null;
        m.inputs = "";
      } else {
        const state = await refresh();
        if (
          state.vaultBalance < state.maxReward &&
          m.session?.state !== "playing"
        )
          throw Error("insufficient funded reserve");
        if (Date.now() > state.closesAt * 1000)
          throw Error("expired reward season");
        const session = await api.current!.start();
        if (current !== generation.current) return;
        m.session = session;
        void account()
          .then((a) => refresh(a))
          .catch(() => {});
        if (session.state !== "playing") {
          m.run = null;
          m.previous = null;
          m.phase = "result";
          pollStart.current = Date.now();
          await applyResult(session);
          return;
        }
        if (
          !session.run ||
          session.rulesHash?.toLowerCase() !== getEngineHash() ||
          (session.tickRate !== undefined && session.tickRate !== 30) ||
          (session.hz !== undefined && session.hz !== 30) ||
          (session.maxTicks !== undefined && session.maxTicks !== 1800) ||
          !expiryMs(session.expiresAt)
        )
          throw Error("Invalid rules or session deadline");
        if (Date.now() > expiryMs(session.expiresAt)!)
          throw Error("expired session");
        m.run = session.run;
        m.inputs = "";
        const saved = load<{
          seed?: number;
          id?: string;
          expiresAt?: string | number;
          inputs?: string;
        } | null>("unfinished", null);
        if (
          saved &&
          saved.seed === session.seed &&
          saved.id === (session.id ?? session.sessionId) &&
          saved.expiresAt === session.expiresAt &&
          typeof saved.inputs === "string" &&
          saved.inputs.length <= 3600 &&
          /^(?:[01][0-9a-f])*$/.test(saved.inputs)
        ) {
          try {
            for (let i = 0; i < saved.inputs.length; i += 2) {
              m.run = api.current!.tick(
                parseInt(saved.inputs.slice(i, i + 2), 16),
              );
              m.inputs += saved.inputs.slice(i, i + 2);
            }
          } catch {
            throw Error(
              "Saved run could not be recovered. Use My reward in the host.",
            );
          }
        }
      }
      m.previous = m.run ? structuredClone(m.run) : null;
      m.phase = "playing";
      publish();
      if (m.run?.done) finish();
    } catch (e) {
      m.phase = "menu";
      m.error = friendlyError(e);
      publish();
    }
  };
  const tick = (input: number) => {
    const m = model.current;
    if (m.phase !== "playing" || !m.run) return null;
    if (
      !m.preview &&
      m.session &&
      Date.now() > expiryMs(m.session.expiresAt)!
    ) {
      m.phase = "result";
      m.verification = "expired";
      m.error =
        "The five-minute session expired. Your local score is kept; this run cannot earn a reward.";
      m.best = Math.max(m.best, m.run.score);
      save("best", m.best);
      publish();
      return null;
    }
    const before = structuredClone(m.run);
    const oldEnemies = m.run.enemies;
    m.previous = before;
    m.run = m.preview
      ? config.engine.step(m.run, input)
      : api.current!.tick(input);
    m.inputs += input.toString(16).padStart(2, "0");
    // Preserve hit flags from the engine for visual-only destruction effects.
    before.enemies = oldEnemies;
    if (m.run.tick % 30 === 0) checkpoint();
    if (
      m.run.tick % 3 === 0 ||
      m.run.hp !== before.hp ||
      m.run.score !== before.score
    )
      publish();
    if (m.run.done) finish();
    return { before, after: m.run };
  };
  const resume = () => {
    if (model.current.phase !== "paused" || !model.current.ready) return;
    model.current.phase = "playing";
    model.current.error = "";
    publish();
  };
  const reset = () => {
    if (
      model.current.claimPending ||
      model.current.verification === "uncertain"
    )
      return;
    stopPoll();
    remove("unfinished");
    model.current.phase = "menu";
    model.current.run = null;
    model.current.previous = null;
    model.current.session = null;
    model.current.error = "";
    model.current.verification = "none";
    publish();
  };
  const claim = async () => {
    const m = model.current;
    if (
      !m.ready ||
      m.claimPending ||
      m.verification !== "signed" ||
      !m.session?.voucher
    )
      return;
    // Bind all checks to the voucher that initiated this wallet request.
    const voucher = m.session.voucher;
    m.claimPending = true;
    m.error = "";
    publish();
    try {
      const a = await account();
      const state = await refresh(a);
      if (a?.chainId !== config.deployment.chainId) throw Error("wrong chain");
      const problem = voucherProblem(voucher, state, a);
      if (problem) {
        m.error = problem;
        return;
      }
      const client = clientFor(config),
        game = contract(config, "Game");
      if (
        await client.readContract({
          ...game,
          functionName: "claimed",
          args: [voucher.session],
        })
      ) {
        m.verification = "paid";
        return;
      }
      const result = await api.current!.claim();
      const hash =
        typeof result === "string"
          ? result
          : (result?.transactionHash ?? result?.hash);
      if (!hash || !/^0x[0-9a-fA-F]{64}$/.test(hash)) {
        m.verification = "uncertain";
        throw Error("Confirmation pending");
      }
      m.txHash = hash;
      publish();
      const receipt = await client.waitForTransactionReceipt({
        hash,
        timeout: 120000,
      });
      if (
        receipt.status !== "success" ||
        !(await client.readContract({
          ...game,
          functionName: "claimed",
          args: [voucher.session],
        }))
      )
        throw Error("Reward confirmation failed");
      m.verification = "paid";
      remove("unfinished");
      await refresh(a);
    } catch (e) {
      m.error = friendlyError(e);
      if (m.txHash || /timeout|timed out|pending|receipt/i.test(String(e)))
        m.verification = "uncertain";
    } finally {
      m.claimPending = false;
      publish();
    }
  };
  const recover = async () => {
    const m = model.current;
    if (!m.ready || m.pendingAction || m.claimPending) return;
    m.error = "";
    m.pendingAction = "status";
    publish();
    try {
      const a = await account();
      await refresh(a);
      if (
        m.session?.voucher &&
        (await clientFor(config).readContract({
          ...contract(config, "Game"),
          functionName: "claimed",
          args: [m.session.voucher.session],
        }))
      ) {
        m.verification = "paid";
        m.pendingAction = null;
        publish();
        return;
      }
      if (m.phase === "menu") {
        const session = await api.current!.status();
        if (session.state === "playing") {
          m.session = session;
          m.error =
            "An unfinished session is ready. Press Play to resume. If storage is unavailable, it restarts from the same seed before the original expiry.";
          m.pendingAction = null;
          publish();
          return;
        }
        m.phase = "result";
        pollStart.current = Date.now();
        await applyResult(session);
      } else
        await check(
          m.run?.done && (!m.session || m.session.state === "playing")
            ? "finish"
            : "status",
        );
    } catch (e) {
      m.error = friendlyError(e);
      m.pendingAction = null;
      publish();
    }
  };
  useEffect(() => {
    alive.current = true;
    let instance: Arcade | null = null;
    const onInit = ({ preview }: { preview: boolean }) => {
      const m = model.current;
      if (m.ready) {
        generation.current++;
        pause(
          "Host connection changed. Reopen this game in Pepe2Pepe to recover your run.",
        );
        m.error = "The host connection changed. Reopen this game in Pepe2Pepe.";
        m.ready = false;
        publish();
        return;
      }
      m.ready = true;
      m.preview = preview;
      publish();
      if (!preview)
        void account()
          .then((a) => refresh(a))
          .catch(() => {});
    };
    void import(/* @vite-ignore */ localUrl("sdk/arcade-client.js"))
      .then((module) => {
        if (!alive.current) return;
        instance = module.createPepeArcade({
          onInit,
          onPause: () =>
            pause("Paused by Pepe2Pepe. Resume when you’re ready."),
          onResume: () => {},
        }) as Arcade;
        api.current = instance;
        deliverBufferedHostInit();
      })
      .catch(() => {
        model.current.error =
          "The game bridge could not load. Reopen this game in Pepe2Pepe.";
        publish();
      });
    const visibility = () => {
      if (document.hidden) pause("You switched tabs. Your run is paused.");
    };
    const blur = () => pause("Your game lost focus. Resume when you’re ready.");
    const resize = () => pause("The screen size changed. Your run is paused.");
    const leave = (e: BeforeUnloadEvent) => {
      if (["playing", "paused"].includes(model.current.phase)) {
        checkpoint();
        e.preventDefault();
        e.returnValue = "";
      }
    };
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("blur", blur);
    window.addEventListener("resize", resize);
    window.addEventListener("beforeunload", leave);
    return () => {
      alive.current = false;
      generation.current++;
      stopPoll();
      instance?.destroy();
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("blur", blur);
      window.removeEventListener("resize", resize);
      window.removeEventListener("beforeunload", leave);
    };
  }, [config, account, pause, publish, refresh]);
  useEffect(() => {
    if (view.ready && !view.preview) void refresh().catch(() => {});
  }, [refresh, view.ready, view.preview]);
  return {
    view,
    model,
    chain,
    chainError,
    chainLoading,
    publish,
    start,
    tick,
    pause,
    resume,
    reset,
    claim,
    recover,
    refresh,
    account,
  };
}
export type ArcadeControls = ReturnType<typeof useArcade>;
