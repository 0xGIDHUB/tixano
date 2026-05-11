# Environment Variables Setup Guide

This guide explains how to set up all required environment variables for the Tixano application.

## Overview

The application uses environment variables for integrating with:
- Supabase (Backend & Authentication)
- Cardano (Blockchain Network)
- Pinata (IPFS Storage)
- Gmail (Email Service)

## Setup Instructions

### 1. Create `.env.local` File

Create a `.env.local` file in the root directory of your project and add all the variables listed below.

```bash
cp .env.example .env.local  # if .env.example exists
# OR manually create .env.local
```

---

## Environment Variables

### Supabase Configuration

Supabase provides the backend database and real-time capabilities.

| Variable | Description | How to Get |
|----------|-------------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | 1. Go to [supabase.com](https://supabase.com) and log in<br>2. Select your project<br>3. Go to Settings → API<br>4. Copy the Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anonymous key for client-side operations | Settings → API → Copy the `anon` public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key for server-side operations | Settings → API → Copy the `service_role` secret key<br>⚠️ **Keep this secret** - never expose it in client code |

**Note:** The `NEXT_PUBLIC_` prefix means these variables will be exposed to the browser. Keep sensitive keys in `SUPABASE_SERVICE_ROLE_KEY` which is server-only.

---

### Cardano Configuration

Configuration for interacting with the Cardano blockchain network.

| Variable | Description | How to Get |
|----------|-------------|-----------|
| `NEXT_PUBLIC_CARDANO_NETWORK` | Blockchain network (preprod/mainnet) | Set to `preprod` for testing or `mainnet` for production |
| `NEXT_PUBLIC_CARDANOSCAN_URL` | URL to Cardanoscan explorer | `https://preprod.cardanoscan.io` for preprod or `https://cardanoscan.io` for mainnet |
| `NEXT_PUBLIC_BLOCKFROST_KEY` | Blockfrost API key for Cardano node access | 1. Go to [blockfrost.io](https://blockfrost.io)<br>2. Sign up and create a project<br>3. Copy your API key for your network |
| `NEXT_PUBLIC_ADMIN_PKH` | Admin's Payment Key Hash | Generated from your Cardano wallet's public key |
| `NEXT_PUBLIC_ADMIN_ADDRESS` | Admin's wallet address | Your Cardano wallet address (testnet address for preprod) |

**Note on Networks:**
- **preprod**: Cardano's public test network (for development/testing)
- **mainnet**: Cardano's main production network (for live transactions)

---

### IPFS Storage Configuration (Pinata)

Pinata provides IPFS pinning services for storing NFT metadata and images.

| Variable | Description | How to Get |
|----------|-------------|-----------|
| `PINATA_API_KEY` | Pinata API key | 1. Go to [pinata.cloud](https://pinata.cloud)<br>2. Sign in to your account<br>3. Go to API Keys<br>4. Create or copy your API key |
| `PINATA_API_SECRET` | Pinata API secret | API Keys page → Copy your API secret<br>⚠️ **Keep this secret** - store securely |
| `PINATA_JWT` | Pinata JWT token for authentication | API Keys page → Copy your JWT token<br>This token expires, generate a new one when needed |

**Note:** JWT tokens have expiration dates. Monitor your Pinata account and regenerate when necessary.

---

### Email Configuration (Gmail OAuth2)

Gmail API configuration for sending email confirmations and notifications.

| Variable | Description | How to Get |
|----------|-------------|-----------|
| `GMAIL_CLIENT_ID` | Google OAuth 2.0 Client ID | See [Gmail Setup Guide](./mail/GMAIL_SETUP.md) |
| `GMAIL_CLIENT_SECRET` | Google OAuth 2.0 Client Secret | See [Gmail Setup Guide](./mail/GMAIL_SETUP.md) |
| `GMAIL_REFRESH_TOKEN` | OAuth 2.0 refresh token for server-side access | See [Gmail Setup Guide](./mail/GMAIL_SETUP.md) |
| `GMAIL_USER_EMAIL` | The Gmail account email address | Your Gmail account email address |

⚠️ **Gmail Setup Required:** Follow the detailed [Gmail Setup Guide](./mail/GMAIL_SETUP.md) for complete OAuth2 configuration.

---

### Other Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_APP_URL` | Your application's base URL | `http://localhost:3000` (development)<br>Set to your production domain in production |

---

## Security Considerations

### ⚠️ DO NOT Commit `.env.local`

Your `.env.local` file contains sensitive information. Always:

1. **Add to `.gitignore`:**
   ```
   .env.local
   .env.*.local
   ```

2. **Never commit secrets** to version control
3. **Use environment variables in CI/CD** (GitHub Actions, etc.)
4. **Rotate keys regularly** if compromised

### Environment Variable Naming

- `NEXT_PUBLIC_*`: Exposed to the browser (use only for non-sensitive data)
- Other variables: Server-side only (sensitive keys)

---

## Development Setup Checklist

- [ ] Create `.env.local` file in the root directory
- [ ] Set up Supabase project and add credentials
- [ ] Set up Cardano wallet and add network credentials
- [ ] Set up Blockfrost account and get API key
- [ ] Set up Pinata account and get API credentials
- [ ] Set up Gmail OAuth2 and get credentials (see [GMAIL_SETUP.md](../mail/GMAIL_SETUP.md))
- [ ] Verify all variables are set correctly
- [ ] Test the application locally

---

## Testing Your Setup

To verify your environment variables are loaded correctly:

1. Run the development server:
   ```bash
   npm run dev
   ```

2. Check for any error messages related to missing environment variables

3. Verify API connections are working by testing key features:
   - Supabase: User authentication
   - Blockfrost: Wallet balance queries
   - Pinata: Image upload to IPFS
   - Gmail: Email sending

---

## Environment Variables by Feature

### User Authentication & Database
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### NFT Minting & Blockchain
- `NEXT_PUBLIC_CARDANO_NETWORK`
- `NEXT_PUBLIC_BLOCKFROST_KEY`
- `NEXT_PUBLIC_ADMIN_PKH`
- `NEXT_PUBLIC_ADMIN_ADDRESS`

### NFT Metadata Storage (IPFS)
- `PINATA_API_KEY`
- `PINATA_API_SECRET`
- `PINATA_JWT`

### Email Notifications
- `GMAIL_CLIENT_ID`
- `GMAIL_CLIENT_SECRET`
- `GMAIL_REFRESH_TOKEN`
- `GMAIL_USER_EMAIL`

### Application
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_CARDANOSCAN_URL`

---

## Troubleshooting

### "Environment variable not found" errors
- Verify all required variables are in `.env.local`
- Restart the development server after adding variables
- Check spelling and variable names

### API connection failures
- Verify API keys are correct and not expired
- Check network connectivity
- For Pinata JWT, generate a new token if expired
- For Gmail, verify refresh token is valid

### CORS/Access errors
- Ensure Supabase URL is correct
- Verify the anonimous key has proper permissions
- Check Blockfrost key is for the correct network

---

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Cardano Developer Portal](https://developers.cardano.org/)
- [Blockfrost API Docs](https://docs.blockfrost.io/)
- [Pinata Documentation](https://docs.pinata.cloud/)
- [Gmail API Documentation](https://developers.google.com/gmail/api/guides)
- [Gmail Setup Guide](./mail/GMAIL_SETUP.md)

---

## Support

If you encounter issues:
1. Check the relevant service's documentation
2. Verify all credentials are correct
3. Ensure you have account access to each service
4. Check the troubleshooting section above
