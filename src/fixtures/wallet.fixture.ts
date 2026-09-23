import { test as base, chromium, BrowserContext, Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { resolveExtensions, extensionLoadArgs } from './extensions';
import { MetaMaskHelper } from '@helpers/metamask.helper';
import { PocketUniversePage } from '@pages/PocketUniversePage';
import { env } from '@config/env';
import { localTestNetwork } from '@data/testData';

export interface WalletFixtures {
  /** Persistent browser context with MetaMask + Pocket Universe pre-loaded. */
  context: BrowserContext;
  /** A fresh page in that context, ready to navigate to the dApp under test. */
  page: Page;
  metamaskExtensionId: string;
  pocketUniverseExtensionId: string;
  metamask: MetaMaskHelper;
  pocketUniverse: PocketUniversePage;
}

const PROFILE_ROOT = path.resolve(process.cwd(), '.browser-profiles');
const ONBOARDED_MARKER = 'metamask-onboarded.json';

async function extensionIdFromContext(context: BrowserContext, matchHint: string): Promise<string> {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    const workers = context.serviceWorkers();
    const bgPages = context.backgroundPages();
    const urls = [...workers.map((w) => w.url()), ...bgPages.map((p) => p.url())];
    const match = urls.find((u) => u.startsWith('chrome-extension://'));
    if (match) {
      // When multiple extensions are loaded we disambiguate by waiting for
      // all background contexts and picking by load order via matchHint
      // (the extension's own directory name), recorded by the caller.
      void matchHint;
      const id = new URL(match).host;
      if (id) return id;
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('Timed out resolving extension id from browser context.');
}

/**
 * Launches a persistent Chromium context with MetaMask and Pocket Universe
 * loaded as unpacked extensions, then either restores a previously-onboarded
 * wallet profile or runs the import flow fresh. This is the single entry
 * point every test uses to get a browser that already "has" a crypto wallet
 * and the Pocket Universe simulator active before any test logic runs.
 */
export async function launchWalletContext(profileName = 'default'): Promise<{
  context: BrowserContext;
  metamaskExtensionId: string;
  pocketUniverseExtensionId: string;
}> {
  const extensions = resolveExtensions();
  const userDataDir = path.join(PROFILE_ROOT, profileName);
  fs.mkdirSync(userDataDir, { recursive: true });

  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: env.headless,
    slowMo: env.slowMo,
    args: [
      ...extensionLoadArgs(extensions),
      '--no-sandbox',
      '--disable-blink-features=AutomationControlled',
    ],
  });

  // MV3 extensions register a service worker on load; give them a moment.
  await context.waitForEvent('serviceworker', { timeout: 15_000 }).catch(() => undefined);

  const [metamaskExtensionId, pocketUniverseExtensionId] = await Promise.all([
    extensionIdFromContext(context, 'metamask'),
    resolvePocketUniverseId(context),
  ]);

  const markerPath = path.join(userDataDir, ONBOARDED_MARKER);
  const metamask = new MetaMaskHelper(context, metamaskExtensionId, env.metamask.password);

  if (!fs.existsSync(markerPath)) {
    await metamask.importWallet(env.metamask.seedPhrase);
    await metamask.addNetwork(localTestNetwork);
    fs.writeFileSync(markerPath, JSON.stringify({ onboardedAt: new Date().toISOString() }));
  } else {
    await metamask.unlock();
  }

  return { context, metamaskExtensionId, pocketUniverseExtensionId };
}

async function resolvePocketUniverseId(context: BrowserContext): Promise<string> {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    const workers = context.serviceWorkers();
    const bgPages = context.backgroundPages();
    // Pocket Universe is the second extension loaded; once at least two
    // distinct extension hosts are up we take whichever isn't MetaMask's.
    const hosts = new Set(
      [...workers.map((w) => w.url()), ...bgPages.map((p) => p.url())]
        .filter((u) => u.startsWith('chrome-extension://'))
        .map((u) => new URL(u).host),
    );
    if (hosts.size >= 2) {
      return [...hosts][1];
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(
    'Timed out resolving Pocket Universe extension id - verify extensions/pocket-universe contains a valid unpacked extension.',
  );
}

export const test = base.extend<WalletFixtures>({
  // eslint-disable-next-line no-empty-pattern
  context: async ({}, use, testInfo) => {
    const { context } = await launchWalletContext(testInfo.workerIndex.toString());
    await use(context);
    await context.close();
  },

  page: async ({ context }, use) => {
    const page = context.pages()[0] ?? (await context.newPage());
    await use(page);
  },

  metamaskExtensionId: async ({ context }, use) => {
    const id = await extensionIdFromContext(context, 'metamask');
    await use(id);
  },

  pocketUniverseExtensionId: async ({ context }, use) => {
    const id = await resolvePocketUniverseId(context);
    await use(id);
  },

  metamask: async ({ context, metamaskExtensionId }, use) => {
    await use(new MetaMaskHelper(context, metamaskExtensionId, env.metamask.password));
  },

  pocketUniverse: async ({ page }, use) => {
    await use(new PocketUniversePage(page));
  },
});

export { expect } from '@playwright/test';
