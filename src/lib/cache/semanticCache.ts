import { Embeddings } from '@langchain/core/embeddings';
import { Document } from 'langchain/document';
import computeSimilarity from '../utils/computeSimilarity';

export interface CacheEntry {
  query: string;
  queryEmbedding: number[];
  response: string;
  sources: Document[];
  timestamp: number;
  hitCount: number;
}

export interface CacheStats {
  totalEntries: number;
  totalHits: number;
  hitRate: number;
}

/**
 * SemanticCache - In-memory semantic caching for query responses
 * 
 * For demo purposes, this uses an in-memory cache. In production,
 * this would be backed by Redis with vector search capabilities.
 * 
 * Cache hits can reduce costs by 20-30% by avoiding LLM inference
 * for similar queries.
 */
export class SemanticCache {
  private cache: Map<string, CacheEntry> = new Map();
  private embeddings: Embeddings;
  private similarityThreshold: number;
  private maxCacheSize: number;
  private totalHits: number = 0;
  private totalQueries: number = 0;
  
  constructor(
    embeddings: Embeddings,
    similarityThreshold: number = 0.95,
    maxCacheSize: number = 1000
  ) {
    this.embeddings = embeddings;
    this.similarityThreshold = similarityThreshold;
    this.maxCacheSize = maxCacheSize;
  }
  
  /**
   * Get a cached response for a similar query
   */
  async get(query: string): Promise<CacheEntry | null> {
    this.totalQueries++;
    
    // Generate query embedding
    const queryEmbedding = await this.embeddings.embedQuery(query);
    
    // Search for similar cached queries
    let bestMatch: { entry: CacheEntry; similarity: number } | null = null;
    
    for (const entry of this.cache.values()) {
      const similarity = computeSimilarity(queryEmbedding, entry.queryEmbedding);
      
      if (similarity >= this.similarityThreshold) {
        if (!bestMatch || similarity > bestMatch.similarity) {
          bestMatch = { entry, similarity };
        }
      }
    }
    
    if (bestMatch) {
      // Increment hit count
      bestMatch.entry.hitCount++;
      this.totalHits++;
      
      console.log(`[SemanticCache] Cache HIT (similarity: ${bestMatch.similarity.toFixed(3)}) for query: "${query}"`);
      
      return bestMatch.entry;
    }
    
    console.log(`[SemanticCache] Cache MISS for query: "${query}"`);
    return null;
  }
  
  /**
   * Store a query response in the cache
   */
  async set(query: string, response: string, sources: Document[]): Promise<void> {
    // Check cache size limit
    if (this.cache.size >= this.maxCacheSize) {
      this.evictLeastUsed();
    }
    
    // Generate query embedding
    const queryEmbedding = await this.embeddings.embedQuery(query);
    
    const cacheKey = `${Date.now()}-${query.substring(0, 50)}`;
    
    const entry: CacheEntry = {
      query,
      queryEmbedding,
      response,
      sources,
      timestamp: Date.now(),
      hitCount: 0,
    };
    
    this.cache.set(cacheKey, entry);
    
    console.log(`[SemanticCache] Cached response for query: "${query}"`);
  }
  
  /**
   * Evict the least recently used cache entry
   */
  private evictLeastUsed(): void {
    let leastUsedKey: string | null = null;
    let leastUsedCount = Infinity;
    let oldestTimestamp = Infinity;
    
    for (const [key, entry] of this.cache.entries()) {
      // Prioritize evicting entries with low hit count
      if (entry.hitCount < leastUsedCount) {
        leastUsedKey = key;
        leastUsedCount = entry.hitCount;
        oldestTimestamp = entry.timestamp;
      } else if (entry.hitCount === leastUsedCount && entry.timestamp < oldestTimestamp) {
        // If hit counts are equal, evict the oldest
        leastUsedKey = key;
        oldestTimestamp = entry.timestamp;
      }
    }
    
    if (leastUsedKey) {
      this.cache.delete(leastUsedKey);
      console.log(`[SemanticCache] Evicted cache entry: ${leastUsedKey}`);
    }
  }
  
  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    console.log('[SemanticCache] Cache cleared');
  }
  
  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return {
      totalEntries: this.cache.size,
      totalHits: this.totalHits,
      hitRate: this.totalQueries > 0 ? this.totalHits / this.totalQueries : 0,
    };
  }
}

export default SemanticCache;
