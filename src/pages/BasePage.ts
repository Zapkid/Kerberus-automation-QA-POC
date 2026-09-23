import { Page, Locator, expect } from '@playwright/test';

/**
 * Base class for all Page Objects. Holds the shared Playwright `Page` and
 * common wait/interaction helpers so concrete pages stay declarative.
 */
export abstract class BasePage {
  constructor(protected readonly page: Page) {}

  async goto(url: string): Promise<void> {
    await this.page.goto(url);
  }

  async waitForLoad(): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded');
  }

  protected locator(selector: string): Locator {
    return this.page.locator(selector);
  }

  async click(selector: string): Promise<void> {
    await this.locator(selector).click();
  }

  async fill(selector: string, value: string): Promise<void> {
    await this.locator(selector).fill(value);
  }

  async isVisible(selector: string): Promise<boolean> {
    return this.locator(selector).isVisible();
  }

  async expectVisible(selector: string): Promise<void> {
    await expect(this.locator(selector)).toBeVisible();
  }

  async textOf(selector: string): Promise<string> {
    return (await this.locator(selector).textContent())?.trim() ?? '';
  }
}
