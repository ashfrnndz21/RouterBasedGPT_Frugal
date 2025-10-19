# Frugal RAG Demo Cheatsheet

Quick reference for demonstrating the frugal features.

## URLs
- **Main App**: http://localhost:3000
- **Metrics Dashboard**: http://localhost:3000/metrics
- **Metrics API**: http://localhost:3000/api/metrics

## Test Queries

### 1. Canned Responses (Free, Instant)
```
hello
hi
what can you do
help
thanks
```
**Expected**: Instant response, no model call, shows "canned" in metrics

### 2. Semantic Cache (Free after first query)
```
First:  "What is Docker?"
Second: "Tell me about Docker"
Third:  "Explain Docker to me"
```
**Expected**: First query uses Tier 1, subsequent similar queries hit cache

### 3. Tier 1 - Simple Queries (1x cost)
```
What is the capital of France?
Who is the CEO of Tesla?
When was Python created?
Define machine learning
List the planets in our solar system
```
**Expected**: Ultra-fast response, routes to Tier 1 (granite4:micro)

### 4. Tier 2 - Complex Queries (3.5x cost)
```
Explain the relationship between quantum entanglement and information theory
Compare and contrast the advantages and disadvantages of microservices vs monolithic architecture
Analyze the implications of climate change on global food security
What are the philosophical implications of artificial general intelligence?
```
**Expected**: More detailed response, routes to Tier 2 (qwen3:1.7b)

## Demo Flow (5 minutes)

### Minute 1: Introduction
"This is a frugal RAG system that cuts AI costs by 40-60% through intelligent routing"

### Minute 2: Canned Responses
1. Type: `hello`
2. Point out: "Instant, no AI model needed"
3. Show metrics: "See the 'canned' route"

### Minute 3: Semantic Cache
1. Type: `What is Docker?`
2. Wait for response
3. Type: `Tell me about Docker`
4. Point out: "Much faster! It cached the answer"
5. Show metrics: "Cache hit rate increasing"

### Minute 4: Tiered Models
1. Type: `What is the capital of France?`
2. Point out: "Simple question, uses cheap Tier 1 model"
3. Type: `Explain quantum entanglement`
4. Point out: "Complex question, uses smart Tier 2 model"

### Minute 5: Cost Savings
1. Open metrics dashboard
2. Point to cache hit rate
3. Point to query distribution
4. **Highlight cost savings percentage**
5. "This is how we save 40-60% on production costs"

## Key Talking Points

### Problem
"AI APIs are expensive. Every query costs money. At scale, costs add up fast."

### Solution
"Our frugal system uses 4 strategies:
1. Canned responses for simple queries (free)
2. Semantic caching for repeated questions (free)
3. Cheap models for simple questions (1x cost)
4. Expensive models only for complex reasoning (3.5x cost)"

### Results
"40-60% cost savings while maintaining quality"

### Proof
"The metrics dashboard shows exactly where costs are going and how much we're saving"

## Metrics Dashboard Explained

### Top Cards
- **Total Queries**: All queries processed
- **Cache Hit Rate**: % served from cache (target: 20-30%)
- **Avg Latency**: Response time in milliseconds
- **Cost Savings**: % saved vs. no optimization

### Cost Analysis
- **With Frugal System**: Actual cost
- **Without Optimization**: Cost if everything used Tier 2
- **Savings**: The difference (your money saved!)

### Query Distribution
- **Canned**: Free, instant
- **Cache Hits**: Free, cached
- **Tier 1**: 1x cost (cheap)
- **Tier 2**: 3.5x cost (expensive)

### Recent Queries Table
- Shows last 20 queries
- Route taken for each
- Cache hit/miss
- Latency

## Common Questions

**Q: How does the cache know queries are similar?**
A: "We use vector embeddings and cosine similarity. If two queries are >95% similar, we return the cached answer."

**Q: What if the cache gives wrong answers?**
A: "The similarity threshold is very high (95%). Plus, we can invalidate cache entries or adjust the threshold."

**Q: How do you decide which tier to use?**
A: "Pattern matching on query complexity. Simple factual questions → Tier 1. Complex reasoning → Tier 2."

**Q: Can users choose the tier?**
A: "Currently automatic, but we could add manual override for power users."

**Q: What about production deployment?**
A: "We'd upgrade to Redis cache, vLLM inference, and add user authentication. The core logic is production-ready."

## Troubleshooting During Demo

### Cache not hitting
- Queries need to be very similar
- Try asking the exact same question
- Check console logs

### Slow responses
- Models need to be loaded in Ollama
- First query is always slower (model loading)
- Subsequent queries are faster

### Metrics not showing
- Refresh the page
- Make sure you've asked at least one question
- Check browser console

### Ollama errors
- Verify Ollama is running: `ollama list`
- Check models are installed: `ollama pull granite4:micro`
- Check config.toml has correct Ollama URL

## After Demo

### Next Steps to Discuss
1. "Want to add user authentication?"
2. "Need rate limiting for production?"
3. "Want to fine-tune the router on your query logs?"
4. "Ready to deploy with Redis and vLLM?"

### Files to Share
- `FRUGAL_FEATURES.md` - Full documentation
- `DEMO_SETUP.md` - Setup instructions
- `IMPLEMENTATION_SUMMARY.md` - Technical details
- `.kiro/specs/frugal-rag-platform/` - Complete spec

## Quick Commands

```bash
# Start system
docker compose up -d

# View logs
docker compose logs -f

# Check Ollama models
ollama list

# Pull models
ollama pull granite4:micro
ollama pull qwen3:1.7b

# Stop system
docker compose down

# Clear metrics (via API)
curl -X DELETE http://localhost:3000/api/metrics
```

## Success Metrics

After demo, you should see:
- ✅ Cache hit rate: 15-30%
- ✅ Tier 1 usage: 60-80%
- ✅ Tier 2 usage: 10-20%
- ✅ Canned responses: 5-10%
- ✅ Cost savings: 40-60%

## Backup Plan

If something breaks during demo:
1. Show the metrics dashboard (pre-populated)
2. Walk through the code architecture
3. Show the spec documents
4. Explain the cost calculation manually

---
*Last updated: October 19, 2025*
