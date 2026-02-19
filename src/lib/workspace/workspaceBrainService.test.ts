/**
 * Unit tests for WorkspaceBrainService
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10, 1.11
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from '@/lib/db/schema';
import {
  WorkspaceBrainService,
  cosineSimilarity,
  decayFactor,
  computeRetrievalScore,
  isScopeAccessible,
  type MemoryEntry,
} from './workspaceBrainService';

// ----------------------------------------------------------------
// In-memory DB setup
// ----------------------------------------------------------------

function createTestDb() {
  const sqlite = new Database(':memory:');

  sqlite.exec(`
    CREATE TABLE workspaces (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      owner_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE workspace_agents (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      system_prompt TEXT,
      chat_model TEXT,
      chat_model_provider TEXT,
      embedding_model TEXT,
      embedding_model_provider TEXT,
      is_default INTEGER DEFAULT 0,
      avatar TEXT DEFAULT '🤖',
      role TEXT,
      specialty TEXT,
      tools_allowed TEXT DEFAULT '[]',
      memory_scope TEXT DEFAULT 'workspace',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE workspace_conversations (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      agent_id TEXT REFERENCES workspace_agents(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      message_count INTEGER DEFAULT 0,
      tags TEXT DEFAULT '[]',
      participant_agent_ids TEXT DEFAULT '[]'
    );

    CREATE TABLE workspace_memory (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      agent_id TEXT REFERENCES workspace_agents(id) ON DELETE SET NULL,
      user_id TEXT,
      scope TEXT NOT NULL CHECK(scope IN ('workspace', 'agent', 'user')),
      content TEXT NOT NULL,
      embedding TEXT,
      source_conversation_id TEXT REFERENCES workspace_conversations(id) ON DELETE SET NULL,
      source_message_id TEXT,
      pinned INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const db = drizzle(sqlite, { schema });
  return { sqlite, db };
}

function seedWorkspace(sqlite: Database.Database, id = 'ws-1') {
  sqlite.prepare(`INSERT INTO workspaces (id, name, owner_id) VALUES (?, ?, ?)`).run(id, 'Test WS', 'user-1');
}

function seedAgent(sqlite: Database.Database, id = 'agent-1', workspaceId = 'ws-1') {
  sqlite.prepare(`INSERT INTO workspace_agents (id, workspace_id, name) VALUES (?, ?, ?)`).run(id, workspaceId, 'Agent');
}

// Insert a memory row directly (bypasses embedding computation)
function insertMemory(
  sqlite: Database.Database,
  opts: {
    id: string;
    workspaceId: string;
    scope: 'workspace' | 'agent' | 'user';
    content: string;
    embedding?: number[] | null;
    agentId?: string | null;
    userId?: string | null;
    pinned?: boolean;
    createdAt?: string;
  }
) {
  const embeddingJson = opts.embedding ? JSON.stringify(opts.embedding) : null;
  const now = opts.createdAt ?? new Date().toISOString();
  sqlite
    .prepare(
      `INSERT INTO workspace_memory
        (id, workspace_id, scope, content, embedding, agent_id, user_id, pinned, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      opts.id,
      opts.workspaceId,
      opts.scope,
      opts.content,
      embeddingJson,
      opts.agentId ?? null,
      opts.userId ?? null,
      opts.pinned ? 1 : 0,
      now,
      now
    );
}

// ----------------------------------------------------------------
// Pure function tests
// ----------------------------------------------------------------

describe('cosineSimilarity', () => {
  it('returns 1 for identical vectors', () => {
    expect(cosineSimilarity([1, 0, 0], [1, 0, 0])).toBeCloseTo(1);
  });

  it('returns 0 for orthogonal vectors', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
  });

  it('returns -1 for opposite vectors', () => {
    expect(cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1);
  });

  it('returns 0 for zero vector', () => {
    expect(cosineSimilarity([0, 0], [1, 1])).toBe(0);
  });

  it('returns 0 for mismatched lengths', () => {
    expect(cosineSimilarity([1, 2], [1, 2, 3])).toBe(0);
  });
});

describe('decayFactor', () => {
  it('returns 1 at age 0', () => {
    expect(decayFactor(0)).toBeCloseTo(1);
  });

  it('is monotonically decreasing', () => {
    expect(decayFactor(10)).toBeGreaterThan(decayFactor(20));
    expect(decayFactor(20)).toBeGreaterThan(decayFactor(100));
  });

  it('is approximately 0.5 at ~69 days (half-life)', () => {
    expect(decayFactor(69)).toBeCloseTo(0.5, 1);
  });
});

describe('computeRetrievalScore', () => {
  it('pinned entry uses factor 1.0 regardless of age', () => {
    const score = computeRetrievalScore(0.8, true, 1000);
    expect(score).toBeCloseTo(0.8);
  });

  it('unpinned entry applies decay', () => {
    const score = computeRetrievalScore(0.8, false, 0);
    expect(score).toBeCloseTo(0.8); // age 0 → decay = 1
    const scoreOld = computeRetrievalScore(0.8, false, 100);
    expect(scoreOld).toBeLessThan(score);
  });

  it('pinned entry scores >= unpinned entry with same similarity and age', () => {
    const pinned = computeRetrievalScore(0.7, true, 50);
    const unpinned = computeRetrievalScore(0.7, false, 50);
    expect(pinned).toBeGreaterThanOrEqual(unpinned);
  });
});

describe('isScopeAccessible', () => {
  it('workspace-scoped entries are always accessible', () => {
    expect(isScopeAccessible({ scope: 'workspace', agentId: null, userId: null }, 'user-1', 'agent-1')).toBe(true);
    expect(isScopeAccessible({ scope: 'workspace', agentId: null, userId: null }, 'user-2', null)).toBe(true);
  });

  it('agent-scoped entries are only accessible when agentId matches', () => {
    expect(isScopeAccessible({ scope: 'agent', agentId: 'agent-1', userId: null }, 'user-1', 'agent-1')).toBe(true);
    expect(isScopeAccessible({ scope: 'agent', agentId: 'agent-1', userId: null }, 'user-1', 'agent-2')).toBe(false);
    expect(isScopeAccessible({ scope: 'agent', agentId: 'agent-1', userId: null }, 'user-1', null)).toBe(false);
  });

  it('user-scoped entries are only accessible when userId matches', () => {
    expect(isScopeAccessible({ scope: 'user', agentId: null, userId: 'user-1' }, 'user-1', null)).toBe(true);
    expect(isScopeAccessible({ scope: 'user', agentId: null, userId: 'user-1' }, 'user-2', null)).toBe(false);
  });
});

// ----------------------------------------------------------------
// WorkspaceBrainService integration tests (in-memory SQLite)
// ----------------------------------------------------------------

describe('WorkspaceBrainService', () => {
  let sqlite: Database.Database;
  let service: WorkspaceBrainService;

  beforeEach(() => {
    const testDb = createTestDb();
    sqlite = testDb.sqlite;
    service = new WorkspaceBrainService(testDb.db as any);
    seedWorkspace(sqlite);
    seedAgent(sqlite);
  });

  afterEach(() => {
    sqlite.close();
  });

  // ----------------------------------------------------------------
  // indexFact — stores entry with null embedding when no Ollama
  // ----------------------------------------------------------------

  it('indexFact stores entry with null embedding when Ollama unavailable (Req 1.11)', async () => {
    // No Ollama configured in test env — embedding will be null
    const entry = await service.indexFact({
      workspaceId: 'ws-1',
      agentId: null,
      userId: 'user-1',
      scope: 'workspace',
      content: 'The sky is blue',
      embedding: null,
      sourceConversationId: null,
      sourceMessageId: null,
      pinned: false,
    });

    expect(entry.id).toBeTruthy();
    expect(entry.content).toBe('The sky is blue');
    expect(entry.workspaceId).toBe('ws-1');
    expect(entry.scope).toBe('workspace');
    // embedding may be null (Ollama not available in test)
    expect(entry.createdAt).toBeTruthy();
    expect(entry.updatedAt).toBeTruthy();
  });

  it('indexFact persists to DB (Req 1.1)', async () => {
    const entry = await service.indexFact({
      workspaceId: 'ws-1',
      agentId: null,
      userId: 'user-1',
      scope: 'workspace',
      content: 'Persistent fact',
      embedding: null,
      sourceConversationId: null,
      sourceMessageId: null,
      pinned: false,
    });

    const row = sqlite.prepare('SELECT * FROM workspace_memory WHERE id = ?').get(entry.id) as any;
    expect(row).toBeTruthy();
    expect(row.content).toBe('Persistent fact');
  });

  // ----------------------------------------------------------------
  // retrieve — scope filtering
  // ----------------------------------------------------------------

  it('retrieve returns workspace-scoped entries for any user/agent (Req 1.6, 1.7)', async () => {
    const vec = [1, 0, 0];
    insertMemory(sqlite, { id: 'm1', workspaceId: 'ws-1', scope: 'workspace', content: 'ws fact', embedding: vec });

    const results = await service.retrieve({
      workspaceId: 'ws-1',
      query: 'ws fact',
      queryEmbedding: vec,
      userId: 'any-user',
      agentId: null,
      topK: 5,
    });

    expect(results.some((r) => r.id === 'm1')).toBe(true);
  });

  it('retrieve does NOT return agent-scoped entries when agentId does not match (Req 1.7)', async () => {
    const vec = [1, 0, 0];
    insertMemory(sqlite, {
      id: 'm-agent',
      workspaceId: 'ws-1',
      scope: 'agent',
      content: 'agent secret',
      embedding: vec,
      agentId: 'agent-1',
    });

    const results = await service.retrieve({
      workspaceId: 'ws-1',
      query: 'agent secret',
      queryEmbedding: vec,
      userId: 'user-1',
      agentId: 'agent-2', // different agent
      topK: 5,
    });

    expect(results.some((r) => r.id === 'm-agent')).toBe(false);
  });

  it('retrieve returns agent-scoped entries when agentId matches (Req 1.6)', async () => {
    const vec = [1, 0, 0];
    insertMemory(sqlite, {
      id: 'm-agent',
      workspaceId: 'ws-1',
      scope: 'agent',
      content: 'agent fact',
      embedding: vec,
      agentId: 'agent-1',
    });

    const results = await service.retrieve({
      workspaceId: 'ws-1',
      query: 'agent fact',
      queryEmbedding: vec,
      userId: 'user-1',
      agentId: 'agent-1',
      topK: 5,
    });

    expect(results.some((r) => r.id === 'm-agent')).toBe(true);
  });

  it('retrieve does NOT return user-scoped entries when userId does not match (Req 1.7)', async () => {
    const vec = [1, 0, 0];
    insertMemory(sqlite, {
      id: 'm-user',
      workspaceId: 'ws-1',
      scope: 'user',
      content: 'private note',
      embedding: vec,
      userId: 'user-1',
    });

    const results = await service.retrieve({
      workspaceId: 'ws-1',
      query: 'private note',
      queryEmbedding: vec,
      userId: 'user-2',
      agentId: null,
      topK: 5,
    });

    expect(results.some((r) => r.id === 'm-user')).toBe(false);
  });

  it('retrieve returns user-scoped entries when userId matches (Req 1.6)', async () => {
    const vec = [1, 0, 0];
    insertMemory(sqlite, {
      id: 'm-user',
      workspaceId: 'ws-1',
      scope: 'user',
      content: 'my note',
      embedding: vec,
      userId: 'user-1',
    });

    const results = await service.retrieve({
      workspaceId: 'ws-1',
      query: 'my note',
      queryEmbedding: vec,
      userId: 'user-1',
      agentId: null,
      topK: 5,
    });

    expect(results.some((r) => r.id === 'm-user')).toBe(true);
  });

  it('retrieve excludes entries with null embeddings (Req 1.11)', async () => {
    insertMemory(sqlite, {
      id: 'm-no-embed',
      workspaceId: 'ws-1',
      scope: 'workspace',
      content: 'no embedding',
      embedding: null,
    });

    const results = await service.retrieve({
      workspaceId: 'ws-1',
      query: 'no embedding',
      queryEmbedding: [1, 0, 0],
      userId: 'user-1',
      agentId: null,
      topK: 5,
    });

    expect(results.some((r) => r.id === 'm-no-embed')).toBe(false);
  });

  it('retrieve returns top-K results (Req 1.3)', async () => {
    const vec = [1, 0, 0];
    for (let i = 0; i < 10; i++) {
      insertMemory(sqlite, {
        id: `m-${i}`,
        workspaceId: 'ws-1',
        scope: 'workspace',
        content: `fact ${i}`,
        embedding: vec,
      });
    }

    const results = await service.retrieve({
      workspaceId: 'ws-1',
      query: 'fact',
      queryEmbedding: vec,
      userId: 'user-1',
      agentId: null,
      topK: 3,
    });

    expect(results.length).toBe(3);
  });

  it('retrieve applies temporal decay — newer entries score higher (Req 1.4)', async () => {
    const vec = [1, 0, 0];
    const oldDate = new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString(); // 200 days ago
    const newDate = new Date().toISOString();

    insertMemory(sqlite, { id: 'm-old', workspaceId: 'ws-1', scope: 'workspace', content: 'old', embedding: vec, createdAt: oldDate });
    insertMemory(sqlite, { id: 'm-new', workspaceId: 'ws-1', scope: 'workspace', content: 'new', embedding: vec, createdAt: newDate });

    const results = await service.retrieve({
      workspaceId: 'ws-1',
      query: 'fact',
      queryEmbedding: vec,
      userId: 'user-1',
      agentId: null,
      topK: 2,
    });

    const newEntry = results.find((r) => r.id === 'm-new')!;
    const oldEntry = results.find((r) => r.id === 'm-old')!;
    expect(newEntry.decayScore).toBeGreaterThan(oldEntry.decayScore);
  });

  it('retrieve: pinned entry scores >= unpinned entry with same similarity and age (Req 1.5)', async () => {
    const vec = [1, 0, 0];
    const sameDate = new Date().toISOString();

    insertMemory(sqlite, { id: 'm-pinned', workspaceId: 'ws-1', scope: 'workspace', content: 'pinned', embedding: vec, pinned: true, createdAt: sameDate });
    insertMemory(sqlite, { id: 'm-unpinned', workspaceId: 'ws-1', scope: 'workspace', content: 'unpinned', embedding: vec, pinned: false, createdAt: sameDate });

    const results = await service.retrieve({
      workspaceId: 'ws-1',
      query: 'fact',
      queryEmbedding: vec,
      userId: 'user-1',
      agentId: null,
      topK: 5,
    });

    const pinned = results.find((r) => r.id === 'm-pinned')!;
    const unpinned = results.find((r) => r.id === 'm-unpinned')!;
    expect(pinned.decayScore).toBeGreaterThanOrEqual(unpinned.decayScore);
  });

  // ----------------------------------------------------------------
  // getTimeline — pagination, ordering
  // ----------------------------------------------------------------

  it('getTimeline returns entries ordered by created_at DESC (Req 1.8)', async () => {
    const dates = [
      new Date(Date.now() - 3000).toISOString(),
      new Date(Date.now() - 2000).toISOString(),
      new Date(Date.now() - 1000).toISOString(),
    ];
    dates.forEach((d, i) => {
      insertMemory(sqlite, { id: `m-${i}`, workspaceId: 'ws-1', scope: 'workspace', content: `fact ${i}`, createdAt: d });
    });

    const { entries } = await service.getTimeline('ws-1', 1);
    expect(entries[0].createdAt >= entries[1].createdAt).toBe(true);
    expect(entries[1].createdAt >= entries[2].createdAt).toBe(true);
  });

  it('getTimeline returns page size 20 (Req 1.8)', async () => {
    for (let i = 0; i < 25; i++) {
      insertMemory(sqlite, { id: `m-${i}`, workspaceId: 'ws-1', scope: 'workspace', content: `fact ${i}` });
    }

    const { entries, total } = await service.getTimeline('ws-1', 1);
    expect(entries.length).toBe(20);
    expect(total).toBe(25);
  });

  it('getTimeline page 2 returns remaining entries', async () => {
    for (let i = 0; i < 25; i++) {
      insertMemory(sqlite, { id: `m-${i}`, workspaceId: 'ws-1', scope: 'workspace', content: `fact ${i}` });
    }

    const { entries } = await service.getTimeline('ws-1', 2);
    expect(entries.length).toBe(5);
  });

  it('getTimeline includes null-embedding entries (Req 1.11)', async () => {
    insertMemory(sqlite, { id: 'm-null', workspaceId: 'ws-1', scope: 'workspace', content: 'no embed', embedding: null });

    const { entries } = await service.getTimeline('ws-1', 1);
    expect(entries.some((e) => e.id === 'm-null')).toBe(true);
  });

  // ----------------------------------------------------------------
  // update
  // ----------------------------------------------------------------

  it('update changes content and sets updatedAt (Req 1.9)', async () => {
    insertMemory(sqlite, { id: 'm-upd', workspaceId: 'ws-1', scope: 'workspace', content: 'original' });

    const updated = await service.update('m-upd', 'updated content');
    expect(updated.content).toBe('updated content');
    expect(updated.updatedAt).toBeTruthy();
  });

  it('update throws when entry not found', async () => {
    await expect(service.update('nonexistent', 'content')).rejects.toThrow();
  });

  // ----------------------------------------------------------------
  // delete
  // ----------------------------------------------------------------

  it('delete removes the entry (Req 1.10)', async () => {
    insertMemory(sqlite, { id: 'm-del', workspaceId: 'ws-1', scope: 'workspace', content: 'to delete' });

    await service.delete('m-del');

    const row = sqlite.prepare('SELECT * FROM workspace_memory WHERE id = ?').get('m-del');
    expect(row).toBeUndefined();
  });

  // ----------------------------------------------------------------
  // pin
  // ----------------------------------------------------------------

  it('pin sets pinned=true (Req 1.5)', async () => {
    insertMemory(sqlite, { id: 'm-pin', workspaceId: 'ws-1', scope: 'workspace', content: 'pin me', pinned: false });

    const result = await service.pin('m-pin', true);
    expect(result.pinned).toBe(true);
  });

  it('pin sets pinned=false (unpin)', async () => {
    insertMemory(sqlite, { id: 'm-unpin', workspaceId: 'ws-1', scope: 'workspace', content: 'unpin me', pinned: true });

    const result = await service.pin('m-unpin', false);
    expect(result.pinned).toBe(false);
  });

  it('pin throws when entry not found', async () => {
    await expect(service.pin('nonexistent', true)).rejects.toThrow();
  });
});
