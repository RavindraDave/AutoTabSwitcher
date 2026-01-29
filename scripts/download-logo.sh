#!/bin/bash

# Quick script to download R2DSolutions logo from your website
# Run this from the project root directory

echo "Downloading R2DSolutions logo..."

# Try to download from your website
curl -o src/assets/r2d-logo.png https://extensions.r2dsolutions.com/logo.png

if [ $? -eq 0 ] && [ -f src/assets/r2d-logo.png ]; then
    echo "✓ Logo downloaded successfully!"
    ls -lh src/assets/r2d-logo.png
else
    echo "✗ Failed to download logo"
    echo ""
    echo "Please manually download your logo:"
    echo "1. Go to: https://extensions.r2dsolutions.com/logo.png"
    echo "2. Save as: src/assets/r2d-logo.png"
    echo ""
    echo "Or copy from your local files:"
    echo "cp /path/to/your/logo.png src/assets/r2d-logo.png"
fi
