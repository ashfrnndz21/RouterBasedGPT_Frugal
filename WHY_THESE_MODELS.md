# Why Granite 4 Micro + Qwen 3 1.7B?

## Model Selection Rationale

We chose **granite4:micro** (Tier 1) and **qwen3:1.7b** (Tier 2) for the frugal RAG demo based on these criteria:

### Key Requirements
1. **Laptop-friendly**: Must run smoothly on consumer hardware
2. **Fast inference**: Sub-second response times for good UX
3. **Cost-effective**: Minimal resource usage
4. **Quality**: Good enough for demo purposes
5. **Available**: Easy to install via Ollama

## Tier 1: Granite 4 Micro

### Why Granite 4 Micro?

**IBM's Granite 4 Micro** is the perfect Tier 1 model:

✅ **Ultra-lightweight**: Only 1-2GB RAM
✅ **Blazing fast**: Near-instant responses
✅ **Efficient**: Minimal CPU/GPU usage
✅ **Sufficient quality**: Good for simple factual queries
✅ **Open source**: Apache 2.0 license

### Specifications
- **Size**: ~1.5GB
- **Parameters**: Micro-scale (optimized for speed)
- **Inference**: 50-100+ tokens/second on CPU
- **Use case**: Simple factual queries, definitions, basic Q&A

### Perfect For
- "What is the capital of France?"
- "Who is the CEO of Tesla?"
- "Define machine learning"
- "When was Python created?"

## Tier 2: Qwen 3 1.7B

### Why Qwen 3 1.7B?

**Alibaba's Qwen 3 1.7B** is an excellent Tier 2 choice:

✅ **Compact**: Only ~2GB RAM (much smaller than Mistral 7B's 7GB)
✅ **Capable**: Surprisingly good reasoning for its size
✅ **Fast**: Still runs quickly on laptops
✅ **Balanced**: Good quality-to-size ratio
✅ **Modern**: Latest Qwen 3 architecture

### Specifications
- **Size**: ~2GB
- **Parameters**: 1.7 billion
- **Inference**: 20-40 tokens/second on CPU
- **Use case**: Complex reasoning, analysis, multi-step thinking

### Perfect For
- "Explain the relationship between X and Y"
- "Compare and contrast A vs B"
- "Analyze the implications of..."
- "What are the pros and cons of..."

## Comparison with Alternatives

### vs. Phi-3 Mini (Previous Tier 1)
| Metric | Granite 4 Micro | Phi-3 Mini |
|--------|-----------------|------------|
| Size | ~1.5GB | ~4GB |
| Speed | ⚡⚡⚡⚡⚡ | ⚡⚡⚡⚡ |
| Quality | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Winner** | **Speed & Size** | Quality |

**Verdict**: Granite 4 Micro is better for Tier 1 because speed matters more than quality for simple queries.

### vs. Mistral 7B (Previous Tier 2)
| Metric | Qwen 3 1.7B | Mistral 7B |
|--------|-------------|------------|
| Size | ~2GB | ~7GB |
| Speed | ⚡⚡⚡⚡ | ⚡⚡ |
| Quality | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Winner** | **Speed & Size** | Quality |

**Verdict**: Qwen 3 1.7B is better for laptop demos because it's 3.5x smaller and much faster, with only slightly lower quality.

## Total Resource Usage

### Combined Memory Footprint
- **Granite 4 Micro**: ~1.5GB
- **Qwen 3 1.7B**: ~2GB
- **Total**: ~3.5GB

Compare to previous setup:
- **Phi-3 Mini**: ~4GB
- **Mistral 7B**: ~7GB
- **Total**: ~11GB

**Savings**: 68% less memory! Perfect for laptops.

### Performance Characteristics

**Tier 1 (Granite 4 Micro)**:
- Latency: 0.5-1.5 seconds
- Throughput: 50-100 tokens/sec
- CPU usage: Low
- Perfect for: 90% of queries

**Tier 2 (Qwen 3 1.7B)**:
- Latency: 2-4 seconds
- Throughput: 20-40 tokens/sec
- CPU usage: Medium
- Perfect for: 10% of queries (complex reasoning)

## Cost Multipliers

### Relative Costs
- **Tier 1 (Granite 4 Micro)**: 1.0x (baseline)
- **Tier 2 (Qwen 3 1.7B)**: 2.5x

This is more realistic than the previous 3.5x multiplier because:
1. Qwen 3 1.7B is only slightly larger than Granite 4 Micro
2. Both run efficiently on CPU
3. The cost difference is mainly inference time, not resources

### Cost Calculation Example

For 1000 queries:
- 100 canned (free): 0
- 200 cache hits (free): 0
- 600 Tier 1: 600 × 1.0 = 600
- 100 Tier 2: 100 × 2.5 = 250
- **Total: 850 cost units**

Without frugal system (all Tier 2):
- 1000 × 2.5 = 2500 cost units

**Savings: 66%**

## Demo Benefits

### 1. Runs on Any Laptop
- Total memory: ~3.5GB (vs 11GB before)
- Works on 8GB RAM machines
- No GPU required
- Fast on CPU

### 2. Fast Responses
- Tier 1: Near-instant
- Tier 2: Still quick (2-4 seconds)
- Great demo experience
- No waiting around

### 3. Clear Differentiation
- Tier 1 is noticeably faster
- Tier 2 provides better reasoning
- Easy to demonstrate the difference
- Obvious cost/quality tradeoff

### 4. Realistic Costs
- 2.5x multiplier is believable
- Reflects actual resource usage
- Easy to explain to stakeholders
- Matches real-world scenarios

## Installation

```bash
# Install both models (takes ~2 minutes)
ollama pull granite4:micro
ollama pull qwen3:1.7b

# Verify installation
ollama list
```

## When to Use Each Tier

### Use Tier 1 (Granite 4 Micro) for:
- ✅ Simple factual questions
- ✅ Definitions
- ✅ Basic Q&A
- ✅ Quick lookups
- ✅ Straightforward queries

### Use Tier 2 (Qwen 3 1.7B) for:
- ✅ Complex reasoning
- ✅ Multi-step analysis
- ✅ Comparisons
- ✅ Explanations
- ✅ Nuanced questions

## Alternatives

### If You Need More Quality

**Tier 1 Alternative**: Phi-3 Mini
```bash
ollama pull phi3:mini  # 4GB, better quality
```

**Tier 2 Alternative**: Mistral 7B
```bash
ollama pull mistral:7b  # 7GB, best quality
```

### If You Need More Speed

**Tier 1 Alternative**: Already using the fastest!

**Tier 2 Alternative**: Gemma 2B
```bash
ollama pull gemma:2b  # Similar size, different strengths
```

## Conclusion

**Granite 4 Micro + Qwen 3 1.7B** is the optimal combination for a laptop demo because:

1. ✅ **Lightweight**: Only 3.5GB total
2. ✅ **Fast**: Great demo experience
3. ✅ **Capable**: Good enough quality
4. ✅ **Realistic**: Believable cost savings
5. ✅ **Accessible**: Runs on any laptop

This setup demonstrates the frugal RAG concept perfectly while being practical for real-world use.
