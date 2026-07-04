import { generateTicketImageBrowser } from './generateTicketImageBrowser';

export async function generateTicketImage({
  bannerImageUrl,
  ticketId,
  eventTitle,
  eventAlias,
  eventDate,
  assetName,
  ownerName,
  avatarDataUrl,
}: {
  bannerImageUrl: string | null;
  ticketId: string;
  eventTitle: string;
  eventAlias: string;
  eventDate: string | null;
  assetName: string;
  ownerName?: string;
  avatarDataUrl?: string | null;
}): Promise<string> {
  return generateTicketImageBrowser({
    bannerImageUrl,
    ticketId,
    eventAlias,
    assetName,
    ownerName,
    avatarDataUrl,
  });
}