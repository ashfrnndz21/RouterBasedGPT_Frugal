#!/bin/bash
# Run the FrugalAIGpt app container with proper volume mounts

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "🚀 Running FrugalAIGpt app container..."
echo ""

cd "$PROJECT_ROOT"

# Check if config.toml exists
if [ ! -f "$PROJECT_ROOT/config.toml" ]; then
  echo "⚠️  Warning: config.toml not found!"
  echo "   Creating from sample.config.toml..."
  if [ -f "$PROJECT_ROOT/sample.config.toml" ]; then
    cp "$PROJECT_ROOT/sample.config.toml" "$PROJECT_ROOT/config.toml"
    echo "✅ Created config.toml from sample"
  else
    echo "❌ sample.config.toml not found. Please create config.toml manually."
    exit 1
  fi
fi

# Check if image exists
if ! docker image inspect frugalaigpt-app:latest > /dev/null 2>&1; then
  echo "📦 Image not found. Building first..."
  ./dockers/build-app.sh
fi

# Create volumes if they don't exist
docker volume create frugalaigpt-data 2>/dev/null || true
docker volume create frugalaigpt-uploads 2>/dev/null || true

# Get Ollama URL from config or use default
OLLAMA_URL="${OLLAMA_API_URL:-http://localhost:11434}"

echo "🔧 Configuration:"
echo "   Config file: $PROJECT_ROOT/config.toml"
echo "   Ollama URL: $OLLAMA_URL"
echo "   Port: 3000"
echo ""

# Run the container
docker run -it --rm \
  -p 3000:3000 \
  -v "$PROJECT_ROOT/config.toml:/home/frugalaigpt/config.toml:ro" \
  -v frugalaigpt-data:/home/frugalaigpt/data \
  -v frugalaigpt-uploads:/home/frugalaigpt/uploads \
  -e OLLAMA_API_URL="$OLLAMA_URL" \
  --name frugalaigpt-app \
  frugalaigpt-app:latest
