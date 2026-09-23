import { BrowserContext, Page } from '@playwright/test';
import { MetaMaskOnboardingPage } from '@pages/metamask/MetaMaskOnboardingPage';
import { MetaMaskHomePage } from '@pages/metamask/MetaMaskHomePage';
import { MetaMaskNetworkPage, NetworkConfig } from '@pages/metamask/MetaMaskNetworkPage';
import { MetaMaskConfirmationPage } from '@pages/metamask/MetaMaskConfirmationPage';

/**
 * High-level, test-facing API over the MetaMask extension. Wraps the
 * individual MetaMask Page Objects so specs interact with the wallet in
 * business terms ("confirm the transaction") instead of raw selectors.
 */
export class MetaMaskHelper {
  constructor(
    private readonly context: BrowserContext,
    private readonly extensionId: string,
    private readonly password: string,
  ) {}

  /** Opens (or reuses) the MetaMask extension's full-screen UI tab. */
  private async openExtensionPage(): Promise<Page> {
    const url = `chrome-extension://${this.extensionId}/home.html`;
    const existing = this.context.pages().find((p) => p.url().startsWith(url));
    if (existing) {
      await existing.bringToFront();
      return existing;
    }
    const page = await this.context.newPage();
    await page.goto(url);
    return page;
  }

  async importWallet(seedPhrase: string): Promise<void> {
    const page = await this.openExtensionPage();
    const onboarding = new MetaMaskOnboardingPage(page);
    await onboarding.importWallet(seedPhrase, this.password);
  }

  async unlock(): Promise<void> {
    const page = await this.openExtensionPage();
    const home = new MetaMaskHomePage(page);
    await home.unlock(this.password);
  }

  async addNetwork(config: NetworkConfig): Promise<void> {
    const page = await this.openExtensionPage();
    const networkPage = new MetaMaskNetworkPage(page);
    await networkPage.addNetwork(config);
  }

  async switchNetwork(name: string): Promise<void> {
    const page = await this.openExtensionPage();
    const networkPage = new MetaMaskNetworkPage(page);
    await networkPage.switchToNetwork(name);
  }

  /** Waits for and accepts the next MetaMask connection/confirmation popup. */
  private async waitForNotificationPopup(timeoutMs = 15_000): Promise<Page> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const popup = this.context
        .pages()
        .find((p) => p.url().includes(`chrome-extension://${this.extensionId}/notification.html`));
      if (popup) return popup;
      await new Promise((r) => setTimeout(r, 250));
    }
    throw new Error('Timed out waiting for MetaMask notification popup.');
  }

  async connectToDapp(): Promise<void> {
    const popup = await this.waitForNotificationPopup();
    const confirmation = new MetaMaskConfirmationPage(popup);
    await confirmation.connect();
  }

  async confirmTransaction(): Promise<void> {
    const popup = await this.waitForNotificationPopup();
    const confirmation = new MetaMaskConfirmationPage(popup);
    await confirmation.confirm();
  }

  async rejectTransaction(): Promise<void> {
    const popup = await this.waitForNotificationPopup();
    const confirmation = new MetaMaskConfirmationPage(popup);
    await confirmation.reject();
  }

  async signTypedData(): Promise<void> {
    const popup = await this.waitForNotificationPopup();
    const confirmation = new MetaMaskConfirmationPage(popup);
    await confirmation.signTypedData();
  }
}
