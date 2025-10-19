# 🔧 RAM Optimization - Fix High Memory Usage

## The Problem

Your MacBook RAM is being consumed by **Mistral 7B** (5.8 GB) which is still loaded in Ollama!

```
NAME          SIZE      
mistral:7b    5.8 GB    ← This is eating your RAM!
```

## Why This Happened

1. You previously used Mistral 7B
2. Ollama keeps models in memory for 5 minutes after use
3. It's still loaded even though we switched to qwen3:1.7b

## Quick Fix (Unload Model)

### Option 1: Stop Ollama Model
```bash
ollama stop mistral:7b
```

### Option 2: Restart Ollama
```bash
# Kill all Ollama processes
killall ollama

# Restart Ollama
ollama serve &
```

### Option 3: Let It Timeout (Wait 5 min)
- Ollama will automatically unload after 5 minutes of inactivity
- But this wastes RAM in the meantime

## Permanent Fix (Remove Mistral)

Since we're using qwen3:1.7b now, you can remove Mistral:

```bash
# Remove the old model
ollama rm mistral:7b

# Verify it's gone
ollama list
```

## Expected RAM Usage

### Before (Current):
- Mistral 7B: **5.8 GB** ❌
- Node.js: ~500 MB
- Browser: ~1 GB
- **Total: ~7.3 GB**

### After (Optimized):
- Qwen 3 1.7B: **~2 GB** ✅
- Granite 4 Micro: **~1.5 GB** ✅
- Node.js: ~500 MB
- Browser: ~1 GB
- **Total: ~5 GB** (saves 2.3 GB!)

## Configure Ollama Keep-Alive

To prevent models from staying in memory too long:

### Option 1: Set in config.toml
```toml
[GENERAL]
KEEP_ALIVE = "1m"  # Unload after 1 minute instead of 5
```

### Option 2: Set globally
```bash
# Add to ~/.zshrc or ~/.bash_profile
export OLLAMA_KEEP_ALIVE="1m"
```

## Check Current RAM Usage

```bash
# See what's loaded in Ollama
ollama ps

# See all processes using RAM
ps aux | grep -E "(node|ollama)" | grep -v grep

# Check total system memory
vm_stat | head -5
```

## Optimize for Your MacBook

### If you have 8GB RAM:
```bash
# Remove Mistral
ollama rm mistral:7b

# Use only lightweight models
ollama pull granite4:micro  # 1.5GB
ollama pull qwen3:1.7b      # 2GB

# Set aggressive keep-alive
export OLLAMA_KEEP_ALIVE="30s"
```

### If you have 16GB+ RAM:
```bash
# You can keep both, but still unload when not in use
ollama stop mistral:7b

# Or set moderate keep-alive
export OLLAMA_KEEP_ALIVE="2m"
```

## What's Using RAM Right Now

Let me break down your current RAM usage:

1. **Ollama (Mistral 7B)**: 5.8 GB ← **MAIN CULPRIT**
2. **Kiro IDE**: ~2-3 GB
3. **Node.js (Next.js)**: ~500 MB
4. **Browser**: ~1 GB
5. **System**: ~1-2 GB

**Total: ~10-12 GB** (This is why your MacBook is struggling!)

## Immediate Action

Run this now to free up RAM:

```bash
# Stop the loaded model
ollama stop mistral:7b

# Verify it's unloaded
ollama ps
```

You should see:
```
NAME    ID    SIZE    PROCESSOR    CONTEXT    UNTIL
(empty - no models loaded)
```

## After Optimization

Your RAM usage will drop to:
- **~5-6 GB total** (comfortable for 8GB MacBook)
- Models load on-demand (1-2 seconds)
- Unload automatically after 1 minute

## Test It

1. **Stop Mistral**: `ollama stop mistral:7b`
2. **Check RAM**: `ollama ps` (should be empty)
3. **Ask a question** in the app
4. **Granite 4 Micro loads** (~1.5 GB)
5. **After 1 minute**: Automatically unloads

## Why Our Models Are Better

### Mistral 7B (Old):
- Size: 5.8 GB in RAM
- Speed: Slower
- Cost: 3.5x multiplier
- **Problem**: Too big for laptops!

### Granite 4 Micro + Qwen 3 1.7B (New):
- Combined: 3.5 GB in RAM
- Speed: Much faster
- Cost: 1.0x and 2.5x
- **Benefit**: Perfect for laptops!

## Summary

**Problem**: Mistral 7B using 5.8 GB RAM
**Solution**: Stop/remove it, use qwen3:1.7b instead
**Result**: Save 3.8 GB RAM, faster responses!

Run this now:
```bash
ollama stop mistral:7b
```

**Your RAM will be freed immediately! 🚀**

---
*Last updated: October 19, 2025*
