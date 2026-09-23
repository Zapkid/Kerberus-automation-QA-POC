# Kerberus Automation QA POC

End-to-end test automation infrastructure for web3/crypto dApp testing.

- **Playwright + TypeScript** as the test runner
- **MetaMask** and **Pocket Universe** browser extensions are loaded and the
  wallet is onboarded automatically *before any test body starts*
- **Page Object Model** for all UI interactions (dApp pages, MetaMask's own
  UI, and Pocket Universe's simulation overlay)
- **Allure** for test reporting

## Architecture

```
extensions/                 unpacked browser extensions (gitignored binaries)
  metamask/                 downloaded by scripts/download-extensions.ts
  pocket-universe/          provisioned manually, see its README.md
scripts/
  download-extensions.ts    fetches & unpacks the MetaMask release zip
src/
  config/env.ts             typed environment configuration
  fixtures/
    extensions.ts           resolves/validates unpacked extension directories
    wallet.fixture.ts       launches a persistent Chromium context with both
                             extensions loaded, onboards/unlocks MetaMask,
                             and exposes it all as Playwright test fixtures
  pages/                    Page Object Model
    BasePage.ts
    metamask/                MetaMaskOnboardingPage, MetaMaskHomePage,
                              MetaMaskNetworkPage, MetaMaskConfirmationPage
    PocketUniversePage.ts
    dapp/ExampleDappPage.ts  page objects for the application under test
  helpers/metamask.helper.ts business-level wallet actions (connect, confirm
                             transaction, add network, ...)
  data/testData.ts          shared fixtures/test data (network config, etc.)
tests/
  smoke/                    fast checks that both extensions loaded correctly
  example/                  example specs showing the intended usage pattern
  polymarket/               real-dApp specs proving Pocket Universe's UI
                             (with vs. without the extension loaded)
  security/                 verifies Pocket Universe's malicious-tx warning
playwright.config.ts        Allure + HTML reporters, trace/video/screenshot
```

## How wallet injection works

Playwright loads unpacked Chromium extensions via
`chromium.launchPersistentContext(userDataDir, { args: ['--load-extension=...'] })`.
`src/fixtures/wallet.fixture.ts`:

1. Resolves the on-disk paths of the MetaMask and Pocket Universe extensions
   (`src/fixtures/extensions.ts`), failing fast with a clear error if either
   is missing.
2. Launches a persistent Chromium context with **both** extensions loaded via
   `--disable-extensions-except` / `--load-extension`.
3. Waits for each extension's service worker/background page to come up and
   resolves their extension IDs.
4. On first run for a given worker/profile, drives MetaMask's onboarding UI
   (`MetaMaskOnboardingPage`) to import a test wallet from a seed phrase and
   adds the configured test network. A marker file is written into the
   profile directory (`.browser-profiles/<worker>/metamask-onboarded.json`)
   so subsequent runs just unlock the existing wallet instead of re-importing.
5. Exposes `context`, `page`, `metamask` (a `MetaMaskHelper`), and
   `pocketUniverse` (a `PocketUniversePage`) as Playwright test fixtures -
   every test that imports `@fixtures/wallet.fixture` starts with a wallet
   already connected and both extensions active.

Because extension loading requires a headed-capable Chromium context, tests
run through this fixture rather than Playwright's default `browser`/`context`
fixtures, and `fullyParallel`/`workers` are kept conservative in
`playwright.config.ts` (each worker gets its own persistent profile).

### Why Pocket Universe can't be auto-downloaded

MetaMask is open source and publishes unpacked build zips on GitHub, so
`npm run prepare:extensions` fetches it automatically. Pocket Universe is
closed-source and distributed only via the Chrome Web Store, so it must be
provisioned manually once per environment - see
[`extensions/pocket-universe/README.md`](extensions/pocket-universe/README.md).
In CI, provision it from a private artifact/secret store (see the
placeholder step in `.github/workflows/tests.yml`).

## Setup

Follow these steps in order the first time you set up the repo. Every step
after step 1 assumes you're in the repo root.

### 1. Prerequisites

- **Node.js 20+** and **npm 10+** (`node -v`, `npm -v`). Any recent LTS works;
  CI pins Node 20.
- **Java 11+** on your `PATH` (`java -version`) - required by the Allure
  commandline tool (`allure-commandline`, installed as a dev dependency) to
  generate/open HTML reports. Not needed just to *run* tests, only for
  `npm run report:generate` / `report:open` / `report:serve`.
- Linux/CI runners: enough packages for a headed-capable Chromium (installed
  automatically by `playwright install --with-deps`, which needs `sudo`
  on most distros).
- A Chromium-based Chrome or Chromium install is **not** required separately -
  Playwright downloads its own Chromium in step 3.

### 2. Install dependencies

```bash
npm install
```

This installs Playwright, `allure-playwright`, `allure-commandline`,
TypeScript, ESLint/Prettier, and the extension-download tooling.

### 3. Install the Playwright browser binary

```bash
npx playwright install --with-deps chromium
```

Only Chromium is needed - extension loading (`--load-extension`) is a
Chromium-only feature, so this project doesn't use Firefox/WebKit.

### 4. Configure environment variables

```bash
cp .env.example .env
```

Then edit `.env`:

| Variable | Required | Notes |
| --- | --- | --- |
| `BASE_URL` | yes | URL of the dApp under test. |
| `METAMASK_SEED_PHRASE` | yes | Seed phrase for a **disposable, funds-free** test wallet only (e.g. the well-known Hardhat/Anvil default account, or a testnet-only wallet). Never a real wallet. |
| `METAMASK_PASSWORD` | yes | Password MetaMask will be unlocked with during onboarding. |
| `METAMASK_NETWORK_NAME`, `METAMASK_RPC_URL`, `METAMASK_CHAIN_ID`, `METAMASK_SYMBOL` | yes | The custom network added to MetaMask on first run (defaults target a local `http://127.0.0.1:8545` chain - point these at whatever chain your dApp/tests expect, e.g. a local Hardhat/Anvil node or a public testnet). |
| `METAMASK_VERSION` | yes | Pinned MetaMask release version downloaded by step 5. Bump deliberately, not automatically - a version bump can shift the `data-testid` selectors the MetaMask page objects rely on. |
| `POCKET_UNIVERSE_PATH` | yes | Path to the unpacked Pocket Universe extension directory. Defaults to `./extensions/pocket-universe` (step 6). |
| `POLYMARKET_URL` | no | Defaults to `https://polymarket.com`. Used by `tests/polymarket/*.spec.ts`. |
| `ALLOW_REAL_POLYMARKET_TRADE` | no | `true`/`false`, default `false`. Keep `false` unless you deliberately want a Polymarket spec to submit a real, funded transaction - see "Polymarket + Pocket Universe UI-diff tests" below. |
| `SCAM_DAPP_URL` | no | A **controlled** phishing-simulation target for `tests/security/scam-dapp-warning.spec.ts`. Never a live scam site. Leave blank to skip that spec - see "Pocket Universe malicious-dApp warning test" below. |
| `HEADLESS` | no | `true`/`false`. Keep `false` locally the first time so you can watch onboarding run; CI sets `true`. |
| `SLOW_MO` | no | Milliseconds to slow down each Playwright action by, useful while debugging the onboarding flow. |

### 5. Download the MetaMask extension

```bash
npm run prepare:extensions
```

This fetches the MetaMask release zip matching `METAMASK_VERSION` from
MetaMask's public GitHub releases and unpacks it into
`extensions/metamask/`. Safe to re-run; it skips the download if
`extensions/metamask/manifest.json` already exists. Delete
`extensions/metamask/` to force a re-download after changing
`METAMASK_VERSION`.

### 6. Provision the Pocket Universe extension (manual, one-time)

Pocket Universe is closed-source and only distributed via the Chrome Web
Store, so it **cannot** be downloaded by a script. Follow
[`extensions/pocket-universe/README.md`](extensions/pocket-universe/README.md)
to extract the unpacked extension folder from a Chrome install (or a `.crx`)
and place it at `extensions/pocket-universe/` (or wherever
`POCKET_UNIVERSE_PATH` points). When done,
`extensions/pocket-universe/manifest.json` must exist.

In CI, this step is instead provisioned from a private artifact/secret store
- see the placeholder step in `.github/workflows/tests.yml`.

### 7. Verify the setup

```bash
npm run typecheck   # tsc --noEmit - confirms the project compiles
npx playwright test --list   # confirms config/fixtures load correctly
npm run test:smoke  # actually launches Chromium with both extensions and
                     # onboards MetaMask - the real end-to-end check
```

`test:smoke` is the definitive check: it launches the persistent Chromium
context, loads both extensions, onboards/unlocks the MetaMask wallet, and
asserts both extension IDs resolve - i.e. it proves steps 1-6 were done
correctly. If it fails, re-check the table in step 4 and the extension
directories from steps 5-6 first.

## Running tests

```bash
npm test               # headless per .env, all tests
npm run test:headed    # watch the browser
npm run test:smoke     # tests tagged @smoke (extension load checks)
npm run test:polymarket # tests tagged @polymarket
npm run test:security  # tests tagged @security
npm run test:ui        # Playwright UI mode
```

### Polymarket + Pocket Universe UI-diff tests

`tests/polymarket/` proves Pocket Universe adds real UI to a real dApp
(Polymarket, on Polygon mainnet - not a test fixture), by running the
*identical* connect-wallet-and-start-a-trade flow twice:

- `polymarket-with-pocket-universe.spec.ts` - Pocket Universe loaded
  (`usePocketUniverse: true`, the default) - asserts its simulation overlay
  **appears**.
- `polymarket-without-pocket-universe.spec.ts` - a "bare MetaMask" context
  (`test.use({ usePocketUniverse: false })`) - asserts that same overlay
  **never appears**, proving it's something the extension adds rather than
  part of Polymarket's own UI.

Two things to set up before these will pass:

1. **`PolymarketPage` selectors are unverified.** This environment's network
   policy blocks browsing to polymarket.com, so `src/pages/dapp/PolymarketPage.ts`
   was written against Polymarket's general public UI shape using resilient
   role/text-based locators, not confirmed against the live DOM. Run
   `npx playwright codegen https://polymarket.com` locally, click through
   connect-wallet -> open a market -> start a buy order, and reconcile the
   recorded selectors with the ones in that file.
2. **A funded wallet, if you want a real trade to go through.** By default
   both specs stop at the order review / wallet confirmation step and
   cancel - `ALLOW_REAL_POLYMARKET_TRADE=false` in `.env.example`. Polymarket
   trades real USDC on Polygon mainnet; only flip that flag with a wallet
   (real MATIC for gas + real USDC) you're deliberately willing to spend
   from, and update `METAMASK_NETWORK_NAME`/`METAMASK_RPC_URL`/
   `METAMASK_CHAIN_ID` to point at Polygon instead of the local test network.

### Pocket Universe malicious-dApp warning test

`tests/security/scam-dapp-warning.spec.ts` verifies Pocket Universe actually
renders a "risky" verdict when interacting with a malicious dApp. It targets
whatever URL you set as `SCAM_DAPP_URL` and skips itself with a clear
message if that's unset - **no default target is bundled with this repo.**

Set `SCAM_DAPP_URL` to a **controlled phishing-simulation target only**
(an internal red-team fixture, or a security vendor's own published test/demo
malicious dApp) - never a live, real-world scam site. Running an automated
wallet against a real scam site risks genuine interaction with malicious
infrastructure and is out of scope for this repo to encourage. Once you have
a target, inspect its markup (`npx playwright codegen <url>`) and adjust
`src/pages/dapp/ScamDappPage.ts`'s locators to match.

## Allure reporting

Test runs write raw results to `allure-results/` via the `allure-playwright`
reporter configured in `playwright.config.ts`. Generate and view the HTML
report with:

```bash
npm run report:generate   # allure-results -> allure-report
npm run report:open       # opens the generated report
# or, for a live server without a separate generate step:
npm run report:serve
```

CI uploads both the Allure and Playwright HTML reports as build artifacts
(see `.github/workflows/tests.yml`).

## Writing new tests

1. Add a Page Object under `src/pages/` for any new dApp screen, extending
   `BasePage`.
2. Add business-level wallet actions to `src/helpers/metamask.helper.ts` if
   the flow needs something beyond connect/confirm/reject.
3. Import `test`/`expect` from `@fixtures/wallet.fixture` (not
   `@playwright/test` directly) so the test gets a browser with both
   extensions already loaded and the wallet already onboarded.
4. Tag smoke-level tests with `@smoke` in the test title so `npm run
   test:smoke` picks them up.

## Security notes

- Never use a real/funded wallet seed phrase in `.env` or CI secrets - use a
  disposable wallet for a local chain (e.g. Hardhat/Anvil) or a testnet
  faucet account.
- `extensions/`, `.env`, and `.browser-profiles/` (which caches an unlocked
  wallet profile) are gitignored and must never be committed.
