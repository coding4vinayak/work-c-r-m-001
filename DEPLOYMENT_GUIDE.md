# ABETWORKS WORKCRM - Production Deployment Guide

## Overview
This document outlines the complete setup for deploying ABETWORKS WORKCRM in production environments with Docker, PostgreSQL, Redis, and all necessary configurations.

## Prerequisites
- Docker and Docker Compose installed
- Domain name configured for your CRM
- SSL certificate (recommended for production)

## Quick Start

### 1. Clone and Setup
```bash
git clone https://github.com/your-org/abetworks-workcrm.git
cd abetworks-workcrm
```

### 2. Environment Configuration
Copy the example environment file and customize it:
```bash
cp .env.example .env
```

Edit the `.env` file with your specific configurations:
- Database credentials
- JWT secrets
- SMTP settings
- Stripe API keys
- etc.

### 3. Docker Setup
Build and start the services:
```bash
docker-compose up --build -d
```

### 4. Initial Setup
Run the initial database setup:
```bash
docker-compose exec app npm run db:setup
```

## Environment Variables (.env)

```env
# Server Configuration
PORT=3000
NODE_ENV=production

# Database Configuration
DB_HOST=db
DB_PORT=5432
DB_NAME=abetworks_workcrm
DB_USER=postgres
DB_PASSWORD=your_secure_password
DATABASE_URL=postgresql://postgres:your_secure_password@db:5432/abetworks_workcrm

# JWT Configuration
JWT_SECRET=your_very_long_and_secure_jwt_secret_here_make_it_random_and_complex
JWT_EXPIRES_IN=24h
REFRESH_JWT_SECRET=your_refresh_token_secret_different_from_main_secret

# Redis Configuration
REDIS_URL=redis://redis:6379

# Email Configuration
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
SMTP_FROM=noreply@yourdomain.com

# Stripe Configuration
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_signing_secret

# Encryption (optional)
ENCRYPTION_KEY=your_32_character_encryption_key_for_sensitive_data

# Backup Configuration
BACKUP_RETENTION_DAYS=30
BACKUP_DIRECTORY=/backups
BACKUP_INTERVAL_HOURS=24

# Security
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## Docker Compose Setup

The system includes:
- Application server (Node.js)
- PostgreSQL database
- Redis cache
- Nginx reverse proxy (optional)
- Backup service

## Super Admin Account

After initial setup, a super admin account will be created automatically:
- Email: `superadmin@abetworks.com`
- Temporary password: `SuperAdmin2023!`
- Role: `abetworks_super_admin`

**Important**: Change the default password immediately after first login!

## Production Considerations

1. **SSL/TLS**: Use a reverse proxy (nginx/Apache) with SSL termination
2. **Monitoring**: Set up health checks and monitoring
3. **Backups**: Regular automated backups are configured
4. **Security**: Keep dependencies updated and monitor for vulnerabilities
5. **Scaling**: The application supports horizontal scaling

## Troubleshooting

Common issues and solutions:
- Database connection issues: Verify DB_HOST and credentials
- Authentication problems: Check JWT_SECRET consistency
- Email delivery: Verify SMTP settings
- Performance: Monitor Redis and DB connections

For support, contact the ABETWORKS team or refer to the documentation.
```