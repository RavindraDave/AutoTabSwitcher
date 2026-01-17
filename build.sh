#!/bin/bash
# Build script for Auto Tab Switcher
# Runs clean, test, and build in sequence
# Supports conditional builds via BUILD_TYPE environment variable
#
# Usage:
#   ./build.sh                    # Interactive mode
#   BUILD_TYPE=free ./build.sh    # Free build (no premium features)
#   BUILD_TYPE=premium ./build.sh # Premium build (all features)
#   BUILD_TYPE=dev ./build.sh     # Development build

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

# Determine build type from environment variable
if [ -n "$BUILD_TYPE" ]; then
  case "$BUILD_TYPE" in
    free)
      echo "Building FREE version (no premium features)..."
      npm run build:free
      ;;
    premium)
      echo "Building PREMIUM version (all features)..."
      npm run build:premium
      ;;
    dev)
      echo "Building DEVELOPMENT version..."
      npm run dev
      ;;
    *)
      echo "Error: Invalid BUILD_TYPE='$BUILD_TYPE'"
      echo "Valid options: free, premium, dev"
      exit 1
      ;;
  esac
else
  # Interactive mode
  npm run build
fi

echo "✓ Build completed"
echo ""

echo "======================================"
echo "✓ All steps completed successfully!"
echo "======================================"
echo ""
echo "Output directory: dist/"
echo "Ready for deployment or testing"
