import {
  MeshTxBuilder,
  BlockfrostProvider,
  deserializeAddress,
  stringToHex,
  mConStr0,
} from '@meshsdk/core';
import { getAppliedScript, getPolicyId } from './policy';


function splitMetadataString(str: string, maxLen = 64): string | string[] {
  if (str.length <= maxLen) return str;
  const chunks: string[] = [];
  for (let i = 0; i < str.length; i += maxLen) {
    chunks.push(str.slice(i, i + maxLen));
  }
  return chunks;
}

export function getEventPrice(capacity: number): number {
  const prices: Record<number, number> = {
    50: 5_000_000,
    100: 10_000_000,
    200: 20_000_000,
    500: 50_000_000,
    1000: 100_000_000,
  };
  const price = prices[capacity];
  if (!price) throw new Error(`Invalid capacity: ${capacity}`);
  return price;
}

export function getOwnerTokenName(eventName: string): string {
  return `TXNE-${eventName}`;
}

export async function buildMintOwnerTicketTx({
  wallet,
  eventUuid,
  eventName,
  eventTitle,
  eventCapacity,
  nftImageUri,
}: {
  wallet: any;
  eventUuid: string;
  eventName: string;
  eventTitle: string;
  eventCapacity: number;
  nftImageUri: string;
}): Promise<{ txHash: string; policyId: string }> {

  const provider = new BlockfrostProvider(process.env.NEXT_PUBLIC_BLOCKFROST_KEY!);

  const ownerAddress = await wallet.getChangeAddress();
  const utxos = await wallet.getUtxos();
  const collateral = await wallet.getCollateral();

  if (!collateral || collateral.length === 0) {
    throw new Error(
      'No collateral found in your wallet. Please set up collateral in your wallet settings (usually ~5 ADA) before creating an event.'
    );
  }

  const { pubKeyHash: ownerPkh } = deserializeAddress(ownerAddress);
  const adminPkh = process.env.NEXT_PUBLIC_ADMIN_PKH!;
  const adminAddress = process.env.NEXT_PUBLIC_ADMIN_ADDRESS!;

  const appliedScript = getAppliedScript(eventUuid, eventName);
  const policyId = getPolicyId(appliedScript);
  const tokenName = stringToHex(getOwnerTokenName(eventName));
  const eventPrice = getEventPrice(eventCapacity);

  const redeemer = mConStr0([
    adminPkh, // dosent need to be converted to hex because its already in the correct format
    ownerPkh,
    eventCapacity,
  ]);

  const txBuilder = new MeshTxBuilder({ fetcher: provider, verbose: true });

  const unsignedTx = await txBuilder
    .mintPlutusScriptV3()
    .mint('1', policyId, tokenName)
    .mintingScript(appliedScript)
    .mintRedeemerValue(redeemer)
    .txOut(adminAddress, [{ unit: 'lovelace', quantity: String(eventPrice) }])
    .metadataValue(721, {
      [policyId]: {
        [getOwnerTokenName(eventName)]: {
          name: getOwnerTokenName(eventName),
          image: splitMetadataString(nftImageUri),
          description: eventTitle,
          type: 'EventOwnerTicket',
          event_id: eventUuid,
          event_capacity: eventCapacity,
          platform: 'Tixano',
          website: 'tixano link here',
        },
      },
    })
    .txInCollateral(
      collateral[0].input.txHash,
      collateral[0].input.outputIndex,
      collateral[0].output.amount,
      collateral[0].output.address
    )
    .requiredSignerHash(ownerPkh)
    .changeAddress(ownerAddress)
    .selectUtxosFrom(utxos)
    .complete();

  const signedTx = await wallet.signTx(unsignedTx, true);
  const txHash = await wallet.submitTx(signedTx);

  return { txHash, policyId };
}