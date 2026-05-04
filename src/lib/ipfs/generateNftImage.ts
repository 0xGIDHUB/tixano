export async function generateNftImage(
  coverImageFile: File,
  eventAlias: string
): Promise<string> {
  // Convert File to base64
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(coverImageFile);
  });

  const res = await fetch('/api/nft/generate-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      coverImageBase64: base64,
      eventAlias,
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to generate NFT image');
  }

  const { ipfsUri } = await res.json();
  return ipfsUri;
}