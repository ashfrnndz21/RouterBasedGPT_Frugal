#!/bin/sh
set -e

echo "🚀 Starting FrugalAIGpt Application..."
echo "📡 Ollama should be running in a separate container or remote server"

# Optional: Check if external Ollama is reachable
if [ -n "$OLLAMA_API_URL" ]; then
  echo "📡 Checking connection to Ollama at $OLLAMA_API_URL..."
  for i in $(seq 1 30); do
    if curl -s --max-time 5 "$OLLAMA_API_URL/api/tags" > /dev/null 2>&1; then
      echo "✅ Ollama is reachable at $OLLAMA_API_URL"
      break
    fi
    if [ $i -eq 30 ]; then
      echo "⚠️  Warning: Cannot reach Ollama at $OLLAMA_API_URL"
      echo "   Make sure Ollama container is running and accessible"
      echo "   The app will continue but Ollama models won't be available"
    fi
    sleep 1
  done
else
  echo "ℹ️  OLLAMA_API_URL not set - configure Ollama URL in config.toml"
  echo "   Default: http://ollama:11434 (for Docker) or http://localhost:11434 (for local)"
fi

# Run database migrations
echo "🗄️  Running database migrations..."
node migrate.js || echo "⚠️  Migration failed or already completed"

# Start the Next.js application
echo "🚀 Starting Next.js application..."
exec node server.js
