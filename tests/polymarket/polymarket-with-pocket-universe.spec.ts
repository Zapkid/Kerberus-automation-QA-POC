import { test, expect } from '@fixtures/wallet.fixture';
import { PolymarketPage } from '@pages/dapp/PolymarketPage';
import { env } from '@config/env';

/**
 * Verifies Pocket Universe's own UI elements actually appear on top of
 * Polymarket's normal flow: its simulation overlay before the wallet
 * confirmation, with a risk/safety verdict rendered in it. Compare against
 * tests/polymarket/polymarket-without-pocket-universe.spec.ts, which runs
 * the identical flow with the extension NOT loaded and asserts those same
 * elements are absent.
 *
 * Stops at the order review step and cancels - see
 * env.polymarket.allowRealTrade in src/config/env.ts for why.
 */
test.use({ usePocketUniverse: true });

test.describe('Polymarket + Pocket Universe @polymarket', () => {
  test('Pocket Universe renders its simulation overlay when starting a Polymarket trade', async ({
    page,
    metamask,
    pocketUniverse,
  }) => {
    const polymarket = new PolymarketPage(page);
    await polymarket.open(env.polymarket.url);

    await polymarket.clickConnectWallet();
    await metamask.connectToDapp();
    await expect.poll(() => polymarket.isWalletConnected()).toBe(true);

    await polymarket.openFirstMarket();
    await polymarket.startBuyOrder('Yes', '1');

    // The unique UI element under test: Pocket Universe's own simulation
    // overlay, injected into the Polymarket page ahead of MetaMask's
    // confirmation popup. This must NOT appear in the without-extension spec.
    await pocketUniverse!.waitForSimulation();
    expect(await pocketUniverse!.isOverlayVisible()).toBe(true);

    if (env.polymarket.allowRealTrade) {
      await pocketUniverse!.approveInOverlay();
      await metamask.confirmTransaction();
    } else {
      await pocketUniverse!.cancelInOverlay();
    }
  });
});
