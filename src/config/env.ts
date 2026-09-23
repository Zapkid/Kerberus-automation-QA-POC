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

  headless: (process.env.HEADLESS ?? 'false').toLowerCase() === 'true',
  slowMo: Number(process.env.SLOW_MO ?? 0),
};
