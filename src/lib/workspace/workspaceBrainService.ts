/**
 * WorkspaceBrainService — Workspace Team Brain (shared persistent memory)
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10, 1.11
 */
import { eq, desc, count } from 'drizzle-orm';
import { OllamaEmbeddings } from '@langchain/ollama';
import { randomUUID } from 'crypto';
import defaultDb from '@/lib/db';
import { workspaceMemory } from '@/lib/db/schema';
import { getOllamaApiEndpoint, getOllamaApiKey } from '@/lib/config';

type DbInstance = typeof defaultDb;

// ============================================================
// Types
// ============================================================

export interface MemoryEntry {
  id: string;
  workspaceId: string;
  agentId: string | null;
  userId: string | null;
  scope: 'workspace' | 'agent' | 'user';
  content: string;
  embedding: number[] | null;
  sourceConversationId: string | null;
  sourceMessageId: string | null;
  pinned: boolean;
  decayScore: number; // computed at retrieval time, not stored
  createdAt: string;
  updatedAt: string;
}

export interface MemoryRetrievalOptions {
  workspaceId: string;
  query: string;
  queryEmbedding: number[];
  userId: string;
  agentId: string | null;
  topK: number; // default 5
}

// ============================================================
// Temporal Decay
// ============================================================

const DECAY_LAMBDA = 0.01; // half-life ≈ 69 days

/**
 * Computes the temporal decay factor for a given age in days.
 * decayFactor(d) = exp(-λ * d)
 */
export function decayFactor(ageInDays: number): number {
  return Math.exp(-DECAY_LAMBDA * ageInDays);
}

/**
 * Computes the retrieval score for a memory entry.
 * score = cosineSimilarity * (pinned ? 1.0 : decayFactor(ageInDays))
 */
export function computeRetrievalScore(
  cosineSimilarity: number,
  pinned: boolean,
  ageInDays: number
): number {
  return cosineSimilarity * (pinned ? 1.0 : decayFactor(ageInDays));
}

// ============================================================
// Cosine Similarity (pure, no config dependency for testability)
// ============================================================

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

// ============================================================
// Scope filtering (Req 1.6, 1.7)
// ============================================================

/**
 * Returns true if the entry is accessible to the requesting user/agent.
 *
 * - workspace-scoped: always accessible
 * - agent-scoped: only when requesting agentId matches entry's agentId
 * - user-scoped: only when requesting userId matches entry's userId
 */
export function isScopeAccessible(
  entry: Pick<MemoryEntry, 'scope' | 'agentId' | 'userId'>,
  requestingUserId: string,
  requestingAgentId: string | null
): boolean {
  switch (entry.scope) {
    case 'workspace':
      return true;
    case 'agent':
      return requestingAgentId !== null && entry.agentId === requestingAgentId;
    case 'user':
      return entry.userId === requestingUserId;
    default:
      return false;
  }
}

// ============================================================
// Row → MemoryEntry mapper
// ============================================================

function rowToEntry(
  row: typeof workspaceMemory.$inferSelect,
  decayScore = 0
): MemoryEntry {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    agentId: row.agentId ?? null,
    userId: row.userId ?? null,
    scope: row.scope as 'workspace' | 'agent' | 'user',
    content: row.content,
    embedding: row.embedding ? (JSON.parse(row.embedding) as number[]) : null,
    sourceConversationId: row.sourceConversationId ?? null,
    sourceMessageId: row.sourceMessageId ?? null,
    pinned: Boolean(row.pinned),
    decayScore,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// ============================================================
// WorkspaceBrainService
// ============================================================

export class WorkspaceBrainService {
  private readonly db: DbInstance;
  private readonly embeddingModel: string;

  constructor(db: DbInstance = defaultDb, embeddingModel = 'nomic-embed-text') {
    this.db = db;
    this.embeddingModel = embeddingModel;
  }

  /**
   * Compute an embedding for the given text via Ollama.
   * Returns null if embedding computation fails (Req 1.11).
   */
  private async computeEmbedding(text: string): Promise<number[] | null> {
    try {
      const endpoint = getOllamaApiEndpoint();
      const apiKey = getOllamaApiKey();

      if (!endpoint) {
        console.warn('[WorkspaceBrainService] No Ollama endpoint configured — storing entry with null embedding');
        return null;
      }

      const embeddings = new OllamaEmbeddings({
        baseUrl: endpoint,
        model: this.embeddingModel,
        ...(apiKey ? { headers: { Authorization: `Bearer ${apiKey}` } } : {}),
      });

      const [vector] = await embeddings.embedDocuments([text]);
      return vector;
    } catch (err) {
      console.error('[WorkspaceBrainService] Embedding computation failed:', err);
      return null;
    }
  }

  /**
   * Index a new fact into workspace_memory.
   * Computes embedding via Ollama; stores null embedding on failure (Req 1.11).
   */
  async indexFact(
    entry: Omit<MemoryEntry, 'id' | 'decayScore' | 'createdAt' | 'updatedAt'>
  ): Promise<MemoryEntry> {
    const id = randomUUID();
    const now = new Date().toISOString();

    // Compute embedding; null on failure (Req 1.11)
    const embeddingVector = await this.computeEmbedding(entry.content);
    const embeddingJson = embeddingVector ? JSON.stringify(embeddingVector) : null;

    await this.db.insert(workspaceMemory).values({
      id,
      workspaceId: entry.workspaceId,
      agentId: entry.agentId ?? null,
      userId: entry.userId ?? null,
      scope: entry.scope,
      content: entry.content,
      embedding: embeddingJson,
      sourceConversationId: entry.sourceConversationId ?? null,
      sourceMessageId: entry.sourceMessageId ?? null,
      pinned: entry.pinned,
      createdAt: now,
      updatedAt: now,
    });

    return {
      ...entry,
      id,
      embedding: embeddingVector,
      decayScore: 0,
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Retrieve top-K semantically relevant memory entries.
   * Applies scope filtering (Req 1.6, 1.7) and temporal decay (Req 1.4, 1.5).
   * Entries with null embeddings are excluded from semantic retrieval (Req 1.11).
   */
  async retrieve(options: MemoryRetrievalOptions): Promise<MemoryEntry[]> {
    const { workspaceId, queryEmbedding, userId, agentId, topK = 5 } = options;

    // Fetch all candidates for this workspace
    const rows = await this.db
      .select()
      .from(workspaceMemory)
      .where(eq(workspaceMemory.workspaceId, workspaceId));

    const now = Date.now();
    const scored: Array<{ entry: MemoryEntry; score: number }> = [];

    for (const row of rows) {
      // Scope filtering (Req 1.6, 1.7)
      const entry = rowToEntry(row);
      if (!isScopeAccessible(entry, userId, agentId)) continue;

      // Exclude entries with null embeddings from semantic retrieval (Req 1.11)
      if (!entry.embedding) continue;

      // Compute cosine similarity
      const sim = cosineSimilarity(queryEmbedding, entry.embedding);

      // Temporal decay (Req 1.4, 1.5)
      const createdMs = new Date(entry.createdAt).getTime();
      const ageInDays = (now - createdMs) / (1000 * 60 * 60 * 24);
      const score = computeRetrievalScore(sim, entry.pinned, ageInDays);

      entry.decayScore = score;
      scored.push({ entry, score });
    }

    // Sort descending by score, return top-K
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK).map((s) => s.entry);
  }

  /**
   * Returns memory entries for the workspace ordered by created_at DESC, paginated (page size 20).
   * Req 1.8
   */
  async getTimeline(
    workspaceId: string,
    page: number
  ): Promise<{ entries: MemoryEntry[]; total: number }> {
    const PAGE_SIZE = 20;
    const offset = (page - 1) * PAGE_SIZE;

    const [rows, totalRows] = await Promise.all([
      this.db
        .select()
        .from(workspaceMemory)
        .where(eq(workspaceMemory.workspaceId, workspaceId))
        .orderBy(desc(workspaceMemory.createdAt))
        .limit(PAGE_SIZE)
        .offset(offset),
      this.db
        .select({ value: count() })
        .from(workspaceMemory)
        .where(eq(workspaceMemory.workspaceId, workspaceId)),
    ]);

    return {
      entries: rows.map((r) => rowToEntry(r)),
      total: totalRows[0]?.value ?? 0,
    };
  }

  /**
   * Updates the content of a memory entry and sets updatedAt. Req 1.9
   */
  async update(id: string, content: string): Promise<MemoryEntry> {
    const now = new Date().toISOString();

    await this.db
      .update(workspaceMemory)
      .set({ content, updatedAt: now })
      .where(eq(workspaceMemory.id, id));

    const rows = await this.db
      .select()
      .from(workspaceMemory)
      .where(eq(workspaceMemory.id, id))
      .limit(1);

    if (rows.length === 0) {
      throw new Error(`Memory entry not found: ${id}`);
    }

    return rowToEntry(rows[0]);
  }

  /**
   * Removes a memory entry and its embedding. Req 1.10
   */
  async delete(id: string): Promise<void> {
    await this.db.delete(workspaceMemory).where(eq(workspaceMemory.id, id));
  }

  /**
   * Toggles the pinned flag on a memory entry. Req 1.5
   */
  async pin(id: string, pinned: boolean): Promise<MemoryEntry> {
    const now = new Date().toISOString();

    await this.db
      .update(workspaceMemory)
      .set({ pinned, updatedAt: now })
      .where(eq(workspaceMemory.id, id));

    const rows = await this.db
      .select()
      .from(workspaceMemory)
      .where(eq(workspaceMemory.id, id))
      .limit(1);

    if (rows.length === 0) {
      throw new Error(`Memory entry not found: ${id}`);
    }

    return rowToEntry(rows[0]);
  }
}

export default new WorkspaceBrainService();
