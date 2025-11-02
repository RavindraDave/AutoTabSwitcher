#!/bin/bash

# Prepare extension for Chrome Web Store deployment
# This script switches to hybrid implementation for 5-second minimum support

set -e

echo "========================================="
echo "Preparing for Chrome Web Store deployment"
echo "========================================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "Error: Must run from project root directory"
    exit 1
fi

# Backup current files
echo "📦 Creating backups..."
cp src/background.ts src/background.ts.backup
cp src/popup/popup.ts src/popup/popup.ts.backup
echo "   ✓ Backed up background.ts → background.ts.backup"
echo "   ✓ Backed up popup.ts → popup.ts.backup"
echo ""

# Switch to hybrid implementation
echo "🔄 Switching to hybrid implementation..."
cp src/background-hybrid.ts src/background.ts
cp src/popup/popup-hybrid.ts src/popup/popup.ts
echo "   ✓ Using background-hybrid.ts (supports 5s minimum)"
echo "   ✓ Using popup-hybrid.ts (environment-aware)"
echo ""

# Clean and build
echo "🏗️  Building for production..."
npm run clean
npm run build
echo "   ✓ Build complete"
echo ""

# Get version from manifest
VERSION=$(grep -o '"version": *"[^"]*"' src/manifest.json | cut -d'"' -f4)

# Create release directory
RELEASE_DIR="releases/v${VERSION}"
mkdir -p "$RELEASE_DIR"

# Copy dist to release
echo "📁 Creating release package..."
cp -r dist/* "$RELEASE_DIR/"

# Create ZIP for Chrome Web Store
cd "$RELEASE_DIR"
ZIP_FILE="../auto-tab-switcher-v${VERSION}.zip"
zip -r "$ZIP_FILE" . -x "*.map" "*.DS_Store"
cd ../..
echo "   ✓ Created: releases/auto-tab-switcher-v${VERSION}.zip"
echo ""

# Calculate size
ZIP_SIZE=$(du -h "releases/auto-tab-switcher-v${VERSION}.zip" | cut -f1)
echo "📊 Package size: $ZIP_SIZE"
echo ""

echo "========================================="
echo "✅ Production build complete!"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Test the extension:"
echo "   - Go to chrome://extensions/"
echo "   - Enable Developer mode"
echo "   - Click 'Pack extension'"
echo "   - Select: $RELEASE_DIR"
echo "   - Test the packed .crx file"
echo ""
echo "2. Verify 5-second minimum works"
echo ""
echo "3. Upload to Chrome Web Store:"
echo "   - File: releases/auto-tab-switcher-v${VERSION}.zip"
echo ""
echo "To restore development version:"
echo "   mv src/background.ts.backup src/background.ts"
echo "   mv src/popup/popup.ts.backup src/popup/popup.ts"
echo "   npm run build"
echo ""
