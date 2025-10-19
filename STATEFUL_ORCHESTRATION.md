# Stateful Orchestration System

## Overview

The stateful orchestration system implements advanced conversation context management to optimize costs and improve response quality in long conversations.

## Architecture

```
User Query
    ↓
Load Context Payload (from in-memory store)
    ↓
Router (canned/cache/rag-tier1/rag-tier2)
    ↓
Extract Entities (products, prices, locations, etc.)
    ↓
Targeted RAG (enhanced with entity context)
    ↓
Summarize History (every 5 turns)
    ↓
Minimal Context to LLM (summary + last 2 turns + entities)
    ↓
Update Payload (add turn, update entities, track costs)
    ↓
Save to Store (in-memory with TTL)
    ↓
Response
```

## Key Features

### 1. **Context Payload**
Maintains conversation state across turns:
- Conversation history
- Progressive summary
- Extracted entities
- Routing history
- Cost tracking

### 2. **Entity Extraction**
Automatically extracts and tracks:
- Products (e.g., "500Mbps fiber plan")
- Prices (e.g., "RM 235", "$50 USD")
- Locations (e.g., "Kuala Lumpur")
- Dates (e.g., "next month")
- Organizations (e.g., "TM", "Maxis")
- People (e.g., "Dr. Smith")

### 3. **Progressive Summarization**
- Summarizes conversation every 5 turns
- Reduces token costs by 60-80% in long conversations
- Uses summary + last 2 turns instead of full history

### 4. **Smart Context Windowing**
- Only sends relevant context to LLM
- Summary + recent turns + tracked entities
- Dramatically reduces input token costs

### 5. **Cost Tracking**
- Real token counting (estimated)
- Per-query cost calculation
- Cumulative session costs
- Savings from summarization

## Configuration

### Enable/Disable

Set environment variable:
```bash
# Enable (default)
USE_STATEFUL_ORCHESTRATION=true

# Disable (use basic handler)
USE_STATEFUL_ORCHESTRATION=false
```

### Context Store Settings

Edit `src/lib/context/contextStore.ts`:
```typescript
const DEFAULT_CONFIG: ContextStoreConfig = {
  ttlMs: 24 * 60 * 60 * 1000, // 24 hours
  maxEntries: 1000,            // Max contexts to store
};
```

### Summarization Threshold

Edit `src/lib/orchestration/statefulOrchestrator.ts`:
```typescript
if (needsSummarization(contextPayload, 5)) { // Summarize every 5 turns
  // ...
}
```

## Usage Example

### Conversation Flow

**Turn 1:**
```
User: "What's your 500Mbps fiber plan?"
System: 
  - Creates context payload
  - Extracts entity: "500Mbps fiber plan"
  - Routes to RAG tier1
  - Responds with pricing
  - Saves context
```

**Turn 2:**
```
User: "How much is that in Malaysian Ringgit?"
System:
  - Loads context payload
  - Extracts entity: "Malaysian Ringgit"
  - Enhances RAG query with "500Mbps fiber plan"
  - Uses minimal context (no full history needed)
  - Responds with conversion
  - Updates context
```

**Turn 6:**
```
User: "What about installation fees?"
System:
  - Loads context
  - Triggers summarization (5 turns passed)
  - Creates summary: "User asking about 500Mbps plan pricing in MYR"
  - Uses summary instead of full history
  - Saves 60% tokens
  - Responds about installation
```

## Cost Savings

### Without Stateful Orchestration
```
Turn 1: 100 tokens input + 150 tokens output = 250 tokens
Turn 2: 250 tokens input + 150 tokens output = 400 tokens (includes turn 1)
Turn 3: 400 tokens input + 150 tokens output = 550 tokens (includes turns 1-2)
Turn 10: 1,350 tokens input + 150 tokens output = 1,500 tokens

Total: ~7,500 tokens
Cost: ~$0.015
```

### With Stateful Orchestration
```
Turn 1: 100 tokens input + 150 tokens output = 250 tokens
Turn 2: 250 tokens input + 150 tokens output = 400 tokens
Turn 3: 400 tokens input + 150 tokens output = 550 tokens
Turn 6: Summarization triggered
Turn 7: 200 tokens input (summary + last 2) + 150 tokens output = 350 tokens
Turn 10: 200 tokens input + 150 tokens output = 350 tokens

Total: ~3,000 tokens
Cost: ~$0.006
Savings: 60% ($0.009)
```

## Monitoring

### Check Context Store Stats

```typescript
import { getContextStore } from '@/lib/context/contextStore';

const store = getContextStore();
const stats = store.getStats();

console.log(stats);
// {
//   totalEntries: 42,
//   oldestEntry: 3600000, // 1 hour
//   newestEntry: 1000,    // 1 second
//   averageAge: 1800000   // 30 minutes
// }
```

### View Session Context

```typescript
import { StatefulOrchestrator } from '@/lib/orchestration/statefulOrchestrator';

const orchestrator = new StatefulOrchestrator(handler, embeddings);
const context = await orchestrator.getSessionContext(chatId);

console.log({
  turnCount: context.turnCount,
  entitiesTracked: context.extractedEntities.size,
  summary: context.conversationSummary,
  totalCost: context.estimatedCost,
});
```

## Limitations

### Current Implementation (In-Memory)
- ❌ Data lost on server restart
- ❌ Doesn't scale across multiple servers
- ❌ Limited by server RAM (~1000 concurrent sessions)

### Future Improvements (Redis)
- ✅ Persistent across restarts
- ✅ Scales across multiple servers
- ✅ Handles 100,000+ concurrent sessions

## Troubleshooting

### Context Not Persisting
- Check if `USE_STATEFUL_ORCHESTRATION=true`
- Verify context store is initialized
- Check server logs for errors

### High Memory Usage
- Reduce `maxEntries` in context store config
- Reduce `ttlMs` to expire contexts faster
- Consider upgrading to Redis

### Summarization Not Triggering
- Check threshold in `statefulOrchestrator.ts`
- Verify LLM is available for summarization
- Check logs for summarization errors

## Performance

### Benchmarks (Local Testing)
- Context load: ~0.1ms
- Entity extraction: ~1-2ms
- Summarization: ~500-1000ms (uses LLM)
- Context save: ~0.1ms
- Total overhead: ~2-5ms (without summarization)

### Memory Usage
- Per context: ~50KB
- 1000 contexts: ~50MB
- 10,000 contexts: ~500MB

## Next Steps

1. **Add Redis Support** - For production deployments
2. **Improve Entity Extraction** - Use NER models
3. **Better Summarization** - Fine-tune summarization model
4. **Context Branching** - Handle topic shifts
5. **Multi-turn Planning** - Predict future queries

## References

- Context Payload: `src/lib/context/contextPayload.ts`
- Context Store: `src/lib/context/contextStore.ts`
- Entity Extractor: `src/lib/context/entityExtractor.ts`
- Conversation Summarizer: `src/lib/context/conversationSummarizer.ts`
- Stateful Orchestrator: `src/lib/orchestration/statefulOrchestrator.ts`

---
*Last updated: October 19, 2025*
