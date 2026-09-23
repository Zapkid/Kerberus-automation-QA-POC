import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  baseUrl: required('BASE_URL', 'https://example-dapp.kerberus.com'),

  metamask: {
    seedPhrase: required(
      'METAMASK_SEED_PHRASE',
      'test test test test test test test test test test test junk',
    ),
    password: required('METAMASK_PASSWORD', 'Password1234!'),
    networkName: process.env.METAMASK_NETWORK_NAME ?? 'Localhost 8545',
    rpcUrl: process.env.METAMASK_RPC_URL ?? 'http://127.0.0.1:8545',
    chainId: process.env.METAMASK_CHAIN_ID ?? '31337',
    symbol: process.env.METAMASK_SYMBOL ?? 'ETH',
    version: process.env.METAMASK_VERSION ?? '11.16.14',
  },

  pocketUniverse: {
    path: process.env.POCKET_UNIVERSE_PATH
      ? path.resolve(process.cwd(), process.env.POCKET_UNIVERSE_PATH)
      : path.resolve(process.cwd(), 'extensions/pocket-universe'),
  },

  polymarket: {
    url: process.env.POLYMARKET_URL ?? 'https://polymarket.com',
    // Safety gate: Polymarket trades real USDC on Polygon mainnet. By
    // default the Polymarket specs stop at Pocket Universe's simulation
    // preview / MetaMask's confirmation screen and then cancel, so a CI or
    // local run never moves real funds. Set this to 'true' only if you
    // deliberately want a test to click through and submit a real,
    // funded transaction.
    allowRealTrade: (process.env.ALLOW_REAL_POLYMARKET_TRADE ?? 'false').toLowerCase() === 'true',
  },

  // A dApp/site known to trigger Pocket Universe's malicious-transaction
  // warning, used to verify that warning actually renders. Intentionally
  // has NO default - never point this at a live, real-world scam site;
  // use a controlled phishing-simulation harness instead. The spec that
  // uses this skips itself with a clear message when it's unset.
  scamDappUrl: process.env.SCAM_DAPP_URL,

  headless: (process.env.HEADLESS ?? 'false').toLowerCase() === 'true',
  slowMo: Number(process.env.SLOW_MO ?? 0),
};
