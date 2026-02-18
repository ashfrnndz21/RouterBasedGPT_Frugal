#!/bin/bash
# Build the FrugalAIGpt app Docker image (without Ollama)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "🔨 Building FrugalAIGpt app image (no Ollama)..."
echo ""

cd "$PROJECT_ROOT"

docker build --platform linux/amd64 -f dockers/app/Dockerfile -t frugalaigpt-app:latest .

echo ""
echo "✅ App image built successfully!"
echo ""
echo "📦 Image: frugalaigpt-app:latest"
echo ""
echo "🚀 Next steps:"
echo ""
echo "   Run with config.toml mounted:"
echo "   docker run -p 3000:3000 \\"
echo "     -v \$(pwd)/config.toml:/home/frugalaigpt/config.toml:ro \\"
echo "     -v frugalaigpt-data:/home/frugalaigpt/data \\"
echo "     -v frugalaigpt-uploads:/home/frugalaigpt/uploads \\"
echo "     -e OLLAMA_API_URL=http://your-ollama-server:11434 \\"
echo "     frugalaigpt-app:latest"
echo ""
echo "   Or use docker-compose (recommended):"
echo "   cd dockers && docker compose up app"
