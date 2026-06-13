#!/bin/bash
set -e

echo "==> Installing dependencies..."
npm ci

echo "==> Building TypeScript and preparing HTTP server..."
npm run build:http

echo "==> Build complete!"
ls -la build/
