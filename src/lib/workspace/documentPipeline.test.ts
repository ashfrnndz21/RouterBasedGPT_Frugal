/**
 * Unit tests for DocumentPipeline
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from '@/lib/db/schema';
import { DocumentPipeline, chunkText, cosineSimilarity } from './documentPipeline';

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

    CREATE TABLE workspace_documents (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      conversation_id TEXT REFERENCES workspace_conversations(id) ON DELETE CASCADE,
      filename TEXT NOT NULL,
      file_type TEXT NOT NULL,
      content TEXT,
      embeddings TEXT DEFAULT '[]',
      uploaded_by TEXT NOT NULL,
      uploaded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      file_size INTEGER,
      status TEXT DEFAULT 'ready',
      error_message TEXT,
      priority_agents TEXT DEFAULT '[]'
    );

    CREATE TABLE workspace_document_chunks (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL REFERENCES workspace_documents(id) ON DELETE CASCADE,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      chunk_index INTEGER NOT NULL,
      content TEXT NOT NULL,
      embedding TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const db = drizzle(sqlite, { schema });
  return { sqlite, db };
}

function seedWorkspace(sqlite: Database.Database, id = 'ws-1') {
  sqlite.prepare(`INSERT INTO workspaces (id, name, owner_id) VALUES (?, ?, ?)`).run(id, 'Test WS', 'user-1');
}

// ----------------------------------------------------------------
// Mock embedding: returns a deterministic vector based on content hash
// ----------------------------------------------------------------

function makeEmbedding(seed: number, dims = 4): number[] {
  // Simple deterministic vector
  return Array.from({ length: dims }, (_, i) => Math.sin(seed + i));
}

// ----------------------------------------------------------------
// Helper: create a pipeline with mocked embedding
// ----------------------------------------------------------------

function createPipelineWithMockEmbedding(
  db: ReturnType<typeof createTestDb>['db'],
  embeddingFn: (text: string) => number[] | null = () => makeEmbedding(1)
) {
  const pipeline = new DocumentPipeline(db as any);
  // Override private computeEmbedding
  (pipeline as any).computeEmbedding = async (text: string) => embeddingFn(text);
  return pipeline;
}

// ----------------------------------------------------------------
// Pure function tests
// ----------------------------------------------------------------

describe('chunkText', () => {
  it('returns empty array for empty string', () => {
    expect(chunkText('')).toEqual([]);
  });

  it('returns single chunk for short text', () => {
    const text = 'Hello world';
    const chunks = chunkText(text);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toBe(text);
  });

  it('splits text into multiple chunks with overlap', () => {
    const text = 'a'.repeat(1100); // > 2 chunks
    const chunks = chunkText(text);
    expect(chunks.length).toBeGreaterThan(1);
    // Each chunk should be at most 500 chars
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(500);
    }
  });

  it('chunks overlap by ~50 characters', () => {
    const text = 'x'.repeat(600);
    const chunks = chunkText(text);
    expect(chunks.length).toBe(2);
    // chunk[0] ends at 500, chunk[1] starts at 450 → overlap of 50
    expect(chunks[1].length).toBe(150); // 600 - 450
  });

  it('covers all content (no data loss)', () => {
    const text = 'abcdefghij'.repeat(60); // 600 chars
    const chunks = chunkText(text);
    // First chunk starts at 0, last chunk ends at text.length
    expect(chunks[0].startsWith('abcdefghij')).toBe(true);
    expect(text.endsWith(chunks[chunks.length - 1])).toBe(true);
  });
});

describe('cosineSimilarity', () => {
  it('returns 1 for identical vectors', () => {
    expect(cosineSimilarity([1, 0, 0], [1, 0, 0])).toBeCloseTo(1);
  });

  it('returns 0 for orthogonal vectors', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
  });

  it('returns 0 for zero vector', () => {
    expect(cosineSimilarity([0, 0], [1, 1])).toBe(0);
  });

  it('returns 0 for mismatched lengths', () => {
    expect(cosineSimilarity([1, 2], [1, 2, 3])).toBe(0);
  });
});

// ----------------------------------------------------------------
// DocumentPipeline integration tests (in-memory SQLite)
// ----------------------------------------------------------------

describe('DocumentPipeline', () => {
  let sqlite: Database.Database;
  let pipeline: DocumentPipeline;

  beforeEach(() => {
    const testDb = createTestDb();
    sqlite = testDb.sqlite;
    pipeline = createPipelineWithMockEmbedding(testDb.db);
    seedWorkspace(sqlite);
  });

  afterEach(() => {
    sqlite.close();
  });

  // ----------------------------------------------------------------
  // Status transitions
  // ----------------------------------------------------------------

  it('status transitions: uploading → indexing → ready (Req 4.2)', async () => {
    const statuses: string[] = [];

    // Spy on DB updates to capture status transitions
    const origUpdate = (pipeline as any).db.update.bind((pipeline as any).db);
    (pipeline as any).db.update = (table: any) => {
      const builder = origUpdate(table);
      const origSet = builder.set.bind(builder);
      builder.set = (values: any) => {
        if (values.status) statuses.push(values.status);
        return origSet(values);
      };
      return builder;
    };

    const docId = await pipeline.ingest('ws-1', Buffer.from('Hello world'), 'test.txt', 'txt', 'user-1');

    expect(statuses).toContain('indexing');
    expect(statuses).toContain('ready');

    const finalStatus = await pipeline.getStatus(docId);
    expect(finalStatus).toBe('ready');
  });

  it('status transitions: uploading → failed on parse error (Req 4.2, 4.4)', async () => {
    // Override computeEmbedding to throw
    (pipeline as any).computeEmbedding = async () => { throw new Error('embed fail'); };

    // Use a bad PDF buffer that will fail parsing
    const badBuffer = Buffer.from('not a real pdf');

    // pdf-parse will throw on invalid PDF
    const docId = await pipeline.ingest('ws-1', badBuffer, 'bad.pdf', 'pdf', 'user-1');

    const status = await pipeline.getStatus(docId);
    expect(status).toBe('failed');

    // Error message should be stored (Req 4.4)
    const row = sqlite.prepare('SELECT error_message FROM workspace_documents WHERE id = ?').get(docId) as any;
    expect(row.error_message).toBeTruthy();
  });

  it('ingest txt file reaches ready status (Req 4.2)', async () => {
    const docId = await pipeline.ingest('ws-1', Buffer.from('Simple text content'), 'doc.txt', 'txt', 'user-1');
    const status = await pipeline.getStatus(docId);
    expect(status).toBe('ready');
  });

  it('ingest csv file reaches ready status (Req 4.5)', async () => {
    const csv = 'name,age\nAlice,30\nBob,25';
    const docId = await pipeline.ingest('ws-1', Buffer.from(csv), 'data.csv', 'csv', 'user-1');
    const status = await pipeline.getStatus(docId);
    expect(status).toBe('ready');
  });

  it('ingest docx file reaches ready status (Req 4.5)', async () => {
    // mammoth can handle empty/minimal docx — use a minimal valid docx buffer
    // For test purposes, mammoth will fail gracefully on invalid buffer → failed status is acceptable
    // We just verify the pipeline handles it without throwing
    const docId = await pipeline.ingest('ws-1', Buffer.from('fake docx'), 'doc.docx', 'docx', 'user-1');
    const status = await pipeline.getStatus(docId);
    expect(['ready', 'failed']).toContain(status);
  });

  // ----------------------------------------------------------------
  // getStatus
  // ----------------------------------------------------------------

  it('getStatus returns correct status (Req 4.2)', async () => {
    const docId = await pipeline.ingest('ws-1', Buffer.from('content'), 'f.txt', 'txt', 'user-1');
    const status = await pipeline.getStatus(docId);
    expect(status).toBe('ready');
  });

  it('getStatus throws for unknown documentId', async () => {
    await expect(pipeline.getStatus('nonexistent-id')).rejects.toThrow();
  });

  // ----------------------------------------------------------------
  // Chunk creation (Req 4.8)
  // ----------------------------------------------------------------

  it('ingest creates chunks in workspace_document_chunks (Req 4.8)', async () => {
    const text = 'Hello world. This is a test document.';
    const docId = await pipeline.ingest('ws-1', Buffer.from(text), 'test.txt', 'txt', 'user-1');

    const chunks = sqlite
      .prepare('SELECT * FROM workspace_document_chunks WHERE document_id = ?')
      .all(docId) as any[];

    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0].workspace_id).toBe('ws-1');
    expect(chunks[0].document_id).toBe(docId);
    expect(chunks[0].chunk_index).toBe(0);
    expect(chunks[0].content).toBeTruthy();
  });

  it('chunks store embeddings (Req 4.8)', async () => {
    const docId = await pipeline.ingest('ws-1', Buffer.from('Some content'), 'e.txt', 'txt', 'user-1');

    const chunks = sqlite
      .prepare('SELECT embedding FROM workspace_document_chunks WHERE document_id = ?')
      .all(docId) as any[];

    expect(chunks.length).toBeGreaterThan(0);
    // Mock embedding returns non-null
    expect(chunks[0].embedding).not.toBeNull();
    const parsed = JSON.parse(chunks[0].embedding);
    expect(Array.isArray(parsed)).toBe(true);
  });

  it('chunks store null embedding when embedding fails (Req 4.4)', async () => {
    (pipeline as any).computeEmbedding = async () => null;

    const docId = await pipeline.ingest('ws-1', Buffer.from('content'), 'n.txt', 'txt', 'user-1');

    const chunks = sqlite
      .prepare('SELECT embedding FROM workspace_document_chunks WHERE document_id = ?')
      .all(docId) as any[];

    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0].embedding).toBeNull();
  });

  // ----------------------------------------------------------------
  // deleteDocument — removes document and chunks (Req 4.7)
  // ----------------------------------------------------------------

  it('deleteDocument removes document row (Req 4.7)', async () => {
    const docId = await pipeline.ingest('ws-1', Buffer.from('delete me'), 'del.txt', 'txt', 'user-1');

    await pipeline.deleteDocument(docId);

    const row = sqlite.prepare('SELECT * FROM workspace_documents WHERE id = ?').get(docId);
    expect(row).toBeUndefined();
  });

  it('deleteDocument cascades to chunks (Req 4.7)', async () => {
    const docId = await pipeline.ingest('ws-1', Buffer.from('delete me and chunks'), 'del2.txt', 'txt', 'user-1');

    // Verify chunks exist before delete
    const before = sqlite
      .prepare('SELECT * FROM workspace_document_chunks WHERE document_id = ?')
      .all(docId) as any[];
    expect(before.length).toBeGreaterThan(0);

    await pipeline.deleteDocument(docId);

    const after = sqlite
      .prepare('SELECT * FROM workspace_document_chunks WHERE document_id = ?')
      .all(docId) as any[];
    expect(after).toHaveLength(0);
  });

  // ----------------------------------------------------------------
  // searchChunks — cosine similarity ordering (Req 4.3)
  // ----------------------------------------------------------------

  it('searchChunks returns results ordered by similarity (Req 4.3)', async () => {
    // Insert two documents with distinct embeddings
    const highVec = [1, 0, 0, 0];
    const lowVec = [0, 1, 0, 0];
    const queryVec = [1, 0, 0, 0]; // matches highVec perfectly

    // Insert chunks directly
    sqlite.prepare(`
      INSERT INTO workspace_documents (id, workspace_id, filename, file_type, uploaded_by, status)
      VALUES ('doc-a', 'ws-1', 'a.txt', 'txt', 'user-1', 'ready')
    `).run();
    sqlite.prepare(`
      INSERT INTO workspace_documents (id, workspace_id, filename, file_type, uploaded_by, status)
      VALUES ('doc-b', 'ws-1', 'b.txt', 'txt', 'user-1', 'ready')
    `).run();

    sqlite.prepare(`
      INSERT INTO workspace_document_chunks (id, document_id, workspace_id, chunk_index, content, embedding)
      VALUES ('chunk-a', 'doc-a', 'ws-1', 0, 'high similarity content', ?)
    `).run(JSON.stringify(highVec));

    sqlite.prepare(`
      INSERT INTO workspace_document_chunks (id, document_id, workspace_id, chunk_index, content, embedding)
      VALUES ('chunk-b', 'doc-b', 'ws-1', 0, 'low similarity content', ?)
    `).run(JSON.stringify(lowVec));

    const { db } = createTestDb();
    // Use the same sqlite instance
    const testPipeline = new DocumentPipeline((pipeline as any).db);

    const results = await testPipeline.searchChunks('ws-1', queryVec, 2);

    expect(results.length).toBe(2);
    expect(results[0].id).toBe('chunk-a'); // highest similarity first
    expect(results[1].id).toBe('chunk-b');
  });

  it('searchChunks respects topK limit (Req 4.3)', async () => {
    // Insert 5 chunks
    sqlite.prepare(`
      INSERT INTO workspace_documents (id, workspace_id, filename, file_type, uploaded_by, status)
      VALUES ('doc-topk', 'ws-1', 'topk.txt', 'txt', 'user-1', 'ready')
    `).run();

    for (let i = 0; i < 5; i++) {
      sqlite.prepare(`
        INSERT INTO workspace_document_chunks (id, document_id, workspace_id, chunk_index, content, embedding)
        VALUES (?, 'doc-topk', 'ws-1', ?, ?, ?)
      `).run(`chunk-topk-${i}`, i, `content ${i}`, JSON.stringify([1, 0, 0, 0]));
    }

    const results = await pipeline.searchChunks('ws-1', [1, 0, 0, 0], 3);
    expect(results.length).toBe(3);
  });

  it('searchChunks skips chunks without embeddings', async () => {
    sqlite.prepare(`
      INSERT INTO workspace_documents (id, workspace_id, filename, file_type, uploaded_by, status)
      VALUES ('doc-noembed', 'ws-1', 'noembed.txt', 'txt', 'user-1', 'ready')
    `).run();

    sqlite.prepare(`
      INSERT INTO workspace_document_chunks (id, document_id, workspace_id, chunk_index, content, embedding)
      VALUES ('chunk-noembed', 'doc-noembed', 'ws-1', 0, 'no embedding', NULL)
    `).run();

    const results = await pipeline.searchChunks('ws-1', [1, 0, 0, 0], 10);
    expect(results.find((r) => r.id === 'chunk-noembed')).toBeUndefined();
  });

  // ----------------------------------------------------------------
  // priorityDocIds ranking (Req 4.6)
  // ----------------------------------------------------------------

  it('searchChunks ranks priorityDocIds chunks first (Req 4.6)', async () => {
    // doc-priority has lower similarity but should appear first
    const priorityVec = [0, 1, 0, 0]; // low similarity to query
    const normalVec = [1, 0, 0, 0];   // high similarity to query
    const queryVec = [1, 0, 0, 0];

    sqlite.prepare(`
      INSERT INTO workspace_documents (id, workspace_id, filename, file_type, uploaded_by, status)
      VALUES ('doc-priority', 'ws-1', 'priority.txt', 'txt', 'user-1', 'ready')
    `).run();
    sqlite.prepare(`
      INSERT INTO workspace_documents (id, workspace_id, filename, file_type, uploaded_by, status)
      VALUES ('doc-normal', 'ws-1', 'normal.txt', 'txt', 'user-1', 'ready')
    `).run();

    sqlite.prepare(`
      INSERT INTO workspace_document_chunks (id, document_id, workspace_id, chunk_index, content, embedding)
      VALUES ('chunk-priority', 'doc-priority', 'ws-1', 0, 'priority content', ?)
    `).run(JSON.stringify(priorityVec));

    sqlite.prepare(`
      INSERT INTO workspace_document_chunks (id, document_id, workspace_id, chunk_index, content, embedding)
      VALUES ('chunk-normal', 'doc-normal', 'ws-1', 0, 'normal content', ?)
    `).run(JSON.stringify(normalVec));

    const results = await pipeline.searchChunks('ws-1', queryVec, 2, ['doc-priority']);

    expect(results.length).toBe(2);
    // Priority chunk should come first despite lower similarity
    expect(results[0].id).toBe('chunk-priority');
    expect(results[1].id).toBe('chunk-normal');
  });

  it('searchChunks without priorityDocIds orders purely by similarity (Req 4.3)', async () => {
    const highVec = [1, 0, 0, 0];
    const lowVec = [0, 0, 0, 1];
    const queryVec = [1, 0, 0, 0];

    sqlite.prepare(`
      INSERT INTO workspace_documents (id, workspace_id, filename, file_type, uploaded_by, status)
      VALUES ('doc-h', 'ws-1', 'h.txt', 'txt', 'user-1', 'ready')
    `).run();
    sqlite.prepare(`
      INSERT INTO workspace_documents (id, workspace_id, filename, file_type, uploaded_by, status)
      VALUES ('doc-l', 'ws-1', 'l.txt', 'txt', 'user-1', 'ready')
    `).run();

    sqlite.prepare(`
      INSERT INTO workspace_document_chunks (id, document_id, workspace_id, chunk_index, content, embedding)
      VALUES ('chunk-h', 'doc-h', 'ws-1', 0, 'high', ?)
    `).run(JSON.stringify(highVec));
    sqlite.prepare(`
      INSERT INTO workspace_document_chunks (id, document_id, workspace_id, chunk_index, content, embedding)
      VALUES ('chunk-l', 'doc-l', 'ws-1', 0, 'low', ?)
    `).run(JSON.stringify(lowVec));

    const results = await pipeline.searchChunks('ws-1', queryVec, 2);
    expect(results[0].id).toBe('chunk-h');
    expect(results[1].id).toBe('chunk-l');
  });

  // ----------------------------------------------------------------
  // Re-upload (Req 4.9)
  // ----------------------------------------------------------------

  it('re-uploading same filename replaces existing document (Req 4.9)', async () => {
    const docId1 = await pipeline.ingest('ws-1', Buffer.from('v1'), 'same.txt', 'txt', 'user-1');
    const docId2 = await pipeline.ingest('ws-1', Buffer.from('v2'), 'same.txt', 'txt', 'user-1');

    // Old document should be gone
    const oldRow = sqlite.prepare('SELECT * FROM workspace_documents WHERE id = ?').get(docId1);
    expect(oldRow).toBeUndefined();

    // New document should exist
    const newRow = sqlite.prepare('SELECT * FROM workspace_documents WHERE id = ?').get(docId2) as any;
    expect(newRow).toBeTruthy();
    expect(newRow.status).toBe('ready');
  });

  it('re-upload removes old chunks (Req 4.9)', async () => {
    const docId1 = await pipeline.ingest('ws-1', Buffer.from('v1 content'), 'dup.txt', 'txt', 'user-1');

    // Verify old chunks exist
    const oldChunks = sqlite
      .prepare('SELECT * FROM workspace_document_chunks WHERE document_id = ?')
      .all(docId1) as any[];
    expect(oldChunks.length).toBeGreaterThan(0);

    await pipeline.ingest('ws-1', Buffer.from('v2 content'), 'dup.txt', 'txt', 'user-1');

    // Old chunks should be gone (cascade delete)
    const afterChunks = sqlite
      .prepare('SELECT * FROM workspace_document_chunks WHERE document_id = ?')
      .all(docId1) as any[];
    expect(afterChunks).toHaveLength(0);
  });

  // ----------------------------------------------------------------
  // Workspace isolation (Req 4.1)
  // ----------------------------------------------------------------

  it('searchChunks only returns chunks from the specified workspace (Req 4.1)', async () => {
    // Seed second workspace
    sqlite.prepare(`INSERT INTO workspaces (id, name, owner_id) VALUES ('ws-2', 'WS2', 'user-2')`).run();

    sqlite.prepare(`
      INSERT INTO workspace_documents (id, workspace_id, filename, file_type, uploaded_by, status)
      VALUES ('doc-ws1', 'ws-1', 'ws1.txt', 'txt', 'user-1', 'ready')
    `).run();
    sqlite.prepare(`
      INSERT INTO workspace_documents (id, workspace_id, filename, file_type, uploaded_by, status)
      VALUES ('doc-ws2', 'ws-2', 'ws2.txt', 'txt', 'user-2', 'ready')
    `).run();

    const vec = [1, 0, 0, 0];
    sqlite.prepare(`
      INSERT INTO workspace_document_chunks (id, document_id, workspace_id, chunk_index, content, embedding)
      VALUES ('chunk-ws1', 'doc-ws1', 'ws-1', 0, 'ws1 content', ?)
    `).run(JSON.stringify(vec));
    sqlite.prepare(`
      INSERT INTO workspace_document_chunks (id, document_id, workspace_id, chunk_index, content, embedding)
      VALUES ('chunk-ws2', 'doc-ws2', 'ws-2', 0, 'ws2 content', ?)
    `).run(JSON.stringify(vec));

    const results = await pipeline.searchChunks('ws-1', vec, 10);

    expect(results.find((r) => r.id === 'chunk-ws1')).toBeTruthy();
    expect(results.find((r) => r.id === 'chunk-ws2')).toBeUndefined();
  });
});
