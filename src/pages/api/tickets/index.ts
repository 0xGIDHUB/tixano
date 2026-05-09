import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '@/lib/supabase/server';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    ticketId,
    eventId,
    policyId,
    assetName,
    txHash,
    ownerWallet,
    ownerName,
    ownerEmail,
    ownerPhone,
    ownerExpectation,
    nftImageUrl,
  } = req.body;

  if (!ticketId || !eventId || !ownerWallet || !ownerName || !ownerEmail || !txHash) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Insert ticket
  const { data: ticket, error: ticketError } = await supabaseAdmin
    .from('tickets')
    .insert({
      id: ticketId,
      event_id: eventId,
      policy_id: policyId,
      asset_name: assetName,
      tx_hash: txHash,
      owner_wallet: ownerWallet,
      owner_name: ownerName,
      owner_email: ownerEmail,
      owner_phone: ownerPhone || null,
      owner_expectation: ownerExpectation || null,
      nft_image_url: nftImageUrl || null,
      status: 'unused',
    })
    .select()
    .single();

  if (ticketError) {
    console.error('Ticket insert error:', ticketError);
    return res.status(500).json({ error: ticketError.message });
  }

  // Increment total_registrations on the event
  const { error: updateError } = await supabaseAdmin.rpc('increment_registrations', {
    event_id: eventId,
  });

  if (updateError) {
    console.error('Registration count update error:', updateError);
    // Non-fatal — ticket was still created
  }

  return res.status(201).json({ ticket });
}