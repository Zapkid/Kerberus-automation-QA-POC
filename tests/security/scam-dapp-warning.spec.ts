import { test, expect } from '@fixtures/wallet.fixture';
import { ScamDappPage } from '@pages/dapp/ScamDappPage';
import { env } from '@config/env';

/**
 * Verifies Pocket Universe actually warns when interacting with a malicious
 * dApp, by pointing at a configured test target (SCAM_DAPP_URL) and
 * asserting the simulation overlay renders with a "risky" verdict.
 *
 * SCAM_DAPP_URL must be a controlled phishing-simulation target, never a
 * live real-world scam site - see .env.example and ScamDappPage's doc
 * comment. This spec skips itself (rather than failing) when unset, since
 * no safe default target is bundled with this repo.
 */
test.use({ usePocketUniverse: true });

test.describe('Pocket Universe malicious-dApp warning @security', () => {
  test.skip(
    !env.scamDappUrl,
    'SCAM_DAPP_URL is not configured - see .env.example for how to set a controlled test target.',
  );

  test('Pocket Universe flags a malicious transaction as risky', async ({
    page,
    metamask,
    pocketUniverse,
  }) => {
    const scamSite = new ScamDappPage(page);
    await scamSite.open(env.scamDappUrl as string);

    await scamSite.connectWallet();
    await metamask.connectToDapp();

    await scamSite.triggerMaliciousTransaction();

    await pocketUniverse!.waitForSimulation();
    expect(await pocketUniverse!.isSimulationFlaggedRisky()).toBe(true);

    // Never confirm a transaction Pocket Universe has flagged as risky.
    await pocketUniverse!.cancelInOverlay();
  });
});
