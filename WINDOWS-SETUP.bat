#!/usr/bin/env bash

# Quick Windows Setup and Troubleshooting Guide
# Run this from Command Prompt or PowerShell in the project directory

# Step 1: Clean install
echo "Cleaning previous build artifacts..."
if exist dist rmdir /s /q dist
if exist package-lock.json del package-lock.json

# Step 2: Reinstall dependencies
echo "Installing dependencies..."
npm install

# Step 3: Rebuild TypeScript
echo "Building TypeScript..."
npm run build

# Step 4: Verify build succeeded
echo "Verifying build..."
if exist dist\src\cli\index.js (
    echo ✓ Build successful!
) else (
    echo ✗ Build failed - files not generated
    exit /b 1
)

# Step 5: Run test audit
echo "Running test audit..."
npm run audit -- --url https://www.tnkproject.com --output ./my-audit-results

echo "Done!"
