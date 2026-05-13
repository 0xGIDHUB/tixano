export async function generateTicketImage({
  bannerImageUrl,
  ticketId,
  eventTitle,
  eventAlias,
  eventDate,
  assetName,
}: {
  bannerImageUrl: string | null;
  ticketId: string;
  eventTitle: string;
  eventAlias: string;
  eventDate: string | null;
  assetName: string;
}): Promise<string> {

  // If there's a banner URL, fetch it and convert to base64
  let bannerBase64 = '';
  if (bannerImageUrl) {
    const imgRes = await fetch(bannerImageUrl);
    const blob = await imgRes.blob();
    bannerBase64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  const res = await fetch('/api/nft/generate-ticket-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      bannerImageBase64: bannerBase64,
      ticketId,
      eventTitle,
      eventAlias,
      eventDate,
      assetName,
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to generate ticket NFT image');
  }

  const { ipfsUri } = await res.json();
  return ipfsUri;
}