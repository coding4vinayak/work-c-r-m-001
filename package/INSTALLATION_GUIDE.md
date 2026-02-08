# ABETWORKS WORKCRM - Complete Application Package

## Overview
This package contains the complete ABETWORKS WORKCRM application with all enterprise-grade features:
- Multi-tenant CRM system
- Data preservation with soft deletes
- Comprehensive monitoring and metrics
- Distributed tracing
- Circuit breakers for external services
- Rate limiting and security measures
- Redis caching layer
- Automated backup and disaster recovery
- Structured logging system

## Prerequisites
- Docker (https://docs.docker.com/get-docker/)
- Docker Compose (usually included with Docker Desktop)

## Installation & Setup

### On Windows:
1. Double-click `build-package.bat` to create the package
2. Navigate to the package directory
3. Run: `docker-compose -f docker-compose-full.yml up -d`

### On Linux/macOS:
1. Run: `chmod +x build-package.sh`
2. Run: `./build-package.sh`
3. Navigate to the package directory
4. Run: `docker-compose -f docker-compose-full.yml up -d`

### Manual Setup:
1. Extract this package to a directory
2. Run: `docker-compose -f docker-compose-full.yml up -d`

## Access Points

### Application
- Main Application: http://localhost:3000
- Dashboard: http://localhost:3000/index.html
- Health Check: http://localhost:3000/health
- Metrics: http://localhost:3000/metrics

### Monitoring & Debugging
- Grafana Dashboard: http://localhost:3001 (admin/admin)
- Jaeger Tracing: http://localhost:16686
- Prometheus: http://localhost:9090
- MailHog (for email testing): http://localhost:8025

### API Endpoints
- Customers: http://localhost:3000/api/customers
- Leads: http://localhost:3000/api/leads
- Deals: http://localhost:3000/api/deals
- Tasks: http://localhost:3000/api/tasks
- Quotes: http://localhost:3000/api/quotes
- Invoices: http://localhost:3000/api/invoices

## Services Included
- **App**: Main ABETWORKS WORKCRM application
- **PostgreSQL**: Database for storing CRM data
- **Redis**: Caching and session management
- **Jaeger**: Distributed tracing
- **Prometheus**: Metrics collection
- **Grafana**: Metrics visualization
- **MailHog**: Email testing server

## Enterprise Features Active
- Data preservation with soft deletes and audit trails
- Rate limiting and security measures
- Distributed tracing for request flows
- Comprehensive monitoring and alerting
- Automated backup and disaster recovery
- Redis caching for improved performance
- Circuit breakers for external service calls
- Structured logging with correlation IDs

## Configuration
All environment variables are preconfigured in the docker-compose file. For production use, update the following in docker-compose-full.yml:
- JWT_SECRET: Use a strong, random secret
- DB_PASSWORD: Change the database password
- ENCRYPTION_KEY: Use a strong encryption key
- Other sensitive configuration values

## Troubleshooting
- If services don't start, check logs with: `docker-compose -f docker-compose-full.yml logs -f`
- Make sure ports 3000, 3001, 5432, 6379, 8025, 9090, 16686 are available
- Ensure Docker has sufficient resources allocated

## Stopping the Application
Run: `docker-compose -f docker-compose-full.yml down`

## Data Persistence
- Database data persists in the postgres_data volume
- Redis data persists in the redis_data volume
- Application logs and backups are stored in the ./backups directory

Enjoy your enterprise-grade CRM solution!