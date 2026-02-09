#!/bin/bash

# ABETWORKS WORKCRM Docker Startup Script

set -e  # Exit on any error

echo "🚀 Starting ABETWORKS WORKCRM Docker Environment..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if docker-compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "⚠️  Docker Compose not found. Trying 'docker compose' (Docker Desktop v2.0.0.0+)"
    if command -v docker &> /dev/null; then
        alias docker-compose='docker compose'
    else
        echo "❌ Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
fi

echo "✅ Docker and Docker Compose are available."

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from example..."
    cp .env.example .env
    echo "✅ .env file created. Please review and customize it as needed."
fi

# Build and start the services
echo "🏗️  Building and starting Docker services..."
docker-compose up --build -d

echo "⏳ Waiting for services to start..."
sleep 10

# Check if services are running
echo "🔍 Checking service status..."
docker-compose ps

echo "📋 Checking logs for any issues..."
docker-compose logs app | tail -20

echo ""
echo "🎉 ABETWORKS WORKCRM Docker Environment Started Successfully!"
echo ""
echo "🌐 Access the application at: http://localhost:3000"
echo "🗄️  Database: PostgreSQL on port 5432"
echo ".Redis: Redis on port 6379"
echo "☁️  File Storage: MinIO at http://localhost:9000 (console: http://localhost:9001)"
echo "👥 MinIO Credentials: minioaccesskey / miniosecretkey"
echo ""
echo "🛠️  Useful commands:"
echo "   docker-compose logs -f app    # View application logs"
echo "   docker-compose logs -f worker # View worker logs"
echo "   docker-compose down           # Stop all services"
echo "   docker-compose restart        # Restart all services"
echo ""
echo "💡 Tip: Check the logs for any initialization messages or errors."