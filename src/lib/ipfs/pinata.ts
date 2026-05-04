export async function uploadImageToIPFS(
  imageBuffer: Buffer,
  fileName: string
): Promise<string> {
  const formData = new FormData();
  const blob = new Blob([new Uint8Array(imageBuffer)], { type: 'image/png' });
  formData.append('file', blob, fileName);
  formData.append('pinataMetadata', JSON.stringify({ name: fileName }));
  formData.append('pinataOptions', JSON.stringify({ cidVersion: 1 }));

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

  try {
    const res = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PINATA_JWT!}`,
      },
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      const err = await res.json();
      throw new Error(`Pinata upload failed: ${JSON.stringify(err)}`);
    }

    const data = await res.json();
    return `ipfs://${data.IpfsHash}`;

  } catch (err: any) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') {
      throw new Error('Pinata upload timed out. Check your internet connection.');
    }
    throw err;
  }
}