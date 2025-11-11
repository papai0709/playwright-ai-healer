#!/bin/bash

# Self-Healing Test Framework - Quick Start Script

echo "🚀 Self-Healing Test Automation Framework Setup"
echo "================================================"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating from template..."
    cp .env.example .env
    echo "✅ Created .env file"
    echo ""
    echo "⚠️  IMPORTANT: Please edit .env and add your OpenAI API key:"
    echo "   OPENAI_API_KEY=your_actual_api_key_here"
    echo ""
    read -p "Press Enter after you've added your API key to .env..."
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo "✅ Dependencies installed"
else
    echo "✅ Dependencies already installed"
fi

# Build the project
echo ""
echo "🔨 Building TypeScript..."
npm run build
echo "✅ Build complete"

# Install Playwright browsers
echo ""
echo "🌐 Installing Playwright browsers..."
npx playwright install chromium
echo "✅ Playwright browsers installed"

# Create necessary directories
echo ""
echo "📁 Creating directories..."
mkdir -p data logs screenshots test-results
echo "✅ Directories created"

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Make sure your OpenAI API key is set in .env"
echo "2. Run tests: npm test"
echo "3. Run tests in headed mode: npm run test:headed"
echo "4. Run tests in debug mode: npm run test:debug"
echo "5. View reports: npm run report"
echo ""
echo "📖 For more information, see README.md"
