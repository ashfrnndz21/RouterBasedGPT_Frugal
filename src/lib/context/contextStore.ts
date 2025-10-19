/**
 * Context Store - Manages persistent storage of conversation context
 * 
 * Uses in-memory storage by default, can be upgraded to Redis for production
 */

import { ContextPayload, serializeContextPayload, deserializeContextPayload } from './contextPayload';

export interface ContextStoreConfig {
  ttlMs: number; // Time-to-live for context entries
  maxEntries: number; // Maximum number of contexts to store
}

const DEFAULT_CONFIG: ContextStoreConfig = {
  ttlMs: 24 * 60 * 60 * 1000, // 24 hours
  maxEntries: 1000,
};

/**
 * In-memory context store with LRU eviction
 */
class ContextStore {
  private store: Map<string, { payload: ContextPayload; expiresAt: number }>;
  private config: ContextStoreConfig;
  private accessOrder: string[]; // For LRU tracking

  constructor(config: Partial<ContextStoreConfig> = {}) {
    this.store = new Map();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.accessOrder = [];
    
    // Start cleanup interval
    this.startCleanup();
  }

  /**
   * Store a context payload
   */
  async set(sessionId: string, payload: ContextPayload): Promise<void> {
    const expiresAt = Date.now() + this.config.ttlMs;
    
    // Update payload timestamp
    payload.updatedAt = Date.now();
    
    // Store the payload
    this.store.set(sessionId, { payload, expiresAt });
    
    // Update access order for LRU
    this.updateAccessOrder(sessionId);
    
    // Evict if over capacity
    if (this.store.size > this.config.maxEntries) {
      this.evictLRU();
    }
    
    console.log(`[ContextStore] Stored context for session: ${sessionId}`);
  }

  /**
   * Retrieve a context payload
   */
  async get(sessionId: string): Promise<ContextPayload | null> {
    const entry = this.store.get(sessionId);
    
    if (!entry) {
      console.log(`[ContextStore] No context found for session: ${sessionId}`);
      return null;
    }
    
    // Check if expired
    if (Date.now() > entry.expiresAt) {
      console.log(`[ContextStore] Context expired for session: ${sessionId}`);
      this.store.delete(sessionId);
      return null;
    }
    
    // Update access order
    this.updateAccessOrder(sessionId);
    
    console.log(`[ContextStore] Retrieved context for session: ${sessionId}`);
    return entry.payload;
  }

  /**
   * Delete a context payload
   */
  async delete(sessionId: string): Promise<void> {
    this.store.delete(sessionId);
    this.accessOrder = this.accessOrder.filter(id => id !== sessionId);
    console.log(`[ContextStore] Deleted context for session: ${sessionId}`);
  }

  /**
   * Check if a context exists
   */
  async exists(sessionId: string): Promise<boolean> {
    const entry = this.store.get(sessionId);
    if (!entry) return false;
    
    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.store.delete(sessionId);
      return false;
    }
    
    return true;
  }

  /**
   * Get store statistics
   */
  getStats(): {
    totalEntries: number;
    oldestEntry: number | null;
    newestEntry: number | null;
    averageAge: number;
  } {
    const entries = Array.from(this.store.values());
    
    if (entries.length === 0) {
      return {
        totalEntries: 0,
        oldestEntry: null,
        newestEntry: null,
        averageAge: 0,
      };
    }
    
    const now = Date.now();
    const ages = entries.map(e => now - e.payload.createdAt);
    
    return {
      totalEntries: entries.length,
      oldestEntry: Math.max(...ages),
      newestEntry: Math.min(...ages),
      averageAge: ages.reduce((a, b) => a + b, 0) / ages.length,
    };
  }

  /**
   * Clear all contexts
   */
  clear(): void {
    this.store.clear();
    this.accessOrder = [];
    console.log('[ContextStore] Cleared all contexts');
  }

  /**
   * Update access order for LRU
   */
  private updateAccessOrder(sessionId: string): void {
    // Remove from current position
    this.accessOrder = this.accessOrder.filter(id => id !== sessionId);
    // Add to end (most recently used)
    this.accessOrder.push(sessionId);
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    if (this.accessOrder.length === 0) return;
    
    const lruSessionId = this.accessOrder[0];
    this.store.delete(lruSessionId);
    this.accessOrder.shift();
    
    console.log(`[ContextStore] Evicted LRU context: ${lruSessionId}`);
  }

  /**
   * Start periodic cleanup of expired entries
   */
  private startCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      let expiredCount = 0;
      
      for (const [sessionId, entry] of this.store.entries()) {
        if (now > entry.expiresAt) {
          this.store.delete(sessionId);
          this.accessOrder = this.accessOrder.filter(id => id !== sessionId);
          expiredCount++;
        }
      }
      
      if (expiredCount > 0) {
        console.log(`[ContextStore] Cleaned up ${expiredCount} expired contexts`);
      }
    }, 60 * 1000); // Run every minute
  }
}

// Global singleton instance
let globalContextStore: ContextStore | null = null;

/**
 * Get the global context store instance
 */
export function getContextStore(): ContextStore {
  if (!globalContextStore) {
    globalContextStore = new ContextStore();
  }
  return globalContextStore;
}

/**
 * Initialize context store with custom config
 */
export function initializeContextStore(config: Partial<ContextStoreConfig>): ContextStore {
  globalContextStore = new ContextStore(config);
  return globalContextStore;
}

export default ContextStore;
