import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '@/lib/supabase/server';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { eventId, registrationNumber } = req.body;

  if (!eventId || !registrationNumber) {
    return res.status(400).json({ error: 'Missing eventId or registrationNumber' });
  }

  const { error } = await supabaseAdmin
    .rpc('add_failed_reservation', {
      event_id: eventId,
      reg_number: registrationNumber,
    });

  if (error) {
    console.error('Release number error:', error);
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ released: true });
}