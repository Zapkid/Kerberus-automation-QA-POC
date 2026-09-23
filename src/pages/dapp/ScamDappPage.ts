import { Page } from '@playwright/test';
import { BasePage } from '../BasePage';

/**
 * Generic Page Object for a "malicious/test" dApp used to verify Pocket
 * Universe's warning UI actually fires - it is deliberately NOT tied to any
 * specific site's markup, because the target is configured per environment
 * via `SCAM_DAPP_URL` (see src/config/env.ts) rather than hardcoded here.
 *
 * IMPORTANT: `SCAM_DAPP_URL` must point at a *controlled* phishing-simulation
 * target (an internal red-team fixture, a vendor's own test/demo malicious
 * dApp, etc.) - never at a live, real-world scam site. Running an automated
 * wallet against a real scam site risks real interaction with malicious
 * infrastructure and is out of scope for this repo to encourage.
 *
 * Most malicious-dApp test harnesses expose a single "Connect Wallet" button
 * and one button that triggers a wallet_sendTransaction/eth_sign request
 * crafted to look dangerous (e.g. unlimited token approval, drainer-style
 * calldata). Adjust the locators below once you've picked a concrete target
 * and inspected its markup - `npx playwright codegen <your-target-url>` is
 * the fastest way to do that.
 */
export class ScamDappPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async open(url: string): Promise<void> {
    await this.goto(url);
    await this.waitForLoad();
  }

  async connectWallet(): Promise<void> {
    await this.page.getByRole('button', { name: /connect( wallet)?/i }).click();
  }

  /** Triggers whatever malicious/risky wallet request the target harness exposes. */
  async triggerMaliciousTransaction(): Promise<void> {
    await this.page
      .getByRole('button', { name: /claim|mint|drain|send|approve/i })
      .first()
      .click();
  }
}
