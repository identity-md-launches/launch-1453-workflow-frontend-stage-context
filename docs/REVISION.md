# Reopened review — SKYLINE HEIST

This revision preserves the accepted implementation, deployed contracts, engine, bridge, cover and runtime configuration. It addresses the four supplied findings. Every finding reproduced before its corresponding source change; the original-export observations are in [reproduction.json](validation/revision/reproduction.json). Reviewer responses are delivered in repository-root `.imd-responses.json`, the explicit revision-only path exception. The design document stays at [DESIGN.md](DESIGN.md) because root `DESIGN.md` is outside the overriding write budget.

## Findings and fixes

| Finding | Reproduction and cause | Correction and evidence |
| --- | --- | --- |
| `e42ecb2…` — landscape touch layout | Chromium 141.0.7390.37, 844×390, `hasTouch: true`, production export through `/host?preview=true`. Document height was 639px; scrolling to the controls hid the 66px header and 100.59px HUD. The arena minimum and tall control strip could not fit. | `web/src/styles.css:996` allocates active play/pause from the dynamic viewport; the compact landscape rules at `:2080` use inline instruments and smaller but substantial touch targets. The 330px minimum is removed. At 844×390 the rows are 52px header, 43px HUD, 207px arena and 88px controls; document height is 390px. Tests also cover 667×375, 740×360, 568×320 and 932×430, dual touch, visible Pause and rotation. See [landscape-844.jpg](validation/revision/landscape-844.jpg). |
| `8144f46…` — expiry during claim | The mocked signed voucher had a 240-second deadline. Advancing 235 seconds, holding `arcade.claim`, then advancing seven seconds removed Confirming claim and enabled Play again. Reset occurred without a host reply. | `web/src/components/Game.tsx:65` gates resolution on no pending claim; the result retains the amount, disabled claim control and pending explanation across expiry. `web/src/game/useArcade.ts:368` guards reset during pending/uncertain claims and `:394` captures the original voucher for asynchronous checks. Tests settle the held request via a delayed confirmed receipt, explicit cancellation, or an uncertain reply followed by status recovery. No path offers replay while the claim remains pending/uncertain. See [expired-pending-confirmed.jpg](validation/revision/expired-pending-confirmed.jpg). |
| `36499d8…` — fragmented type scale | Rendered direct-text census at 390px and 1440px confirmed many one-off sizes, five weights and labels below 12px. This census includes visible decorative text and therefore differs slightly from the reviewer's taste-script count. | `web/src/styles.css:28` defines six responsive roles, consumed by component styles: 12px label, 14px small, 16px body, title, instrument and wordmark. Weights are 400/600/800; unused 500/700 font faces are removed. The final public-page census has exactly six sizes and three weights at both widths. Condensed wordmarks and tabular numerals remain. The larger type exposed 200% text overflow in mission statistics; a rem-based flex basis at `:2237` repairs it. |
| `e59b157…` — redundant slogan labels | The rendered hero caption plus mission, controls, rewards and closing promotional eyebrows matched all reported selectors. | Removed those five blocks and their dedicated spacing/styles. `web/src/components/Landing.tsx:204` uses “Move. Fire. Survive.” and `:250` uses “Claim your LOOT”. Closing now has a self-contained heading. Required tagline/instruction and district/time/HUD labels remain. Browser assertions and [phone](validation/revision/landing-390.jpg)/[desktop](validation/revision/landing-1440.jpg) captures verify the result. |

The type consolidation also exposed insufficient contrast on the decorative NH billboard: the rendered 16px text pair measured 3.33:1. Its sign background was darkened from `#a4588e` to `#774267`, keeping the magenta hue; `#f3cbea` text on the corrected solid background is 5.27:1. This is a local consequence of the reported typography fix, not a palette redesign.

## Better Interface review

The pinned guide's workflow and core principles for all six domains were read and applied to the changed surfaces. Review did not expand into new gameplay, economics or wallet features.

| Domain | Coverage and outcome | Limits |
| --- | --- | --- |
| Accessibility | Checked names, disabled/pending controls, keyboard pause/resume, touch cancellation, settings focus, visible pause target, text enlargement and automated axe audits in the production browser suite. | No screen-reader or physical-device session; a visually aimed action game is not claimed to be screen-reader playable. |
| Layout | Checked before/after screenshots, all four active game regions together, no document scroll during play, five landscape widths, portrait rotation, public 320px reflow and 200% text. Fixed the arena height allocation and enlarged-stat wrapping. Menu/results retain scrolling. | Not browser-native 200% zoom, RTL or every possible viewport. The square arena naturally becomes smaller on short phones; physics/coordinates are unchanged. |
| Writing | Checked required tagline/instruction, removed competing promotional labels, direct section headings and truthful claim state through expiry. | No localization changes. |
| Typography | Checked loaded local fonts, six computed public-page size roles, three weights, 12px minimum labels, wrapping and tabular numerals. Removed unused font faces. | Canvas scenery text is artwork, not part of the DOM type census. No platform-wide font rendering guarantee. |
| Colors | Preserved semantic palette; reran production accessibility checks and solid-surface contrast measurements. Corrected the small NH sign after its size changed. | Changing Canvas pixels, gradients and every effect frame are not a complete contrast audit. |
| UI | Checked touch pressed state, pause/resume, rotation, pending wallet/receipt lock, cancellation and uncertain status recovery. Existing art, settings and motion behavior remain. | No 10%-speed animation-panel study, gamepad, real headphone audition or native wallet extension. |

## Validation method and boundaries

All browser tests serve `dist/` under a relative `/preview/` subpath using the supplied sandbox host. They execute the production JavaScript in an opaque iframe. Wallet/host/RPC responses are mocks; no transaction was signed or broadcast. The regression suite holds actual bridge requests unanswered and separately holds the mocked receipt response, rather than inferring pending behavior from source.

From the repository root (build and install may also be run from `web/`):

```sh
npm ci --prefix web --cache /tmp/skyline-revision-npm-cache --no-audit --no-fund
npm --prefix web run build
npm --prefix web run typecheck
npm --prefix web test
SKYLINE_BROWSER_SHARD=1/2 PLAYWRIGHT_BROWSERS_PATH=/tmp/blackout-browser npm --prefix web run test:browser
SKYLINE_BROWSER_SHARD=2/2 PLAYWRIGHT_BROWSERS_PATH=/tmp/blackout-browser npm --prefix web run test:browser
node web/tests/merge-browser.mjs
PLAYWRIGHT_BROWSERS_PATH=/tmp/blackout-browser node web/tests/revision.mjs
npm --prefix web run verify
node web/scripts/audit-submission.mjs
```

One initial whole-suite run was terminated with exit 143 before completing. Optional sharding runs the identical 24 checks in two bounded commands. The merger requires 24 unique checks and a matching hash of the final deployment manifest. The revision suite and final export audit bind their evidence to that same manifest hash. Browser binaries and npm caches are temporary and excluded from submission.

WebKit 26.0 was downloaded for an additional check, but this worker lacks its GTK, GStreamer and other runtime libraries; WebKit behavior is **not verified** here. Chromium 141 is the rendered/interaction evidence. The reviewer's WebKit reproduction is not claimed as this worker's result.

No live-chain behavior was retested in this revision: real host authorization, production verification, wallet prompts, gas payment, transaction mining, fund/recover operations and publication remain untested. Prior deployment-code/RPC and contract-test observations remain separately recorded in [VALIDATION.md](VALIDATION.md). The publisher's later checks do not replace browser validation.

## Final export and check results

- Production build and standalone TypeScript check passed. The build copies the two ABIs from deployed source commit `03131de3c1cbc06b61e1b1361e87aa8a2b5432ac`, verifies their canonical Keccak hashes, then emits the deployment manifest after the export. The final build log is [build.txt](validation/revision/build.txt).
- All 12 frontend/engine unit tests passed; [unit-tests.xml](validation/unit-tests.xml).
- All 24 original production-browser checks passed across two shards of the same export; [browser-tests.json](validation/browser-tests.json). There are no captured page errors and no axe violations in the checked landing/menu states. Public scroll widths equal 1440, 900, 760, 390 and 320px; the 200% text assertion also passes. Measured solid-surface contrast ratios remain 9.98:1 for body copy, 6.60:1 for muted text, 7.69:1 for primary-button text and 9.11:1 for card copy.
- All 10 targeted revision checks passed against the final manifest hash; [regressions.json](validation/revision/regressions.json). Final desktop, phone, small-landscape, rotation and pending-claim screenshots were inspected. The five landscape document heights equal their viewport heights, and no captured page errors remain.
- The final export contains 19 declared assets plus the manifest, totaling **712,438 bytes**. No individual file approaches 8 MiB. Both pinned build-input files compare byte-for-byte with the supplied handoffs; [handoff-binding.json](validation/revision/handoff-binding.json) records the preserved source/attestation, ABI hashes, network/pool binding and manifest hash.

The art/engine, original ABIs, contracts, root build files and dependency lockfile are preserved. Only unused font faces are removed from the rebuilt export; required runtime assets, cover, SDK, licenses, descriptors and ABIs remain complete. No ignore file was changed. `node_modules`, caches, downloaded browsers and scratch tooling are excluded from Git.

Completion: **Complete for the revision's stated scope**, with the browser/device/live-chain limitations above. The original `.git` is read-only on this worker, so the revision commit and submission bundle are prepared in an isolated Git directory under `/tmp`, with the original source commit as the bundle prerequisite. The working-tree deliverables and explicit reviewer-response file remain here for the publisher. The final staged-path, dependency/submodule and bundle-size checks are performed before handoff; no publication or redeployment is part of this revision.
