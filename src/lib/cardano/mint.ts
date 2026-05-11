import {
  MeshTxBuilder,
  BlockfrostProvider,
  deserializeAddress,
  stringToHex,
  mConStr0,
  mConStr1, 
  mNone
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

export function getAttendeeTokenName(eventName: string, registrationNumber: number): string {
  const paddedNumber = String(registrationNumber).padStart(4, '0');
  return `TXNT-${eventName}-${paddedNumber}`;
}

export async function buildMintOwnerTicketTx({
  wallet,
  eventUuid,
  eventName,
  eventTitle,
  eventDate,
  eventCapacity,
  nftImageUri,
}: {
  wallet: any;
  eventUuid: string;
  eventName: string;
  eventTitle: string;
  eventDate: string;
  eventCapacity: number;
  nftImageUri: string;
}): Promise<{ txHash: string; policyId: string }> {

  const provider = new BlockfrostProvider(process.env.NEXT_PUBLIC_BLOCKFROST_KEY!);

  const ownerAddress = await wallet.getChangeAddressBech32();
  const utxos = await wallet.getUtxosMesh();
  const collateral = await wallet.getCollateralMesh();

  if (!collateral || collateral.length === 0) {
    throw new Error(
      'Please set up collateral in your wallet before creating an event.'
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
          event_date: eventDate,
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

  const signedTx = await wallet.signTxReturnFullTx(unsignedTx, false);
  const txHash = await wallet.submitTx(signedTx);

  return { txHash, policyId };
}

export async function buildMintAttendeeTicketTx({
  wallet,
  eventUuid,
  eventAlias,
  eventTitle,
  eventDate,
  eventPricing,
  ticketUuid,
  ticketOwnerName,
  registrationNumber,
  nftImageUri,
}: {
  wallet: any;
  eventUuid: string;
  eventAlias: string;
  eventTitle: string;
  eventDate: string;
  eventPricing: 'free' | 'paid';
  ticketUuid: string;
  ticketOwnerName: string;
  registrationNumber: number;
  nftImageUri: string;
}): Promise<{ txHash: string; policyId: string; assetName: string }> {

  const provider = new BlockfrostProvider(process.env.NEXT_PUBLIC_BLOCKFROST_KEY!);

  const attendeeAddress = await wallet.getChangeAddressBech32();
  const utxos = await wallet.getUtxosMesh();
  const collateral = await wallet.getCollateralMesh();

  if (!collateral || collateral.length === 0) {
    throw new Error(
      'Please set up collateral in your wallet before registering.'
    );
  }

  const { pubKeyHash: attendeePkh } = deserializeAddress(attendeeAddress);

  // Use the event's applied script — same policy as the owner ticket
  const appliedScript = getAppliedScript(eventUuid, eventAlias);
  const policyId = getPolicyId(appliedScript);

  // Full token name: TXNT-{eventAlias}-0001
  const assetName = getAttendeeTokenName(eventAlias, registrationNumber);
  const tokenName = stringToHex(assetName);

  // MintAttendeeTicket is constructor index 1
  // attendee_address: VerificationKeyHash
  // event_type: ByteArray ("free" or "paid")
  // ticket_price: Option<Int> (None for free)
  const redeemer = mConStr1([
    attendeePkh,
    stringToHex(eventPricing),  // "free" as hex
    mNone(),                     // ticket_price: None for free events
  ]);

  const txBuilder = new MeshTxBuilder({ fetcher: provider, verbose: true });

  const unsignedTx = await txBuilder
    .mintPlutusScriptV3()
    .mint('1', policyId, tokenName)
    .mintingScript(appliedScript)
    .mintRedeemerValue(redeemer)
    .metadataValue(721, {
      [policyId]: {
        [assetName]: {
          name: assetName,
          image: splitMetadataString(nftImageUri),
          description: splitMetadataString(eventTitle),
          type: 'AttendeeTicket',
          event_id: splitMetadataString(eventUuid),
          event_date: eventDate,
          ticket_id: splitMetadataString(ticketUuid),
          ticket_owner: ticketOwnerName,
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
    .requiredSignerHash(attendeePkh)
    .changeAddress(attendeeAddress)
    .selectUtxosFrom(utxos)
    .complete();

  const signedTx = await wallet.signTxReturnFullTx(unsignedTx, false);
  console.log('Signed Tx:', signedTx);
  const txHash = await wallet.submitTx(signedTx);

  return { txHash, policyId, assetName };
}