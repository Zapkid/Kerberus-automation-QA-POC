import { BrowserContext, Page } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Pocket Universe is a passive transaction-simulation extension: it injects
 * itself into every page and intercepts wallet_sendTransaction /
 * eth_signTypedData_v4 calls to show a "what this transaction will do"
 * preview before MetaMask's own confirmation. It has no dApp-facing UI of
 * its own to drive - this page object wraps its simulation overlay, which
 * renders inside the active dApp tab (not a separate extension page).
 */
export class PocketUniversePage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  /** Confirms the extension's service worker/background page came up. */
  static async isInstalled(context: BrowserContext, extensionId: string): Promise<boolean> {
    const targets = [
      ...context.backgroundPages().map((p) => p.url()),
      ...context.serviceWorkers().map((w) => w.url()),
    ];
    return targets.some((url) => url.includes(extensionId));
  }

  private get overlay() {
    return this.locator('[data-pocket-universe-overlay]');
  }

  async waitForSimulation(timeoutMs = 15_000): Promise<void> {
    await this.overlay.waitFor({ state: 'visible', timeout: timeoutMs });
  }

  async isSimulationFlaggedRisky(): Promise<boolean> {
    return this.locator('[data-pocket-universe-overlay][data-risk="high"]').isVisible();
  }

  async approveInOverlay(): Promise<void> {
    await this.click('[data-pocket-universe-action="continue"]');
  }

  async cancelInOverlay(): Promise<void> {
    await this.click('[data-pocket-universe-action="cancel"]');
  }
}
