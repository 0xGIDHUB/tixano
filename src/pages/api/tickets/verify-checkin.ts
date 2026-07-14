import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '@/lib/supabase/server';
import { BLOCKFROST_BASE_URL } from '@/lib/cardano/network';

interface VerificationResult {
  status: 'success' | 'invalid_ticket' | 'already_used' | 'not_owned' | 'error';
  message: string;
  ticketData?: {
    id: string;
    asset_name: string;
    owner_name: string;
    owner_email: string;
    owner_phone: string | null;
    owner_wallet: string;
    policy_id: string | null;
    tx_hash: string | null;
    used_at: string | null;
  };
  previousCheckInTime?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<VerificationResult>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      status: 'error',
      message: 'Method not allowed',
    });
  }

  const { ticketId, eventId } = req.body; // eslint-disable-line @typescript-eslint/no-unused-vars

  // Validate required fields
  if (!ticketId || !eventId) {
    return res.status(400).json({
      status: 'error',
      message: 'Missing required fields: ticketId and eventId',
    });
  }

  try {
    // ─────────────────────────────────────────────────────────
    // Step 1: Verify ticket exists and matches the event
    // ─────────────────────────────────────────────────────────
    const { data: ticket, error: ticketError } = await supabaseAdmin
      .from('tickets_testnet')
      .select('id, event_id, policy_id, asset_name, owner_wallet, owner_name, owner_email, owner_phone, tx_hash, status, used_at')
      .eq('id', ticketId)
      .single();

    if (ticketError || !ticket) {
      console.error('Ticket lookup error:', ticketError);
      return res.status(404).json({
        status: 'invalid_ticket',
        message: 'Ticket not found in database',
      });
    }

    // Verify ticket belongs to the requested event
    if (ticket.event_id !== eventId) {
      return res.status(400).json({
        status: 'invalid_ticket',
        message: 'Ticket does not match this event',
      });
    }

    // ─────────────────────────────────────────────────────────
    // Step 2: Verify ticket status is 'unused'
    // ─────────────────────────────────────────────────────────
    if (ticket.status === 'used') {
      return res.status(200).json({
        status: 'already_used',
        message: 'This ticket has already been used for check-in',
        ticketData: {
          id: ticket.id,
          asset_name: ticket.asset_name || '',
          owner_name: ticket.owner_name,
          owner_email: ticket.owner_email,
          owner_phone: ticket.owner_phone,
          owner_wallet: ticket.owner_wallet,
          policy_id: ticket.policy_id,
          tx_hash: ticket.tx_hash,
          used_at: ticket.used_at,
        },
        previousCheckInTime: ticket.used_at || undefined,
      });
    }

    // ─────────────────────────────────────────────────────────
    // Step 3: Verify ticket ownership via Blockfrost
    // ─────────────────────────────────────────────────────────
    if (ticket.policy_id && ticket.asset_name) {
      try {
        // Query Blockfrost for UTXOs at the owner's wallet
        const blockfrostResponse = await fetch(
          `${BLOCKFROST_BASE_URL}/addresses/${ticket.owner_wallet}/utxos`,
          {
            headers: {
              project_id: process.env.NEXT_PUBLIC_BLOCKFROST_KEY || '',
            },
          }
        );

        if (blockfrostResponse.ok) {
          const utxos = await blockfrostResponse.json();

          // Check if the specific NFT (policy_id + asset_name) exists in UTXOs
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const ownsNFT = utxos.some((utxo: Record<string, unknown>) => {
            if (!utxo.amount) return false;
            // Parse the full asset identifier (policy_id.asset_name)
            const hexAssetName = Buffer.from(ticket.asset_name || '', 'utf8').toString('hex');
            const expectedUnit = `${ticket.policy_id}${hexAssetName}`;
            return (utxo.amount as {unit: string}[]).some((amount: {unit: string}) => amount.unit === expectedUnit);
          });

          if (!ownsNFT) {
            return res.status(200).json({
              status: 'not_owned',
              message: 'The ticket NFT is not owned by the specified wallet',
              ticketData: {
                id: ticket.id,
                asset_name: ticket.asset_name || '',
                owner_name: ticket.owner_name,
                owner_email: ticket.owner_email,
                owner_phone: ticket.owner_phone,
                owner_wallet: ticket.owner_wallet,
                policy_id: ticket.policy_id,
                tx_hash: ticket.tx_hash,
                used_at: ticket.used_at,
              },
            });
          }
        } else if (blockfrostResponse.status !== 404) {
          // If it's not a 404 (wallet not found), log the error but continue
          // Some wallets may not exist on Blockfrost initially
          console.warn('Blockfrost query failed:', blockfrostResponse.status);
        }
      } catch (blockfrostError) {
        console.warn('Blockfrost verification error:', blockfrostError);
        // Continue anyway - Blockfrost may be temporarily unavailable
        // The ticket data is already verified in Supabase
      }
    }

    // ─────────────────────────────────────────────────────────
    // Step 4: Update ticket status to 'used' and set used_at
    // ─────────────────────────────────────────────────────────
    const now = new Date().toISOString();
    const { error: updateError } = await supabaseAdmin
      .from('tickets_testnet')
      .update({
        status: 'used',
        used_at: now,
      })
      .eq('id', ticketId);

    if (updateError) {
      console.error('Ticket update error:', updateError);
      return res.status(500).json({
        status: 'error',
        message: 'Failed to update ticket status',
      });
    }

    // ─────────────────────────────────────────────────────────
    // Step 5: Return success with ticket details
    // ─────────────────────────────────────────────────────────
    return res.status(200).json({
      status: 'success',
      message: 'Check-in successful',
      ticketData: {
        id: ticket.id,
        asset_name: ticket.asset_name || '',
        owner_name: ticket.owner_name,
        owner_email: ticket.owner_email,
        owner_phone: ticket.owner_phone,
        owner_wallet: ticket.owner_wallet,
        policy_id: ticket.policy_id,
        tx_hash: ticket.tx_hash,
        used_at: now,
      },
    });
  } catch (error) {
    console.error('Verification error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error during verification',
    });
  }
}
