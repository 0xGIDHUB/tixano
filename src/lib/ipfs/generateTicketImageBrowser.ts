import QRCode from 'qrcode';

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function generateTicketImageBrowser({
  bannerImageUrl,
  ticketId,
  eventAlias,
  assetName,
}: {
  bannerImageUrl: string | null;
  ticketId: string;
  eventAlias: string;
  assetName: string;
}): Promise<string> {
  const W = 800;
  const H = 1000;

  // Create canvas
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  // ─────────────────────────────────────
  // BACKGROUND
  // ─────────────────────────────────────
  ctx.fillStyle = '#050505';
  ctx.fillRect(0, 0, W, H);

  // ─────────────────────────────────────
  // BANNER
  // ─────────────────────────────────────
  const BANNER_H = 270;

  if (bannerImageUrl) {
    try {
      const bannerImage = await loadImage(bannerImageUrl);
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, W, BANNER_H);
      ctx.clip();

      const bw = bannerImage.width;
      const bh = bannerImage.height;
      const bannerScale = Math.max(W / bw, BANNER_H / bh);
      const scaledW = bw * bannerScale;
      const scaledH = bh * bannerScale;
      const bannerOffsetX = (W - scaledW) / 2;
      const bannerOffsetY = (BANNER_H - scaledH) / 2;
      ctx.drawImage(bannerImage, bannerOffsetX, bannerOffsetY, scaledW, scaledH);

      ctx.restore();
    } catch (e) {
      console.warn('Failed to load banner image:', e);
    }
  }

  // ── ASSET NAME TITLE ──
  const titleY = BANNER_H + 20;

  // Cyan label tag background
  ctx.fillStyle = '#050505';
  ctx.fillRect(0, BANNER_H, W, 90);

  // Top micro-line separator
  ctx.fillStyle = 'rgba(0, 229, 255, 0.3)';
  ctx.fillRect(0, BANNER_H, W, 1);

  // Asset name text - direct canvas rendering
  ctx.fillStyle = '#00E5FF';
  ctx.font = 'bold 22px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(assetName, W / 2, titleY + 30);

  // ─────────────────────────────────────
  // OUTER BORDER
  // FULL IMAGE BORDER
  // SHARP/SQUARE CORNERS
  // ─────────────────────────────────────
  ctx.strokeStyle = '#00E5FF';
  ctx.lineWidth = 5;
  ctx.strokeRect(2, 2, W - 4, H - 4);

  // ── DIVIDER ──
  const dividerY = BANNER_H + 90;

  // Dashed divider line — full width, no notches
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.setLineDash([10, 8]);
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(8, dividerY);
  ctx.lineTo(W - 8, dividerY);
  ctx.stroke();
  ctx.setLineDash([]);

  // ─────────────────────────────────────
  // QR SECTION
  // ─────────────────────────────────────
  const QR_SIZE = 430;

  const qrX = (W - QR_SIZE) / 2;
  const qrY = dividerY + 70;

  // Generate QR
  const qrDataUrl = await QRCode.toDataURL(ticketId, {
    width: QR_SIZE,
    margin: 1,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
    errorCorrectionLevel: 'H',
  });

  // QR background with rounded edges
  ctx.fillStyle = '#ffffff';

  const qrBgX = qrX - 16;
  const qrBgY = qrY - 16;
  const qrBgSize = QR_SIZE + 32;
  const qrRadius = 22;

  ctx.beginPath();
  ctx.moveTo(qrBgX + qrRadius, qrBgY);
  ctx.lineTo(qrBgX + qrBgSize - qrRadius, qrBgY);
  ctx.quadraticCurveTo(
    qrBgX + qrBgSize,
    qrBgY,
    qrBgX + qrBgSize,
    qrBgY + qrRadius
  );

  ctx.lineTo(
    qrBgX + qrBgSize,
    qrBgY + qrBgSize - qrRadius
  );

  ctx.quadraticCurveTo(
    qrBgX + qrBgSize,
    qrBgY + qrBgSize,
    qrBgX + qrBgSize - qrRadius,
    qrBgY + qrBgSize
  );

  ctx.lineTo(qrBgX + qrRadius, qrBgY + qrBgSize);

  ctx.quadraticCurveTo(
    qrBgX,
    qrBgY + qrBgSize,
    qrBgX,
    qrBgY + qrBgSize - qrRadius
  );

  ctx.lineTo(qrBgX, qrBgY + qrRadius);

  ctx.quadraticCurveTo(
    qrBgX,
    qrBgY,
    qrBgX + qrRadius,
    qrBgY
  );

  ctx.closePath();
  ctx.fill();

  // Draw QR
  const qrImage = await loadImage(qrDataUrl);
  ctx.drawImage(qrImage, qrX, qrY, QR_SIZE, QR_SIZE);

  // ─────────────────────────────────────
  // TIXANO ICON CENTER
  // ─────────────────────────────────────
  try {
    const tixanoIcon = await loadImage('/Tixano.png');
    const iconSize = 68;
    const iconX = qrX + QR_SIZE / 2 - iconSize / 2;
    const iconY = qrY + QR_SIZE / 2 - iconSize / 2;

    // White square behind icon
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(
      iconX - 8,
      iconY - 8,
      iconSize + 16,
      iconSize + 16
    );

    ctx.drawImage(tixanoIcon, iconX, iconY, iconSize, iconSize);
  } catch (e) {
    console.warn('Failed to load Tixano icon:', e);
  }

  // ─────────────────────────────────────
  // BOTTOM SECTION
  // ─────────────────────────────────────
  const stripY = H - 90;

  // POWERED BY CARDANO text - direct canvas rendering
  ctx.fillStyle = 'rgba(228, 236, 238, 0.72)';
  ctx.font = '16px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('POWERED BY CARDANO', 34, stripY + 34);

  // ─────────────────────────────────────
  // CARDANO LOGO
  // ─────────────────────────────────────
  try {
    const cardanoLogo = await loadImage('/Cardano Logo.png');
    const cardanoSize = 56;
    ctx.globalAlpha = 0.85;
    ctx.drawImage(
      cardanoLogo,
      W - cardanoSize - 34,
      stripY,
      cardanoSize,
      cardanoSize
    );
    ctx.globalAlpha = 1;
  } catch (e) {
    console.warn('Failed to load Cardano logo:', e);
  }

  // ─────────────────────────────────────
  // EXPORT + UPLOAD
  // ─────────────────────────────────────
  return new Promise((resolve, reject) => {
    canvas.toBlob(async (blob) => {
      if (!blob) {
        reject(new Error('Failed to convert canvas to blob'));
        return;
      }

      try {
        // Convert blob to base64
        const reader = new FileReader();
        reader.onload = async () => {
          const base64Data = reader.result as string;

          const uploadRes = await fetch('/api/nft/upload-to-ipfs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              imageBase64: base64Data,
              fileName: `TXNT-${eventAlias}-${ticketId.slice(0, 8)}-nft.png`,
            }),
          });

          if (!uploadRes.ok) {
            const err = await uploadRes.json();
            reject(new Error(err.error || 'Failed to upload image to IPFS'));
            return;
          }

          const { ipfsUri } = await uploadRes.json();
          resolve(ipfsUri);
        };
        reader.onerror = () => {
          reject(new Error('Failed to read blob'));
        };
        reader.readAsDataURL(blob);
      } catch (err) {
        reject(err);
      }
    }, 'image/png');
  });
}
