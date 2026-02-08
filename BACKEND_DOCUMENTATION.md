# ABETWORKS WORKCRM - Backend Implementation

This backend serves the existing Duralux admin template frontend with comprehensive CRM functionality and multi-tenancy support.

## Overview

The backend provides a complete CRM API that integrates with the existing Duralux admin template HTML pages. The original template has been enhanced to work with a multi-tenant CRM system.

## Multi-Tenant Architecture

The system implements a robust multi-tenancy model:
- Each client company gets their own isolated data space
- Row-level security in PostgreSQL ensures data isolation
- Tenant identification via subdomain or headers
- Role-based access control (Super Admin, Client Admin, Client User)

## API Endpoints

### Customer Management
- `GET /api/customers` - Retrieve all customers for the current tenant
- `POST /api/customers` - Create a new customer
- `GET /api/customers/:id` - Retrieve a specific customer
- `PUT /api/customers/:id` - Update a customer
- `DELETE /api/customers/:id` - Delete a customer
- `GET /api/customers/categories` - Get customer categories

### Lead Management
- `GET /api/leads` - Retrieve all leads for the current tenant
- `POST /api/leads` - Create a new lead
- `GET /api/leads/:id` - Retrieve a specific lead
- `PUT /api/leads/:id` - Update a lead
- `DELETE /api/leads/:id` - Delete a lead
- `GET /api/leads/sources` - Get lead sources

### Deal Management
- `GET /api/deals` - Retrieve all deals for the current tenant
- `POST /api/deals` - Create a new deal
- `GET /api/deals/:id` - Retrieve a specific deal
- `PUT /api/deals/:id` - Update a deal
- `DELETE /api/deals/:id` - Delete a deal
- `GET /api/deals/stages` - Get deal stages

### Task Management
- `GET /api/tasks` - Retrieve all tasks for the current tenant
- `POST /api/tasks` - Create a new task
- `GET /api/tasks/:id` - Retrieve a specific task
- `PUT /api/tasks/:id` - Update a task
- `DELETE /api/tasks/:id` - Delete a task
- `PUT /api/tasks/:id/complete` - Mark task as completed
- `PUT /api/tasks/:id/uncomplete` - Mark task as incomplete
- `GET /api/tasks/categories` - Get task categories

### Quote Management
- `GET /api/quotes` - Retrieve all quotes for the current tenant
- `POST /api/quotes` - Create a new quote
- `GET /api/quotes/:id` - Retrieve a specific quote
- `PUT /api/quotes/:id` - Update a quote
- `DELETE /api/quotes/:id` - Delete a quote
- `PUT /api/quotes/:id/status` - Update quote status
- `GET /api/quotes/products` - Get products for quotes

### Invoice Management
- `GET /api/invoices` - Retrieve all invoices for the current tenant
- `POST /api/invoices` - Create a new invoice
- `GET /api/invoices/:id` - Retrieve a specific invoice
- `PUT /api/invoices/:id` - Update an invoice
- `DELETE /api/invoices/:id` - Delete an invoice
- `PUT /api/invoices/:id/status` - Update invoice status
- `POST /api/invoices/:id/payments` - Record payment for invoice
- `GET /api/invoices/:id/payments` - Get payments for invoice

## Integration with Existing Frontend

The existing Duralux admin template HTML pages have been enhanced to work with the backend API:

### Pages Integration:
- **index.html** → Dashboard with CRM analytics
- **customers.html** → GET /api/customers
- **customers-create.html** → POST /api/customers
- **customers-view.html** → GET /api/customers/:id
- **leads.html** → GET /api/leads
- **leads-create.html** → POST /api/leads
- **leads-view.html** → GET /api/leads/:id
- **projects.html** → GET /api/deals (Deals/Pipeline)
- **projects-create.html** → POST /api/deals
- **projects-view.html** → GET /api/deals/:id
- **apps-tasks.html** → GET /api/tasks
- **proposal.html** → GET /api/quotes
- **proposal-create.html** → POST /api/quotes
- **invoice-view.html** → GET /api/invoices
- **analytics.html** → GET /api/analytics
- **reports-*.html** → GET /api/reports/*

## Security Features

- JWT-based authentication with tenant context
- Row-level security in PostgreSQL
- Input validation and sanitization
- Rate limiting for API endpoints
- Secure password hashing with bcrypt
- CORS configuration for frontend integration

## Logging & Metrics

- Comprehensive request/response logging
- Performance metrics tracking
- Error tracking and alerting
- Tenant usage analytics
- API usage statistics

## Testing

The backend includes comprehensive test coverage:
- Unit tests for all controllers
- Integration tests for API endpoints
- Multi-tenancy isolation tests
- Database transaction tests

Run tests with:
```bash
npm test
npm run test:unit
npm run test:integration
npm run test:coverage
```

## Setup

1. Install dependencies: `npm install`
2. Set up PostgreSQL database with the comprehensive schema
3. Create `.env` file with required environment variables
4. Run the application: `npm run dev`

## Environment Variables

```
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=abetworks_workcrm
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your_jwt_secret_key_here_must_be_long_enough_for_security
JWT_EXPIRES_IN=24h
STRIPE_SECRET_KEY=your_stripe_secret_key
REDIS_URL=redis://localhost:6379
NODE_ENV=development
```

## Database Schema

The comprehensive database schema includes:
- Customer management with categories and activities
- Lead tracking with sources and scoring
- Deal pipeline with stages and probabilities
- Task management with priorities
- Quotes and invoices with line items
- Payment processing
- File attachments
- Tagging system
- Notification system
- Tenant-specific settings