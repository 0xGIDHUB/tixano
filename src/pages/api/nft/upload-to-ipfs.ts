import type { NextApiRequest, NextApiResponse } from 'next';
import { uploadImageToIPFS } from '@/lib/ipfs/pinata';

type ResponseData = {
  ipfsUri?: string;
  error?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { imageBase64, fileName } = req.body;

    if (!imageBase64 || !fileName) {
      return res.status(400).json({ error: 'Missing imageBase64 or fileName' });
    }

    // Convert base64 data URL to buffer
    const base64String = imageBase64.split(',')[1] || imageBase64;
    const imageBuffer = Buffer.from(base64String, 'base64');

    // Upload to IPFS
    const ipfsUri = await uploadImageToIPFS(imageBuffer, fileName);

    return res.status(200).json({ ipfsUri });
  } catch (error) {
    console.error('Upload to IPFS error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to upload to IPFS',
    });
  }
}
