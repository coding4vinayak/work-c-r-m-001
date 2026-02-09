#!/bin/bash

# ABETWORKS WORKCRM - Docker Multi-Service Startup Script
# This script demonstrates the Docker setup with separate services

echo "🐳 Starting ABETWORKS WORKCRM Docker Multi-Service Architecture"
echo "=================================================================="

# Function to start Docker services
start_docker_services() {
    echo "🔄 Bringing up Docker services..."
    echo ""
    
    # Start all services in detached mode
    docker-compose up --build -d
    
    echo "⏳ Waiting for services to start..."
    sleep 10
    
    # Show service status
    echo ""
    echo "📊 DOCKER SERVICE STATUS:"
    echo "========================="
    docker-compose ps
    echo ""
}

# Function to show individual service status
show_service_details() {
    echo "🖥️  APPLICATION SERVER:"
    echo "   - Port: 3000"
    echo "   - Status: $(docker-compose ps app | grep -o '[a-zA-Z]*' | tail -1)"
    echo "   - Endpoint: http://localhost:3000"
    echo ""
    
    echo "🗄️  DATABASE SERVER:"
    echo "   - Port: 5432"
    echo "   - Status: $(docker-compose ps db | grep -o '[a-zA-Z]*' | tail -1)"
    echo "   - PostgreSQL 15 with multi-tenant schema"
    echo ""
    
    echo "⚡ REDIS CACHE:"
    echo "   - Port: 6379"
    echo "   - Status: $(docker-compose ps redis | grep -o '[a-zA-Z]*' | tail -1)"
    echo "   - Used for sessions, caching, and job queues"
    echo ""
    
    echo "☁️  FILE STORAGE (MinIO):"
    echo "   - API Port: 9000"
    echo "   - Console Port: 9001"
    echo "   - Status: $(docker-compose ps minio | grep -o '[a-zA-Z]*' | tail -1)"
    echo "   - S3-compatible object storage"
    echo ""
    
    echo "⚙️  BACKGROUND WORKER:"
    echo "   - Status: $(docker-compose ps worker | grep -o '[a-zA-Z]*' | tail -1)"
    echo "   - Handles: customer-operations, lead-operations, notifications, file-processing, reports, backups"
    echo ""
}

# Function to show application endpoints
show_endpoints() {
    echo "🔗 APPLICATION ENDPOINTS:"
    echo "========================="
    echo "🌍 Main Application: http://localhost:3000"
    echo "📊 Health Check: http://localhost:3000/health"
    echo "📋 Dashboard: http://localhost:3000/dashboard/"
    echo "🔐 Login: http://localhost:3000/authentication/auth-login-cover.html"
    echo "📋 Register: http://localhost:3000/authentication/auth-register-cover.html"
    echo "⚙️  API Root: http://localhost:3000/api/"
    echo ""
    echo "☁️  MINIO STORAGE:"
    echo "   Console: http://localhost:9001"
    echo "   Credentials: minioaccesskey / miniosecretkey"
    echo ""
}

# Function to show login information
show_login_info() {
    echo "🔐 LOGIN INFORMATION:"
    echo "====================="
    echo "You can access the application at: http://localhost:3000"
    echo ""
    echo "Login Options:"
    echo "1. Existing Super Admin:"
    echo "   - Email: superadmin@abetworks.com"
    echo "   - Password: SuperAdmin2023!"
    echo ""
    echo "2. Register New User:"
    echo "   - Navigate to: http://localhost:3000/authentication/auth-register-cover.html"
    echo "   - Create a new account with tenant association"
    echo ""
    echo "3. Demo User (if available):"
    echo "   - Email: demo@abetworks.com"
    echo "   - Password: DemoPass123!"
    echo ""
    echo "💡 TIP: The application supports multi-tenant architecture."
    echo "    Each user is associated with a specific tenant."
    echo ""
}

# Function to show logs for each service
show_logs() {
    echo "📝 SERVICE LOGS (Last 10 lines each):"
    echo "====================================="
    
    echo "APP SERVER LOGS:"
    docker-compose logs --tail=10 app 2>/dev/null || echo "   (Service not running)"
    echo ""
    
    echo "WORKER LOGS:"
    docker-compose logs --tail=10 worker 2>/dev/null || echo "   (Service not running)"
    echo ""
    
    echo "DATABASE LOGS:"
    docker-compose logs --tail=5 db 2>/dev/null || echo "   (Service not running)"
    echo ""
}

# Function to show how to stop services
show_stop_info() {
    echo "🛑 TO STOP SERVICES:"
    echo "==================="
    echo "To stop all services, run:"
    echo "   docker-compose down"
    echo ""
    echo "To stop and remove containers:"
    echo "   docker-compose down -v"
    echo ""
    echo "To view logs continuously:"
    echo "   docker-compose logs -f"
    echo ""
}

# Main execution
main() {
    echo "Starting ABETWORKS WORKCRM Docker multi-service architecture..."
    echo ""
    
    # Start services
    start_docker_services
    
    # Show service details
    show_service_details
    
    # Show endpoints
    show_endpoints
    
    # Show login information
    show_login_info
    
    # Show logs
    show_logs
    
    # Show stop information
    show_stop_info
    
    echo "🎉 ABETWORKS WORKCRM Docker services are now running!"
    echo ""
    echo "📌 SERVICES RUNNING:"
    echo "   - Application Server: Ready for user access"
    echo "   - Database: PostgreSQL with multi-tenant schema"
    echo "   - Cache: Redis for performance"
    echo "   - Storage: MinIO for file management"
    echo "   - Worker: Background job processing"
    echo ""
    echo "🚀 The system is ready for use via http://localhost:3000"
    echo ""
    echo "💡 TIP: Check the logs above to ensure all services are healthy."
}

# Run main function
main