/**
 * Context Store - Manages persistent storage of conversation context
 *
 * Two-layer store: in-memory LRU (hot path) + SQLite (durability).
 * On every set(), the payload is upserted into the `sessions` table.
 * On get() miss in LRU, falls back to SQLite.
 * On startup, warmFromDb() pre-warms the LRU from recent SQLite rows.
 */

import Database from 'better-sqlite3';
import { ContextPayload, serializeContextPayload, deserializeContextPayload } from './contextPayload';
import { sqlite } from '../db/index';

export interface ContextStoreConfig {
  ttlMs: number;
  maxEntries: number;
}

const DEFAULT_CONFIG: ContextStoreConfig = {
  ttlMs: 24 * 60 * 60 * 1000, // 24 hours
  maxEntries: 1000,
};

class ContextStore {
  private store: Map<string, { payload: ContextPayload; expiresAt: number }>;
  private config: ContextStoreConfig;
  private accessOrder: string[];
  private db: Database.Database;

  constructor(config: Partial<ContextStoreConfig> = {}, db?: Database.Database) {
    this.store = new Map();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.accessOrder = [];
    this.db = db ?? sqlite;
    this.startCleanup();
  }

  async set(sessionId: string, payload: ContextPayload): Promise<void> {
    const expiresAt = Date.now() + this.config.ttlMs;
    payload.updatedAt = Date.now();

    this.store.set(sessionId, { payload, expiresAt });
    this.updateAccessOrder(sessionId);

    if (this.store.size > this.config.maxEntries) {
      this.evictLRU();
    }

    // Persist to SQLite
    try {
      const serialized = serializeContextPayload(payload);
      const now = new Date().toISOString();
      this.db.prepare(
        `INSERT OR REPLACE INTO sessions (id, chatId, payload, createdAt, updatedAt)
         VALUES (?, ?, ?, COALESCE((SELECT createdAt FROM sessions WHERE id = ?), ?), ?)`
      ).run(sessionId, payload.chatId, serialized, sessionId, now, now);
    } catch (err) {
      console.error(`[ContextStore] SQLite write error for session ${sessionId}:`, err);
    }

    console.log(`[ContextStore] Stored context for session: ${sessionId}`);
  }

  async get(sessionId: string): Promise<ContextPayload | null> {
    const entry = this.store.get(sessionId);

    if (entry) {
      if (Date.now() > entry.expiresAt) {
        console.log(`[ContextStore] Context expired for session: ${sessionId}`);
        this.store.delete(sessionId);
        // fall through to SQLite check
      } else {
        this.updateAccessOrder(sessionId);
        console.log(`[ContextStore] Retrieved context for session: ${sessionId}`);
        return entry.payload;
      }
    }

    // LRU miss — fall back to SQLite
    try {
      const row = this.db.prepare(
        `SELECT payload FROM sessions WHERE id = ?`
      ).get(sessionId) as { payload: string } | undefined;

      if (row) {
        const payload = deserializeContextPayload(row.payload);
        const expiresAt = Date.now() + this.config.ttlMs;
        this.store.set(sessionId, { payload, expiresAt });
        this.updateAccessOrder(sessionId);
        console.log(`[ContextStore] Loaded context from SQLite for session: ${sessionId}`);
        return payload;
      }
    } catch (err) {
      console.error(`[ContextStore] SQLite read error for session ${sessionId}:`, err);
    }

    console.log(`[ContextStore] No context found for session: ${sessionId}`);
    return null;
  }

  async delete(sessionId: string): Promise<void> {
    this.store.delete(sessionId);
    this.accessOrder = this.accessOrder.filter(id => id !== sessionId);

    try {
      this.db.prepare(`DELETE FROM sessions WHERE id = ?`).run(sessionId);
    } catch (err) {
      console.error(`[ContextStore] SQLite delete error for session ${sessionId}:`, err);
    }

    console.log(`[ContextStore] Deleted context for session: ${sessionId}`);
  }

  async exists(sessionId: string): Promise<boolean> {
    const entry = this.store.get(sessionId);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(sessionId);
      return false;
    }
    return true;
  }

  /**
   * Pre-warm the LRU from SQLite rows updated within the TTL window.
   * Called once at startup.
   */
  async warmFromDb(): Promise<void> {
    try {
      const ttlSeconds = Math.floor(this.config.ttlMs / 1000);
      const rows = this.db.prepare(
        `SELECT id, payload FROM sessions
         WHERE datetime(updatedAt) > datetime('now', '-' || ? || ' seconds')`
      ).all(ttlSeconds) as { id: string; payload: string }[];

      let loaded = 0;
      for (const row of rows) {
        try {
          const payload = deserializeContextPayload(row.payload);
          const expiresAt = Date.now() + this.config.ttlMs;
          this.store.set(row.id, { payload, expiresAt });
          this.updateAccessOrder(row.id);
          loaded++;
        } catch (err) {
          console.error(`[ContextStore] Failed to deserialize session ${row.id}:`, err);
        }
      }

      console.log(`[ContextStore] Warmed ${loaded} sessions from SQLite`);
    } catch (err) {
      console.error('[ContextStore] warmFromDb error — starting with empty LRU:', err);
    }
  }

  /**
   * Clear in-memory LRU without touching SQLite (for testing).
   */
  clearMemory(): void {
    this.store.clear();
    this.accessOrder = [];
  }

  getStats(): {
    totalEntries: number;
    oldestEntry: number | null;
    newestEntry: number | null;
    averageAge: number;
  } {
    const entries = Array.from(this.store.values());

    if (entries.length === 0) {
      return { totalEntries: 0, oldestEntry: null, newestEntry: null, averageAge: 0 };
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

  clear(): void {
    this.store.clear();
    this.accessOrder = [];
    console.log('[ContextStore] Cleared all contexts');
  }

  private updateAccessOrder(sessionId: string): void {
    this.accessOrder = this.accessOrder.filter(id => id !== sessionId);
    this.accessOrder.push(sessionId);
  }

  private evictLRU(): void {
    if (this.accessOrder.length === 0) return;
    const lruSessionId = this.accessOrder[0];
    this.store.delete(lruSessionId);
    this.accessOrder.shift();
    console.log(`[ContextStore] Evicted LRU context: ${lruSessionId}`);
  }

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
    }, 60 * 1000);
  }
}

// Global singleton instance
let globalContextStore: ContextStore | null = null;

export function getContextStore(): ContextStore {
  if (!globalContextStore) {
    globalContextStore = new ContextStore();
  }
  return globalContextStore;
}

export function initializeContextStore(config: Partial<ContextStoreConfig>): ContextStore {
  globalContextStore = new ContextStore(config);
  return globalContextStore;
}

export default ContextStore;
