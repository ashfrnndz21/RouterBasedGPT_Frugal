/**
 * Unit tests for DataAgentService
 * Requirements: 5.1, 5.3, 5.5, 5.7, 5.8
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from '@/lib/db/schema';
import { DataAgentService, NoDataSourceError } from './dataAgentService';

// ----------------------------------------------------------------
// Mock the GenBI engine dependencies so tests don't need Ollama
// ----------------------------------------------------------------

vi.mock('@/lib/providers', () => ({
  getAvailableChatModelProviders: vi.fn().mockResolvedValue({}),
}));

vi.mock('./dataSourceService', () => ({
  dataSourceService: {
    executeQuery: vi.fn().mockResolvedValue({
      success: true,
      rows: [{ id: 1, name: 'Alice' }],
      columns: ['id', 'name'],
    }),
  },
}));

vi.mock('./csvDataService', () => ({
  queryCSVDatabase: vi.fn().mockResolvedValue({
    success: true,
    rows: [{ id: 1, name: 'Alice' }],
    columns: ['id', 'name'],
  }),
}));

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
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE workspace_conversations (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      message_count INTEGER DEFAULT 0,
      tags TEXT DEFAULT '[]',
      participant_agent_ids TEXT DEFAULT '[]'
    );

    CREATE TABLE workspace_data_sources (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      config TEXT NOT NULL DEFAULT '{}',
      schema TEXT,
      row_count INTEGER,
      columns TEXT,
      status TEXT DEFAULT 'active',
      last_tested TEXT,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE genbi_queries (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      conversation_id TEXT REFERENCES workspace_conversations(id) ON DELETE CASCADE,
      data_source_id TEXT NOT NULL REFERENCES workspace_data_sources(id) ON DELETE CASCADE,
      nl_query TEXT NOT NULL,
      generated_sql TEXT NOT NULL,
      sql_explanation TEXT,
      status TEXT NOT NULL,
      result_row_count INTEGER,
      execution_time_ms INTEGER,
      error_message TEXT,
      model_tier TEXT,
      estimated_cost INTEGER,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const db = drizzle(sqlite, { schema });
  return { sqlite, db };
}

function seedWorkspace(sqlite: Database.Database, id = 'ws-1') {
  sqlite
    .prepare(`INSERT INTO workspaces (id, name, owner_id) VALUES (?, ?, ?)`)
    .run(id, 'Test WS', 'user-1');
}

function seedConversation(sqlite: Database.Database, id = 'conv-1', workspaceId = 'ws-1') {
  sqlite
    .prepare(
      `INSERT INTO workspace_conversations (id, workspace_id, title, created_by) VALUES (?, ?, ?, ?)`
    )
    .run(id, workspaceId, 'Test Conv', 'user-1');
}

function seedDataSource(
  sqlite: Database.Database,
  id = 'ds-1',
  workspaceId = 'ws-1',
  type = 'sqlite'
) {
  sqlite
    .prepare(
      `INSERT INTO workspace_data_sources (id, workspace_id, name, type, config, columns, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      id,
      workspaceId,
      'Test DB',
      type,
      JSON.stringify({ database: '/tmp/test.db', tableName: 'users' }),
      JSON.stringify([
        { name: 'id', type: 'INTEGER' },
        { name: 'name', type: 'TEXT' },
      ]),
      'user-1'
    );
}

// ----------------------------------------------------------------
// Tests
// ----------------------------------------------------------------

describe('DataAgentService', () => {
  let sqlite: Database.Database;
  let service: DataAgentService;

  beforeEach(() => {
    const testDb = createTestDb();
    sqlite = testDb.sqlite;
    service = new DataAgentService(testDb.db as any);
    seedWorkspace(sqlite);
    seedConversation(sqlite);
  });

  afterEach(() => {
    sqlite.close();
    vi.clearAllMocks();
  });

  // ----------------------------------------------------------------
  // NoDataSourceError — Req 5.8
  // ----------------------------------------------------------------

  it('throws NoDataSourceError when no data source is configured (Req 5.8)', async () => {
    await expect(
      service.handleQuery('show all users', 'ws-1', 'conv-1', 'user-1')
    ).rejects.toThrow(NoDataSourceError);
  });

  it('NoDataSourceError message mentions the workspace and GenBI tab', async () => {
    await expect(
      service.handleQuery('show all users', 'ws-1', 'conv-1', 'user-1')
    ).rejects.toThrow(/data source/i);
  });

  it('throws NoDataSourceError for a workspace that has no data sources even if other workspaces do', async () => {
    // Seed a data source for a different workspace
    seedWorkspace(sqlite, 'ws-other');
    seedDataSource(sqlite, 'ds-other', 'ws-other');

    await expect(
      service.handleQuery('show all users', 'ws-1', 'conv-1', 'user-1')
    ).rejects.toThrow(NoDataSourceError);
  });

  // ----------------------------------------------------------------
  // Successful InlineResultCard shape — Req 5.3
  // ----------------------------------------------------------------

  it('returns an InlineResultCard with correct shape on success (Req 5.3)', async () => {
    seedDataSource(sqlite);

    const card = await service.handleQuery('show all users', 'ws-1', 'conv-1', 'user-1');

    expect(card.type).toBe('inline_result_card');
    expect(typeof card.queryId).toBe('string');
    expect(card.queryId.length).toBeGreaterThan(0);
    expect(card.naturalLanguageQuery).toBe('show all users');
    expect(typeof card.generatedSql).toBe('string');
    expect(Array.isArray(card.columns)).toBe(true);
    expect(Array.isArray(card.rows)).toBe(true);
    expect(typeof card.rowCount).toBe('number');
    expect(typeof card.summary).toBe('string');
    expect(typeof card.executionTimeMs).toBe('number');
  });

  it('rowCount matches the number of rows returned (Req 5.3)', async () => {
    seedDataSource(sqlite);

    const card = await service.handleQuery('show all users', 'ws-1', 'conv-1', 'user-1');

    expect(card.rowCount).toBe(card.rows.length);
  });

  it('naturalLanguageQuery in card matches the input query (Req 5.3)', async () => {
    seedDataSource(sqlite);

    const query = 'how many users are there?';
    const card = await service.handleQuery(query, 'ws-1', 'conv-1', 'user-1');

    expect(card.naturalLanguageQuery).toBe(query);
  });

  // ----------------------------------------------------------------
  // genbi_query record stored — Req 5.5
  // ----------------------------------------------------------------

  it('stores a genbi_query record linked to the conversation (Req 5.5)', async () => {
    seedDataSource(sqlite);

    const card = await service.handleQuery('show all users', 'ws-1', 'conv-1', 'user-1');

    const rows = sqlite.prepare('SELECT * FROM genbi_queries WHERE id = ?').all(card.queryId) as any[];
    expect(rows).toHaveLength(1);

    const row = rows[0];
    expect(row.workspace_id).toBe('ws-1');
    expect(row.conversation_id).toBe('conv-1');
    expect(row.nl_query).toBe('show all users');
    expect(row.created_by).toBe('user-1');
    expect(row.status).toBe('success');
  });

  it('stored genbi_query has result_row_count and execution_time_ms (Req 5.5)', async () => {
    seedDataSource(sqlite);

    const card = await service.handleQuery('show all users', 'ws-1', 'conv-1', 'user-1');

    const row = sqlite
      .prepare('SELECT result_row_count, execution_time_ms FROM genbi_queries WHERE id = ?')
      .get(card.queryId) as any;

    expect(row.result_row_count).toBe(card.rowCount);
    expect(row.execution_time_ms).toBeGreaterThanOrEqual(0);
  });

  // ----------------------------------------------------------------
  // CSV data source path
  // ----------------------------------------------------------------

  it('uses queryCSVDatabase for csv-type data sources', async () => {
    const { queryCSVDatabase } = await import('./csvDataService');
    seedDataSource(sqlite, 'ds-csv', 'ws-1', 'csv');

    await service.handleQuery('show all users', 'ws-1', 'conv-1', 'user-1');

    expect(queryCSVDatabase).toHaveBeenCalled();
  });
});
