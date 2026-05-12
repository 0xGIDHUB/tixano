import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '@/lib/supabase/server';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { eventId } = req.body;
  if (!eventId) return res.status(400).json({ error: 'Missing eventId' });

  // Step 1 — Try to claim a previously failed reservation number first.
  // This RPC locks the row atomically so no race condition is possible.
  const { data: reclaimedNumber, error: reclaimError } = await supabaseAdmin
    .rpc('claim_failed_reservation', { event_id: eventId });

  if (reclaimError) {
    console.error('Reclaim error:', reclaimError);
    return res.status(500).json({ error: reclaimError.message });
  }

  // A number was available in failed_reservations — reuse it.
  // Do NOT call increment_registrations here; total_registrations stays the same.
  if (reclaimedNumber !== null) {
    return res.status(200).json({
      registrationNumber: reclaimedNumber,
      reused: true,
    });
  }

  // Step 2 — No failed reservations available, claim a fresh slot.
  const { data: newNumber, error: incrementError } = await supabaseAdmin
    .rpc('increment_registrations', { event_id: eventId });

  if (incrementError) {
    if (incrementError.message.includes('EVENT_FULL')) {
      return res.status(409).json({ error: 'This event is now fully booked.' });
    }
    console.error('Increment error:', incrementError);
    return res.status(500).json({ error: incrementError.message });
  }

  return res.status(200).json({
    registrationNumber: newNumber,
    reused: false,
  });
}