# ABETWORKS WORKCRM

A comprehensive, multi-tenant CRM SaaS platform built with Node.js, TypeScript, and PostgreSQL.

## Features

- **Multi-tenant architecture** with secure data isolation
- **Complete CRM functionality**: customers, leads, deals, tasks, quotes, invoices
- **Role-based access control** with super admin, client admin, and client user roles
- **Workflow automation** engine
- **Advanced reporting** and analytics
- **File management** system
- **Notification system**
- **Payment processing** integration
- **RESTful API** with comprehensive endpoints
- **Docker-ready** for easy deployment

## Prerequisites

- Docker and Docker Compose
- Node.js (for development)
- PostgreSQL (for development, though Docker handles this in production)

## Quick Start

### Option 1: Using the Setup Script (Recommended)

On Linux/macOS:
```bash
chmod +x setup.sh
./setup.sh
```

On Windows:
```cmd
setup.bat
```

### Option 2: Manual Setup

1. Clone the repository:
```bash
git clone https://github.com/your-org/abetworks-workcrm.git
cd abetworks-workcrm
```

2. Create and configure the environment file:
```bash
cp .env.example .env
# Edit .env with your specific configurations
```

3. Build and start the services:
```bash
docker-compose up --build -d
```

4. The application will be available at `http://localhost:3000`

## Default Super Admin Account

After initial setup, a super admin account is created automatically:

- **Email**: `superadmin@abetworks.com`
- **Password**: `SuperAdmin2023!`
- **Role**: `abetworks_super_admin`

> **Important**: Change the default password immediately after first login!

## Environment Variables

The application uses the following environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Application port | 3000 |
| `NODE_ENV` | Environment mode | production |
| `DB_HOST` | Database host | db |
| `DB_PORT` | Database port | 5432 |
| `DB_NAME` | Database name | abetworks_workcrm |
| `DB_USER` | Database user | postgres |
| `DB_PASSWORD` | Database password | postgres |
| `JWT_SECRET` | JWT signing secret | (random) |
| `REDIS_URL` | Redis connection URL | redis://redis:6379 |
| `SMTP_HOST` | SMTP server host | smtp.gmail.com |
| `SMTP_PORT` | SMTP server port | 587 |
| `STRIPE_SECRET_KEY` | Stripe secret key | (required for payments) |

## API Endpoints

The application provides comprehensive API endpoints:

- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/customers` - Get customers
- `POST /api/customers` - Create customer
- `GET /api/leads` - Get leads
- `POST /api/leads` - Create lead
- `GET /api/deals` - Get deals
- `POST /api/deals` - Create deal
- `GET /api/tasks` - Get tasks
- `POST /api/tasks` - Create task
- `GET /api/products` - Get products
- `POST /api/products` - Create product
- `GET /api/quotes` - Get quotes
- `POST /api/quotes` - Create quote
- `GET /api/invoices` - Get invoices
- `POST /api/invoices` - Create invoice
- `GET /api/payments` - Get payments
- `POST /api/payments` - Create payment
- `GET /api/users` - Get users
- `POST /api/users` - Create user
- `GET /api/settings` - Get settings
- `PUT /api/settings` - Update settings
- `GET /api/notifications` - Get notifications
- `GET /api/files` - Get files
- `POST /api/files` - Upload file
- `GET /api/reports/dashboard` - Get dashboard analytics
- `GET /api/workflows` - Get workflows
- `POST /api/workflows` - Create workflow

## Architecture

The application follows a multi-tier architecture:

- **Presentation Layer**: REST API with Express.js
- **Business Logic Layer**: Service classes with business rules
- **Data Access Layer**: PostgreSQL with row-level security
- **Infrastructure Layer**: Docker containers for all services

## Database Schema

The application uses a multi-tenant schema with:

- `public.tenants` - Stores tenant information
- `public.users` - Stores user accounts with tenant associations
- `tenant_data.*` - Tenant-specific data tables with row-level security

## Security

- JWT-based authentication
- Password hashing with bcrypt
- Input validation and sanitization
- SQL injection prevention
- XSS protection
- Rate limiting
- Multi-tenant data isolation with PostgreSQL RLS

## Development

To run the application in development mode:

1. Install dependencies:
```bash
npm install
```

2. Set up the database:
```bash
npm run db:setup
```

3. Start the development server:
```bash
npm run dev
```

## Production Deployment

For production deployment:

1. Use the provided `docker-compose.yml`
2. Configure SSL with a reverse proxy (nginx/Apache)
3. Set up proper environment variables
4. Configure backup strategies
5. Set up monitoring and logging

## Support

For support, please contact the ABETWORKS team or submit an issue on GitHub.

## License

This project is licensed under the MIT License.