import { test, expect } from '@fixtures/wallet.fixture';
import { PocketUniversePage } from '@pages/PocketUniversePage';

test.describe('Environment smoke checks @smoke', () => {
  test('MetaMask extension loads and unlocks before the test body runs', async ({
    metamask,
    metamaskExtensionId,
  }) => {
    expect(metamaskExtensionId).toMatch(/^[a-z]{32}$/);
    // By the time this test body executes, the wallet fixture has already
    // imported (or restored) the wallet - `metamask` is ready to use.
    expect(metamask).toBeTruthy();
  });

  test('Pocket Universe extension is installed and active', async ({
    context,
    pocketUniverseExtensionId,
  }) => {
    // Default fixture config (usePocketUniverse: true) guarantees this is non-null.
    expect(pocketUniverseExtensionId).not.toBeNull();
    expect(pocketUniverseExtensionId).toMatch(/^[a-z]{32}$/);
    const installed = await PocketUniversePage.isInstalled(context, pocketUniverseExtensionId!);
    expect(installed).toBe(true);
  });
});
