import { test as base, chromium, BrowserContext, Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { resolveExtensions, extensionLoadArgs } from './extensions';
import { MetaMaskHelper } from '@helpers/metamask.helper';
import { PocketUniversePage } from '@pages/PocketUniversePage';
import { env } from '@config/env';
import { localTestNetwork } from '@data/testData';

export interface WalletFixtures {
  /**
   * Whether Pocket Universe should be loaded alongside MetaMask for this
   * test. Defaults to true. Override per-file with
   * `test.use({ usePocketUniverse: false })` to get a "bare MetaMask"
   * baseline context - used to prove UI differences the extension adds.
   */
  usePocketUniverse: boolean;
  /** Persistent browser context with MetaMask (+ Pocket Universe, if enabled) pre-loaded. */
  context: BrowserContext;
  /** A fresh page in that context, ready to navigate to the dApp under test. */
  page: Page;
  metamaskExtensionId: string;
  /** null when `usePocketUniverse` is false. */
  pocketUniverseExtensionId: string | null;
  metamask: MetaMaskHelper;
  /** null when `usePocketUniverse` is false. */
  pocketUniverse: PocketUniversePage | null;
}

const PROFILE_ROOT = path.resolve(process.cwd(), '.browser-profiles');
const ONBOARDED_MARKER = 'metamask-onboarded.json';

async function extensionIdFromContext(context: BrowserContext): Promise<string> {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    const workers = context.serviceWorkers();
    const bgPages = context.backgroundPages();
    const urls = [...workers.map((w) => w.url()), ...bgPages.map((p) => p.url())];
    const match = urls.find((u) => u.startsWith('chrome-extension://'));
    if (match) {
      const id = new URL(match).host;
      if (id) return id;
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('Timed out resolving extension id from browser context.');
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

/**
 * Launches a persistent Chromium context with MetaMask (and, unless
 * disabled, Pocket Universe) loaded as unpacked extensions, then either
 * restores a previously-onboarded wallet profile or runs the import flow
 * fresh. This is the single entry point every test uses to get a browser
 * that already "has" a crypto wallet - and, for most tests, the Pocket
 * Universe simulator active - before any test logic runs.
 */
export async function launchWalletContext(
  profileName = 'default',
  includePocketUniverse = true,
): Promise<{
  context: BrowserContext;
  metamaskExtensionId: string;
  pocketUniverseExtensionId: string | null;
}> {
  const extensions = resolveExtensions({ includePocketUniverse });
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
    extensionIdFromContext(context),
    includePocketUniverse ? resolvePocketUniverseId(context) : Promise.resolve(null),
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

export const test = base.extend<WalletFixtures>({
  usePocketUniverse: [true, { option: true }],

  context: async ({ usePocketUniverse }, use, testInfo) => {
    // Separate persistent profiles per extension set: a profile onboarded
    // with Pocket Universe present must not be reused for a "bare MetaMask"
    // run (and vice versa), since Chromium profiles remember which
    // extensions were installed into them.
    const profileSuffix = usePocketUniverse ? 'with-pocket-universe' : 'metamask-only';
    const { context } = await launchWalletContext(
      `${testInfo.workerIndex}-${profileSuffix}`,
      usePocketUniverse,
    );
    await use(context);
    await context.close();
  },

  page: async ({ context }, use) => {
    const page = context.pages()[0] ?? (await context.newPage());
    await use(page);
  },

  metamaskExtensionId: async ({ context }, use) => {
    const id = await extensionIdFromContext(context);
    await use(id);
  },

  pocketUniverseExtensionId: async ({ context, usePocketUniverse }, use) => {
    if (!usePocketUniverse) {
      await use(null);
      return;
    }
    const id = await resolvePocketUniverseId(context);
    await use(id);
  },

  metamask: async ({ context, metamaskExtensionId }, use) => {
    await use(new MetaMaskHelper(context, metamaskExtensionId, env.metamask.password));
  },

  pocketUniverse: async ({ page, usePocketUniverse }, use) => {
    await use(usePocketUniverse ? new PocketUniversePage(page) : null);
  },
});

export { expect } from '@playwright/test';
