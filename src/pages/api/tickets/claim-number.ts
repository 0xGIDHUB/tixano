import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '@/lib/supabase/server';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { eventId } = req.body;
  if (!eventId) return res.status(400).json({ error: 'Missing eventId' });

  // First check if there are any failed reservations to reuse
  const { data: event, error: fetchError } = await supabaseAdmin
    .from('events')
    .select('failed_reservations')
    .eq('id', eventId)
    .single();

  if (fetchError) {
    return res.status(500).json({ error: fetchError.message });
  }

  const hasFailed = event.failed_reservations && event.failed_reservations.length > 0;

  if (hasFailed) {
    // Pop the first failed reservation number — atomic operation
    const { data, error } = await supabaseAdmin
      .rpc('claim_failed_reservation', { event_id: eventId });

    if (error || data === null) {
      // Race condition — another user claimed it, fall through to increment
    } else {
      return res.status(200).json({
        registrationNumber: data,
        reused: true,
      });
    }
  }

  // No failed reservations — increment and return new number
  const { data, error } = await supabaseAdmin
    .rpc('increment_registrations', { event_id: eventId });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({
    registrationNumber: data,
    reused: false,
  });
}