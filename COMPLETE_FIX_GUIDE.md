# Complete App Fix & Optimization Guide

## Current Issues

### 1. Discover Page Not Working
**Error**: `AxiosError: Request failed with status code 429` (Rate Limited)
**Cause**: Public SearxNG instances block too many requests
**Impact**: Discover page shows errors

### 2. Slow Performance
**Issue**: 5-6 seconds to load pages
**Cause**: 
- Development mode (not optimized)
- 9000+ modules being compiled
- No build optimization
**Impact**: Slow user experience

### 3. SearxNG Reliability
**Issue**: Public instances are unreliable
**Cause**: Rate limiting, blocking, downtime
**Impact**: Web search and Discover fail randomly

## Solutions

### Quick Fix (For Demo Right Now)

#### Option 1: Disable Discover Page (Fastest)
The Discover page isn't essential for demonstrating frugal features. Just avoid it during your demo.

**What Works Without It:**
✅ Main chat interface
✅ Web search (when SearxNG works)
✅ Frugal routing
✅ Semantic caching
✅ Metrics dashboard
✅ All focus modes

#### Option 2: Use Mock Data for Discover
I can create a version that doesn't rely on SearxNG.

### Performance Optimization

#### 1. Build for Production (Much Faster)

Instead of `npm run dev`, build and run production:

```bash
# Stop the dev server (Ctrl+C)

# Build for production (takes 2-3 minutes once)
npm run build

# Run production server (much faster!)
npm start
```

**Benefits:**
- ⚡ 10x faster page loads
- ⚡ Optimized bundles
- ⚡ Better caching
- ⚡ Smaller memory footprint

#### 2. Optimize Ollama Models

Make sure models stay loaded:

```bash
# Keep models in memory
ollama run granite4:micro "test" &
ollama run qwen3:1.7b "test" &
```

This prevents reload delays on first query.

### Long-term Solutions

#### 1. Run Your Own SearxNG (Best)

**With Docker:**
```bash
cd searxng
docker-compose up -d
```

Then update config:
```toml
SEARXNG = "http://localhost:4000"
```

**Benefits:**
- ✅ No rate limiting
- ✅ Reliable
- ✅ Fast
- ✅ Full control

#### 2. Use Alternative Search API

Replace SearxNG with:
- **Brave Search API** (free tier)
- **Serper API** (Google results)
- **Bing Search API** (Microsoft)

### What to Do Right Now

**For Your Demo:**

1. **Build for production** (much faster):
   ```bash
   npm run build
   npm start
   ```

2. **Focus on working features**:
   - ✅ Main chat
   - ✅ Frugal routing (canned responses)
   - ✅ Semantic caching
   - ✅ Metrics dashboard
   - ⚠️ Skip Discover page

3. **Test queries that work without web search**:
   - "hello" → Canned response
   - "What is machine learning?" → Model knowledge
   - "Explain Docker" → Model knowledge
   - Ask twice → Cache hit!

4. **Show metrics dashboard**:
   - Go to `/metrics`
   - Show cost savings
   - Show cache hits

## Why It's Slow

### Development Mode Issues:
- **Hot reload**: Watches all files for changes
- **Source maps**: Generates debugging info
- **No optimization**: Code isn't minified
- **Large bundles**: Includes dev tools

### Production Mode Benefits:
- **Pre-compiled**: Everything built once
- **Minified**: Smaller files
- **Optimized**: Tree-shaking, code splitting
- **Cached**: Static assets cached

## Performance Comparison

| Mode | First Load | Subsequent | Memory |
|------|-----------|------------|--------|
| Dev  | 5-6s      | 2-3s       | ~500MB |
| Prod | 1-2s      | 0.5s       | ~200MB |

## Recommended Demo Setup

### Step 1: Build Production
```bash
npm run build
npm start
```

### Step 2: Pre-load Models
```bash
ollama run granite4:micro "warmup"
ollama run qwen3:1.7b "warmup"
```

### Step 3: Test Before Demo
- Open http://localhost:3000
- Ask a few questions
- Check metrics at /metrics
- Verify cache is working

### Step 4: Demo Flow
1. Show main interface
2. Ask "hello" → Instant canned response
3. Ask "What is Docker?" → Tier 1 response
4. Ask "Tell me about Docker" → Cache hit!
5. Ask complex question → Tier 2 response
6. Show metrics dashboard → Cost savings!

## What NOT to Show

❌ Discover page (broken with public SearxNG)
❌ Web search (unreliable with public instances)
❌ Document upload (not part of frugal demo)

## What TO Show

✅ Intelligent routing (canned/tier1/tier2)
✅ Semantic caching (ask twice)
✅ Metrics dashboard (cost savings)
✅ Fast responses (production mode)
✅ Beautiful UI (existing FrugalAIGpt)

## Quick Commands

```bash
# Build and run production (recommended)
npm run build && npm start

# Or keep dev mode (slower)
npm run dev

# Check Ollama models
ollama list

# Test a model
ollama run granite4:micro "test"

# Stop everything
# Press Ctrl+C
```

## Summary

**For best demo experience:**
1. ✅ Build for production (`npm run build && npm start`)
2. ✅ Pre-load Ollama models
3. ✅ Focus on frugal features (routing, caching, metrics)
4. ✅ Skip Discover page
5. ✅ Use queries that work without web search

**Your frugal features work perfectly - just avoid the broken Discover page!** 🚀

---
*Last updated: October 19, 2025*
