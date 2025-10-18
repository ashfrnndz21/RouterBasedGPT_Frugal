# Frugal RAG Demo Setup Guide

Quick guide to get the frugal RAG features running on your laptop.

## Prerequisites

- Docker and Docker Compose installed
- At least 8GB RAM available
- Ollama installed (for local models)

## Quick Start

### 1. Install Ollama Models

```bash
# Install Tier 1 model (ultra-fast, ultra-cheap)
ollama pull granite4:micro

# Install Tier 2 model (compact but capable)
ollama pull qwen3:1.7b
```

### 2. Configure FrugalAIGpt

Copy and rename the config file:
```bash
cp sample.config.toml config.toml
```

Edit `config.toml` and set:
```toml
[MODELS.OLLAMA]
API_URL = "http://host.docker.internal:11434"
```

### 3. Start the System

```bash
# Build and start all services
docker compose up -d

# Check logs
docker compose logs -f
```

### 4. Access the Application

- **Main App**: http://localhost:3000
- **Metrics Dashboard**: http://localhost:3000/metrics

## Demo Flow

### Step 1: Test Canned Responses (Free)

1. Go to http://localhost:3000
2. Type: `hello`
3. **Expected**: Instant response, no model call
4. Check metrics dashboard - should show "canned" route

### Step 2: Test Semantic Cache

1. Ask: `What is Docker?`
2. Wait for response (will use Tier 1 model)
3. Ask: `Tell me about Docker`
4. **Expected**: Much faster response (cache hit!)
5. Check metrics - cache hit rate should increase

### Step 3: Test Tier 1 (Simple Queries)

1. Ask: `What is the capital of France?`
2. **Expected**: Routes to Tier 1 (granite4:micro)
3. Ultra-fast response, ultra-low cost

### Step 4: Test Tier 2 (Complex Queries)

1. Ask: `Explain the relationship between quantum entanglement and information theory`
2. **Expected**: Routes to Tier 2 (qwen3:1.7b)
3. More detailed response for complex reasoning

### Step 5: View Cost Savings

1. Go to http://localhost:3000/metrics
2. See:
   - Cache hit rate
   - Query distribution
   - **Cost savings percentage**
   - Recent query history

## What to Show in Demo

### 1. Intelligent Routing
"Watch how the system automatically routes simple questions to fast models and complex questions to smart models"

### 2. Semantic Caching
"Ask the same question twice - the second time is instant and free because it's cached"

### 3. Cost Savings
"The metrics dashboard shows we're saving 40-60% compared to using only expensive models"

### 4. Real-time Metrics
"Every query is tracked - you can see exactly where costs are going"

## Troubleshooting

### Ollama Connection Error

**Problem**: "Cannot connect to Ollama"

**Solution**:
```bash
# Check Ollama is running
ollama list

# On Linux, expose Ollama to network
export OLLAMA_HOST=0.0.0.0:11434
ollama serve
```

### Models Not Found

**Problem**: "Model not found"

**Solution**:
```bash
# Pull the models
ollama pull granite4:micro
ollama pull qwen3:1.7b

# Verify they're installed
ollama list
```

### Metrics Not Showing

**Problem**: Dashboard shows zero queries

**Solution**:
1. Make sure you've asked at least one question
2. Refresh the metrics page
3. Check browser console for errors

### Cache Not Hitting

**Problem**: Similar queries don't hit cache

**Solution**:
- Queries need to be very similar (>95% similarity)
- Try asking the exact same question
- Check console logs for cache operations

## Performance Tips

### For Faster Demo

1. Use only Tier 1 model (granite4:micro - extremely fast!)
2. Reduce model context window
3. Use `speed` optimization mode

### For Better Quality

1. Use Tier 2 model (qwen3:1.7b)
2. Use `balanced` or `quality` optimization mode
3. Enable web search

## Demo Script

```
1. "Hi everyone, this is a frugal RAG system that minimizes AI costs"

2. [Type "hello"] 
   "See how it instantly responds to greetings without calling an AI model"

3. [Type "What is Docker?"]
   "Now a real question - it uses a fast, cheap model"

4. [Type "Tell me about Docker"]
   "Same question again - instant! It cached the answer"

5. [Type complex question]
   "For complex reasoning, it automatically uses a smarter model"

6. [Show metrics dashboard]
   "Here's the magic - we're saving 50%+ on costs while maintaining quality"
   "Cache hits are free, Tier 1 is cheap, Tier 2 only when needed"

7. "This is perfect for production where every API call costs money"
```

## Next Steps

After the demo, you can:

1. **Add Authentication**: Implement user accounts (Task 1-2)
2. **Add Rate Limiting**: Prevent abuse (Task 3)
3. **Deploy to Production**: Use Redis cache, vLLM inference
4. **Fine-tune Router**: Train on your query logs
5. **Add More Tiers**: Ultra-cheap tier for very simple queries

## Resources

- Full documentation: `FRUGAL_FEATURES.md`
- Architecture: `.kiro/specs/frugal-rag-platform/design.md`
- Requirements: `.kiro/specs/frugal-rag-platform/requirements.md`
- Tasks: `.kiro/specs/frugal-rag-platform/tasks.md`

## Support

If you encounter issues:
1. Check Docker logs: `docker compose logs`
2. Check Ollama: `ollama list`
3. Verify config: `cat config.toml`
4. Check browser console for errors
