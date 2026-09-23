import { Page } from '@playwright/test';
import { BasePage } from '../BasePage';

/**
 * Drives MetaMask's first-run onboarding flow: accept terms, import an
 * existing wallet from a seed phrase, and set the unlock password.
 *
 * Selectors are MetaMask's own `data-testid` attributes (the same ones
 * MetaMask uses in its own e2e suite), pinned against the extension version
 * downloaded by scripts/download-extensions.ts (see METAMASK_VERSION).
 */
export class MetaMaskOnboardingPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async acceptTerms(): Promise<void> {
    const checkbox = this.locator('[data-testid="onboarding-terms-checkbox"]');
    if (await checkbox.isVisible().catch(() => false)) {
      await checkbox.click();
    }
  }

  async clickImportWallet(): Promise<void> {
    await this.click('[data-testid="onboarding-import-wallet"]');
  }

  async declineMetrics(): Promise<void> {
    const noThanks = this.locator('[data-testid="metametrics-no-thanks"]');
    if (await noThanks.isVisible().catch(() => false)) {
      await noThanks.click();
    }
  }

  async fillSeedPhrase(seedPhrase: string): Promise<void> {
    const words = seedPhrase.trim().split(/\s+/);
    for (let i = 0; i < words.length; i++) {
      await this.fill(`[data-testid="import-srp__srp-word-${i}"]`, words[i]);
    }
    await this.click('[data-testid="import-srp-confirm"]');
  }

  async setPassword(password: string): Promise<void> {
    await this.fill('[data-testid="create-password-new"]', password);
    await this.fill('[data-testid="create-password-confirm"]', password);
    await this.click('[data-testid="create-password-terms"]');
    await this.click('[data-testid="create-password-import"]');
  }

  async completeOnboarding(): Promise<void> {
    const gotIt = this.locator('[data-testid="onboarding-complete-done"]');
    if (await gotIt.isVisible().catch(() => false)) {
      await gotIt.click();
    }
    const pinNext = this.locator('[data-testid="pin-extension-next"]');
    if (await pinNext.isVisible().catch(() => false)) {
      await pinNext.click();
    }
    const pinDone = this.locator('[data-testid="pin-extension-done"]');
    if (await pinDone.isVisible().catch(() => false)) {
      await pinDone.click();
    }
  }

  /** Full import flow: terms -> import -> seed phrase -> password -> done. */
  async importWallet(seedPhrase: string, password: string): Promise<void> {
    await this.acceptTerms();
    await this.clickImportWallet();
    await this.declineMetrics();
    await this.fillSeedPhrase(seedPhrase);
    await this.setPassword(password);
    await this.completeOnboarding();
  }
}
