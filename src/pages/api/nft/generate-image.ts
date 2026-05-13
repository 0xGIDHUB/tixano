import type { NextApiRequest, NextApiResponse } from 'next';
import { createCanvas, loadImage } from 'canvas';
import path from 'path';
import { uploadImageToIPFS } from '@/lib/ipfs/pinata';

export const config = {
  api: { bodyParser: { sizeLimit: '5mb' } },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { coverImageBase64, eventAlias } = req.body;

    if (!coverImageBase64 || !eventAlias) {
      return res.status(400).json({ error: 'Missing coverImageBase64 or eventAlias' });
    }

    // 1. Create 800x800 canvas
    const SIZE = 800;
    const canvas = createCanvas(SIZE, SIZE);
    const ctx = canvas.getContext('2d');

    // 2. Draw the cover image stretched to fill canvas
    const coverImage = await loadImage(coverImageBase64);
    ctx.drawImage(coverImage, 0, 0, SIZE, SIZE);

    // 3. Load the Tixano icon from public folder
    const iconPath = path.join(process.cwd(), 'public', 'Tixano.png');
    const icon = await loadImage(iconPath);

    // 4. Draw the Tixano icon directly as watermark (bottom-left)
    const iconSize = 60;
    const iconPadding = 20;
    ctx.globalAlpha = 0.85;
    ctx.drawImage(
      icon,
      SIZE - iconSize - iconPadding,      // ← right edge
      SIZE - iconSize - iconPadding,
      iconSize,
      iconSize
    );
    ctx.globalAlpha = 1.0;

    // 5. Draw cyan border
    ctx.strokeStyle = '#00E5FF';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, SIZE - 4, SIZE - 4);

    // 6. Export canvas as PNG buffer
    const buffer = canvas.toBuffer('image/png');

    // 7. Upload to IPFS via Pinata
    const ipfsUri = await uploadImageToIPFS(buffer, `TXNE-${eventAlias}-nft.png`);

    return res.status(200).json({ ipfsUri });

  } catch (err: any) {
    console.error('NFT image generation error:', err);
    return res.status(500).json({ error: err.message });
  }
}