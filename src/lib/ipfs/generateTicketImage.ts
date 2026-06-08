import { generateTicketImageBrowser } from './generateTicketImageBrowser';

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
  // Generate ticket image in the browser using canvas
  return generateTicketImageBrowser({
    bannerImageUrl,
    ticketId,
    eventAlias,
    assetName,
  });
}