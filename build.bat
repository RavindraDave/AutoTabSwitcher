@echo off
REM Build script for Auto Tab Switcher (Windows)
REM Runs clean, test, and build in sequence

echo ======================================
echo Auto Tab Switcher - Build Pipeline
echo ======================================
echo.

REM Step 1: Clean
echo Step 1/3: Cleaning previous build...
call npm run clean
if %errorlevel% neq 0 (
    echo ERROR: Clean failed
    exit /b %errorlevel%
)
echo [32m✓ Clean completed[0m
echo.

REM Step 2: Test
echo Step 2/3: Running tests...
call npm test
if %errorlevel% neq 0 (
    echo ERROR: Tests failed
    exit /b %errorlevel%
)
echo [32m✓ Tests completed[0m
echo.

REM Step 3: Build
echo Step 3/3: Building extension...
call npm run build
if %errorlevel% neq 0 (
    echo ERROR: Build failed
    exit /b %errorlevel%
)
echo [32m✓ Build completed[0m
echo.

echo ======================================
echo [32m✓ All steps completed successfully![0m
echo ======================================
echo.
echo Output directory: dist/
echo Ready for deployment or testing
