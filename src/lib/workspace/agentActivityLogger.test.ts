/**
 * Unit tests for AgentActivityLogger
 * Requirements: 2.7, 2.8
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from '@/lib/db/schema';
import { AgentActivityLogger } from './agentActivityLogger';

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

    CREATE TABLE agent_activity_log (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL REFERENCES workspace_agents(id) ON DELETE CASCADE,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      conversation_id TEXT REFERENCES workspace_conversations(id) ON DELETE SET NULL,
      message_id TEXT,
      action_type TEXT NOT NULL CHECK(action_type IN ('query_answered','document_read','data_analyzed','handoff_sent','handoff_received')),
      metadata TEXT DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
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

function seedConversation(sqlite: Database.Database, id = 'conv-1', workspaceId = 'ws-1') {
  sqlite
    .prepare(`INSERT INTO workspace_conversations (id, workspace_id, title, created_by) VALUES (?, ?, ?, ?)`)
    .run(id, workspaceId, 'Test Conv', 'user-1');
}

// ----------------------------------------------------------------
// Tests
// ----------------------------------------------------------------

describe('AgentActivityLogger', () => {
  let sqlite: Database.Database;
  let logger: AgentActivityLogger;

  beforeEach(() => {
    const testDb = createTestDb();
    sqlite = testDb.sqlite;
    logger = new AgentActivityLogger(testDb.db as any);
    seedWorkspace(sqlite);
    seedAgent(sqlite);
    seedConversation(sqlite);
  });

  afterEach(() => {
    sqlite.close();
  });

  // ----------------------------------------------------------------
  // record() — inserts an entry correctly
  // ----------------------------------------------------------------

  it('record() inserts an entry into agent_activity_log (Req 2.7)', async () => {
    await logger.record({
      agentId: 'agent-1',
      workspaceId: 'ws-1',
      conversationId: 'conv-1',
      messageId: 'msg-1',
      actionType: 'query_answered',
      metadata: { tokens: 42 },
    });

    const rows = sqlite.prepare('SELECT * FROM agent_activity_log').all() as any[];
    expect(rows).toHaveLength(1);
    const row = rows[0];
    expect(row.agent_id).toBe('agent-1');
    expect(row.workspace_id).toBe('ws-1');
    expect(row.conversation_id).toBe('conv-1');
    expect(row.message_id).toBe('msg-1');
    expect(row.action_type).toBe('query_answered');
    expect(row.id).toBeTruthy();
    expect(row.created_at).toBeTruthy();
  });

  it('record() stores metadata as JSON (Req 2.7)', async () => {
    await logger.record({
      agentId: 'agent-1',
      workspaceId: 'ws-1',
      conversationId: 'conv-1',
      messageId: 'msg-2',
      actionType: 'data_analyzed',
      metadata: { rowCount: 100, sql: 'SELECT 1' },
    });

    const row = sqlite.prepare('SELECT metadata FROM agent_activity_log').get() as any;
    const parsed = JSON.parse(row.metadata);
    expect(parsed.rowCount).toBe(100);
    expect(parsed.sql).toBe('SELECT 1');
  });

  it('record() works for all action types', async () => {
    const actionTypes = [
      'query_answered',
      'document_read',
      'data_analyzed',
      'handoff_sent',
      'handoff_received',
    ] as const;

    for (const actionType of actionTypes) {
      await logger.record({
        agentId: 'agent-1',
        workspaceId: 'ws-1',
        conversationId: 'conv-1',
        messageId: `msg-${actionType}`,
        actionType,
        metadata: {},
      });
    }

    const rows = sqlite.prepare('SELECT action_type FROM agent_activity_log').all() as any[];
    const types = rows.map((r) => r.action_type);
    for (const actionType of actionTypes) {
      expect(types).toContain(actionType);
    }
  });

  // ----------------------------------------------------------------
  // getLog() — ordering, pagination, total count
  // ----------------------------------------------------------------

  it('getLog() returns entries ordered by created_at DESC (Req 2.8)', async () => {
    // Insert entries with distinct timestamps
    const timestamps = [
      new Date(Date.now() - 3000).toISOString(),
      new Date(Date.now() - 2000).toISOString(),
      new Date(Date.now() - 1000).toISOString(),
    ];

    for (let i = 0; i < 3; i++) {
      sqlite
        .prepare(
          `INSERT INTO agent_activity_log (id, agent_id, workspace_id, conversation_id, message_id, action_type, metadata, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(`log-${i}`, 'agent-1', 'ws-1', 'conv-1', `msg-${i}`, 'query_answered', '{}', timestamps[i]);
    }

    const { entries } = await logger.getLog('agent-1', 1);
    expect(entries.length).toBe(3);
    // Verify descending order
    expect(entries[0].createdAt >= entries[1].createdAt).toBe(true);
    expect(entries[1].createdAt >= entries[2].createdAt).toBe(true);
  });

  it('getLog() paginates correctly with page size 20 (Req 2.8)', async () => {
    // Insert 25 entries
    for (let i = 0; i < 25; i++) {
      const ts = new Date(Date.now() - i * 1000).toISOString();
      sqlite
        .prepare(
          `INSERT INTO agent_activity_log (id, agent_id, workspace_id, conversation_id, message_id, action_type, metadata, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(`log-${i}`, 'agent-1', 'ws-1', 'conv-1', `msg-${i}`, 'query_answered', '{}', ts);
    }

    const page1 = await logger.getLog('agent-1', 1);
    expect(page1.entries.length).toBe(20);

    const page2 = await logger.getLog('agent-1', 2);
    expect(page2.entries.length).toBe(5);
  });

  it('getLog() returns correct total count (Req 2.8)', async () => {
    for (let i = 0; i < 25; i++) {
      sqlite
        .prepare(
          `INSERT INTO agent_activity_log (id, agent_id, workspace_id, conversation_id, message_id, action_type, metadata, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(`log-${i}`, 'agent-1', 'ws-1', 'conv-1', `msg-${i}`, 'query_answered', '{}', new Date().toISOString());
    }

    const { total } = await logger.getLog('agent-1', 1);
    expect(total).toBe(25);
  });

  it('getLog() only returns entries for the specified agentId', async () => {
    // Seed a second agent
    seedAgent(sqlite, 'agent-2', 'ws-1');

    sqlite
      .prepare(
        `INSERT INTO agent_activity_log (id, agent_id, workspace_id, conversation_id, message_id, action_type, metadata)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run('log-a1', 'agent-1', 'ws-1', 'conv-1', 'msg-1', 'query_answered', '{}');

    sqlite
      .prepare(
        `INSERT INTO agent_activity_log (id, agent_id, workspace_id, conversation_id, message_id, action_type, metadata)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run('log-a2', 'agent-2', 'ws-1', 'conv-1', 'msg-2', 'query_answered', '{}');

    const { entries, total } = await logger.getLog('agent-1', 1);
    expect(total).toBe(1);
    expect(entries[0].agentId).toBe('agent-1');
  });

  it('getLog() returns empty result when agent has no entries', async () => {
    const { entries, total } = await logger.getLog('agent-1', 1);
    expect(entries).toHaveLength(0);
    expect(total).toBe(0);
  });

  it('getLog() page 2 returns remaining entries after page 1', async () => {
    for (let i = 0; i < 25; i++) {
      const ts = new Date(Date.now() - i * 1000).toISOString();
      sqlite
        .prepare(
          `INSERT INTO agent_activity_log (id, agent_id, workspace_id, conversation_id, message_id, action_type, metadata, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(`log-${i}`, 'agent-1', 'ws-1', 'conv-1', `msg-${i}`, 'query_answered', '{}', ts);
    }

    const page1 = await logger.getLog('agent-1', 1);
    const page2 = await logger.getLog('agent-1', 2);

    // No overlap between pages
    const page1Ids = new Set(page1.entries.map((e) => e.id));
    for (const entry of page2.entries) {
      expect(page1Ids.has(entry.id)).toBe(false);
    }

    // Together they cover all 25
    expect(page1.entries.length + page2.entries.length).toBe(25);
  });
});
