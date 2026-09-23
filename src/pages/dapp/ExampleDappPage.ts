import { Page } from '@playwright/test';
import { BasePage } from '../BasePage';

/**
 * Example Page Object for the dApp under test. Replace selectors/methods
 * with the real application's once available - this class exists to
 * demonstrate the POM pattern and how a dApp page triggers wallet
 * interactions that the MetaMask fixture then handles.
 */
export class ExampleDappPage extends BasePage {
  private readonly connectButton = '[data-testid="connect-wallet-button"]';
  private readonly walletAddress = '[data-testid="wallet-address"]';
  private readonly sendTransactionButton = '[data-testid="send-transaction-button"]';

  constructor(page: Page) {
    super(page);
  }

  async open(baseUrl: string): Promise<void> {
    await this.goto(baseUrl);
    await this.waitForLoad();
  }

  async clickConnectWallet(): Promise<void> {
    await this.click(this.connectButton);
  }

  async getConnectedAddress(): Promise<string> {
    return this.textOf(this.walletAddress);
  }

  async isWalletConnected(): Promise<boolean> {
    return this.isVisible(this.walletAddress);
  }

  async clickSendTransaction(): Promise<void> {
    await this.click(this.sendTransactionButton);
  }
}
