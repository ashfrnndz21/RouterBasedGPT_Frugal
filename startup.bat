@echo off
REM FrugalAIGpt Startup Script for Windows
REM This script starts the application using Docker Compose
REM Usage: startup.bat [reset]

setlocal enabledelayedexpansion

REM Colors (limited in Windows CMD)
set "GREEN=[92m"
set "YELLOW=[93m"
set "RED=[91m"
set "BLUE=[94m"
set "NC=[0m"

REM Configuration
set "APP_PORT=3000"
set "APP_URL=http://localhost:%APP_PORT%"
set "METRICS_URL=http://localhost:%APP_PORT%/metrics"

REM Check for reset mode
set "RESET_MODE=false"
if "%1"=="reset" set "RESET_MODE=true"
if "%1"=="--reset" set "RESET_MODE=true"

echo.
echo ========================================================
echo.
echo           FrugalAIGpt Startup Script
echo.
echo ========================================================
echo.

REM Handle reset mode
if "%RESET_MODE%"=="true" goto :reset_app

REM Check Docker
echo %BLUE%Checking prerequisites...%NC%
where docker >nul 2>nul
if %errorlevel% neq 0 (
    echo %RED%Error: Docker is not installed or not in PATH%NC%
    echo Please install Docker Desktop from: https://www.docker.com/products/docker-desktop
    pause
    exit /b 1
)
echo %GREEN%[OK] Docker is installed%NC%

REM Check Docker Compose
docker compose version >nul 2>nul
if %errorlevel% neq 0 (
    echo %RED%Error: Docker Compose is not available%NC%
    echo Please ensure Docker Desktop is running
    pause
    exit /b 1
)
echo %GREEN%[OK] Docker Compose is available%NC%

REM Check config.toml
if not exist "config.toml" (
    echo %YELLOW%Warning: config.toml not found%NC%
    if exist "sample.config.toml" (
        echo %YELLOW%Copying sample.config.toml to config.toml...%NC%
        copy sample.config.toml config.toml >nul
        echo %GREEN%[OK] Created config.toml from sample%NC%
    ) else (
        echo %RED%Error: sample.config.toml not found%NC%
        pause
        exit /b 1
    )
) else (
    echo %GREEN%[OK] config.toml exists%NC%
)

echo.
echo %BLUE%Starting Docker services...%NC%
echo.

REM Stop existing containers
docker compose down >nul 2>nul

REM Start services
docker compose up -d --build
if %errorlevel% neq 0 (
    echo %RED%Error: Failed to start Docker services%NC%
    pause
    exit /b 1
)

echo.
echo %GREEN%[OK] Docker services started successfully%NC%
echo.

REM Wait for app to be ready
echo %YELLOW%Waiting for app to be ready...%NC%
timeout /t 5 /nobreak >nul

REM Try to check if app is responding (basic check)
for /l %%i in (1,1,30) do (
    curl -s %APP_URL% >nul 2>nul
    if !errorlevel! equ 0 (
        echo %GREEN%[OK] App is ready!%NC%
        goto :app_ready
    )
    timeout /t 2 /nobreak >nul
)

echo %YELLOW%Warning: App did not respond in time, but may still be starting...%NC%

:app_ready
echo.
echo %BLUE%Service Status:%NC%
docker compose ps

echo.
echo ========================================================
echo.
echo %GREEN%FrugalAIGpt is Running!%NC%
echo.
echo %BLUE%Access Points:%NC%
echo   - Main App:      %APP_URL%
echo   - Metrics:       %METRICS_URL%
echo   - Analytics:     %APP_URL%/analytics
echo   - Discovery:     %APP_URL%/discover
echo   - Settings:      %APP_URL%/settings
echo.
echo %BLUE%Useful Commands:%NC%
echo   - View logs:     docker compose logs -f
echo   - Stop app:      docker compose down
echo   - Restart:       docker compose restart
echo   - Rebuild:       docker compose up -d --build
echo.
echo %YELLOW%Tips:%NC%
echo   - Configure API keys in config.toml
echo   - Check metrics at %METRICS_URL%
echo   - Press Ctrl+C to stop viewing logs
echo.
echo ========================================================
echo.

REM Open browser
echo %YELLOW%Opening browser...%NC%
start %APP_URL%

echo.
set /p "view_logs=Would you like to view the logs? (y/n): "
if /i "%view_logs%"=="y" (
    echo.
    echo %BLUE%Showing logs (Press Ctrl+C to exit)...%NC%
    echo.
    docker compose logs -f
)

endlocal
goto :eof

:reset_app
echo.
echo %YELLOW%Resetting Application...%NC%
echo.
echo %RED%WARNING: This will:%NC%
echo   - Stop all Docker containers
echo   - Remove all volumes (database, uploads)
echo   - Clear all data
echo   - Free up port %APP_PORT%
echo.
set /p "confirm=Are you sure? This cannot be undone! (yes/no): "
if /i not "%confirm%"=="yes" (
    echo %YELLOW%Reset cancelled.%NC%
    exit /b 0
)

echo.
echo %YELLOW%Stopping and removing containers...%NC%
docker compose down -v 2>nul

echo %YELLOW%Cleaning up local data...%NC%
if exist "data\*.db" del /q "data\*.db" 2>nul
if exist "uploads\*" del /q "uploads\*" 2>nul

echo.
echo %GREEN%Application reset complete!%NC%
echo.
echo %BLUE%You can now start fresh with: startup.bat%NC%
exit /b 0
