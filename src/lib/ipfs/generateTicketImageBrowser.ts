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

function drawPersonIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number) {
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  // Head
  ctx.beginPath();
  ctx.arc(cx, cy - radius * 0.16, radius * 0.25, 0, Math.PI * 2);
  ctx.fill();
  // Body/shoulders arc
  ctx.beginPath();
  ctx.arc(cx, cy + radius * 0.50, radius * 0.48, Math.PI, 0, false);
  ctx.fill();
}

export async function generateTicketImageBrowser({
  bannerImageUrl,
  ticketId,
  eventAlias,
  assetName,
  ownerName,
  avatarDataUrl,
}: {
  bannerImageUrl: string | null;
  ticketId: string;
  eventAlias: string;
  assetName: string;
  ownerName?: string;
  avatarDataUrl?: string | null;
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
  const QR_SIZE = 400;

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
  // BOTTOM SECTION — avatar + name + cardano logo
  // ─────────────────────────────────────
  const stripY = H - 120;
  const avatarDiameter = 88;
  const avatarRadius = avatarDiameter / 2;
  const avatarCX = 40 + avatarRadius;
  const avatarCY = stripY + 45;
  const cardanoSize = 56;

  // Draw avatar circle (clipped)
  ctx.save();
  ctx.beginPath();
  ctx.arc(avatarCX, avatarCY, avatarRadius, 0, Math.PI * 2);
  ctx.clip();

  // Dark fill background
  ctx.fillStyle = '#0a0f1a';
  ctx.fillRect(avatarCX - avatarRadius, avatarCY - avatarRadius, avatarDiameter, avatarDiameter);

  if (avatarDataUrl) {
    try {
      const avatarImg = await loadImage(avatarDataUrl);
      // Cover-fit: crop to square from center
      const imgAspect = avatarImg.width / avatarImg.height;
      let sx = 0, sy = 0, sw = avatarImg.width, sh = avatarImg.height;
      if (imgAspect > 1) { sw = avatarImg.height; sx = (avatarImg.width - sw) / 2; }
      else { sh = avatarImg.width; sy = (avatarImg.height - sh) / 2; }
      ctx.drawImage(avatarImg, sx, sy, sw, sh, avatarCX - avatarRadius, avatarCY - avatarRadius, avatarDiameter, avatarDiameter);
    } catch {
      drawPersonIcon(ctx, avatarCX, avatarCY, avatarRadius);
    }
  } else {
    drawPersonIcon(ctx, avatarCX, avatarCY, avatarRadius);
  }
  ctx.restore();

  // Cyan border ring
  ctx.strokeStyle = '#00E5FF';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(avatarCX, avatarCY, avatarRadius, 0, Math.PI * 2);
  ctx.stroke();

  // Owner name
  if (ownerName) {
    const nameX = avatarCX + avatarRadius + 16;
    const maxNameWidth = W - nameX - (cardanoSize + 34 + 24);
    ctx.fillStyle = 'rgba(228, 236, 238, 0.85)';
    ctx.font = '30px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    // Truncate if needed
    let displayName = ownerName;
    while (ctx.measureText(displayName).width > maxNameWidth && displayName.length > 3) {
      displayName = displayName.slice(0, -1);
    }
    if (displayName !== ownerName) displayName += '...';
    ctx.fillText(displayName, nameX, avatarCY);
  }

  // Cardano logo — bottom right
  try {
    const cardanoLogo = await loadImage('/Cardano Logo.png');
    ctx.globalAlpha = 0.85;
    ctx.drawImage(cardanoLogo, W - cardanoSize - 34, stripY + (90 - cardanoSize) / 2, cardanoSize, cardanoSize);
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
