# ABETWORKS WORKCRM - Multi-Tenant CRM Platform

This platform transforms the original Duralux admin template into a comprehensive multi-tenant CRM solution for ABETWORKS.

## Overview

ABETWORKS WORKCRM is a multi-tenant CRM SaaS platform that allows companies to manage their customer relationships, leads, deals, and tasks efficiently. The platform has been built by extending the original Duralux admin template with comprehensive CRM functionality and multi-tenancy support.

## Multi-Tenant Architecture

The platform follows a multi-tenant architecture where:
- Each client company gets their own isolated CRM instance
- Data is securely separated using PostgreSQL row-level security
- A super admin panel manages all tenant companies
- Each tenant accesses their instance via a unique subdomain

## Enhanced Features

### CRM Functionality
- **Customers**: Comprehensive customer management with categories, activities, and lead scoring
- **Leads**: Lead tracking with sources, assignment, and status management
- **Deals**: Deal pipeline management with stages, probabilities, and forecasting
- **Tasks**: Task management with categories, priorities, and assignments
- **Quotes & Invoices**: Complete quoting and invoicing system
- **Reports**: Comprehensive analytics and reporting

### Multi-Tenancy Implementation
- **Tenant Resolution Middleware**: Identifies tenant from subdomain or headers
- **Row-Level Security**: PostgreSQL RLS ensures data isolation between tenants
- **Tenant Context**: Attaches tenant information to request objects
- **Database Schema**: 
  - `public.tenants` - Stores tenant information
  - `public.users` - Stores user accounts with tenant associations
  - `tenant_data.customers` - Tenant-specific customer data
  - `tenant_data.leads` - Tenant-specific lead data
  - `tenant_data.deals` - Tenant-specific deal data
  - `tenant_data.tasks` - Tenant-specific task data
  - `tenant_data.quotes` - Tenant-specific quotes
  - `tenant_data.invoices` - Tenant-specific invoices
  - `tenant_data.payments` - Tenant-specific payments
  - `tenant_data.files` - Tenant-specific file storage
  - `tenant_data.tags` - Tenant-specific tagging system

### Frontend Implementation
- **Tenant Context**: Manages current tenant and user information
- **Tenant Switching**: Allows users to switch between tenants they have access to
- **Route Protection**: Ensures users can only access resources for their assigned tenant
- **API Headers**: Adds tenant-specific headers to all API requests
- **UI Personalization**: Shows tenant-specific branding and information

## Original Template Adaptation

The original Duralux admin template has been extensively modified to support CRM functionality:

### Updated Pages
- **index.html**: Main dashboard with CRM navigation
- **customers.html**: Customer management interface
- **leads.html**: Lead tracking and management
- **projects.html**: Deal/pipeline management (renamed to Deals)
- **apps-tasks.html**: Task management system
- **proposal.html**: Quote management (renamed to Quotes)
- **invoice-view.html**: Invoice management
- **analytics.html**: CRM analytics and reporting
- **settings pages**: Tenant-specific settings

### Navigation Updates
The navigation menu has been reorganized to reflect CRM functionality:
- Customers → Customer management
- Leads → Lead tracking
- Deals → Pipeline management (using projects pages)
- Tasks → Task management
- Quotes & Invoices → Quoting and invoicing
- Reports → Analytics and reporting
- Settings → Tenant administration

## Tech Stack

### Backend
- **Node.js** with TypeScript
- **Express.js** framework
- **PostgreSQL** with row-level security
- **JWT-based** authentication
- **Docker** + Kubernetes ready

### Frontend
- **Original Duralux Template** enhanced with CRM functionality
- **Bootstrap 5** for responsive design
- **Custom JavaScript** for CRM interactions
- **AJAX** for dynamic data loading

### Database Schema
Comprehensive schema supporting:
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

## Security & Access Control
- **Role-Based Access Control**: Super Admin, Client Admin, Client User roles
- **Data Isolation**: Each tenant can only access their own data
- **Tenant-Aware Routing**: Different views based on user role and tenant
- **API Security**: Token-based authentication with tenant verification

## Setup Instructions

### Prerequisites
- Node.js v16+
- PostgreSQL database
- Git

### Backend Setup
1. Install dependencies: `npm install`
2. Set up PostgreSQL database with the comprehensive schema
3. Create `.env` file with required environment variables
4. Run the application: `npm run dev`

### Environment Variables
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

## Database Setup

Run the comprehensive database schema from `comprehensive_database_schema.sql` to set up all required tables with proper relationships and row-level security policies.

## Key Features

- Multi-tenant architecture with complete data isolation
- Comprehensive CRM functionality (customers, leads, deals, tasks)
- Advanced quoting and invoicing system
- Lead scoring and activity tracking
- File management system
- Tagging and categorization
- Notification system
- Advanced reporting and analytics
- Role-based access control
- Subscription and billing management
- API-first design for integration

## Multi-Tenancy Architecture Details

### Data Isolation
- Row-level security in PostgreSQL ensures tenants can only access their own data
- Each tenant's data is tagged with a tenant_id
- Super admins can access all tenants' data
- Regular users can only access their tenant's data

### Tenant Identification
- Subdomain-based routing (tenant1.abetworks.com)
- Header-based identification for API requests (X-Tenant-ID)
- Session-based tenant context

### User Roles
- `abetworks_super_admin`: Can manage all tenants and their data
- `client_admin`: Can manage their tenant's data and users
- `client_user`: Can access their tenant's data based on permissions

## Extending the Platform

The platform is designed for easy extension:
- Add new CRM modules by creating corresponding database tables
- Extend the API with new endpoints following the existing patterns
- Enhance the UI with additional Bootstrap components
- Integrate with third-party services via the API layer

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting pull requests.

## License

This project is licensed under the MIT License.