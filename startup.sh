#!/bin/bash

# FrugalAIGpt Startup Script
# This script starts all required services for FrugalAIGpt
# Usage: ./startup.sh [--reset]

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
METRICS_URL="http://localhost:${APP_PORT}/metrics"
OLLAMA_URL="http://localhost:11434"
REQUIRED_MODELS=("granite4:micro" "qwen3:1.7b" "qwen3-embedding:0.6b")

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
    echo "   • Stop all Docker containers"
    echo "   • Remove all volumes (database, uploads)"
    echo "   • Clear all data"
    echo "   • Free up port $APP_PORT"
    echo ""
    
    read -p "$(print_message "$RED" "Are you sure? This cannot be undone! (yes/no): ")" -r
    echo ""
    
    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        print_message "$YELLOW" "Reset cancelled."
        exit 0
    fi
    
    print_message "$YELLOW" "⚡ Stopping and removing containers..."
    docker compose down -v 2>/dev/null || true
    
    print_message "$YELLOW" "⚡ Cleaning up port $APP_PORT..."
    kill_port $APP_PORT
    
    print_message "$YELLOW" "⚡ Removing local data..."
    rm -rf data/*.db 2>/dev/null || true
    rm -rf uploads/* 2>/dev/null || true
    
    print_message "$GREEN" "✓ Application reset complete!"
    echo ""
    print_message "$BLUE" "You can now start fresh with: ./startup.sh"
    exit 0
}

# Check prerequisites
check_prerequisites() {
    print_header "🔍 Checking Prerequisites"
    
    local missing_deps=()
    
    # Check Docker
    if command_exists docker; then
        print_message "$GREEN" "✓ Docker is installed"
    else
        print_message "$RED" "✗ Docker is not installed"
        missing_deps+=("Docker")
    fi
    
    # Check Docker Compose
    if docker compose version >/dev/null 2>&1; then
        print_message "$GREEN" "✓ Docker Compose is installed"
    else
        print_message "$RED" "✗ Docker Compose is not installed"
        missing_deps+=("Docker Compose")
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
    
    # Check if port is available
    if check_port $APP_PORT; then
        print_message "$YELLOW" "⚠ Port $APP_PORT is already in use"
        read -p "$(print_message "$YELLOW" "Would you like to free up port $APP_PORT? (y/n): ")" -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            kill_port $APP_PORT
        else
            print_message "$RED" "✗ Cannot start app on port $APP_PORT"
            print_message "$YELLOW" "  Please free the port manually or use: ./startup.sh --reset"
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

# Start Docker services
start_docker_services() {
    print_header "🐳 Starting Docker Services"
    
    print_message "$YELLOW" "⚡ Building and starting containers..."
    
    # Stop any existing containers
    docker compose down 2>/dev/null || true
    
    # Start services
    if docker compose up -d --build; then
        print_message "$GREEN" "✓ Docker services started successfully"
    else
        print_message "$RED" "✗ Failed to start Docker services"
        exit 1
    fi
}

# Wait for services to be ready
wait_for_services() {
    print_header "⏳ Waiting for Services"
    
    print_message "$YELLOW" "⏳ Waiting for app to be ready..."
    
    local max_attempts=60
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -s "$APP_URL" >/dev/null 2>&1; then
            print_message "$GREEN" "✓ App is ready!"
            return 0
        fi
        
        attempt=$((attempt + 1))
        echo -n "."
        sleep 2
    done
    
    echo ""
    print_message "$YELLOW" "⚠ App did not respond in time, but may still be starting..."
    print_message "$YELLOW" "  Check logs with: docker compose logs -f app"
}

# Display service status
show_status() {
    print_header "📊 Service Status"
    
    echo ""
    docker compose ps
    echo ""
}

# Open browser
open_browser() {
    print_header "🌐 Opening Browser"
    
    print_message "$YELLOW" "🌐 Opening FrugalAIGpt in your browser..."
    
    # Open browser based on OS
    if [[ "$OSTYPE" == "darwin"* ]]; then
        open "$APP_URL"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        xdg-open "$APP_URL" 2>/dev/null || {
            print_message "$YELLOW" "  Please open manually: $APP_URL"
        }
    else
        print_message "$YELLOW" "  Please open manually: $APP_URL"
    fi
}

# Display final information
show_final_info() {
    print_header "✅ FrugalAIGpt is Running!"
    
    echo ""
    print_message "$GREEN" "🎉 All services are up and running!"
    echo ""
    print_message "$BLUE" "📍 Access Points:"
    echo "   • Main App:      $APP_URL"
    echo "   • Metrics:       $METRICS_URL"
    echo "   • Analytics:     $APP_URL/analytics"
    echo "   • Discovery:     $APP_URL/discover"
    echo "   • Settings:      $APP_URL/settings"
    echo ""
    print_message "$BLUE" "🛠️  Useful Commands:"
    echo "   • View logs:     docker compose logs -f"
    echo "   • Stop app:      docker compose down"
    echo "   • Restart:       docker compose restart"
    echo "   • Rebuild:       docker compose up -d --build"
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
    echo "   • Check metrics at $METRICS_URL"
    echo "   • Press Ctrl+C to stop viewing logs"
    echo ""
}

# Main execution
main() {
    clear
    
    print_message "$BLUE" "╔════════════════════════════════════════════════════════╗"
    print_message "$BLUE" "║                                                        ║"
    print_message "$BLUE" "║           🚀 FrugalAIGpt Startup Script 🚀            ║"
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
    start_docker_services
    wait_for_services
    show_status
    open_browser
    show_final_info
    
    # Ask if user wants to view logs
    echo ""
    read -p "$(print_message "$YELLOW" "Would you like to view the logs? (y/n): ")" -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_message "$BLUE" "\n📋 Showing logs (Press Ctrl+C to exit)...\n"
        docker compose logs -f
    fi
}

# Run main function
main
