# ABETWORKS WORKCRM - Setup Guide for PostgreSQL, Redis, and Monitoring

This guide provides detailed instructions for setting up PostgreSQL, Redis, and monitoring services for the ABETWORKS WORKCRM application.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [PostgreSQL Setup](#postgresql-setup)
3. [Redis Setup](#redis-setup)
4. [Monitoring Setup](#monitoring-setup)
5. [Environment Configuration](#environment-configuration)
6. [Running the Application](#running-the-application)
7. [Troubleshooting](#troubleshooting)

## Prerequisites

Before starting, ensure you have:
- Docker and Docker Compose installed (recommended)
- Git (for cloning if needed)
- At least 4GB RAM and 2 CPU cores for optimal performance
- Administrative privileges for installing services

## PostgreSQL Setup

### Option 1: Using Docker (Recommended)
The docker-compose.yml file includes PostgreSQL configuration:

```yaml
  postgres:
    image: postgres:15
    environment:
      - POSTGRES_DB=abetworks_workcrm
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./comprehensive_database_schema.sql:/docker-entrypoint-initdb.d/init.sql
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
```

### Option 2: Manual Installation

1. **Download PostgreSQL**:
   - Visit https://www.postgresql.org/download/
   - Choose your operating system
   - Download and install PostgreSQL

2. **Configure PostgreSQL**:
   - During installation, set password as 'password' (or update .env file)
   - Ensure PostgreSQL service is running
   - Create database: `CREATE DATABASE abetworks_workcrm;`
   - Create user: `CREATE USER postgres WITH PASSWORD 'password';`
   - Grant privileges: `GRANT ALL PRIVILEGES ON DATABASE abetworks_workcrm TO postgres;`

3. **Run Database Schema**:
   - Execute the comprehensive database schema:
   ```bash
   psql -U postgres -d abetworks_workcrm -f comprehensive_database_schema.sql
   ```

### PostgreSQL Configuration Options

The application supports various PostgreSQL configurations:

- **Connection Pooling**: Configured in .env file
- **SSL**: Enable with `DB_SSL=true` in .env
- **Max Connections**: Adjust `DB_POOL_MAX` in .env
- **Idle Timeout**: Configure with `DB_IDLE_TIMEOUT` in .env

## Redis Setup

### Option 1: Using Docker (Recommended)
The docker-compose.yml file includes Redis configuration:

```yaml
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 3
```

### Option 2: Manual Installation

1. **Download Redis**:
   - For Windows: https://github.com/redis-windows/redis-windows
   - For Linux/macOS: Use package manager (apt, brew, etc.)

2. **Install and Start Redis**:
   ```bash
   # Linux/macOS
   sudo apt-get install redis-server  # Ubuntu/Debian
   brew install redis  # macOS
   
   # Start Redis
   sudo systemctl start redis  # Ubuntu/Debian
   brew services start redis  # macOS
   ```

3. **Configure Redis**:
   - Default port: 6379
   - No authentication required for local development
   - For production, configure authentication and security

### Redis Configuration Options

The application uses Redis for:
- **Caching**: API response caching
- **Session Management**: User sessions
- **Rate Limiting**: API rate limiting
- **Message Queue**: Background job processing

## Monitoring Setup

### Services Included

The application includes comprehensive monitoring with:

1. **Prometheus**: Metrics collection
2. **Grafana**: Dashboard visualization
3. **Jaeger**: Distributed tracing
4. **Built-in Health Checks**: Application health monitoring

### Prometheus Configuration

Located in `prometheus.yml`:

```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'abetworks-workcrm'
    static_configs:
      - targets: ['app:3000']
    metrics_path: /metrics
    scrape_interval: 5s
```

### Grafana Configuration

- **Port**: 3001
- **Default Credentials**: admin/admin
- **Data Sources**: Prometheus (auto-configured)
- **Dashboards**: Custom dashboards for CRM metrics

### Jaeger Configuration

- **Port**: 16686
- **Purpose**: Distributed tracing for request flows
- **Integration**: OpenTelemetry automatically sends traces

## Environment Configuration

Update the `.env` file with your specific settings:

### Database Configuration
```
DB_HOST=localhost          # PostgreSQL host
DB_PORT=5432              # PostgreSQL port
DB_NAME=abetworks_workcrm # Database name
DB_USER=postgres          # Database user
DB_PASSWORD=password      # Database password
```

### Redis Configuration
```
REDIS_URL=redis://localhost:6379  # Redis connection URL
```

### Security Configuration
```
JWT_SECRET=your-super-secret-jwt-key-here-make-it-long-and-random  # JWT signing key
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here             # Payment processing
```

### Monitoring Configuration
```
OTEL_EXPORTER_OTLP_ENDPOINT=http://jaeger:4318/v1/traces  # Tracing endpoint
LOG_LEVEL=info                                           # Logging level
```

## Running the Application

### Using Docker Compose (Recommended)

1. **Navigate to the project directory**
2. **Start all services**:
   ```bash
   docker-compose up -d
   ```
3. **Check service status**:
   ```bash
   docker-compose ps
   ```
4. **View logs**:
   ```bash
   docker-compose logs -f app
   ```

### Access Points

- **Application**: http://localhost:3000
- **Dashboard**: http://localhost:3000/index.html
- **Health Check**: http://localhost:3000/health
- **Metrics**: http://localhost:3000/metrics
- **Grafana**: http://localhost:3001
- **Jaeger**: http://localhost:16686
- **MailHog**: http://localhost:8025

## Troubleshooting

### Common Issues

1. **Database Connection Errors**:
   - Verify PostgreSQL is running
   - Check credentials in .env file
   - Ensure database schema is applied

2. **Redis Connection Errors**:
   - Verify Redis is running
   - Check Redis URL in .env file
   - Ensure Redis port is accessible

3. **Application Won't Start**:
   - Check logs: `docker-compose logs app`
   - Verify all environment variables are set
   - Ensure required services are running

4. **Monitoring Services Not Working**:
   - Check if Prometheus/Grafana/Jaeger containers are running
   - Verify network connectivity between services
   - Check configuration files

### Health Check Endpoints

- **Overall Health**: GET /health
- **Liveness Probe**: GET /live
- **Readiness Probe**: GET /ready
- **Metrics**: GET /metrics

### Log Locations

- **Application Logs**: stdout/stderr (visible in docker logs)
- **Database Logs**: PostgreSQL logs
- **Redis Logs**: Redis logs
- **System Metrics**: Prometheus data

## Production Considerations

### Security
- Use strong passwords for PostgreSQL and Redis
- Enable SSL/TLS for database connections
- Use environment variables for secrets
- Implement proper firewall rules

### Performance
- Adjust connection pool sizes based on load
- Configure Redis memory limits
- Set up database indexing
- Monitor resource usage

### Backup and Recovery
- Regular database backups
- Redis persistence configuration
- Automated backup schedules
- Disaster recovery procedures

### Scaling
- Horizontal scaling for application instances
- Database read replicas
- Redis clustering
- Load balancing configuration

For additional support, refer to the documentation files included in the package or contact the development team.