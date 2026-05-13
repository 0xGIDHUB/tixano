import type { NextApiRequest, NextApiResponse } from 'next';
import { createCanvas, loadImage } from 'canvas';
import path from 'path';
import QRCode from 'qrcode';
import { uploadImageToIPFS } from '@/lib/ipfs/pinata';

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
            eventTitle,
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

        // NO rounded clipping anymore
        ctx.drawImage(bannerImage, 0, 0, W, BANNER_H);

        // ── ASSET NAME TITLE ──
        const titleY = BANNER_H + 20;

        // Cyan label tag background
        ctx.fillStyle = '#050505';
        ctx.fillRect(0, BANNER_H, W, 90);

        // Top micro-line separator
        ctx.fillStyle = 'rgba(0, 229, 255, 0.3)';
        ctx.fillRect(0, BANNER_H, W, 1);

        // Asset name text
        ctx.fillStyle = '#00E5FF';
        ctx.font = 'bold 22px monospace';
        ctx.textAlign = 'center';
        ctx.fillText((req.body.assetName || `TXNT-${eventAlias}`).toUpperCase(), W / 2, titleY + 35);

        // ─────────────────────────────────────
        // OUTER BORDER
        // FULL IMAGE BORDER
        // SHARP/SQUARE CORNERS
        // ─────────────────────────────────────
        ctx.strokeStyle = '#00E5FF';
        ctx.lineWidth = 5;
        ctx.strokeRect(2, 2, W - 4, H - 4);

        // ── DIVIDER WITH NOTCHES ──
        const dividerY = BANNER_H + 90;
        const NOTCH_R = 30;

        // Use destination-out to punch TRUE transparent holes at both sides
        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';

        // Left notch — erase a semicircle from the left edge
        ctx.beginPath();
        ctx.arc(0, dividerY, NOTCH_R, -Math.PI / 2, Math.PI / 2);
        ctx.fill();

        // Right notch — erase a semicircle from the right edge
        ctx.beginPath();
        ctx.arc(W, dividerY, NOTCH_R, Math.PI / 2, -Math.PI / 2);
        ctx.fill();

        ctx.restore(); // restore normal compositing

        // Redraw the cyan border in two halves (above and below the notches)
        ctx.strokeStyle = '#00E5FF';
        ctx.lineWidth = 4;

        // Top half — top edge + left and right sides down to notch
        ctx.beginPath();
        ctx.moveTo(2, 2);
        ctx.lineTo(W - 2, 2);
        ctx.lineTo(W - 2, dividerY - NOTCH_R);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(2, 2);
        ctx.lineTo(2, dividerY - NOTCH_R);
        ctx.stroke();

        // Bottom half — left and right sides from notch down + bottom edge
        ctx.beginPath();
        ctx.moveTo(2, dividerY + NOTCH_R);
        ctx.lineTo(2, H - 2);
        ctx.lineTo(W - 2, H - 2);
        ctx.lineTo(W - 2, dividerY + NOTCH_R);
        ctx.stroke();

        // Dashed divider line between the notches
        ctx.strokeStyle = 'rgba(255,255,255,0.35)';
        ctx.setLineDash([8, 6]);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(NOTCH_R + 8, dividerY);
        ctx.lineTo(W - NOTCH_R - 8, dividerY);
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

        // POWERED BY CARDANO
        ctx.fillStyle = 'rgba(228, 236, 238, 0.72)';
        ctx.font = '400 18px sans-serif';
        ctx.textAlign = 'left';

        ctx.fillText('POWERED BY CARDANO', 34, stripY + 34);

        // ─────────────────────────────────────
        // CARDANO LOGO
        // ─────────────────────────────────────
        const cardanoLogo = await loadImage(
            path.join(process.cwd(), 'public', 'Cardano Logo.png')
        );

        const cardanoSize = 56;

        ctx.globalAlpha = 0.65;

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

    } catch (err: any) {
        console.error(
            'Ticket NFT image generation error:',
            err.message,
            err.stack
        );

        return res.status(500).json({ error: err.message });
    }
}