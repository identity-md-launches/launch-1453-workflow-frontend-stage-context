import type { CSSProperties } from "react";
export function Icon({
  name,
  size = 20,
  style,
}: {
  name:
    | "arrow"
    | "play"
    | "pause"
    | "sound"
    | "mute"
    | "settings"
    | "close"
    | "copy"
    | "check"
    | "core"
    | "shield"
    | "keys";
  size?: number;
  style?: CSSProperties;
}) {
  const paths = {
    arrow: (
      <>
        <path d="M5 19 19 5M5 5h14v14" />
      </>
    ),
    play: <path d="m9 5 11 7-11 7z" />,
    pause: (
      <>
        <path d="M8 5v14M16 5v14" />
      </>
    ),
    sound: (
      <>
        <path d="m11 5-5 4H3v6h3l5 4zM15 8a6 6 0 0 1 0 8M18 4a11 11 0 0 1 0 16" />
      </>
    ),
    mute: (
      <>
        <path d="m11 5-5 4H3v6h3l5 4zM16 9l6 6m0-6-6 6" />
      </>
    ),
    settings: (
      <>
        <path d="M5 3v18M12 3v18M19 3v18" />
        <path d="M2 8h6M9 16h6M16 7h6" strokeWidth="4" />
      </>
    ),
    close: <path d="m6 6 12 12M6 18 18 6" />,
    copy: (
      <>
        <rect x="8" y="8" width="12" height="13" rx="2" />
        <path d="M16 8V3H3v13h5" />
      </>
    ),
    check: <path d="m4 12 5 5L20 6" />,
    core: (
      <>
        <path d="m12 2 8 5v10l-8 5-8-5V7zM4 7l8 5 8-5M12 12v10" />
      </>
    ),
    shield: <path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6z" />,
    keys: (
      <>
        <rect x="2" y="6" width="20" height="13" rx="2" />
        <path d="M5 10h2m3 0h2m3 0h2M5 14h2m3 0h2m3 0h2" />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={style}
    >
      {paths[name]}
    </svg>
  );
}
export function Brand({ small = false }: { small?: boolean }) {
  return (
    <span className={`brand ${small ? "brand-small" : ""}`}>
      <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true">
        <path
          d="m3 25 4-16 9-5 1 7-6 3-1 5 6-3 1 8-8 5zm17 3-1-17 7-6 5 3-4 5-3 1 1 7 4-3 2 5-8 6z"
          fill="currentColor"
        />
      </svg>
      <span>
        Skyline<span>Heist</span>
      </span>
    </span>
  );
}
