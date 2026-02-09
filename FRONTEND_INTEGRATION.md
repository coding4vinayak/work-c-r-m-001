# ABETWORKS WORKCRM - Frontend-Backend Integration

## Overview
This project integrates the frontend template pack with the backend API to create a fully functional CRM application. The integration connects the static HTML templates to the dynamic backend services using JavaScript and REST API calls.

## Integration Components

### JavaScript Services Created

1. **API Service (`assets/js/api-service.js`)**
   - Centralized service for all API communications
   - Handles authentication token management
   - Implements error handling and retry mechanisms
   - Provides methods for all CRM entities (customers, leads, deals, etc.)

2. **Authentication Manager (`assets/js/auth-manager.js`)**
   - Manages user authentication state
   - Handles login, logout, and registration
   - Stores tokens securely in browser storage
   - Redirects users based on authentication status

3. **Module-Specific Handlers**
   - `assets/js/dashboard-handler.js` - Dashboard data loading and display
   - `assets/js/customers-handler.js` - Customer management functionality
   - `assets/js/leads-handler.js` - Lead management functionality
   - `assets/js/deals-handler.js` - Deal management functionality
   - `assets/js/tasks-handler.js` - Task management functionality
   - `assets/js/quotes-handler.js` - Quote management functionality
   - `assets/js/invoices-handler.js` - Invoice management functionality
   - `assets/js/login-handler.js` - Login form handling

### HTML Files Updated
All HTML files in the following directories have been updated to include the necessary JavaScript references:

- `/dashboard/` - Dashboard pages
- `/customer/` - Customer management pages
- `/lead/` - Lead management pages
- `/deal/` - Deal management pages
- `/task/` - Task management pages
- `/quote/` - Quote management pages
- `/invoicing/` - Invoice management pages
- `/authentication/` - Authentication pages

## Features Implemented

### Authentication
- Login functionality with token management
- Automatic redirection after login
- Protected route handling
- Session management

### CRM Modules
- **Customers**: Full CRUD operations (Create, Read, Update, Delete)
- **Leads**: Full CRUD operations with status tracking
- **Deals**: Full CRUD operations with pipeline management
- **Tasks**: Task creation, completion tracking, assignment
- **Quotes**: Quote creation, status management, financial tracking
- **Invoices**: Invoice creation, payment tracking, status management

### User Experience
- Loading states for all API calls
- Error handling with user-friendly messages
- Success notifications
- Form validation
- Responsive design maintained

## How to Use

### Prerequisites
- Node.js and npm installed
- Backend server running (port 3000 by default)

### Setup
1. The JavaScript files are already linked in the HTML files
2. Ensure the backend API is running
3. Open any HTML file in a web browser

### Development
To run the application:
```bash
./start-app.sh
```

Or manually:
```bash
npm install
npm run build
npm start
```

## API Endpoints Used

The frontend communicates with the following backend endpoints:

- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/customers` - Get customers
- `POST /api/customers` - Create customer
- `GET /api/customers/:id` - Get specific customer
- `PUT /api/customers/:id` - Update customer
- `DELETE /api/customers/:id` - Delete customer

Similar patterns are followed for leads, deals, tasks, quotes, and invoices.

## Security Features
- JWT token-based authentication
- Secure token storage
- Protected route enforcement
- Input sanitization
- Error message sanitization

## Error Handling
- Network error detection
- Authentication failure handling
- Invalid input validation
- Server error responses
- User-friendly error messages

## Future Enhancements
- Real-time notifications via WebSockets
- Advanced filtering and search capabilities
- Bulk operations
- File upload functionality
- Advanced reporting features