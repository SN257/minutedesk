#!/bin/bash
# =============================================================
# Nexus Deployment Script for MilesWeb VPS - Where everything flows together
# Run this script ON the MilesWeb server after uploading files
# =============================================================

set -e  # Exit on error

echo "========================================="
echo "  Nexus Production Deployment - Where everything flows together"
echo "========================================="

# Navigate to project directory
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

echo ""
echo "📦 Step 1: Installing Backend Dependencies..."
cd backend
npm ci --production
echo "✅ Backend dependencies installed."

echo ""
echo "🔨 Step 2: Building Backend..."
npm run build
echo "✅ Backend built successfully."

echo ""
echo "📦 Step 3: Installing Frontend Dependencies..."
cd ../frontend
npm ci
echo "✅ Frontend dependencies installed."

echo ""
echo "🔨 Step 4: Building Frontend..."
npm run build
echo "✅ Frontend built successfully. Output in frontend/dist/"

echo ""
echo "🗄️  Step 5: Running Database Migrations..."
cd ../backend
npm run migration:run
echo "✅ Database migrations applied."

echo ""
echo "🚀 Step 6: Starting/Restarting Backend with PM2..."
cd ..
if command -v pm2 &> /dev/null; then
    pm2 delete nexus-backend 2>/dev/null || true
    pm2 start ecosystem.config.js
    pm2 save
    echo "✅ Backend started with PM2."
else
    echo "⚠️  PM2 is not installed. Install it with: npm install -g pm2"
    echo "   Then run: pm2 start ecosystem.config.js && pm2 save"
fi

echo ""
echo "========================================="
echo "  ✅ Deployment Complete!"
echo "========================================="
echo ""
echo "Next steps:"
echo "  1. Configure Nginx using the nginx.conf template"
echo "  2. Set up SSL with: sudo certbot --nginx -d YOUR_DOMAIN.com"
echo "  3. Restart Nginx: sudo systemctl restart nginx"
echo "  4. Check backend logs: pm2 logs nexus-backend"
echo ""
