export async function waitForConfirmation(
  txHash: string,
  maxAttempts = 30,
  intervalMs = 5000
): Promise<boolean> {
  const network = 'preprod';

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const res = await fetch(
      `https://cardano-${network}.blockfrost.io/api/v0/txs/${txHash}`,
      { headers: { project_id: process.env.NEXT_PUBLIC_BLOCKFROST_KEY! } }
    );

    if (res.status === 200) return true;
    if (res.status === 404) {
      console.log(`Attempt ${attempt}/${maxAttempts} — waiting...`);
      await new Promise(r => setTimeout(r, intervalMs));
      continue;
    }

    throw new Error('Blockfrost error during confirmation');
  }

  throw new Error('Transaction confirmation timed out');
}