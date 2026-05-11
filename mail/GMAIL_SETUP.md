# Gmail OAuth2 Email Setup Guide

Your Tixano app now uses **Gmail with OAuth2** to send automated emails, supporting @gmail.com addresses natively.

## Prerequisites

- A Gmail account (the one you want to send emails from)
- Google Cloud Project

## Step 1: Set Up Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project (or use existing)
3. Search for and enable the **Gmail API**:
   - Click "Enable"

## Step 2: Create OAuth2 Credentials

1. Go to **APIs & Services → Credentials**
2. Click **Create Credentials → OAuth 2.0 Client ID**
3. Select **Desktop Application**
4. Click **Create**
5. Download the JSON file (you'll need the Client ID and Client Secret)

## Step 3: Generate Refresh Token

You need to generate a refresh token. Use this Node.js script:

```javascript
// Save as generate-gmail-token.js in your project root
const { google } = require('googleapis');
const fs = require('fs');
const http = require('http');
const url = require('url');

// remove comment
// const CLIENT_ID = 'your-client-id';
// const CLIENT_SECRET = 'your-client-secret';
// const REDIRECT_URL = 'http://localhost:3000/auth/callback';

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URL
);

const scopes = ['https://mail.google.com/'];

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: scopes,
});

console.log('Visit this URL to authorize:', authUrl);
console.log('Listening on http://localhost:3000...\n');

// Create a local server to receive the callback
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  
  if (parsedUrl.pathname === '/auth/callback') {
    const code = parsedUrl.query.code;
    
    if (code) {
      try {
        console.log('\nAttempting to exchange code for token...');
        const tokenResponse = await oauth2Client.getToken(code);
        
        const credentials = tokenResponse.tokens || tokenResponse;
        
        if (!credentials || !credentials.refresh_token) {
          console.error('\n✗ Error: No refresh token received');
          console.error('Credentials:', JSON.stringify(credentials, null, 2));
          res.writeHead(400, { 'Content-Type': 'text/html' });
          res.end('<h1>✗ Error</h1><p>No refresh token received. Check the terminal for details.</p>');
          server.close();
          return;
        }
        
        console.log('\n✓ Success! Add these to your .env.local:\n');
        console.log(`GMAIL_CLIENT_ID=${CLIENT_ID}`);
        console.log(`GMAIL_CLIENT_SECRET=${CLIENT_SECRET}`);
        console.log(`GMAIL_REFRESH_TOKEN=${credentials.refresh_token}`);
        console.log(`GMAIL_USER_EMAIL=your-email@gmail.com`);
        fs.writeFileSync('gmail-credentials.json', JSON.stringify(credentials, null, 2));
        
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<h1>✓ Authorization successful!</h1><p>You can close this window and return to the terminal.</p>');
        server.close();
      } catch (error) {
        console.error('Error:', error.message);
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end(`<h1>✗ Error</h1><p>${error.message}</p>`);
        server.close();
      }
    } else {
      res.writeHead(400, { 'Content-Type': 'text/html' });
      res.end('<h1>✗ No authorization code received</h1>');
      server.close();
    }
  }
});

server.listen(3000);
```

Run it:
```bash
npm install googleapis
node generate-gmail-token.js
```

## Step 4: Add Environment Variables

Add these to your `.env.local` file:

```env
GMAIL_CLIENT_ID=your_client_id_here
GMAIL_CLIENT_SECRET=your_client_secret_here
GMAIL_REFRESH_TOKEN=your_refresh_token_here
GMAIL_USER_EMAIL=your-email@gmail.com
```

Replace with your actual values from steps 2 and 3.

## Step 5: Test

Restart your Next.js dev server:
```bash
npm run dev
```

The email will now be sent from your Gmail account when users register for events.

## Troubleshooting

### "Less secure app access" error
- Gmail might block the connection for security reasons
- Go to [myaccount.google.com/security](https://myaccount.google.com/security)
- Enable "Less secure app access" or use Gmail App Passwords instead

### "Invalid credentials" error
- Ensure all environment variables are set correctly
- Check that the refresh token hasn't expired
- Regenerate credentials if needed

### Email still not sending
- Check server logs: `npm run dev`
- Verify Gmail account isn't rate-limited
- Try sending a test email with a delay between attempts

## Security Notes

⚠️ **Important:**
- Never commit `.env.local` to version control
- Never share your OAuth2 credentials
- Use environment variables for all sensitive data
- For production, consider rotating credentials periodically

---

Your email setup is now complete and ready to send confirmation emails! 🎉
