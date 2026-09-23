import { test, expect } from '@fixtures/wallet.fixture';
import { ExampleDappPage } from '@pages/dapp/ExampleDappPage';
import { env } from '@config/env';

/**
 * Demonstrates the intended usage pattern: the wallet fixture has already
 * onboarded MetaMask and loaded Pocket Universe before this test starts, so
 * specs only orchestrate Page Objects and business flows.
 *
 * Replace ExampleDappPage / selectors with the real target dApp.
 */
test.describe('Wallet connect flow', () => {
  test('connects MetaMask to the dApp and shows the wallet address', async ({
    page,
    metamask,
  }) => {
    const dapp = new ExampleDappPage(page);
    await dapp.open(env.baseUrl);

    await dapp.clickConnectWallet();
    await metamask.connectToDapp();

    await expect.poll(() => dapp.isWalletConnected()).toBe(true);
    const address = await dapp.getConnectedAddress();
    expect(address).toMatch(/^0x[a-fA-F0-9]{40}$/);
  });

  test('simulates and confirms a transaction via Pocket Universe + MetaMask', async ({
    page,
    metamask,
    pocketUniverse,
  }) => {
    const dapp = new ExampleDappPage(page);
    await dapp.open(env.baseUrl);

    await dapp.clickConnectWallet();
    await metamask.connectToDapp();

    await dapp.clickSendTransaction();

    // Pocket Universe intercepts the tx request and renders its simulation
    // overlay in the dApp tab before MetaMask's own confirmation appears.
    // Non-null: default fixture config (usePocketUniverse: true) guarantees this.
    await pocketUniverse!.waitForSimulation();
    expect(await pocketUniverse!.isSimulationFlaggedRisky()).toBe(false);
    await pocketUniverse!.approveInOverlay();

    await metamask.confirmTransaction();
  });
});
