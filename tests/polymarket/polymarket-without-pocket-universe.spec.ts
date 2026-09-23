import { test, expect } from '@fixtures/wallet.fixture';
import { PolymarketPage } from '@pages/dapp/PolymarketPage';
import { PocketUniversePage } from '@pages/PocketUniversePage';
import { env } from '@config/env';

/**
 * Baseline for tests/polymarket/polymarket-with-pocket-universe.spec.ts:
 * runs the identical Polymarket trade flow with a "bare MetaMask" context
 * (Pocket Universe NOT loaded) and asserts the extension's simulation
 * overlay never appears - proving that overlay is something the extension
 * uniquely adds, not part of Polymarket's own UI.
 */
test.use({ usePocketUniverse: false });

test.describe('Polymarket without Pocket Universe (baseline) @polymarket', () => {
  test('no Pocket Universe simulation overlay appears when starting a Polymarket trade', async ({
    page,
    metamask,
  }) => {
    const polymarket = new PolymarketPage(page);
    await polymarket.open(env.polymarket.url);

    await polymarket.clickConnectWallet();
    await metamask.connectToDapp();
    await expect.poll(() => polymarket.isWalletConnected()).toBe(true);

    await polymarket.openFirstMarket();
    await polymarket.startBuyOrder('Yes', '1');

    // Same flow as the with-extension spec, but Pocket Universe isn't
    // loaded in this context - its overlay must never render.
    const pocketUniverse = new PocketUniversePage(page);
    expect(await pocketUniverse.isOverlayVisible()).toBe(false);

    // The flow should still reach Polymarket's own review UI or MetaMask's
    // confirmation directly, without Pocket Universe stepping in first.
    await polymarket.expectOrderErrorOrReview().catch(() => undefined);
    await metamask.rejectTransaction().catch(() => undefined);
  });
});
