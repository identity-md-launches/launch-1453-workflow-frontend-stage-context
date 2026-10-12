# SKYLINE HEIST — implemented design

This document lives in `docs/` because the assignment’s overriding write budget forbids a root `DESIGN.md`. It describes the shipped source, not a proposed redesign.

## Art direction

**Fantasy:** take the city’s master data-core and survive one clean escape. **Medium:** precise, shaded Canvas illustration with the composition of a chase-film poster. **Motif:** an ivory-and-charcoal rig, carrying one orange core, against dark harbor infrastructure.

The release intentionally uses a dark, after-hours palette. It has no theme switch. The public landing page and the host iframe share type, action color, rig/drone drawing routines and vocabulary. The original cover is rendered at 1200×630 from `web/src/game/render.ts` by `web/scripts/render-cover.mjs`; see `validation/cover-studies.svg` for the two composition studies and `validation/cover-thumbnail.webp` for the 240px inspection size. The selected title-left, diagonal-rig-right composition preserves title hierarchy and distinctive silhouettes; the centered approach study leaves less room for the title at thumbnail size.

## Colors and roles

The CSS source of truth is `web/src/styles.css:1`. Components consume semantic tokens; Canvas uses the matching art palette in `web/src/game/render.ts:2`.

| Semantic token | Value | Purpose |
| --- | --- | --- |
| `--bg` | `#0b141b` | Page and cabinet background |
| `--surface` | `#111e27` | Instrument panel, cards and disclosures |
| `--surface-raised` | `#1a2a35` | Hover/raised surfaces |
| `--border` | `#344650` | Structural rules, buttons and panels |
| `--text` | `#ece8d9` | Ivory primary text and hull bars |
| `--text-secondary` | `#b5c0c2` | Descriptions and secondary labels |
| `--text-muted` | `#8b9da5` | Supporting captions and metadata |
| `--accent` | `#ff8545` | Primary action and the cargo/core motif |
| `--accent-hover` | `#ff965f` | Primary button hover |
| `--focus` / `--success` | `#6ce0e8` | Focus outlines, confirmation and game shots |
| `--error` | `#ff9099` | Persistent, readable error copy |

Canvas adds ink-blue water (`#102a37`), concrete (`#24313a`), amber lamps (`#e5b57b`), selective magenta signs (`#c56aa8`) and red drone warning lights (`#ff5a68`). These scenery colors do not encode interactive controls. Status always includes words, shapes or icons, not just hue.

The browser review measured the rendered solid-surface text/action pairs. Exact ratios are retained in `validation/browser-tests.json`; no contrast claim is made for every changing Canvas pixel or arbitrary image overlay.

## Typography

`web/src/fonts.css` bundles Barlow Condensed at 600/800 and DM Sans at 400/600 as local Latin WOFF2. The interface uses only weights 400, 600 and 800, including explicit 600-weight bold text. `font-display: swap` has a system fallback; synthesized faces are disabled. There are no runtime Google Fonts requests.

- Barlow Condensed is the display face for the slanted two-line wordmark, large section headings, countdown, cargo, results and numeric statistics. The wordmark is 800 weight with an orange rule and a restrained −5° skew, not an unrelated logo image.
- DM Sans is the body, controls, captions and error face. Normal copy uses 1.6 line height and a maximum 65-character measure. Titles use 1.03; headings balance their wrapping.
- Six size roles cover the interface: `--label-size` (12px), `--small-size` (14px), `--body-size` (16px), `--title-size` (40–56px), `--instrument-size` (56–88px) and `--wordmark-size` (responsive display). All component sizes use these tokens; captions never fall below 12px at the default root size. The public wordmark retains its 80–156.8px desktop range and uses `clamp(2.8rem, 13vw, 5.7rem)` on phones, capped/stacked below 380px. The game scopes titles to 32–56px, instruments to 40–56px (32px in compact landscape play) and its wordmark to 76.8–128px.
- Changing timer, cargo, reward and score values use tabular numerals. Full addresses stay reachable in selectable code and explorer/copy controls.
- At phone widths the public wordmark becomes one line where it fits, then returns to a stacked treatment at 380px and below. The last narrow-width rules prevent wordmark/stat overflow under 200% text resizing.

## Layout and responsive behavior

`Landing.tsx` follows header → illustrated hero → mission statistics → three district stretches → controls → rewards/contracts → final hosted-play link → footer. The supplied tagline and short instruction carry the hero; sections use direct headings without additional promotional eyebrows. District names, route times and instrument labels remain. Its primary action consistently opens the exact hosted game. There is no standalone wallet dashboard.

The desktop `.wrap` is at most 1,320px, inset 48px. Insets reduce to 28px, then 20px and 16px on the smallest screens. Layout changes at 1,100px, 760px and 380px where the content needs them. Cards use a three-column desktop arrangement and a compact illustration/text row on mobile. The mission and controls switch to a single column. Navigation and stat groups can wrap under text enlargement. Controls stay inside margins and safe areas.

The iframe is an arcade cabinet: a compact toolbar, an instrument row, the Canvas arena, and a separate lower touch-control strip. During play and pause the cabinet fills `100dvh` (with an `svh` fallback); flex/grid allocate the arena the remaining height, with no arena minimum forcing page scrolling. Landscape viewports at most 600px tall use a 52px toolbar, inline instruments and an 80px movement pad/72px fire button. Pause retains a 44px target. At 844×390 the rendered rows are 52px toolbar, 43px HUD, 207px arena and 88px controls, all visible together.

The square verified world fits the available arena uniformly, with harbor decoration outside the action boundaries; no physics or coordinates change when resizing. Thumbs stay below the rig. Resizing pauses the run. Menu/results and their disclosures retain scrolling, and the pause overlay can scroll on very short screens. Statistic groups use a rem-based flex basis so they wrap when text is enlarged to 200%.

The Canvas renderer preserves aspect ratio for hero art at phone widths. Desktop results use a large extraction image; narrow results include a dedicated image between the result heading and breakdown. Gameplay never cuts the camera away; the cinematic image appears only after the run has ended.

## Components and interaction states

| Component / source | Role and implemented states |
| --- | --- |
| `Brand`, `Icon` / `web/src/components/Icons.tsx` | Original mark and single currentColor stroke icon set; decorative SVGs are hidden from assistive technology. |
| `HeroArt` / `web/src/components/HeroArt.tsx` | Canvas hero, responsive crop and static result art. Public scenery can be paused. Hidden tabs stop its animation loop. |
| `.button`, `.icon-button` / `web/src/styles.css` | Filled orange primary, neutral bordered secondary, 44px minimum icon target; hover, focus, pressed, disabled and pending treatments. |
| `GameCanvas` / `web/src/components/GameCanvas.tsx` | Fixed simulation ticks, interpolated drawing, keyboard input, two-pointer touch pad/fire, cancellation handling. Touch gestures suppress scrolling only on the game controls/arena. |
| HUD / `web/src/components/Game.tsx` | Large countdown, three slanted hull segments, cargo count; damage has visible grace text and an actual countdown arc. Screen-reader status updates on score/hull changes, not every timer tick. |
| Start/pause/result overlays / `web/src/components/Game.tsx` | Clear primary action by state, local best, expiry, verification, unpaid/paid distinction, cancelled/uncertain transaction recovery. Programmatic heading focus announces screen changes without adding a tab stop. |
| Settings dialog / `web/src/components/Game.tsx` | Native modal dialog, labelled heading, focus trap, Escape support, focus restoration, sound/motion/effects settings. Opening it pauses play. |
| `DeploymentPanel` / `web/src/components/DeploymentPanel.tsx` | Native details/summary disclosure. Live balance/policy/close date, loading/retry, full addresses, copy success/failure, explorer links and creator-operation links. |
| Controller / `web/src/game/useArcade.ts` | One bridge, session state machine, retryable verification, claim locking through confirmation, explicit uncertain-write recovery, safe input checkpoints. An in-flight claim retains its voucher/session through local expiry. Pending/uncertain claims block reset; expiry alone never reports that an outstanding wallet request failed. |

## Motion, depth and shapes

There is no camera shake, aim-offset effect, racing physics, boost or scenery collision. Parallax and fast road markings suggest speed; scenery remains behind threats. Banking changes the rig drawing only. Thrusters stretch, the orange core pulses, drone hits emit compact shards and an automatic core-to-cargo visual. Damage grace is drawn from the engine’s remaining invulnerability ticks.

Settings default from `prefers-reduced-motion`: scenery motion off and reduced effects on. Reduced effects removes glow/rain/trains and reduces debris; required hit/hull/grace cues remain. Mute is always visible and audio is gesture-gated. The original Web Audio score changes its pulse and notes across the district’s three stretches.

Most surfaces are square with a 3px corner radius; the settings dialog uses 8px. Touch controls are intentionally circular. Fine structural borders separate instruments and disclosures. Glow is selective around engine/core/lights, not a screen-wide blur. Button transitions name only background, border and transform, take at most 150ms, and run only when reduced motion is not requested. Press scale is 0.96. Focus uses a 3px cyan outline with 5px offset; forced-color fallback keeps control borders explicit.

## Adding another surface

Reuse semantic tokens, `.wrap`, the shared buttons/icons and a concise heading hierarchy. Keep one prominent next action per state. Use `DeploymentPanel` for extended contract facts instead of bringing them into the chase. Preserve coordinate mapping and the frozen engine; visual changes must never redefine hits, timing or payout. New contract fields come from the manifest-referenced ABI and runtime configuration, not another address constant.

Keep copy direct and task-specific: “Resume run”, “Retry verification”, “Check claim status”. A pending or signed voucher is never called a payment. Preserve visible fee and expiry information before Claim. Do not add a light theme, token price, leaderboard, extra pickup or wallet permission that this release does not implement.
