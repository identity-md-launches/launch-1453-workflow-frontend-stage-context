import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { SceneRenderer } from "../game/render";
import { GameAudio } from "../game/audio";
import type { ArcadeControls } from "../game/useArcade";
import type { Config, Effects, Run } from "../lib/types";
export type InputState = {
  keys: Set<string>;
  x: number;
  y: number;
  fire: boolean;
};
export function inputBits(input: InputState) {
  let b = 0;
  const k = input.keys;
  if (k.has("arrowleft") || k.has("a") || input.x < -0.22) b |= 1;
  if (k.has("arrowright") || k.has("d") || input.x > 0.22) b |= 2;
  if (k.has("arrowup") || k.has("w") || input.y < -0.22) b |= 4;
  if (k.has("arrowdown") || k.has("s") || input.y > 0.22) b |= 8;
  if (k.has(" ") || input.fire) b |= 16;
  return b;
}
export function GameCanvas({
  game,
  config,
  effects,
  audio,
}: {
  game: ArcadeControls;
  config: Config;
  effects: Effects;
  audio: GameAudio;
}) {
  const canvas = useRef<HTMLCanvasElement>(null),
    latest = useRef({ game, effects }),
    input = useRef<InputState>({ keys: new Set(), x: 0, y: 0, fire: false });
  latest.current = { game, effects };
  const [thumb, setThumb] = useState({ x: 0, y: 0 }),
    [firing, setFiring] = useState(false);
  const padPointer = useRef<number | null>(null),
    firePointer = useRef<number | null>(null);
  const clear = () => {
    input.current.keys.clear();
    input.current.x = 0;
    input.current.y = 0;
    input.current.fire = false;
    padPointer.current = null;
    firePointer.current = null;
    setThumb({ x: 0, y: 0 });
    setFiring(false);
  };
  useEffect(() => {
    clear();
    if (game.view.phase === "playing")
      canvas.current?.focus({ preventScroll: true });
  }, [game.view.phase]);
  useEffect(() => {
    const node = canvas.current!,
      ctx = node.getContext("2d")!,
      renderer = new SceneRenderer();
    let raf = 0,
      last = 0,
      acc = 0,
      time = 0;
    const idle = config.engine.createRun(20261012);
    idle.y = 700;
    idle.enemies = [
      { x: 260, y: 270, speed: 0 },
      { x: 760, y: 400, speed: 0 },
      { x: 490, y: 60, speed: 0 },
    ];
    const paint = (now: number) => {
      const { game: g, effects: fx } = latest.current,
        m = g.model.current;
      const elapsed = last ? (now - last) / 1000 : 0;
      last = now;
      const box = node.getBoundingClientRect(),
        ratio = Math.min(devicePixelRatio, 2),
        cw = Math.round(box.width * ratio),
        ch = Math.round(box.height * ratio);
      if (node.width !== cw || node.height !== ch) {
        node.width = cw;
        node.height = ch;
      }
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      if (m.phase === "playing") {
        if (elapsed > 0.25) {
          acc = 0;
          g.pause("Rendering was interrupted. Your run is paused.");
        } else {
          acc += Math.min(elapsed, 0.1);
          let steps = 0;
          while (
            acc >= 1 / 30 &&
            steps++ < 3 &&
            g.model.current.phase === "playing"
          ) {
            const bits = inputBits(input.current);
            const result = g.tick(bits);
            acc -= 1 / 30;
            if (result) {
              time = result.after.tick / 30;
              renderer.observe(result.before, result.after, time, fx.reduced);
              audio.tick(result.after.tick, !!(bits & 16));
              if (result.after.score > result.before.score) audio.impact();
              if (result.after.hp < result.before.hp) audio.damage();
              if (result.after.done) audio.finish(result.after.hp > 0);
            }
          }
        }
      } else {
        acc = 0;
      }
      const run = m.run ?? idle;
      const idleTime = fx.motion ? now / 1000 : 0;
      if (!m.run) idle.tick = Math.floor((idleTime % 20) * 30);
      const visualTime =
        m.phase === "playing" ? time + acc : m.run ? time : idleTime;
      renderer.draw(
        ctx,
        box.width,
        box.height,
        run,
        visualTime,
        m.phase === "playing" ? Math.min(elapsed, 0.05) : 0,
        fx,
        m.phase === "playing" ? acc * 30 : 1,
        m.run ? (m.previous ?? undefined) : undefined,
      );
      raf = requestAnimationFrame(paint);
    };
    const key = (e: KeyboardEvent, pressed: boolean) => {
      const g = latest.current.game;
      if (
        document.querySelector("dialog[open]") ||
        ["INPUT", "TEXTAREA", "SELECT"].includes((e.target as Element)?.tagName)
      )
        return;
      if (e.key === "Escape" && pressed && !e.repeat) {
        if (g.model.current.phase === "playing") g.pause();
        else if (g.model.current.phase === "paused") g.resume();
        return;
      }
      const k = e.key.toLowerCase();
      if (
        ![
          "w",
          "a",
          "s",
          "d",
          "arrowleft",
          "arrowright",
          "arrowup",
          "arrowdown",
          " ",
        ].includes(k)
      )
        return;
      if (g.model.current.phase === "playing") {
        e.preventDefault();
        if (pressed) input.current.keys.add(k);
        else input.current.keys.delete(k);
      } else input.current.keys.delete(k);
    };
    const down = (e: KeyboardEvent) => key(e, true),
      up = (e: KeyboardEvent) => key(e, false),
      blur = () => clear();
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    raf = requestAnimationFrame(paint);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, [config, audio]);
  const move = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (padPointer.current !== e.pointerId) return;
    const rect = e.currentTarget.getBoundingClientRect(),
      r = rect.width / 2;
    let x = (e.clientX - rect.left - r) / (r * 0.66),
      y = (e.clientY - rect.top - rect.height / 2) / (r * 0.66);
    const len = Math.hypot(x, y);
    if (len > 1) {
      x /= len;
      y /= len;
    }
    input.current.x = x;
    input.current.y = y;
    setThumb({ x: x * r * 0.35, y: y * r * 0.35 });
  };
  const padEnd = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (padPointer.current !== e.pointerId) return;
    input.current.x = 0;
    input.current.y = 0;
    padPointer.current = null;
    setThumb({ x: 0, y: 0 });
    if (e.type === "pointercancel")
      game.pause("Touch was interrupted. Your run is paused.");
  };
  const fireEnd = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (firePointer.current !== e.pointerId) return;
    firePointer.current = null;
    input.current.fire = false;
    setFiring(false);
    if (e.type === "pointercancel")
      game.pause("Touch was interrupted. Your run is paused.");
  };
  const active = game.view.phase === "playing";
  return (
    <>
      <div className="canvas-stage">
        <canvas
          ref={canvas}
          tabIndex={active ? 0 : -1}
          aria-label="Neon Harbor game arena. Move with WASD or arrow keys, hold Space to fire, Escape to pause."
          data-testid="game-canvas"
        />
        <span className="arena-guide" aria-hidden="true">
          NEON HARBOR
        </span>
      </div>
      <div
        className={`touch-controls ${active ? "" : "inactive"}`}
        role="group"
        aria-label="Touch game controls"
      >
        <div
          className="movement-pad"
          data-testid="movement-pad"
          role="group"
          aria-label="Touch movement pad. Drag to steer."
          onPointerDown={(e) => {
            if (!active || padPointer.current !== null) return;
            padPointer.current = e.pointerId;
            e.currentTarget.setPointerCapture(e.pointerId);
            move(e);
          }}
          onPointerMove={move}
          onPointerUp={padEnd}
          onPointerCancel={padEnd}
          onLostPointerCapture={padEnd}
        >
          <span className="pad-axis vertical" />
          <span className="pad-axis horizontal" />
          <span
            className="thumb"
            style={{ transform: `translate(${thumb.x}px, ${thumb.y}px)` }}
          />
          <span className="pad-label">Move</span>
        </div>
        <span className="touch-hint">
          Keep the
          <br />
          core moving.
        </span>
        <button
          className={`fire-button ${firing ? "firing" : ""}`}
          data-testid="fire-button"
          disabled={!active}
          aria-label="Fire. Hold to shoot."
          onPointerDown={(e) => {
            if (firePointer.current !== null) return;
            firePointer.current = e.pointerId;
            e.currentTarget.setPointerCapture(e.pointerId);
            input.current.fire = true;
            setFiring(true);
          }}
          onPointerUp={fireEnd}
          onPointerCancel={fireEnd}
          onLostPointerCapture={fireEnd}
          onKeyDown={(e) => {
            if (e.key === " " || e.key === "Enter") input.current.fire = true;
          }}
          onKeyUp={() => {
            input.current.fire = false;
          }}
        >
          <span aria-hidden="true">⌖</span>Fire
        </button>
      </div>
    </>
  );
}
