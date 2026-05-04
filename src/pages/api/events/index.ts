import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '@/lib/supabase/server';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    eventId,          // ← the UUID generated on frontend
    walletAddress,
    policyId,
    txHash,
    title,
    eventAlias,
    description,
    date,
    startTime,
    endTime,
    city,
    country,
    address,
    capacity,
    pricing,
    ticketPrice,
    registrationDeadline,
    coverImageUrl,
    bannerImageUrl,
  } = req.body;

  // Add to validation
  if (!eventId || !walletAddress || !title || !eventAlias || !date || !startTime || !policyId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const { data, error } = await supabaseAdmin
    .from('events')
    .insert({
      id: eventId,              // ← use the frontend UUID as primary key
      organizer_wallet: walletAddress,
      policy_id: policyId,
      title,
      event_alias: eventAlias,
      description,
      date,
      start_time: startTime,
      end_time: endTime,
      city,
      country,
      address,
      capacity: parseInt(capacity),
      pricing,
      ticket_price: pricing === 'paid' ? parseFloat(ticketPrice) : 0,
      registration_deadline: registrationDeadline || null,
      cover_image_url: coverImageUrl || null,
      banner_image_url: bannerImageUrl || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Supabase error:', error);
    return res.status(500).json({ error: error.message });
  }

  return res.status(201).json({ event: data });
}