import type { NextApiRequest, NextApiResponse } from 'next';
import { sendEmail } from '@/lib/email/gmail';

type ResponseData = {
  success?: boolean;
  message?: string;
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
    const { ownerEmail, ownerName, eventTitle, eventDate, ticketId, txHash, assetName } = req.body;

    // Validate required fields
    if (!ownerEmail || !ownerName || !eventTitle || !ticketId || !txHash) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Generate confirmation email HTML
    const emailHtml = generateConfirmationEmail({
      ownerName,
      eventTitle,
      eventDate,
      ticketId,
      txHash,
      assetName,
    });

    // Send email
    await sendEmail(
      ownerEmail,
      `Your ${eventTitle} NFT Ticket Confirmation`,
      emailHtml
    );

    return res.status(200).json({
      success: true,
      message: 'Confirmation email sent successfully',
    });
  } catch (error: any) {
    console.error('Error sending confirmation email:', error);
    return res.status(500).json({
      error: error.message || 'Failed to send confirmation email',
    });
  }
}

function generateConfirmationEmail({
  ownerName,
  eventTitle,
  eventDate,
  ticketId,
  txHash,
  assetName,
}: {
  ownerName: string;
  eventTitle: string;
  eventDate: string;
  ticketId: string;
  txHash: string;
  assetName: string;
}): string {
  const cardanoScanUrl = `${process.env.NEXT_PUBLIC_CARDANOSCAN_URL}/transaction/${txHash}`;

  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f5f5f5;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          }
          .header {
            background: linear-gradient(135deg, #00e5ff 0%, #0099cc 100%);
            color: white;
            padding: 40px 30px;
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 700;
          }
          .header p {
            margin: 8px 0 0 0;
            font-size: 14px;
            opacity: 0.9;
          }
          .content {
            padding: 40px 30px;
          }
          .greeting {
            font-size: 16px;
            color: #333;
            margin-bottom: 24px;
            line-height: 1.6;
          }
          .ticket-info {
            background-color: #f8f9fa;
            border-left: 4px solid #00e5ff;
            padding: 20px;
            border-radius: 4px;
            margin: 24px 0;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 12px;
            font-size: 14px;
          }
          .info-row:last-child {
            margin-bottom: 0;
          }
          .info-label {
            color: #666;
            font-weight: 600;
          }
          .info-value {
            color: #333;
            word-break: break-all;
          }
          .cta-section {
            text-align: center;
            margin: 32px 0;
          }
          .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #00e5ff 0%, #0099cc 100%);
            color: white;
            padding: 12px 32px;
            border-radius: 6px;
            text-decoration: none;
            font-weight: 700;
            font-size: 14px;
            transition: transform 0.2s;
          }
          .cta-button:hover {
            transform: scale(1.05);
          }
          .footer {
            background-color: #f8f9fa;
            padding: 20px 30px;
            text-align: center;
            font-size: 12px;
            color: #999;
            border-top: 1px solid #e5e5e5;
          }
          .footer p {
            margin: 0;
            line-height: 1.6;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <!-- Header -->
          <div class="header">
            <h1>🎉 Ticket Confirmed!</h1>
            <p>Your NFT ticket has been successfully minted</p>
          </div>

          <!-- Content -->
          <div class="content">
            <div class="greeting">
              <strong>Hi ${escapeHtml(ownerName)},</strong>
              <p>Thank you for registering for <strong>${escapeHtml(eventTitle)}</strong>! Your NFT ticket has been successfully minted on the Cardano blockchain.</p>
            </div>

            <!-- Ticket Information -->
            <div style="background:#0a0a0a;border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:20px;margin-bottom:24px;">
            <table style="width:100%;border-collapse:collapse;">
              <tr>
                <td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
                  <span style="color:rgba(255,255,255,0.3);font-size:11px;text-transform:uppercase;letter-spacing:0.1em;">Event</span>
                </td>
                <td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);text-align:right;font-size:13px;color:rgba(255,255,255,0.8);">
                  ${eventTitle}
                </td>
              </tr>
              <tr>
                <td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
                  <span style="color:rgba(255,255,255,0.3);font-size:11px;text-transform:uppercase;letter-spacing:0.1em;">Date</span>
                </td>
                <td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);text-align:right;font-size:13px;color:rgba(255,255,255,0.8);">
                  ${eventDate}
                </td>
              </tr>
              <tr>
                <td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
                  <span style="color:rgba(255,255,255,0.3);font-size:11px;text-transform:uppercase;letter-spacing:0.1em;">Ticket ID</span>
                </td>
                <td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);text-align:right;font-size:11px;font-family:monospace;color:rgba(255,255,255,0.6);">
                  ${ticketId}
                </td>
              </tr>
              <tr>
                <td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
                  <span style="color:rgba(255,255,255,0.3);font-size:11px;text-transform:uppercase;letter-spacing:0.1em;">Token Name</span>
                </td>
                <td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);text-align:right;font-size:11px;font-family:monospace;color:rgba(255,255,255,0.6);">
                  ${assetName}
                </td>
              </tr>
            </table>
          </div>

            <!-- Call to Action -->
            <div class="cta-section">
              <p style="color: #666; font-size: 14px; margin-bottom: 16px;">
                View your transaction on the Cardano blockchain:
              </p>
              <a href="${cardanoScanUrl}" class="cta-button">View on Cardanoscan</a>
            </div>

            <!-- Next Steps -->
            <div style="background-color: #f0f7ff; border-left: 4px solid #0099cc; padding: 16px; border-radius: 4px; margin: 24px 0; font-size: 14px; color: #333;">
              <strong style="color: #0099cc;">📌 Next Steps:</strong>
              <ul style="margin: 8px 0 0 0; padding-left: 20px; line-height: 1.8;">
                <li>Your NFT ticket is now stored in your connected wallet</li>
                <li>Ensure you have your ticket available for check-in at the event</li>
                <li>You can see the full details of your ticket through your Cardano wallet</li>
              </ul>
            </div>
          </div>

          <!-- Footer -->
          <div class="footer">
            <p>
              © ${new Date().getFullYear()} Tixano.
            </p>
          </div>
        </div>
      </body>
    </html>
  `;
}

function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
}
