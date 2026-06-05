import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { txHash } = req.body;

  if (!txHash) {
    return res.status(400).json({ error: 'Missing txHash' });
  }

  const ADMIN_ADDRESS = process.env.NEXT_PUBLIC_ADMIN_ADDRESS;
  if (!ADMIN_ADDRESS) {
    return res.status(500).json({ error: 'Admin address not configured' });
  }

  const BLOCKFROST_KEY = process.env.NEXT_PUBLIC_BLOCKFROST_KEY;
  if (!BLOCKFROST_KEY) {
    return res.status(500).json({ error: 'Blockfrost key not configured' });
  }

  // Determine network (preprod or mainnet)
  const BLOCKFROST_BASE = BLOCKFROST_KEY.startsWith('preprod')
    ? 'https://cardano-preprod.blockfrost.io/api/v0'
    : 'https://cardano-mainnet.blockfrost.io/api/v0';

  const BF_HEADERS = { project_id: BLOCKFROST_KEY };

  try {
    // Poll for confirmation + verify 5 ADA output to admin (up to 60s)
    let confirmed = false;

    for (let i = 0; i < 20; i++) {
      if (i > 0) {
        await new Promise(r => setTimeout(r, 5000));
      }

      try {
        // Step 1 — check tx exists on chain
        const txRes = await fetch(`${BLOCKFROST_BASE}/txs/${txHash}`, { headers: BF_HEADERS });
        if (!txRes.ok) continue;

        // Step 2 — verify outputs contain exactly 5 ADA to admin address
        const utxosRes = await fetch(`${BLOCKFROST_BASE}/txs/${txHash}/utxos`, { headers: BF_HEADERS });
        if (!utxosRes.ok) continue;

        const utxoData = await utxosRes.json();
        const outputs: { address: string; amount: { unit: string; quantity: string }[] }[] = utxoData.outputs ?? [];

        const adminReceived = outputs.some(output => {
          if (output.address !== ADMIN_ADDRESS) return false;
          const lovelace = output.amount.find(a => a.unit === 'lovelace');
          return lovelace && parseInt(lovelace.quantity) >= 5_000_000;
        });

        if (!adminReceived) {
          return res.status(400).json({
            error: 'Payment verification failed — 5 ADA output to Tixano not found in transaction.',
          });
        }

        confirmed = true;
        break;
      } catch (verifyErr: unknown) {
        // Re-throw verification failures immediately — no point retrying
        if (verifyErr instanceof Error && verifyErr.message?.includes('Payment verification')) {
          return res.status(400).json({ error: verifyErr.message });
        }
        // Network errors just continue polling
      }
    }

    if (!confirmed) {
      return res.status(408).json({
        error: 'Transaction not confirmed in time. Please try again.',
      });
    }

    return res.status(200).json({ success: true, txHash });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Failed to confirm transaction';
    console.error('Transaction confirmation error:', error);
    return res.status(500).json({
      error: errorMsg,
    });
  }
}
