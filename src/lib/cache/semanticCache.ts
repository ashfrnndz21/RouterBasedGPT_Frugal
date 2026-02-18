import { Embeddings } from '@langchain/core/embeddings';
import { Document } from 'langchain/document';
import Database from 'better-sqlite3';
import computeSimilarity from '../utils/computeSimilarity';
import { sqlite } from '../db/index';

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
 * SemanticCache - In-memory semantic caching for query responses with SQLite persistence
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
  private db: Database.Database;

  constructor(
    embeddings: Embeddings,
    similarityThreshold: number = 0.90,
    maxCacheSize: number = 1000,
    db: Database.Database = sqlite
  ) {
    this.embeddings = embeddings;
    this.similarityThreshold = similarityThreshold;
    this.maxCacheSize = maxCacheSize;
    this.db = db;
  }

  /**
   * Get a cached response for a similar query
   */
  async get(query: string): Promise<CacheEntry | null> {
    this.totalQueries++;

    const queryEmbedding = await this.embeddings.embedQuery(query);

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
      bestMatch.entry.hitCount++;
      this.totalHits++;

      console.log(`[SemanticCache] Cache HIT (similarity: ${bestMatch.similarity.toFixed(3)}) for query: "${query}"`);

      try {
        this.db.prepare(
          'UPDATE semantic_cache SET hitCount = hitCount + 1 WHERE query = ?'
        ).run(query);
      } catch (err) {
        console.error('[SemanticCache] SQLite error on hitCount update:', err);
      }

      return bestMatch.entry;
    }

    console.log(`[SemanticCache] Cache MISS for query: "${query}"`);
    return null;
  }

  /**
   * Store a query response in the cache
   */
  async set(query: string, response: string, sources: Document[]): Promise<void> {
    if (this.cache.size >= this.maxCacheSize) {
      this.evictLeastUsed();
    }

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

    try {
      this.db.prepare(
        `INSERT OR IGNORE INTO semantic_cache (cacheKey, query, queryEmbedding, response, sources)
         VALUES (?, ?, ?, ?, ?)`
      ).run(
        cacheKey,
        query,
        JSON.stringify(queryEmbedding),
        response,
        JSON.stringify(sources)
      );
    } catch (err) {
      console.error('[SemanticCache] SQLite error on insert:', err);
    }

    console.log(`[SemanticCache] Cached response for query: "${query}"`);
  }

  /**
   * Load all persisted cache entries from SQLite into the in-memory Map
   */
  loadFromDb(): void {
    try {
      const rows = this.db.prepare('SELECT * FROM semantic_cache').all() as Array<{
        cacheKey: string;
        query: string;
        queryEmbedding: string;
        response: string;
        sources: string;
        hitCount: number;
        createdAt: string;
      }>;

      for (const row of rows) {
        const entry: CacheEntry = {
          query: row.query,
          queryEmbedding: JSON.parse(row.queryEmbedding) as number[],
          response: row.response,
          sources: JSON.parse(row.sources) as Document[],
          timestamp: row.createdAt ? new Date(row.createdAt).getTime() : Date.now(),
          hitCount: row.hitCount ?? 0,
        };
        this.cache.set(row.cacheKey, entry);
      }

      console.log(`[SemanticCache] Loaded ${rows.length} entries from SQLite`);
    } catch (err) {
      console.error('[SemanticCache] SQLite error on loadFromDb:', err);
    }
  }

  /**
   * Clear in-memory cache without touching SQLite (for testing)
   */
  clearMemory(): void {
    this.cache.clear();
    console.log('[SemanticCache] In-memory cache cleared');
  }

  /**
   * Evict the least recently used cache entry
   */
  private evictLeastUsed(): void {
    let leastUsedKey: string | null = null;
    let leastUsedCount = Infinity;
    let oldestTimestamp = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.hitCount < leastUsedCount) {
        leastUsedKey = key;
        leastUsedCount = entry.hitCount;
        oldestTimestamp = entry.timestamp;
      } else if (entry.hitCount === leastUsedCount && entry.timestamp < oldestTimestamp) {
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

// Singleton instance
let _instance: SemanticCache | null = null;

/**
 * Returns a lazily-initialized singleton SemanticCache.
 */
export function getSemanticCache(embeddings?: Embeddings): SemanticCache {
  if (!_instance) {
    if (!embeddings) {
      throw new Error('[SemanticCache] embeddings must be provided on first initialization');
    }
    _instance = new SemanticCache(embeddings);
  }
  return _instance;
}

export default SemanticCache;
