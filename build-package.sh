#!/bin/bash

echo "Building ABETWORKS WORKCRM Complete Application Package..."

echo "Creating package directory..."
mkdir -p package

echo "Copying source code..."
rsync -av --exclude='package/' --exclude='node_modules/' . ./package/

echo "Changing to package directory..."
cd package

echo "Package build complete!"
echo "To run the application:"
echo "1. Make sure Docker and Docker Compose are installed"
echo "2. Run: docker-compose -f docker-compose-full.yml up -d"
echo "3. Access the application at: http://localhost:3000"
echo "4. Access the dashboard at: http://localhost:3000/index.html"