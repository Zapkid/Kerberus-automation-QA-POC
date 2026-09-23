import { Page } from '@playwright/test';
import { BasePage } from '../BasePage';

/** The main MetaMask wallet screen (post-unlock account view). */
export class MetaMaskHomePage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async isLoaded(): Promise<boolean> {
    return this.isVisible('[data-testid="account-menu-icon"]');
  }

  async openAccountMenu(): Promise<void> {
    await this.click('[data-testid="account-menu-icon"]');
  }

  async openNetworkPicker(): Promise<void> {
    await this.click('[data-testid="network-display"]');
  }

  async currentNetworkName(): Promise<string> {
    return this.textOf('[data-testid="network-display"]');
  }

  async unlock(password: string): Promise<void> {
    const unlockInput = this.locator('[data-testid="unlock-password"]');
    if (await unlockInput.isVisible().catch(() => false)) {
      await unlockInput.fill(password);
      await this.click('[data-testid="unlock-submit"]');
    }
  }
}
