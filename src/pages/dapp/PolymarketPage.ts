import { Page, expect } from '@playwright/test';
import { BasePage } from '../BasePage';

/**
 * Page Object for polymarket.com (a real, production Polygon dApp - not a
 * test fixture). Selectors here are best-effort, written against
 * Polymarket's general public UI shape (role/text-based locators, which are
 * more resilient to markup changes than guessed CSS/data-testid), but they
 * were **not verified against the live site** - this environment's network
 * policy blocks browsing to polymarket.com. Before relying on this class:
 *
 *   1. Run `npx playwright codegen https://polymarket.com` locally.
 *   2. Click through connect-wallet -> open a market -> start a buy order.
 *   3. Reconcile the recorded selectors with the ones below and fix any
 *      that drifted.
 *
 * Trading on Polymarket moves real USDC on Polygon mainnet. `placeBuyOrder`
 * deliberately stops at the review/confirm step and does not submit unless
 * `env.polymarket.allowRealTrade` is true - see src/config/env.ts.
 */
export class PolymarketPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async open(url: string): Promise<void> {
    await this.goto(url);
    await this.waitForLoad();
  }

  // --- Wallet connection -------------------------------------------------

  private get connectWalletButton() {
    // Polymarket's header shows "Log In" (pre-connect) which opens a modal
    // offering "MetaMask" / "Browser Wallet" among other options.
    return this.page.getByRole('button', { name: /log in|connect wallet/i });
  }

  async clickConnectWallet(): Promise<void> {
    await this.connectWalletButton.click();
    // The wallet-selection modal; MetaMask is one of several listed options.
    const metamaskOption = this.page.getByRole('button', { name: /metamask/i });
    await metamaskOption.click();
  }

  async isWalletConnected(): Promise<boolean> {
    // Once connected, the header shows the account's balance/address instead
    // of the "Log In" button.
    return this.page
      .getByRole('button', { name: /0x[a-fA-F0-9]{4}/ })
      .isVisible()
      .catch(() => false);
  }

  // --- Market navigation ---------------------------------------------------

  /** Opens the first market card on the current listing page (home/markets). */
  async openFirstMarket(): Promise<void> {
    const firstMarketCard = this.page.locator('a[href*="/event/"]').first();
    await firstMarketCard.click();
    await this.waitForLoad();
  }

  async openMarketBySlug(slug: string): Promise<void> {
    await this.goto(`https://polymarket.com/event/${slug}`);
    await this.waitForLoad();
  }

  // --- Trading ---------------------------------------------------------

  /**
   * Starts a buy order for the given outcome ("Yes"/"No") and amount, and
   * clicks through to the order review step where MetaMask (and, if loaded,
   * Pocket Universe) takes over. Does **not** submit a real transaction
   * unless `env.polymarket.allowRealTrade` is true.
   */
  async startBuyOrder(outcome: 'Yes' | 'No', usdcAmount: string): Promise<void> {
    await this.page.getByRole('tab', { name: /buy/i }).click();
    await this.page.getByRole('button', { name: new RegExp(`^${outcome}$`, 'i') }).click();

    const amountInput = this.page.getByPlaceholder(/amount|\$0/i);
    await amountInput.fill(usdcAmount);

    await this.page.getByRole('button', { name: /buy|place order|trade/i }).click();
  }

  /** Confirms the trade in Polymarket's own review UI, if one exists before the wallet popup. */
  async confirmOrderReview(): Promise<void> {
    const confirmButton = this.page.getByRole('button', { name: /confirm|submit order/i });
    if (await confirmButton.isVisible().catch(() => false)) {
      await confirmButton.click();
    }
  }

  async expectOrderErrorOrReview(): Promise<void> {
    // Sanity check used by baseline specs: some review UI or wallet prompt
    // should appear after starting an order, whether or not Pocket
    // Universe is present.
    await expect(
      this.page.getByRole('button', { name: /confirm|submit order/i }).or(
        this.page.getByText(/insufficient|connect wallet/i),
      ),
    ).toBeVisible({ timeout: 15_000 });
  }
}
