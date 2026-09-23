import { Page } from '@playwright/test';
import { BasePage } from '../BasePage';

export interface NetworkConfig {
  name: string;
  rpcUrl: string;
  chainId: string;
  symbol: string;
}

/** MetaMask's "Add network" form, reached via Settings > Networks > Add network. */
export class MetaMaskNetworkPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async openSettings(): Promise<void> {
    await this.click('[data-testid="account-options-menu-button"]');
    await this.click('[data-testid="global-menu-settings"]');
  }

  async openNetworksTab(): Promise<void> {
    await this.click('text=Networks');
  }

  async clickAddNetwork(): Promise<void> {
    await this.click('[data-testid="add-network-manually"]');
  }

  async fillNetworkForm(config: NetworkConfig): Promise<void> {
    await this.fill('[data-testid="network-form-network-name"]', config.name);
    await this.fill('[data-testid="network-form-rpc-url"]', config.rpcUrl);
    await this.fill('[data-testid="network-form-chain-id"]', config.chainId);
    await this.fill('[data-testid="network-form-ticker"]', config.symbol);
    await this.click('[data-testid="network-form-save"]');
  }

  /** Adds and switches to a custom network end-to-end. */
  async addNetwork(config: NetworkConfig): Promise<void> {
    await this.openSettings();
    await this.openNetworksTab();
    await this.clickAddNetwork();
    await this.fillNetworkForm(config);
  }

  async switchToNetwork(name: string): Promise<void> {
    await this.click('[data-testid="network-display"]');
    await this.click(`text=${name}`);
  }
}
