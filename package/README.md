# ABETWORKS WORKCRM - Enterprise-Grade Multi-Tenant CRM Platform

## Overview

ABETWORKS WORKCRM is a comprehensive, enterprise-grade multi-tenant CRM SaaS platform built on the original Duralux admin template. The platform has been enhanced with advanced CRM functionality and enterprise-grade features including data preservation, monitoring, security, and operational excellence.

## Key Features

### CRM Functionality
- **Customers**: Comprehensive customer management with categories, activities, and lead scoring
- **Leads**: Lead tracking with sources, assignment, and status management
- **Deals**: Deal pipeline management with stages, probabilities, and forecasting
- **Tasks**: Task management with categories, priorities, and assignments
- **Quotes & Invoices**: Complete quoting and invoicing system
- **Reports**: Comprehensive analytics and reporting

### Enterprise-Grade Features
- **Multi-Tenant Architecture**: Complete data isolation with PostgreSQL row-level security
- **Data Preservation**: Soft deletes with audit trails and recovery procedures
- **Monitoring & Metrics**: Prometheus integration with custom metrics
- **Distributed Tracing**: OpenTelemetry for request flow tracking
- **Circuit Breakers**: For external service resilience
- **Rate Limiting**: API throttling and security measures
- **Caching Layer**: Redis-based caching system
- **Backup & Recovery**: Automated backup procedures
- **Structured Logging**: Comprehensive logging with correlation IDs
- **Security Measures**: Authentication, authorization, and tenant isolation

## Architecture

### Technology Stack
- **Backend**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL with row-level security
- **Caching**: Redis
- **Authentication**: JWT with Passport.js
- **Authorization**: Role-based access control
- **Real-time**: Socket.IO
- **File Upload**: Multer with AWS S3
- **Email**: Nodemailer with SendGrid
- **Payment**: Stripe API
- **Validation**: Joi or Class-validator
- **Logging**: Winston with Morgan
- **Testing**: Jest and Supertest
- **Documentation**: Swagger/OpenAPI

### Multi-Tenant Architecture
- **Single Database with Row-Level Security** (Recommended)
  - All client companies share one database
  - Tenant isolation via tenant_id column and RLS
  - Cost-effective and easy to maintain
  - Requires careful attention to security

## Setup Instructions

### Prerequisites
- Docker and Docker Compose
- At least 4GB RAM and 2 CPU cores
- Administrative privileges

### Quick Start with Docker

1. **Clone or extract the package**
2. **Navigate to the project directory**
3. **Start all services**:
   ```bash
   docker-compose up -d
   ```
4. **Access the application**:
   - Main Application: http://localhost:3000
   - Dashboard: http://localhost:3000/index.html

### Manual Setup

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Set up Environment Variables**:
   - Copy `.env.example` to `.env`
   - Update database and service credentials

3. **Install and Start PostgreSQL**:
   - Follow the setup guide in SETUP_GUIDE.md

4. **Install and Start Redis**:
   - Follow the setup guide in SETUP_GUIDE.md

5. **Run Database Migrations**:
   ```bash
   npm run migrate
   ```

6. **Start the Application**:
   ```bash
   npm run dev
   ```

## Configuration

### Environment Variables

Key configuration options in `.env`:

```
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=abetworks_workcrm
DB_USER=postgres
DB_PASSWORD=password

# Redis Configuration
REDIS_URL=redis://localhost:6379

# Security
JWT_SECRET=your-super-secret-jwt-key-here-make-it-long-and-random
STRIPE_SECRET_KEY=your_stripe_secret_key

# Monitoring
OTEL_EXPORTER_OTLP_ENDPOINT=http://jaeger:4318/v1/traces
LOG_LEVEL=info
```

### Enterprise Features Configuration

- **Data Preservation**: Enabled by default, configurable via `SOFT_DELETE_ENABLED`
- **Audit Logging**: Enabled via `AUDIT_LOGGING_ENABLED`
- **Rate Limiting**: Configured in middleware
- **Caching**: Managed via Redis configuration
- **Backup**: Automated via `BACKUP_INTERVAL_HOURS`

## Access Points

### Application
- **Main Application**: http://localhost:3000
- **Dashboard**: http://localhost:3000/index.html
- **Health Check**: http://localhost:3000/health
- **Metrics**: http://localhost:3000/metrics

### Monitoring & Debugging
- **Grafana Dashboard**: http://localhost:3001 (admin/admin)
- **Jaeger Tracing**: http://localhost:16686
- **Prometheus**: http://localhost:9090
- **MailHog (for email testing)**: http://localhost:8025

### API Endpoints
- **Customers**: http://localhost:3000/api/customers
- **Leads**: http://localhost:3000/api/leads
- **Deals**: http://localhost:3000/api/deals
- **Tasks**: http://localhost:3000/api/tasks
- **Quotes**: http://localhost:3000/api/quotes
- **Invoices**: http://localhost:3000/api/invoices

## Enterprise Features

### Data Preservation
- **Soft Deletes**: Records are marked for deletion instead of being permanently removed
- **Audit Trails**: All data modifications are logged with user context
- **Recovery Procedures**: Soft-deleted records can be restored
- **Retention Policies**: Configurable retention periods with automatic cleanup

### Security & Compliance
- **Tenant Isolation**: Row-level security ensures data separation
- **Role-Based Access Control**: Different permissions for different user roles
- **Rate Limiting**: Protection against abuse and DDoS attacks
- **Input Validation**: Protection against injection attacks

### Monitoring & Observability
- **Metrics Collection**: Custom metrics for business and technical KPIs
- **Distributed Tracing**: End-to-end request tracking
- **Structured Logging**: Correlation IDs for debugging
- **Health Checks**: Liveness and readiness probes

### Performance & Scalability
- **Caching Layer**: Redis-based caching for improved performance
- **Connection Pooling**: Optimized database connection management
- **Load Balancing**: Ready for horizontal scaling
- **CDN Integration**: Asset delivery optimization

## Deployment

### Production Deployment
1. Update environment variables with production values
2. Set `NODE_ENV=production` in `.env`
3. Configure SSL certificates
4. Set up domain and DNS
5. Deploy with Docker Compose or your preferred platform

### Scaling Recommendations
- Use multiple application instances behind a load balancer
- Implement database read replicas for analytics
- Configure Redis clustering for high availability
- Set up CDN for static assets

## Support & Maintenance

### Documentation
- **Setup Guide**: SETUP_GUIDE.md
- **Data Preservation**: DATA_PRESERVATION_GUIDE.md
- **Installation**: INSTALLATION_GUIDE.md
- **Architecture**: BACKEND_DOCUMENTATION.md

### Troubleshooting
- Check Docker container logs: `docker-compose logs -f`
- Verify service health: `docker-compose ps`
- Monitor resource usage
- Check application logs for errors

## License

This project is licensed under the MIT License.

---

For additional support, please refer to the included documentation files or contact the development team.