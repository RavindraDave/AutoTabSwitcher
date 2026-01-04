#!/bin/bash
# Build script for Auto Tab Switcher
# Runs clean, test, and build in sequence

set -e  # Exit on error

echo "======================================"
echo "Auto Tab Switcher - Build Pipeline"
echo "======================================"
echo ""

# Step 1: Clean
echo "Step 1/3: Cleaning previous build..."
npm run clean
echo "✓ Clean completed"
echo ""

# Step 2: Test
echo "Step 2/3: Running tests..."
npm test
echo "✓ Tests completed"
echo ""

# Step 3: Build
echo "Step 3/3: Building extension..."
npm run build
echo "✓ Build completed"
echo ""

echo "======================================"
echo "✓ All steps completed successfully!"
echo "======================================"
echo ""
echo "Output directory: dist/"
echo "Ready for deployment or testing"
