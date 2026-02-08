@echo off
setlocal enabledelayedexpansion

echo ===========================================
echo ABETWORKS WORKCRM Setup Script (Windows)
echo ===========================================

REM Check if Docker is installed
docker --version >nul 2>&1
if errorlevel 1 (
    echo Error: Docker is not installed. Please install Docker Desktop for Windows first.
    pause
    exit /b 1
)

echo ✓ Docker is installed

REM Check if Docker Compose is installed
docker-compose --version >nul 2>&1
if errorlevel 1 (
    echo Error: Docker Compose is not installed. Please install Docker Compose first.
    pause
    exit /b 1
)

echo ✓ Docker Compose is installed

REM Create .env file if it doesn't exist
if not exist ".env" (
    echo Creating .env file...
    echo # Server Configuration > .env
    echo PORT=3000 >> .env
    echo NODE_ENV=production >> .env
    echo. >> .env
    echo # Database Configuration >> .env
    echo DB_HOST=db >> .env
    echo DB_PORT=5432 >> .env
    echo DB_NAME=abetworks_workcrm >> .env
    echo DB_USER=postgres >> .env
    echo DB_PASSWORD=your_secure_password >> .env
    echo DATABASE_URL=postgresql://postgres:your_secure_password@db:5432/abetworks_workcrm >> .env
    echo. >> .env
    echo # JWT Configuration >> .env
    echo JWT_SECRET=%RANDOM%%RANDOM%%RANDOM%%RANDOM%%RANDOM%%RANDOM% >> .env
    echo REFRESH_JWT_SECRET=%RANDOM%%RANDOM%%RANDOM%%RANDOM%%RANDOM%%RANDOM% >> .env
    echo. >> .env
    echo # Redis Configuration >> .env
    echo REDIS_URL=redis://redis:6379 >> .env
    echo. >> .env
    echo # Email Configuration >> .env
    echo SMTP_HOST=smtp.gmail.com >> .env
    echo SMTP_PORT=587 >> .env
    echo SMTP_USER=your-smtp-user >> .env
    echo SMTP_PASS=your-smtp-password >> .env
    echo SMTP_FROM=noreply@abetworks.com >> .env
    echo. >> .env
    echo # Stripe Configuration >> .env
    echo STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key >> .env
    echo STRIPE_WEBHOOK_SECRET=whsec_your_webhook_signing_secret >> .env
    echo. >> .env
    echo # Backup Configuration >> .env
    echo BACKUP_RETENTION_DAYS=30 >> .env
    echo BACKUP_DIRECTORY=/backups >> .env
    echo BACKUP_INTERVAL_HOURS=24 >> .env
    echo. >> .env
    echo # Security >> .env
    echo RATE_LIMIT_WINDOW_MS=900000 >> .env
    echo RATE_LIMIT_MAX_REQUESTS=100 >> .env
    echo. >> .env
    echo ✓ Created .env file with default values ^(please update with your actual values^)
) else (
    echo ✓ Using existing .env file
)

REM Build and start the services
echo Building and starting services...
docker-compose up --build -d

echo Waiting for services to start...
timeout /t 30 /nobreak

REM Run database setup
echo Running database setup...
docker-compose exec app npm run db:setup

echo.
echo ===========================================
echo Setup Complete!
echo ===========================================
echo.
echo Your ABETWORKS WORKCRM instance is now running!
echo.
echo Access the application at: http://localhost:3000
echo.
echo Default Super Admin Credentials:
echo   Email: superadmin@abetworks.com
echo   Password: SuperAdmin2023!
echo   Role: abetworks_super_admin
echo.
echo Important: Change the default password immediately after first login!
echo.
echo To view logs: docker-compose logs -f
echo To stop: docker-compose down
echo To restart: docker-compose restart
echo.
pause