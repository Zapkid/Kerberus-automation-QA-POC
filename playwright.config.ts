import { defineConfig } from '@playwright/test';
import { env } from './src/config/env';

export default defineConfig({
  testDir: './tests',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false, // each worker owns its own extension-loaded browser profile
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  forbidOnly: !!process.env.CI,

  reporter: [
    ['list'],
    [
      'allure-playwright',
      {
        resultsDir: 'allure-results',
        detail: true,
        suiteTitle: true,
        environmentInfo: {
          base_url: env.baseUrl,
          metamask_network: env.metamask.networkName,
        },
      },
    ],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],

  use: {
    baseURL: env.baseUrl,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // Wallet/extension tests always run in a headed-capable Chromium context
    // launched manually by src/fixtures/wallet.fixture.ts, so no `browserName`
    // project matrix is defined here - extension loading requires Chromium.
  },

  // No `projects` array: tests use the custom `context`/`page` fixtures from
  // src/fixtures/wallet.fixture.ts, which launch their own persistent
  // Chromium context (with MetaMask + Pocket Universe loaded) instead of
  // Playwright's default browser/project fixtures.
});
