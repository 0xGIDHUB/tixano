import type { NextApiRequest, NextApiResponse } from 'next';
import { createCanvas, loadImage, registerFont } from 'canvas';
import path from 'path';
import QRCode from 'qrcode';
import { uploadImageToIPFS } from '@/lib/ipfs/pinata';
import fs from 'fs';

// Try to load bundled fonts, but don't fail if they're not available
let fontRegistered = false;

const bundledFontPaths = {
  bold: path.join(process.cwd(), 'public', 'fonts', 'DejaVuSans-Bold.ttf'),
  regular: path.join(process.cwd(), 'public', 'fonts', 'DejaVuSans.ttf'),
};

for (const [weight, fontPath] of Object.entries(bundledFontPaths)) {
  try {
    if (fs.existsSync(fontPath)) {
      registerFont(fontPath, { family: 'CustomFont', weight: weight === 'bold' ? 'bold' : 'normal' });
      fontRegistered = true;
      console.log(`Loaded ${weight} font from: ${fontPath}`);
    }
  } catch (e) {
    console.warn(`Failed to load ${weight} font from ${fontPath}`);
  }
}

if (!fontRegistered) {
  console.warn('⚠ System fonts not available - will use SVG text rendering');
}

// Helper function to render text as SVG and convert to data URL
function createTextImage(text: string, fontSize: number, color: string, width: number, height: number, bold: boolean = false): string {
  const fontWeight = bold ? 'bold' : 'normal';
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <text 
        x="${width / 2}" 
        y="${height / 2}" 
        font-size="${fontSize}" 
        fill="${color}" 
        font-family="Arial, sans-serif"
        font-weight="${fontWeight}"
        text-anchor="middle"
        dominant-baseline="middle"
        style="word-break: break-all;"
      >${escapeXml(text)}</text>
    </svg>
  `;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

// Escape XML special characters
function escapeXml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export const config = {
    api: { bodyParser: { sizeLimit: '10mb' } },
};

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const {
            bannerImageBase64,
            ticketId,
            eventAlias,
        } = req.body;

        if (!bannerImageBase64 || !ticketId || !eventAlias) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // ─────────────────────────────────────
        // CANVAS
        // ─────────────────────────────────────
        const W = 800;
        const H = 1000;

        const canvas = createCanvas(W, H);
        const ctx = canvas.getContext('2d');

        // ─────────────────────────────────────
        // BACKGROUND
        // ─────────────────────────────────────
        ctx.fillStyle = '#050505';
        ctx.fillRect(0, 0, W, H);


        // ─────────────────────────────────────
        // BANNER
        // ─────────────────────────────────────
        const BANNER_H = 270;

        const bannerImage = await loadImage(bannerImageBase64);

        // With this — object-fit: cover equivalent
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

        // ── ASSET NAME TITLE ──
        const titleY = BANNER_H + 20;

        // Cyan label tag background
        ctx.fillStyle = '#050505';
        ctx.fillRect(0, BANNER_H, W, 90);

        // Top micro-line separator
        ctx.fillStyle = 'rgba(0, 229, 255, 0.3)';
        ctx.fillRect(0, BANNER_H, W, 1);

        // Asset name text - render as SVG if fonts aren't registered
        const assetName = (req.body.assetName || `TXNT-${eventAlias}`).toUpperCase();
        
        if (fontRegistered) {
          // Use canvas text rendering if fonts are available
          ctx.fillStyle = '#00E5FF';
          ctx.font = 'bold 22px "CustomFont"';
          ctx.textAlign = 'center';
          ctx.fillText(assetName, W / 2, titleY + 35);
        } else {
          // Use SVG-rendered text as fallback
          const textSvgUrl = createTextImage(assetName, 22, '#00E5FF', W, 60, true);
          const textImage = await loadImage(textSvgUrl);
          const textX = (W - textImage.width) / 2;
          const textY = titleY + 20;
          ctx.drawImage(textImage, textX, textY);
        }

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

        /// QR background with rounded edges
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
        const iconPath = path.join(process.cwd(), 'public', 'Tixano.png');

        const tixanoIcon = await loadImage(iconPath);

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


        // ─────────────────────────────────────
        // BOTTOM SECTION
        // ─────────────────────────────────────
        const stripY = H - 90;

        // POWERED BY CARDANO text - render as SVG if fonts aren't registered
        if (fontRegistered) {
          // Use canvas text rendering if fonts are available
          ctx.fillStyle = 'rgba(228, 236, 238, 0.72)';
          ctx.font = '18px "CustomFont"';
          ctx.textAlign = 'left';
          ctx.fillText('POWERED BY CARDANO', 34, stripY + 34);
        } else {
          // Use SVG-rendered text as fallback
          const textSvgUrl = createTextImage('POWERED BY CARDANO', 18, 'rgba(228, 236, 238, 0.72)', 300, 50, false);
          const textImage = await loadImage(textSvgUrl);
          ctx.drawImage(textImage, 34, stripY + 10);
        }

        // ─────────────────────────────────────
        // CARDANO LOGO
        // ─────────────────────────────────────
        const cardanoLogo = await loadImage(
            path.join(process.cwd(), 'public', 'Cardano Logo.png')
        );

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

        // ─────────────────────────────────────
        // EXPORT + UPLOAD
        // ─────────────────────────────────────
        const buffer = canvas.toBuffer('image/png');

        const ipfsUri = await uploadImageToIPFS(
            buffer,
            `TXNT-${eventAlias}-${ticketId.slice(0, 8)}-nft.png`
        );

        return res.status(200).json({ ipfsUri });

    } catch (err: unknown) {
        const errorObj = err as {message?: string; stack?: string};
        console.error(
            'Ticket NFT image generation error:',
            errorObj.message,
            errorObj.stack
        );

        return res.status(500).json({ error: errorObj.message });
    }
}