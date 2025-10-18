# Frugal RAG Features

This document describes the cost-optimization features added to FrugalAIGpt.

## Overview

The Frugal RAG system adds intelligent routing and caching to minimize operational costs while maintaining high-quality responses. Key features:

- **Semantic Caching**: 20-30% cost reduction by caching similar queries
- **Intelligent Routing**: Routes queries to appropriate processing paths
- **Tiered Models**: Uses cheap models for simple queries, expensive models for complex reasoning
- **Real-time Metrics**: Dashboard showing cost savings and performance

## Architecture

```
User Query → Frugal Router → [Canned | Cache | Tier 1 | Tier 2]
                                ↓        ↓        ↓        ↓
                            Instant  Cached   Fast    Smart
                            (free)   (free)   (1x)    (3.5x)
```

## Components

### 1. Frugal Router (`src/lib/routing/frugalRouter.ts`)

Classifies queries and routes them to the most cost-effective path:

- **Canned**: Greetings, meta queries → Instant, pre-defined responses
- **Cache**: Repeated/similar queries → Cached responses (near-zero cost)
- **Tier 1**: Simple factual queries → Fast, cheap model (Phi-3, Llama-3-8B)
- **Tier 2**: Complex reasoning → Smart, expensive model (Mistral-7B)

### 2. Semantic Cache (`src/lib/cache/semanticCache.ts`)

Vector-based caching that finds similar queries:

- Uses embedding similarity (cosine > 0.95)
- In-memory for demo (Redis in production)
- Tracks hit counts and statistics
- LRU eviction when full

### 3. Orchestration Service (`src/lib/orchestration/orchestrationService.ts`)

Coordinates the entire pipeline:

- Calls Frugal Router for routing decision
- Checks cache before expensive operations
- Falls back to RAG pipeline if needed
- Caches successful responses
- Tracks metrics for all queries

### 4. Metrics Dashboard (`src/app/metrics/page.tsx`)

Real-time visualization of:

- Cache hit rate
- Query distribution (canned/cache/tier1/tier2)
- Cost savings vs. no optimization
- Recent query history
- Average latency

## Usage

### Running the System

1. Start FrugalAIGpt normally:
```bash
docker compose up -d
```

2. Access the metrics dashboard:
```
http://localhost:3000/metrics
```

### Testing the Features

**Test Canned Responses:**
```
Query: "hello"
Expected: Instant response, no LLM call
```

**Test Semantic Cache:**
```
Query 1: "What is Docker?"
Query 2: "Tell me about Docker"
Expected: Second query hits cache (similar embedding)
```

**Test Tier 1 (Simple):**
```
Query: "What is the capital of France?"
Expected: Routes to Tier 1 model
```

**Test Tier 2 (Complex):**
```
Query: "Explain the implications of quantum entanglement on information theory"
Expected: Routes to Tier 2 model
```

## Configuration

### Model Tiers

Edit `src/lib/models/tierConfig.ts` to configure models:

```typescript
export const DEFAULT_TIER_CONFIGS = {
  tier1: {
    provider: 'ollama',
    modelName: 'granite4:micro',  // Ultra-fast, ultra-cheap
    costMultiplier: 1.0,
  },
  tier2: {
    provider: 'ollama',
    modelName: 'mistral:7b',  // Smart, expensive
    costMultiplier: 3.5,
  },
};
```

### Cache Settings

Edit `src/lib/cache/semanticCache.ts`:

```typescript
constructor(
  embeddings: Embeddings,
  similarityThreshold: number = 0.95,  // Adjust threshold
  maxCacheSize: number = 1000          // Max cached queries
)
```

### Router Patterns

Edit `src/lib/routing/frugalRouter.ts` to add patterns:

```typescript
const CANNED_RESPONSES: CannedResponse[] = [
  {
    pattern: /^your pattern here$/i,
    response: "Your response here",
  },
];
```

## Metrics Explained

### Cache Hit Rate
Percentage of queries served from cache. Target: 20-30% after warm-up.

### Cost Savings
Estimated savings compared to using only Tier 2 model with no caching:
- **With Tiering**: Actual cost with our system
- **Without Optimization**: Cost if everything used Tier 2
- **Savings**: Difference (typically 40-60%)

### Query Distribution
- **Canned**: Free, instant responses
- **Cache**: Free, cached responses
- **Tier 1**: 1x cost (base)
- **Tier 2**: 3.5x cost (expensive)

## Production Deployment

For production, upgrade these components:

1. **Cache**: Replace in-memory with Redis + RediSearch
2. **Metrics**: Persist to PostgreSQL/TimescaleDB
3. **Router**: Fine-tune DistilBERT classifier on your query logs
4. **Models**: Deploy with vLLM for optimized inference

## Cost Analysis

Example savings for 1000 queries:

**Without Frugal System:**
- All queries use Tier 2: 1000 × 3.5 = 3500 cost units

**With Frugal System:**
- 100 canned (free): 0
- 200 cache hits (free): 0
- 600 Tier 1: 600 × 1.0 = 600
- 100 Tier 2: 100 × 3.5 = 350
- **Total: 950 cost units**
- **Savings: 73%**

## Troubleshooting

### Cache not hitting
- Check similarity threshold (may be too high)
- Verify embeddings are being generated
- Check console logs for cache operations

### Wrong tier routing
- Review query patterns in `frugalRouter.ts`
- Check console logs for routing decisions
- Adjust complexity classification logic

### Metrics not updating
- Verify `/api/metrics` endpoint is accessible
- Check browser console for errors
- Ensure metrics tracker is imported correctly

## Future Enhancements

- [ ] User-specific caching (multi-tenancy)
- [ ] A/B testing different routing strategies
- [ ] Cost budgets and alerts
- [ ] Fine-tuned router model
- [ ] Redis-backed cache with persistence
- [ ] Advanced metrics (cost per user, per query type)
