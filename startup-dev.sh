#!/bin/bash

# FrugalAIGpt Development Startup Script
# This script starts the app in development mode (without Docker)
# Usage: ./startup-dev.sh [--reset]

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_PORT=3000
APP_URL="http://localhost:${APP_PORT}"
OLLAMA_URL="http://localhost:11434"
REQUIRED_MODELS=("granite4:micro" "qwen3:1.7b")

# Parse command line arguments
RESET_MODE=false
if [[ "$1" == "--reset" ]]; then
    RESET_MODE=true
fi

# Print colored message
print_message() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Print section header
print_header() {
    echo ""
    print_message "$BLUE" "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    print_message "$BLUE" "  $1"
    print_message "$BLUE" "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check if port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Kill process on port
kill_port() {
    local port=$1
    print_message "$YELLOW" "⚡ Killing process on port $port..."
    
    if [[ "$OSTYPE" == "darwin"* ]] || [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # macOS/Linux
        local pids=$(lsof -ti:$port 2>/dev/null)
        if [ -n "$pids" ]; then
            echo "$pids" | xargs kill -9 2>/dev/null || true
            sleep 1
            print_message "$GREEN" "✓ Freed port $port"
        fi
    fi
}

# Reset application
reset_application() {
    print_header "🔄 Resetting Application"
    
    print_message "$YELLOW" "⚠️  This will:"
    echo "   • Stop development server"
    echo "   • Clear database"
    echo "   • Remove uploads"
    echo "   • Free up port $APP_PORT"
    echo ""
    
    read -p "$(print_message "$RED" "Are you sure? This cannot be undone! (yes/no): ")" -r
    echo ""
    
    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        print_message "$YELLOW" "Reset cancelled."
        exit 0
    fi
    
    print_message "$YELLOW" "⚡ Stopping any running dev servers..."
    kill_port $APP_PORT
    
    print_message "$YELLOW" "⚡ Removing local data..."
    rm -rf data/*.db 2>/dev/null || true
    rm -rf uploads/* 2>/dev/null || true
    rm -rf .next 2>/dev/null || true
    
    print_message "$GREEN" "✓ Application reset complete!"
    echo ""
    print_message "$BLUE" "You can now start fresh with: ./startup-dev.sh"
    exit 0
}

# Check prerequisites
check_prerequisites() {
    print_header "🔍 Checking Prerequisites"
    
    local missing_deps=()
    
    # Check Node.js
    if command_exists node; then
        local node_version=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$node_version" -ge 20 ]; then
            print_message "$GREEN" "✓ Node.js $(node -v) is installed"
        else
            print_message "$RED" "✗ Node.js version must be 20 or higher (current: $(node -v))"
            missing_deps+=("Node.js 20+")
        fi
    else
        print_message "$RED" "✗ Node.js is not installed"
        missing_deps+=("Node.js")
    fi
    
    # Check npm
    if command_exists npm; then
        print_message "$GREEN" "✓ npm $(npm -v) is installed"
    else
        print_message "$RED" "✗ npm is not installed"
        missing_deps+=("npm")
    fi
    
    # Check Ollama
    if command_exists ollama; then
        print_message "$GREEN" "✓ Ollama is installed"
    else
        print_message "$YELLOW" "⚠ Ollama is not installed (optional but recommended)"
        print_message "$YELLOW" "  Install from: https://ollama.ai"
    fi
    
    # Check config.toml
    if [ -f "config.toml" ]; then
        print_message "$GREEN" "✓ config.toml exists"
    else
        print_message "$YELLOW" "⚠ config.toml not found, copying from sample.config.toml"
        if [ -f "sample.config.toml" ]; then
            cp sample.config.toml config.toml
            print_message "$GREEN" "✓ Created config.toml from sample"
        else
            print_message "$RED" "✗ sample.config.toml not found"
            missing_deps+=("config.toml")
        fi
    fi
    
    # Check node_modules
    if [ -d "node_modules" ]; then
        print_message "$GREEN" "✓ Dependencies are installed"
    else
        print_message "$YELLOW" "⚠ Dependencies not installed, running npm install..."
        npm install
        print_message "$GREEN" "✓ Dependencies installed"
    fi
    
    # Check if port is available
    if check_port $APP_PORT; then
        print_message "$YELLOW" "⚠ Port $APP_PORT is already in use"
        read -p "$(print_message "$YELLOW" "Would you like to free up port $APP_PORT? (y/n): ")" -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            kill_port $APP_PORT
        else
            print_message "$RED" "✗ Cannot start app on port $APP_PORT"
            print_message "$YELLOW" "  Please free the port manually or use: ./startup-dev.sh --reset"
            exit 1
        fi
    else
        print_message "$GREEN" "✓ Port $APP_PORT is available"
    fi
    
    # Exit if critical dependencies are missing
    if [ ${#missing_deps[@]} -gt 0 ]; then
        print_message "$RED" "\n❌ Missing required dependencies: ${missing_deps[*]}"
        print_message "$YELLOW" "\nPlease install the missing dependencies and try again."
        exit 1
    fi
}

# Start Ollama service
start_ollama() {
    print_header "🚀 Starting Ollama"
    
    if ! command_exists ollama; then
        print_message "$YELLOW" "⚠ Ollama not installed, skipping..."
        return
    fi
    
    # Check if Ollama is already running
    if curl -s "$OLLAMA_URL" >/dev/null 2>&1; then
        print_message "$GREEN" "✓ Ollama is already running"
    else
        print_message "$YELLOW" "⚡ Starting Ollama service..."
        
        # Start Ollama in background (macOS/Linux)
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS - Ollama runs as an app
            open -a Ollama 2>/dev/null || {
                print_message "$YELLOW" "⚠ Could not start Ollama app automatically"
                print_message "$YELLOW" "  Please start Ollama manually from Applications"
            }
        else
            # Linux - Start as service
            if systemctl is-active --quiet ollama; then
                print_message "$GREEN" "✓ Ollama service is running"
            else
                sudo systemctl start ollama 2>/dev/null || {
                    print_message "$YELLOW" "⚠ Could not start Ollama service"
                    print_message "$YELLOW" "  Please start Ollama manually: ollama serve"
                }
            fi
        fi
        
        # Wait for Ollama to be ready
        print_message "$YELLOW" "⏳ Waiting for Ollama to be ready..."
        for i in {1..30}; do
            if curl -s "$OLLAMA_URL" >/dev/null 2>&1; then
                print_message "$GREEN" "✓ Ollama is ready"
                break
            fi
            sleep 1
            if [ $i -eq 30 ]; then
                print_message "$YELLOW" "⚠ Ollama did not start in time, continuing anyway..."
            fi
        done
    fi
}

# Pull required Ollama models
pull_ollama_models() {
    print_header "📦 Checking Ollama Models"
    
    if ! command_exists ollama; then
        print_message "$YELLOW" "⚠ Ollama not installed, skipping model pull..."
        return
    fi
    
    if ! curl -s "$OLLAMA_URL" >/dev/null 2>&1; then
        print_message "$YELLOW" "⚠ Ollama not running, skipping model pull..."
        return
    fi
    
    for model in "${REQUIRED_MODELS[@]}"; do
        print_message "$YELLOW" "🔍 Checking model: $model"
        
        # Check if model exists
        if ollama list | grep -q "$model"; then
            print_message "$GREEN" "✓ Model $model is already available"
        else
            print_message "$YELLOW" "⬇️  Pulling model: $model (this may take a few minutes)..."
            if ollama pull "$model"; then
                print_message "$GREEN" "✓ Successfully pulled $model"
            else
                print_message "$RED" "✗ Failed to pull $model"
                print_message "$YELLOW" "  You can pull it manually later: ollama pull $model"
            fi
        fi
    done
}

# Run database migrations
run_migrations() {
    print_header "🗄️  Running Database Migrations"
    
    print_message "$YELLOW" "⚡ Running migrations..."
    if npm run db:migrate; then
        print_message "$GREEN" "✓ Migrations completed successfully"
    else
        print_message "$YELLOW" "⚠ Migrations failed, but continuing..."
    fi
}

# Start development server
start_dev_server() {
    print_header "🚀 Starting Development Server"
    
    print_message "$YELLOW" "⚡ Starting Next.js development server..."
    print_message "$BLUE" "\n📍 The app will be available at: $APP_URL"
    print_message "$YELLOW" "\n💡 Press Ctrl+C to stop the server\n"
    
    # Start the dev server (this will block)
    npm run dev
}

# Display final information
show_final_info() {
    print_header "✅ FrugalAIGpt Development Setup Complete!"
    
    echo ""
    print_message "$GREEN" "🎉 All checks passed!"
    echo ""
    print_message "$BLUE" "📍 Access Points:"
    echo "   • Main App:      $APP_URL"
    echo "   • Metrics:       $APP_URL/metrics"
    echo "   • Analytics:     $APP_URL/analytics"
    echo "   • Discovery:     $APP_URL/discover"
    echo "   • Settings:      $APP_URL/settings"
    echo ""
    
    if command_exists ollama; then
        print_message "$BLUE" "🤖 Ollama Commands:"
        echo "   • List models:   ollama list"
        echo "   • Pull model:    ollama pull <model>"
        echo "   • Remove model:  ollama rm <model>"
        echo ""
    fi
    
    print_message "$YELLOW" "💡 Tips:"
    echo "   • Configure API keys in config.toml"
    echo "   • Hot reload is enabled for development"
    echo "   • Check console for any errors"
    echo ""
}

# Main execution
main() {
    clear
    
    print_message "$BLUE" "╔════════════════════════════════════════════════════════╗"
    print_message "$BLUE" "║                                                        ║"
    print_message "$BLUE" "║      🚀 FrugalAIGpt Development Startup Script 🚀     ║"
    print_message "$BLUE" "║                                                        ║"
    print_message "$BLUE" "╚════════════════════════════════════════════════════════╝"
    
    # Handle reset mode
    if [ "$RESET_MODE" = true ]; then
        reset_application
    fi
    
    # Run startup sequence
    check_prerequisites
    start_ollama
    pull_ollama_models
    run_migrations
    show_final_info
    
    # Start dev server (this will block)
    start_dev_server
}

# Run main function
main
