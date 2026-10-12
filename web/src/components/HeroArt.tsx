import { useEffect, useRef } from "react";
import { drawHero } from "../game/render";
export function HeroArt({
  motion = true,
  className = "",
  mode = "hero",
}: {
  motion?: boolean;
  className?: string;
  mode?: "hero" | "result";
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current!,
      ctx = canvas.getContext("2d")!;
    let raf = 0,
      then = 0,
      start = performance.now();
    const draw = (now: number) => {
      const box = canvas.getBoundingClientRect(),
        ratio = Math.min(devicePixelRatio, 2);
      if (
        canvas.width !== Math.round(box.width * ratio) ||
        canvas.height !== Math.round(box.height * ratio)
      ) {
        canvas.width = Math.round(box.width * ratio);
        canvas.height = Math.round(box.height * ratio);
      }
      if (now - then > 32 || !motion) {
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
        drawHero(
          ctx,
          box.width,
          box.height,
          motion ? (now - start) / 1000 : 0,
          motion,
          mode,
        );
        then = now;
      }
      if (motion && !document.hidden) raf = requestAnimationFrame(draw);
    };
    const visibility = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden) raf = requestAnimationFrame(draw);
    };
    const observer = new ResizeObserver(() => {
      if (!motion) draw(performance.now());
    });
    observer.observe(canvas);
    document.addEventListener("visibilitychange", visibility);
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [motion, mode]);
  return (
    <canvas
      ref={ref}
      className={`hero-art ${className}`}
      role="img"
      aria-label="An ivory hover-rig carrying an orange data-core cuts between security drones above the dark canals of Neon Harbor."
    />
  );
}
