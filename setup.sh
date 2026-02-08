#!/bin/bash

# ABETWORKS WORKCRM Setup Script

set -e  # Exit immediately if a command exits with a non-zero status

echo "==========================================="
echo "ABETWORKS WORKCRM Setup Script"
echo "==========================================="

# Function to check if a command exists
command_exists() {
    command -v "$@" > /dev/null 2>&1
}

# Check prerequisites
echo "Checking prerequisites..."

if ! command_exists docker; then
    echo "Error: Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command_exists docker-compose; then
    echo "Error: Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "✓ Docker is installed"
echo "✓ Docker Compose is installed"

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cat > .env << EOF
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
JWT_SECRET=$(openssl rand -hex 32)
REFRESH_JWT_SECRET=$(openssl rand -hex 32)

# Redis Configuration
REDIS_URL=redis://redis:6379

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
SMTP_FROM=noreply@abetworks.com

# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_signing_secret

# Backup Configuration
BACKUP_RETENTION_DAYS=30
BACKUP_DIRECTORY=/backups
BACKUP_INTERVAL_HOURS=24

# Security
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
EOF
    echo "✓ Created .env file with default values (please update with your actual values)"
else
    echo "✓ Using existing .env file"
fi

# Build and start the services
echo "Building and starting services..."
docker-compose up --build -d

echo "Waiting for services to start..."
sleep 30

# Run database setup
echo "Running database setup..."
docker-compose exec app npm run db:setup || echo "Note: db:setup command may not exist in this version"

echo ""
echo "==========================================="
echo "Setup Complete!"
echo "==========================================="
echo ""
echo "Your ABETWORKS WORKCRM instance is now running!"
echo ""
echo "Access the application at: http://localhost:3000"
echo ""
echo "Default Super Admin Credentials:"
echo "  Email: superadmin@abetworks.com"
echo "  Password: SuperAdmin2023!"
echo "  Role: abetworks_super_admin"
echo ""
echo "Important: Change the default password immediately after first login!"
echo ""
echo "To view logs: docker-compose logs -f"
echo "To stop: docker-compose down"
echo "To restart: docker-compose restart"
echo ""