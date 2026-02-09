# ABETWORKS WORKCRM - Docker Setup Guide

## 🚀 Overview

This document describes how to deploy the ABETWORKS WORKCRM application using Docker containers with PostgreSQL, Redis, MinIO, and background workers.

## 🏗️ Architecture

The Docker setup includes:

- **App**: Main application server (Express.js + Node.js)
- **DB**: PostgreSQL database for data storage
- **Redis**: Caching and session storage
- **MinIO**: S3-compatible object storage for files
- **Worker**: Background job processor

## 📋 Prerequisites

- Docker Engine (v20.10.0 or higher)
- Docker Compose (v2.0.0 or higher)

## 🚀 Quick Start

### 1. Clone and Navigate
```bash
cd /path/to/abetworks-workcrm
```

### 2. Start the Services
```bash
./start-docker.sh
```

### 3. Access the Application
- **Application**: http://localhost:3000
- **MinIO Console**: http://localhost:9001 (credentials: minioaccesskey / miniosecretkey)

## 🏗️ Docker Services

### App Service
- Runs the main ABETWORKS WORKCRM application
- Port: 3000
- Built from the current directory

### Database Service (PostgreSQL)
- Image: postgres:15-alpine
- Port: 5432
- Data persisted in `postgres_data` volume
- Initialized with `init-db.sql`

### Cache Service (Redis)
- Image: redis:7-alpine
- Port: 6379
- Data persisted in `redis_data` volume

### File Storage (MinIO)
- Image: minio/minio
- Ports: 9000 (API), 9001 (Console)
- Data persisted in `minio_data` volume
- S3-compatible storage

### Worker Service
- Runs background jobs using BullMQ
- Processes customer sync, lead processing, email notifications, and file operations
- Connected to same DB, Redis, and MinIO as main app

## 📁 Volume Mounts

- `postgres_data`: PostgreSQL data persistence
- `redis_data`: Redis data persistence
- `minio_data`: Object storage data
- `uploads`: Application uploads directory

## 🔧 Environment Configuration

The application uses the following environment variables:

### Database
- `DB_HOST`: Database hostname (default: db)
- `DB_PORT`: Database port (default: 5432)
- `DB_NAME`: Database name (default: abetworks_workcrm)
- `DB_USER`: Database user (default: postgres)
- `DB_PASSWORD`: Database password (default: postgres)

### Redis
- `REDIS_URL`: Redis connection URL (default: redis://redis:6379)

### MinIO
- `MINIO_ENDPOINT`: MinIO endpoint (default: minio)
- `MINIO_PORT`: MinIO port (default: 9000)
- `MINIO_ACCESS_KEY`: MinIO access key
- `MINIO_SECRET_KEY`: MinIO secret key

### JWT
- `JWT_SECRET`: Secret key for JWT tokens

## 🛠️ Management Commands

### View Logs
```bash
# Application logs
docker-compose logs -f app

# Worker logs
docker-compose logs -f worker

# All logs
docker-compose logs -f
```

### Stop Services
```bash
docker-compose down
```

### Restart Services
```bash
docker-compose restart
```

### Scale Workers
```bash
docker-compose up --scale worker=3 -d
```

### Access Container Shell
```bash
# App container
docker-compose exec app sh

# Database container
docker-compose exec db psql -U postgres

# Redis container
docker-compose exec redis redis-cli
```

## 🧪 Health Checks

The application includes health check endpoints:
- `/health`: Overall health status
- `/live`: Liveness probe
- `/ready`: Readiness probe
- `/metrics`: Prometheus metrics

## 🔒 Security Considerations

- Change default passwords in `.env` file
- Use HTTPS in production
- Configure firewall rules appropriately
- Regular security updates for base images

## 📊 Monitoring

The system includes:
- Application logging via Winston
- Metrics collection via Prometheus
- Health check endpoints
- Distributed tracing via OpenTelemetry

## 🚀 Production Deployment

For production deployment:

1. Customize the `.env` file with secure values
2. Set up SSL certificates
3. Configure load balancing
4. Set up monitoring and alerting
5. Implement backup strategies

## 🐛 Troubleshooting

### Common Issues

**Port Already in Use**
- Check if services are already running: `docker-compose ps`
- Stop conflicting services or change ports in `docker-compose.yml`

**Database Initialization Errors**
- Check database logs: `docker-compose logs db`
- Ensure `init-db.sql` has proper permissions

**Redis Connection Issues**
- Verify Redis is running: `docker-compose ps redis`
- Check Redis logs: `docker-compose logs redis`

**MinIO Access Issues**
- Verify credentials in `.env` file
- Check MinIO console at http://localhost:9001

## 🤝 Support

For support, please contact the ABETWORKS team or submit an issue on GitHub.