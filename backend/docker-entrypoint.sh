#!/bin/sh
set -e

echo "=== Starting backend ==="
echo "Node version: $(node --version)"
echo "Working directory: $(pwd)"
echo "Checking dist/data-source.prod.js..."
ls -la dist/data-source.prod.js || echo "WARNING: data-source.prod.js not found!"

echo "=== Running migrations ==="
npm run migration:run:prod 2>&1 || {
  echo "WARNING: Migrations failed (exit code $?). Continuing with app startup..."
  echo "The app may have issues if schema is not up to date."
}

echo "=== Starting application ==="
exec node dist/main.js
