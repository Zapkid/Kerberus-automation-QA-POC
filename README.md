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

```bash
npm install
npx playwright install --with-deps chromium
cp .env.example .env        # fill in a funds-free test wallet seed phrase
npm run prepare:extensions  # downloads MetaMask
# follow extensions/pocket-universe/README.md to provision Pocket Universe
```

## Running tests

```bash
npm test              # headless per .env, all tests
npm run test:headed   # watch the browser
npm run test:smoke    # tests tagged @smoke (extension load checks)
npm run test:ui       # Playwright UI mode
```

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
