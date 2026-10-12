# Worker validation — SKYLINE HEIST

This is worker-produced evidence, not an independent certification. The production export was built and exercised locally. No production claim, funding transfer, recovery, swap, publication or redeployment was broadcast.

The reopened-review fixes and current checks are documented in [REVISION.md](REVISION.md), with before/after evidence under `validation/revision/`. The implementation-stage live RPC/contract observations and original visual captures below remain historical evidence; the revision does not claim those live checks were repeated. The browser and export audit reports are refreshed by the revision's final checks.

## Reproducible checks and results

Commands were run from the repository root, except the explicitly noted unit reporter:

| Check | Command actually run | Result / evidence |
| --- | --- | --- |
| Dependencies | `npm install --prefix web --cache /tmp/skyline-npm-cache --no-audit --no-fund` (then pinned Node types added) | Frontend manifest and npm lockfile in `web/`; no dependency directories submitted. |
| Typecheck + export | `npm --prefix web run build` | Passed; includes `tsc --noEmit`, Vite production build, ABI provenance/hash checks and final manifest generation. |
| Frontend/engine tests | `npm --prefix web test` | 12 passed. Final machine report: `cd web && node --test --test-reporter=junit tests/*.test.mjs > ../docs/validation/unit-tests.xml`. |
| Production browser | `PLAYWRIGHT_BROWSERS_PATH=/tmp/skyline-playwright npm --prefix web run test:browser` | 24 passed in Chromium 141.0.7390.37; `validation/browser-tests.json`. |
| Rendered inspection | `PLAYWRIGHT_BROWSERS_PATH=/tmp/skyline-playwright node web/tests/inspect.mjs` | Desktop/mobile public page, mobile menu/gameplay; no page errors. Committed screenshots inspected by the worker. |
| Additional visual states | `PLAYWRIGHT_BROWSERS_PATH=/tmp/skyline-playwright node web/tests/visual-review.mjs` | Billboard stretch, phone result/action scroll, result reflow and worker frame pacing; `validation/visual-review.json`. |
| Static integrity | `npm --prefix web run verify` | Exact handoff fields, whole network/pool key, canonical ABI hashes, every asset SHA-256, paths, relative entrypoint and export limits verified. |
| Read-only live chain | `node web/scripts/check-rpc.mjs` | Ethereum chain 1, nonempty code at both supplied addresses, actual getters and engine/rules binding; `validation/rpc.json`. |
| Existing contract suite | `forge test --offline --out /tmp/skyline-foundry-out --cache-path /tmp/skyline-foundry-cache --json > docs/validation/contract-tests.json 2>/tmp/skyline-forge-errors.log` | 62 passed, 0 failed. No contract or root build configuration changed. |

The supplied browser MCP could not launch because its expected Chrome binary was absent. The worker installed Playwright Chromium under `/tmp` and used its browser API instead, inspected the resulting images, and tested the **committed production export** through a local `/preview/` subpath. A temporary test server and opaque sandbox iframe implement the documented host protocol; they are not in the export. This is actual browser execution, not a claim inferred from source inspection.

## What the interaction evidence covers

- Standalone hosted-play link, relative assets, no wallet or URL-query bypass; real parent-window init, one-shot init before async configuration finishes, self-window spoof rejection and wrong-channel response rejection.
- Admin preview makes **zero** public RPC, wallet or reward-service requests and runs only the frozen local engine. A mocked normal host exercises session authorization; cancelling returns to the menu before any physics start.
- Keyboard steering and shooting, simultaneous two-pointer movement/fire with pointer capture, touch cancellation, Escape pause/resume, host pause, screen resize, fixed physics while paused and five-minute real-time expiry.
- Full extraction and destruction with retained local points, restart and local best. Deterministic replay fixtures are in `validation/replay-fixtures.json`: seed 20261012 with no input loses at tick 973; continuous fire extracts at tick 1800 with 7 points/2 hull; right+fire extracts with 6 points/3 hull. Invalid seeds, malformed/oversized/illegal/unfinished transcripts and input after completion are rejected.
- A complete hosted replay uploads **once**, enters queued verification, polls 2.1 seconds apart and displays the signed amount without treating it as paid. Polling stops at its 60-second bound with explicit retry.
- Claim cancellation/retry, pending lock, confirmed receipt and claimed marker, uncertain-transaction status recovery, zero-reward resolution, wrong wallet/chain, tampered rules, expired voucher, empty pool and RPC failure. A pool-empty state preserves recovery of an existing reward. Expired signed rewards permit another run.
- Native settings dialog, accessible naming, sound/motion/effect settings, explicit Tab/Shift+Tab wrapping inside the opaque iframe, Escape dismissal and focus restoration. Automated axe WCAG A/AA checks found no violations on the public landing page and iframe menu. This is not a blanket accessibility certification of a visual reaction game.
- The unchanged Solidity tests separately cover signatures, wrong player/signer/rules, single-field tampering, duplicates, cross-chain/cross-vault replay, underfunding followed by funding, deadline inclusivity, reentrancy and owner-only recovery strictly after close. These are local EVM tests, not live transactions.

The mocked host returns synthetic test session/transaction hashes and uses supplied public addresses only as fixtures. It never contains a live private key, submits a wallet transaction, or pretends to register this release. Test fixtures and host simulator source are excluded from `dist/`.

## Deployment binding and live observations

Both ABI arrays were obtained with `git show` from deployed source commit `03131de3c1cbc06b61e1b1361e87aa8a2b5432ac`, compared byte-for-byte to the implementation exports and checked against the handoff’s canonical Keccak values:

| Contract | ABI Keccak, without 0x |
| --- | --- |
| LaunchToken | `f36d2fe28b62f817a4fba0b78bb501b41895eada3982280273c063ad8183f577` |
| Game | `3476aa3d42e0f3e0a44c2399a0e1940fb75f2380b169bc0412749e6153d330a2` |

The shipped engine is unmodified and matches `0x6a126dc671dbed043943f72f26c072f71bc7095efd3d0affa4ca4cb56bfcace8`. The deployment manifest is the runtime source for chain, address and ABI configuration; `poolKey`, `network` and `walletAddChain` are copied unchanged. The descriptor for Pepe2Pepe is generated from those same build inputs, not maintained as another runtime map.

The live publicnode read at block **26178131**, captured at **2026-10-12T18:17:16.812Z**, returned the supplied Game and token addresses with nonempty code, the expected token/rules binding, 1 LOOT per point, a 100 LOOT cap, and **0 LOOT vault balance**. The exact owner, signer, close timestamp and runtime code hashes are in `validation/rpc.json`. Consequently the normal UI does not advertise a payable run while funding is absent. This historical read does not promise the current balance or future availability.

## Better Interface consolidated review

All six pinned domains were read and applied during implementation, then reviewed against source and rendered output. Supporting guidance was consulted for keyboard/focus, motion, sizing and documentation. The requested dark arcade direction was retained. `docs/DESIGN.md` records the final tokens, typography, components and responsive behavior; the overriding write budget prevents placing it at the repository root.

| Domain | Coverage | Findings, correction and final evidence |
| --- | --- | --- |
| Accessibility | Native buttons/links/details/dialog, names, headings, keyboard flow, live status, touch hit areas, focus restoration, motion preference, automated browser audit. | The settings dialog initially needed an explicit accessible name; fixed with `aria-labelledby` in `web/src/components/Game.tsx:584`. A supplemental keyboard check found native reverse-Tab could escape the opaque iframe; explicit wrapping in that dialog fixes it. Production browser assertions cover Tab, Shift+Tab, Escape dismissal and focus restoration. Input cancellation clears both pointers and pauses (`web/src/components/GameCanvas.tsx`). Focus rings are explicit (`web/src/styles.css:73`). Screen-reader/native-device checks remain unperformed. |
| Layout | Public page and iframe at desktop/phone widths, actual screenshots, 320px reflow, 200% text enlargement, result scrolling. | Initial hero art stretched on portrait phones; `web/src/game/render.ts` now preserves a uniform scale/crop. The game initially showed too little harbor at narrow widths; world fitting now includes side scenery. Initial 320px title and enlarged-stat overflow were corrected with wordmark stacking and wrapping (`web/src/styles.css:2117`). Measured page widths 1440, 900, 760, 390 and 320 equal their scroll widths. |
| Writing | Labels, instruction length, errors, result states, expiry/gas wording, creator links and empty states. | Expired signed vouchers initially left replay gated; `web/src/components/Game.tsx:60` now recognizes expiry and offers Play again. Empty-pool state initially prevented result recovery; the dedicated recovery control and `web/src/game/useArcade.ts` path now preserve it. The UI distinguishes local score, verification, signed entitlement and payment. No invented USD price, leaderboard or profit claim. |
| Typography | Local intended font weights, numeric stability, heading hierarchy, body measure and actual wrapping. | Narrow public wordmark was corrected without distorting the rig art. Numeric instruments use tabular figures; readable body/error copy remains distinct from compact decorative captions. Full addresses stay available, not only ellipsized. See `web/src/fonts.css`, `web/src/styles.css:328` and the screenshots. |
| Colors | Semantic tokens, actual solid backgrounds and computed contrast, redundant status cues. | Rendered body: **9.98:1**; muted supporting text: **6.60:1**; primary button text: **7.69:1**; card text: **9.11:1**. Exact RGB pairs/ratios are in `validation/browser-tests.json`. All exceed 4.5:1 for the measured normal-text pairs. Canvas/gradient pixels are not represented as fully audited contrast pairs. |
| UI details | Hover/focus/pressed/disabled/pending/empty/error states, restrained motion, icon consistency, responsive result art and timing. | First init could arrive during deployment loading; `web/src/lib/host.ts` now buffers only a validated parent init for the SDK. Demo mode originally initiated public reads; the controller now skips them and the zero-network test passes. Claims remain locked through receipt verification; uncertain writes offer status checking. Scenery stays behind collisions, and the extraction shot appears only after the action. |

The changing Canvas scene was inspected at its intended speed in Chromium. The guide’s optional 10%-speed animation-panel review, RTL/pseudo-localized layouts, Windows forced-color rendering, physical touch devices, native gamepads, screen readers and real headphone/speaker audition were **not verified**. Forced-color fallback exists in source; gamepad support was optional and is not implemented. The game is visually aimed and is not presented as independently playable by a screen reader.

## Art and performance evidence

The cover is an original 1200×630 WebP produced with the actual rig and drone drawing routines. It shows the orange cargo reflected on the harbor approach, and retains the title at 240px width. No stock character or external bitmap was substituted. The two original layout studies, chosen composition and thumbnail are committed:

- [Composition studies](validation/cover-studies.svg)
- [240px cover thumbnail](validation/cover-thumbnail.webp)
- [Desktop page](validation/screenshots/desktop.jpg)
- [Phone page](validation/screenshots/mobile.jpg)
- [Phone controls/gameplay](validation/screenshots/gameplay-mobile.jpg)
- [Billboard canyon](validation/screenshots/billboard-canyon.jpg)
- [Extraction result](validation/screenshots/extraction.jpg)
- [Phone result](validation/screenshots/result-mobile.jpg)
- [Phone result actions](validation/screenshots/result-mobile-actions.jpg)

Frame pacing samples, viewport sizes and result scroll behavior are in `validation/visual-review.json`. Those measurements describe headless Chromium on this worker, not a performance guarantee for physical phones. Particle counts and catch-up ticks are bounded, and long interruptions pause instead of processing an uncontrolled tick backlog.

## Publication, scope and remaining live limitations

The worker did **not** connect a real wallet to Pepe2Pepe, authorize a real session, use the production verification service, pay claim gas, fund/recover the vault, test a real extension’s network-add prompt, or exercise the creator console. The host must provide the documented session envelope, wallet switch → add-on-4902 → switch flow, simulation, confirmation and recovery. These platform-owned operations cannot be established by a local mock. In particular, no existing worker evidence means a mainnet reward was paid.

The approved arcade route explicitly keeps wallet providers, owner authorization and arbitrary swaps out of the iframe. Player Claim delegates to `arcade.claim`; funding/recovery controls link to the creator console. The entire supplied network/pool metadata remains intact, but there is no invented standalone swap, approval or liquidity flow.

Opaque iframe storage may be denied. Input checkpoints are therefore best-effort, and the pause/menu copy asks players to keep the tab open; the host recovers verified results and can return an unfinished seed-bound session. The server’s real-time expiry still applies. No client capability or signing secret is stored.

The export includes relative social-cover metadata because no final named domain or CID was supplied. Absolute social URLs, real gateway CORS, release registration, listing approval, immutable/named publication checks, pinning and hosting are the publisher’s later stage. The actual hosted link uses the supplied build request ID and is not claimed to be a live approved listing yet.

All worker-delivered changes are under `web/`, `dist/` and `docs/`, with the explicitly allowed `web/.gitignore`. Root configuration, `.github/`, `lib/`, contracts and original ABI files are preserved. Dependency caches and browser/Foundry outputs stay outside Git. The final export is far below the 128-asset and response-body limits; exact sizes and integrity checks are in `validation/export-audit.json`. The original checkout’s `.git` is mounted read-only: `git add` fails with `index.lock: Read-only file system`, so an in-place commit cannot be made on this worker. An isolated temporary checkout is used to commit all worker changes and create a Git bundle with the supplied deployed-source commit as its prerequisite, without modifying protected metadata. The older supplied history contains an unavailable Git object, so a standalone `--all` history bundle cannot be made. The worker-change bundle is verified against the supplied repository and checked against the 8 MiB submission limit before handoff; the publisher can import that bundle or commit the delivered working-tree files.
