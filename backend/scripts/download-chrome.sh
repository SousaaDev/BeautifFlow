#!/usr/bin/env bash
set -e
echo "Ensuring Chromium is available (attempting puppeteer binary fetch)..."
# Try to force Puppeteer to download its Chromium binary
if command -v npm > /dev/null 2>&1; then
  npm rebuild puppeteer --update-binary || true
fi

# Fallback: try to install chromium via apt if available
if command -v apt-get > /dev/null 2>&1; then
  echo "Attempting apt-get install chromium-browser"
  sudo apt-get update || true
  sudo apt-get install -y chromium-browser || true
fi

echo "Done. If Chromium is still not present, install it manually on the server or enable network access during build."