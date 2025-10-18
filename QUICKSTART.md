# Frugal RAG Quick Start

Get the demo running in 5 minutes!

## Prerequisites

- Docker & Docker Compose
- Ollama installed

## Step 1: Install Models (2 minutes)

```bash
# Ultra-fast Tier 1 model (IBM Granite 4 Micro)
ollama pull granite4:micro

# Smart Tier 2 model (Mistral 7B)
ollama pull mistral:7b
```

## Step 2: Configure (30 seconds)

```bash
# Copy config
cp sample.config.toml config.toml

# Edit config.toml and set:
# [MODELS.OLLAMA]
# API_URL = "http://host.docker.internal:11434"
```

## Step 3: Start System (1 minute)

```bash
docker compose up -d
```

## Step 4: Test! (2 minutes)

### Open the app
http://localhost:3000

### Try these queries:

1. **Canned (instant, free)**
   ```
   hello
   ```

2. **Cache (instant after first time)**
   ```
   What is Docker?
   (ask again - instant!)
   ```

3. **Tier 1 (ultra-fast, cheap)**
   ```
   What is the capital of France?
   ```

4. **Tier 2 (smart, expensive)**
   ```
   Explain quantum entanglement
   ```

### View metrics
http://localhost:3000/metrics

## What You'll See

- ⚡ **Instant responses** for greetings
- 🎯 **Cache hits** for repeated questions
- 🚀 **Ultra-fast** granite4:micro for simple queries
- 🧠 **Smart** mistral:7b for complex reasoning
- 💰 **40-60% cost savings** in metrics dashboard

## Troubleshooting

### "Cannot connect to Ollama"
```bash
# Check Ollama is running
ollama list

# On Linux, expose to network
export OLLAMA_HOST=0.0.0.0:11434
ollama serve
```

### "Model not found"
```bash
ollama pull granite4:micro
ollama pull mistral:7b
```

### Slow responses
- First query loads the model (slower)
- Subsequent queries are much faster
- This is normal!

## Next Steps

- Read `DEMO_CHEATSHEET.md` for demo script
- Read `FRUGAL_FEATURES.md` for full documentation
- Read `WHY_GRANITE4_MICRO.md` to understand the model choice

## Why granite4:micro?

- ✅ Ultra-lightweight (1-2GB vs 4-8GB)
- ✅ Blazing fast (100+ tokens/sec on CPU)
- ✅ Perfect for 90% of queries
- ✅ Maximum cost savings
- ✅ Great demo experience

Enjoy your frugal RAG system! 🎉
