export type CardanoNetwork = 'preprod' | 'preview' | 'mainnet';

export const CARDANO_NETWORK = (process.env.NEXT_PUBLIC_CARDANO_NETWORK || 'preprod') as CardanoNetwork;

// Cardano network ID: 0 = testnet, 1 = mainnet
export const CARDANO_NETWORK_ID = CARDANO_NETWORK === 'mainnet' ? 1 : 0;

// Blockfrost base URL for the configured network
export const BLOCKFROST_BASE_URL =
  CARDANO_NETWORK === 'mainnet'
    ? 'https://cardano-mainnet.blockfrost.io/api/v0'
    : CARDANO_NETWORK === 'preview'
    ? 'https://cardano-preview.blockfrost.io/api/v0'
    : 'https://cardano-preprod.blockfrost.io/api/v0';

// Cardanoscan base URL for tx links
export const CARDANOSCAN_BASE_URL =
  CARDANO_NETWORK === 'mainnet'
    ? 'https://cardanoscan.io'
    : CARDANO_NETWORK === 'preview'
    ? 'https://preview.cardanoscan.io'
    : 'https://preprod.cardanoscan.io';