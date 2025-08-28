# Security Setup Guide

## 🚨 CRITICAL: Environment Variables Setup

**NEVER commit real credentials to version control!**

### 1. Environment File Setup

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Replace ALL placeholder values with real credentials:
   - `JWT_SECRET`: Generate a strong 32+ character secret
   - `GITHUB_CLIENT_ID` & `GITHUB_CLIENT_SECRET`: From GitHub OAuth App
   - `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET`: From Google Cloud Console
   - Database credentials: From your PostgreSQL provider

### 2. Generate Secure JWT Secret

```bash
# Generate a secure random secret (32 bytes)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. OAuth App Setup

#### GitHub OAuth App:
1. Go to GitHub Settings > Developer settings > OAuth Apps
2. Create new OAuth App
3. Set Authorization callback URL: `http://localhost:3000/auth/github/callback`
4. Copy Client ID and Client Secret to `.env`

#### Google OAuth App:
1. Go to Google Cloud Console > APIs & Services > Credentials
2. Create OAuth 2.0 Client ID
3. Set Authorized redirect URI: `http://localhost:3000/auth/google/callback`
4. Copy Client ID and Client Secret to `.env`

### 4. Database Security

- Use strong passwords (16+ characters with mixed case, numbers, symbols)
- Enable SSL/TLS connections in production
- Restrict database access by IP if possible
- Use connection pooling (already implemented)

### 5. Production Deployment

- Use environment variables or secure secret management
- Never use `.env` files in production
- Rotate secrets regularly
- Monitor for credential exposure

## 🔍 Security Checklist

- [ ] `.env` contains only placeholder values
- [ ] Real credentials stored securely outside version control
- [ ] JWT secret is cryptographically strong (32+ bytes)
- [ ] OAuth apps configured with correct callback URLs
- [ ] Database uses strong authentication
- [ ] Production uses secure secret management