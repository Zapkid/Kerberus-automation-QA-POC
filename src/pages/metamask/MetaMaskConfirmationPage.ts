import { Page } from '@playwright/test';
import { BasePage } from '../BasePage';

/**
 * The MetaMask popup shown for connection requests, signature requests and
 * transaction confirmations. All three share the same footer actions.
 */
export class MetaMaskConfirmationPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async connect(): Promise<void> {
    const nextButton = this.locator('[data-testid="page-container-footer-next"]');
    if (await nextButton.isVisible().catch(() => false)) {
      await nextButton.click();
    }
    await this.click('[data-testid="page-container-footer-next"]');
  }

  async confirm(): Promise<void> {
    const confirmButton = this.locator('[data-testid="confirm-footer-button"]');
    if (await confirmButton.isVisible().catch(() => false)) {
      await confirmButton.click();
      return;
    }
    await this.click('[data-testid="page-container-footer-next"]');
  }

  async reject(): Promise<void> {
    const cancelButton = this.locator('[data-testid="page-container-footer-cancel"]');
    if (await cancelButton.isVisible().catch(() => false)) {
      await cancelButton.click();
      return;
    }
    await this.click('[data-testid="confirm-footer-cancel-button"]');
  }

  async signTypedData(): Promise<void> {
    await this.click('[data-testid="signature-request-scroll-button"]').catch(() => undefined);
    await this.click('[data-testid="page-container-footer-next"]');
  }
}
