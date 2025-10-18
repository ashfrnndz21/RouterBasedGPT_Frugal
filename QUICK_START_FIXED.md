# Quick Start - Fixed Setup

## Issues Fixed ✅

1. ✅ Database initialized (migrations run)
2. ✅ Ollama configured (localhost:11434)
3. ✅ Models available (granite4:micro, qwen3:1.7b)

## Current Setup

### Models Available:
- **Tier 1**: granite4:micro (3.4B, 2.1GB)
- **Tier 2**: qwen3:1.7b (2.0B, 1.4GB)

### What's Working:
- ✅ Chat interface
- ✅ Frugal routing
- ✅ Semantic caching
- ✅ Metrics dashboard
- ✅ Writing Assistant mode (no web search needed)

### What's NOT Working:
- ❌ Web search (SearxNG not configured)
- ❌ Academic/YouTube/Reddit search modes

## How to Use the App

### 1. Start the App
```bash
npm run dev
```

### 2. Access the Interface
- Main app: http://localhost:3000
- Metrics: http://localhost:3000/metrics

### 3. Use Writing Assistant Mode

**IMPORTANT**: Select "Writing Assistant" mode in the UI to avoid web search errors!

The Writing Assistant mode:
- ✅ Works without SearxNG
- ✅ Uses frugal routing
- ✅ Demonstrates cache hits
- ✅ Shows tier selection

### 4. Test Queries

**In Writing Assistant mode:**

```
Simple (Tier 1 - granite4:micro):
- "Write a short poem about AI"
- "Explain what machine learning is"
- "Define quantum computing"

Complex (Tier 2 - qwen3:1.7b):
- "Write an essay comparing supervised and unsupervised learning"
- "Explain the philosophical implications of AI consciousness"
- "Analyze the pros and cons of neural networks"

Canned (instant):
- "hello"
- "hi"
- "thanks"
```

### 5. View Metrics
Go to http://localhost:3000/metrics to see:
- Cache hit rate
- Tier 1 vs Tier 2 usage
- Cost savings
- Query history

## If You Want Web Search

You need to start SearxNG. Two options:

### Option A: Docker (Recommended)
```bash
docker run -d -p 8080:8080 searxng/searxng:latest
```

Then update `config.toml`:
```toml
[API_ENDPOINTS]
SEARXNG = "http://localhost:8080"
```

### Option B: Use Public Instance (Not Recommended)
Update `config.toml`:
```toml
[API_ENDPOINTS]
SEARXNG = "https://searx.be"
```

## Current Model Configuration

The app is configured to use:

**Tier 1 (Fast & Cheap):**
- Model: granite4:micro
- Size: 2.1GB
- Speed: ⚡⚡⚡⚡⚡
- Cost: 1.0x

**Tier 2 (Smart):**
- Model: qwen3:1.7b  
- Size: 1.4GB
- Speed: ⚡⚡⚡⚡
- Cost: 2.5x

## Troubleshooting

### App Hangs
- Make sure you're in "Writing Assistant" mode
- Don't use "Web Search" mode without SearxNG

### Database Errors
```bash
npm run db:migrate
```

### Ollama Not Found
```bash
# Check Ollama is running
ollama list

# Should show granite4:micro and qwen3:1.7b
```

### Models Not Loading
```bash
# Pull models if needed
ollama pull granite4:micro
ollama pull qwen3:1.7b
```

## Demo Flow (Without Web Search)

1. **Start app**: `npm run dev`
2. **Open**: http://localhost:3000
3. **Select**: "Writing Assistant" mode
4. **Test canned**: Type "hello"
5. **Test Tier 1**: "Write a haiku about coding"
6. **Test cache**: Ask same question twice
7. **Test Tier 2**: "Write an essay about AI ethics"
8. **View metrics**: http://localhost:3000/metrics

## What You'll See

### In the Chat:
- Fast responses from granite4:micro
- Detailed responses from qwen3:1.7b
- Instant canned responses
- Cache hits on repeated queries

### In the Metrics Dashboard:
- Total queries processed
- Cache hit rate (should increase)
- Tier 1 vs Tier 2 distribution
- Cost savings percentage
- Recent query history

## Success!

Your frugal RAG system is working! The key is using **Writing Assistant mode** which doesn't require web search. This perfectly demonstrates:

✅ Intelligent routing
✅ Semantic caching
✅ Tiered models
✅ Cost savings

All without needing SearxNG! 🎉
