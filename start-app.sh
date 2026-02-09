#!/bin/bash
# Startup script for ABETWORKS WORKCRM

echo "🚀 Starting ABETWORKS WORKCRM Application..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ Node.js and npm are installed."

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install dependencies."
        exit 1
    fi
    echo "✅ Dependencies installed."
else
    echo "✅ Dependencies already installed."
fi

# Build the TypeScript code
echo "🔨 Building TypeScript code..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Failed to build TypeScript code."
    exit 1
fi
echo "✅ TypeScript code built successfully."

# Start the application
echo "🏃 Starting the application..."
npm start