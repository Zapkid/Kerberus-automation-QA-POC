import { NetworkConfig } from '@pages/metamask/MetaMaskNetworkPage';
import { env } from '@config/env';

export const localTestNetwork: NetworkConfig = {
  name: env.metamask.networkName,
  rpcUrl: env.metamask.rpcUrl,
  chainId: env.metamask.chainId,
  symbol: env.metamask.symbol,
};
