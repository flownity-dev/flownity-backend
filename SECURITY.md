# Security Guidelines

## Environment Variables

### Critical Security Requirements

1. **Never commit `.env` files to version control**
2. **Use strong, unique secrets for production**
3. **Rotate credentials regularly**
4. **Use different credentials for each environment**

### Required Environment Variables

#### JWT Configuration
- `JWT_SECRET`: Must be at least 32 characters, cryptographically random
- `JWT_EXPIRES_IN`: Token expiration time (recommended: 24h or less)

#### OAuth Credentials
- `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`: From GitHub Developer Settings
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`: From Google Cloud Console

#### Database Configuration
- `DATABASE_HOST`: Database server hostname
- `DATABASE_NAME`: Database name
- `DATABASE_USER`: Database username
- `DATABASE_PASSWORD`: Strong database password

### Production Deployment

1. **Use environment-specific configuration management**
2. **Store secrets in secure vaults (AWS Secrets Manager, Azure Key Vault, etc.)**
3. **Enable database SSL/TLS connections**
4. **Use connection pooling with proper limits**
5. **Implement proper logging without exposing sensitive data**

### Development Setup

1. Copy `.env.example` to `.env`
2. Fill in your development credentials
3. Never use production credentials in development
4. Use different OAuth apps for development

## Security Best Practices

### Authentication
- OAuth 2.0 with PKCE when possible
- Secure session configuration
- Proper CSRF protection
- Rate limiting on auth endpoints

### Database Security
- Use parameterized queries (already implemented)
- Enable connection encryption
- Regular security updates
- Principle of least privilege for database users

### Error Handling
- Never expose internal errors to clients
- Log security events appropriately
- Implement proper error boundaries

## Incident Response

If credentials are compromised:
1. Immediately rotate all affected credentials
2. Review access logs for unauthorized activity
3. Update all deployment environments
4. Notify relevant stakeholders