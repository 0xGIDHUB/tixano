import nodemailer from 'nodemailer';

let transporter: nodemailer.Transporter | null = null;

export async function getEmailTransporter() {
  if (transporter) {
    return transporter;
  }

  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN;
  const userEmail = process.env.GMAIL_USER_EMAIL;

  if (!clientId || !clientSecret || !refreshToken || !userEmail) {
    throw new Error(
      'Missing Gmail OAuth2 credentials. Please set GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN, and GMAIL_USER_EMAIL environment variables.'
    );
  }

  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      type: 'OAuth2',
      user: userEmail,
      clientId,
      clientSecret,
      refreshToken,
    },
  });

  // Verify connection
  try {
    await transporter.verify();
    console.log('✓ Gmail transporter verified');
  } catch (error) {
    console.error('✗ Gmail transporter verification failed:', error);
    transporter = null;
    throw error;
  }

  return transporter;
}

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  from?: string
) {
  const transporter = await getEmailTransporter();
  const userEmail = process.env.GMAIL_USER_EMAIL!;

  const result = await transporter.sendMail({
    from: from || `Tixano <${userEmail}>`,
    to,
    subject,
    html,
  });

  return result;
}
