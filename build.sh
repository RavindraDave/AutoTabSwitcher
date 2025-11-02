#!/bin/bash

# Clean previous build
echo "Cleaning previous build..."
npm run clean 2>/dev/null || rm -rf dist

# Build TypeScript
echo "Building TypeScript..."
npm run build

# Check if build was successful
if [ $? -eq 0 ]; then
    echo "Build completed successfully!"
    echo "The extension is ready to load from the 'src' directory"
else
    echo "Build failed!"
    exit 1
fi
