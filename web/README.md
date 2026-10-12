# SKYLINE HEIST frontend

A complete, static Vite + React + TypeScript release. The public page is the game’s illustrated landing page; actual play happens in a Pepe2Pepe iframe. The committed `../dist/` is the publishable site, including the 1200×630 original cover, local fonts and SDK, both implementation ABIs, `pepe-game.json`, and `imd-deployment.json`.

## Install, build and preview

Use Node 22.12+ (validated with Node 24.9.0) and npm. From the repository root:

```sh
npm ci --prefix web --cache /tmp/skyline-npm-cache
npm --prefix web run build
npm --prefix web run preview
```

Open the preview URL printed by Vite. `build` typechecks, builds with `base: './'`, copies and verifies the pinned implementation ABIs, generates the Pepe2Pepe descriptor, and finally inventories **every** exported file except the deployment manifest itself. `npm --prefix web run verify` rechecks the exact contract set, network, pool key, ABI hashes, asset hashes, paths and size limits.

For source editing, first build once, then run `npm --prefix web run dev`. The development middleware serves the same generated runtime deployment JSON and ABI files from `dist/`. It does not define another deployment map. Use the production preview for final validation.

The ABI provenance check uses `git show 03131de3c1cbc06b61e1b1361e87aa8a2b5432ac:docs/abi/<Contract>.json`; retain that deployed source commit in the checkout. The implementation contracts and original ABI exports have not been modified.

## Configuration and trust boundaries

- `src/lib/config.ts` loads **only `imd-deployment.json`** for chain, deployed addresses, ABI locations and public RPC configuration. It fetches both ABI arrays and verifies canonical Keccak hashes. Before rewarded play, `src/lib/chain.ts` checks RPC chain ID, nonempty deployed code, bound token and the engine’s exact on-chain rules hash, then reads the reward policy, close date, pool balance and connected wallet balance.
- `config/deployment.json` and `config/network.json` preserve the supplied build handoffs. They are inputs to `scripts/export.mjs`, not separately bundled address maps. The exact `network`, `walletAddChain` and `poolKey` objects are copied into the runtime manifest. The generated `pepe-game.json` duplicates required publication metadata only; application code does not consume it as deployment configuration.
- `config/product.json` holds the approved build request ID and publication/economic metadata. `HOSTED_PLAY` and the creator-console URL in `src/lib/config.ts` are public product destinations, not RPC or wallet configuration.
- No private credentials, WalletConnect project ID, wallet provider, session capability, server, service worker or external font/CDN is required by the export. The browser performs public reads; Pepe2Pepe alone handles wallet authorization, session admission, signing and claims.
- `public/sdk/arcade-engine.mjs` is byte-identical to the approved engine, Keccak `0x6a126dc671dbed043943f72f26c072f71bc7095efd3d0affa4ca4cb56bfcace8`. Gameplay is 30 fixed ticks/second, 1,800 ticks maximum, three hull points, a 100-point score cap, and the engine’s 45-tick damage grace. Rendering never changes collisions or entitlement.

The SDK is from Pepe2Pepe commit `3df067d1ab5c82481f27e9d4e2dc17ecb1ea93aa`. The local `arcade-client.js` has one documented addition: `account()` forwards the existing read-only account request on the **same** bridge. Using a second bridge with an independent request counter could cross-resolve response IDs; this release uses one bridge. Engine and `onchain-bridge.js` remain unchanged.

## Hosted play

The standalone page links to the approved request:

`https://pepe2pepe.fun/games/play/e15a8192-e16e-4e1b-a7e5-01ba58a965a4`

The early listener in `src/lib/host.ts` retains a one-shot parent init while release files load, then delivers it to the SDK. The iframe waits for a source-window/channel-bound `pepe-game/1` init handshake. Query parameters cannot enable play. A real `preview: true` handshake selects **Review demo · no rewards**, with a fixed local seed and no wallet/backend bridge requests. Normal mode uses `arcade.start`, `tick`, `arcade.finish`, `arcade.status` and `arcade.claim` through the locally bundled client.

The host session must supply the documented `playing` state, seed, rules hash and expiry. Supplied tick rate and maximum ticks must match 30/1800. Existing queued/signed/rejected/expired sessions open their result rather than starting animation. The host keeps the private session capability outside the iframe.

Results distinguish local points, checking, queued, verified-but-unpaid, expired, rejected, uncertain transaction and confirmed claimed states. Only a valid nonzero host voucher can enable Claim. The UI checks the playing wallet, chain, rules, nonzero session/release hashes, policy cap, deadline, season close, funding and the contract’s claimed marker. It rechecks before requesting a claim. It never computes a token entitlement from the local score. Claims stay disabled until the receipt and on-chain claimed state agree. An uncertain transaction requires an explicit status check, not automatic rebroadcast.

If a voucher expires while its wallet request or receipt check is pending, the result keeps “Confirming claim…” and explains that confirmation is pending. It retains the original voucher/session and blocks Play again until the outcome is known. A confirmed cancellation after expiry resolves the expired reward; an uncertain response keeps status recovery available.

Queued verification polls 2.1 seconds apart for at most 60 seconds, then offers Retry. The simulation freezes while paused, while the five-minute server expiry still runs. Visibility loss, resize, blur, stalled rendering and interrupted touches pause safely. When storage is available, legal input checkpoints can restore a session matching its seed, ID and expiry. Opaque sandbox frames generally deny storage: in that case progress stays in memory, and an unfinished session can restart from the same seed before its original expiry. Keep the tab open during a run. Verified rewards remain recoverable using the host’s **My reward** or the in-game **Recover a run or reward** control, including when the pool is empty.

## Wallet and creator boundaries

The approved `pepe-arcade/1` route explicitly says **“No standalone wallet integration or rewarded play.”** Its creator guide says **“The public static game never receives owner authorization”** and that a general embedded swap is not implemented. Accordingly:

- Play asks the host to connect and authorize the wallet before physics start. Missing/wrong wallets, rejected authorization and wrong networks have recoverable explanations.
- Wallet selection, `wallet_switchEthereumChain` and unknown-chain `wallet_addEthereumChain` belong to the host, not a raw provider injected into this opaque iframe. The exact supplied `walletAddChain` is present in the manifest. The host must implement the documented switch → add on 4902 → switch flow. Its real wallet implementation was not exercised on this worker.
- The vault’s primary player action, `claimReward`, has the result-screen Claim control, sent through `arcade.claim`.
- Funding (`LaunchToken.transfer` to Game) and owner-only `recoverExpired` have labelled creator-console links in the contract panel. The console supplies owner authorization. There are no owner-settable contract values in this deployment.
- This game requests no token approval, swap or liquidity operation. Its publication limits are zero native action value and zero token approval. The handoff’s pool key and Uniswap addresses remain intact; arbitrary router permissions are not invented.

The live read at validation time found **0 LOOT in the vault**. New rewarded runs are therefore disabled honestly until funding is available; host admission also checks reservations and budgets. The launch owner is immutable and only that owner can recover unused funds after the close date. The contract panel shows the actual policy and close time, token units, explorer links and copyable checksummed addresses. No USD price source was supplied, so the UI says USD context is unavailable.

## Gameplay and artwork

WASD/arrows move; Space fires; Escape pauses/resumes. On touch screens, the left pad and right fire button support two simultaneous pointers, with pointer capture and a separate lower control strip so thumbs do not hide the rig. Settings provide mute, reduced effects and scenery-motion controls; reduced motion is respected by default. Gamepad support was optional and is not included.

Active play uses the available viewport height, including compact landscape phones. The toolbar, HUD, arena and both touch controls stay visible together; rotating pauses safely. Menu and result content remain scrollable.

Canvas artwork, the rig silhouette, drones, harbor, billboard canyon, approach lighting and synthesized audio are original source in `src/game/`. The actual renderer also produces the cover; it does not imply a different visual fidelity. Fonts are bundled WOFF2 under their OFL licenses. Attribution is in `THIRD_PARTY.md` and `public/licenses/`.

To regenerate the cover (normally unnecessary):

```sh
PLAYWRIGHT_BROWSERS_PATH=/tmp/skyline-playwright npx --prefix web playwright install chromium
PLAYWRIGHT_BROWSERS_PATH=/tmp/skyline-playwright node web/scripts/render-cover.mjs
npm --prefix web run build
```

## Validation

```sh
npm --prefix web run typecheck
npm --prefix web test
PLAYWRIGHT_BROWSERS_PATH=/tmp/skyline-playwright npm --prefix web run test:browser
PLAYWRIGHT_BROWSERS_PATH=/tmp/skyline-playwright node web/tests/revision.mjs
npm --prefix web run verify
node web/scripts/check-rpc.mjs
```

For a local interactive demo, run `node web/tests/server.mjs 4173` from the repository root and open `http://127.0.0.1:4173/host?preview=true`. This test host supplies the real iframe handshake; the production page cannot be enabled by a query parameter.

The browser suite starts a temporary local static server under `/preview/`, uses the real committed production export in an opaque sandbox iframe, and mocks only the external host/wallet/RPC. Its fixture is **not** shipped to `dist/`. It tests complete deterministic runs, keyboard and multi-touch, pause/resume/expiry, wallet cancellation, recovery, verification polling, claim confirmation/uncertainty and safety gates. It produces `docs/validation/browser-tests.json` and a result screenshot. `web/tests/inspect.mjs` captures the landing page and mobile gameplay. Test code and replay fixtures are clearly test-only; no live claims were broadcast.

The revision suite adds landscape geometry/two-touch tests, portrait rotation, voucher expiry during a held host request and delayed receipt, cancellation and uncertain-response recovery, plus computed type-scale and copy checks. Evidence is under `docs/validation/revision/`; see `docs/REVISION.md` for the four review responses and limitations.

On workers with a short command limit, run the existing browser suite as two separate commands with `SKYLINE_BROWSER_SHARD=1/2` and `SKYLINE_BROWSER_SHARD=2/2`, then run `node web/tests/merge-browser.mjs`. This executes the same 24 checks. The merger requires both reports to match the current deployment-manifest hash, checks unique test coverage and rejects failures.

The existing Solidity suite was also run with build/cache outputs under `/tmp`; its 62 test results include duplicate, cross-chain/cross-vault, wrong-player, underfunding, expiry and owner recovery checks. See `../docs/VALIDATION.md` for exact commands, review findings and limitations, and `../docs/DESIGN.md` for the final design system.

## Static publication

Publish `dist/` as files, with directory-relative assets and no server rewrite. A gateway serving the opaque host iframe must allow cross-origin reads of its public module/JSON/font files (normal IPFS gateways do). The worker does not publish, register the release, pin IPFS, redeploy, fund the vault or obtain a live listing/CID. The platform relayer performs publication and listing review later. Open Graph and Twitter metadata use the committed relative cover; absolute social URLs can only be finalized when the publisher supplies the live domain.

Never edit an exported file without rerunning `npm --prefix web run build` or regenerating and verifying the final asset inventory. The frontend ignore budget is only `web/.gitignore`; no root build configuration or ignore file was changed. Dependencies, package caches and browser binaries stay outside Git.
