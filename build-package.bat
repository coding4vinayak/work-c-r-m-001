@echo off
echo Building ABETWORKS WORKCRM Complete Application Package...

echo Creating package directory...
if not exist "package" mkdir package

echo Copying source code...
xcopy /E /I /Y . "package\" /EXCLUDE:exclude-list.txt

echo Creating package structure...
cd package

echo Building Docker image...
docker build -t abetworks-workcrm .

echo Package build complete!
echo To run the application:
echo 1. Make sure Docker and Docker Compose are installed
echo 2. Run: docker-compose -f docker-compose-full.yml up -d
echo 3. Access the application at: http://localhost:3000
echo 4. Access the dashboard at: http://localhost:3000/index.html

pause