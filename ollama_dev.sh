#!/usr/bin/env bash
set -e

# ==============================
# CONFIG
# ==============================
OLLAMA_HOST_IP="0.0.0.0"
OLLAMA_PORT="11434"

REQUIRED_MODELS=(
  "granite4:micro"
  "qwen3:1.7b"
  "qwen3-embedding:0.6b"
)

# ==============================
# FIND OLLAMA BINARY
# ==============================
if command -v ollama >/dev/null 2>&1; then
  OLLAMA_BIN="$(command -v ollama)"
elif [ -x "/usr/local/bin/ollama" ]; then
  OLLAMA_BIN="/usr/local/bin/ollama"
elif [ -x "/opt/homebrew/bin/ollama" ]; then
  OLLAMA_BIN="/opt/homebrew/bin/ollama"
else
  echo "❌ Ollama not found"
  echo "➡ Install first: curl -fsSL https://ollama.com/install.sh | sh"
  exit 1
fi

echo "✅ Using Ollama binary: $OLLAMA_BIN"

# ==============================
# EXPORT HOST
# ==============================
export OLLAMA_HOST="${OLLAMA_HOST_IP}:${OLLAMA_PORT}"

# ==============================
# START OLLAMA
# ==============================
echo "🚀 Starting Ollama on ${OLLAMA_HOST}"
nohup "$OLLAMA_BIN" serve > /tmp/ollama.log 2>&1 &
OLLAMA_PID=$!

sleep 3

# ==============================
# PULL REQUIRED MODELS
# ==============================
for model in "${REQUIRED_MODELS[@]}"; do
  if ! "$OLLAMA_BIN" list | grep -q "$model"; then
    echo "⬇️  Pulling model: $model"
    "$OLLAMA_BIN" pull "$model"
  else
    echo "✅ Model already present: $model"
  fi
done

# ==============================
# HEALTH CHECK
# ==============================
echo "🔎 Health check..."
if curl -s "http://${OLLAMA_HOST}/api/tags" >/dev/null; then
  echo "✅ Ollama exposed at http://${OLLAMA_HOST}"
else
  echo "❌ Ollama not reachable"
  echo "📄 Logs:"
  tail -20 /tmp/ollama.log
fi

# ==============================
# KEEP ALIVE
# ==============================
wait $OLLAMA_PID