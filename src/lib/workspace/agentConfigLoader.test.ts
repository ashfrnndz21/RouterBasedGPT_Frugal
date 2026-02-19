/**
 * Unit tests for AgentConfigLoader
 * Requirements: 8.1, 8.2, 8.3, 8.4
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { sql } from 'drizzle-orm';
import * as schema from '@/lib/db/schema';
import { AgentConfigLoader, AgentNotFoundError, AgentWorkspaceMismatchError } from './agentConfigLoader';

// ----------------------------------------------------------------
// In-memory DB setup — avoids touching the real data/db.sqlite
// ----------------------------------------------------------------

function createTestDb() {
  const sqlite = new Database(':memory:');

  // Create minimal tables needed for the test
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
  `);

  const db = drizzle(sqlite, { schema });
  return { sqlite, db };
}

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

function seedWorkspace(sqlite: Database.Database, id = 'ws-1') {
  sqlite.prepare(
    `INSERT INTO workspaces (id, name, owner_id) VALUES (?, ?, ?)`
  ).run(id, 'Test Workspace', 'user-1');
}

function seedAgent(
  sqlite: Database.Database,
  overrides: Partial<{
    id: string;
    workspaceId: string;
    name: string;
    systemPrompt: string;
    chatModel: string;
    chatModelProvider: string;
    embeddingModel: string;
    embeddingModelProvider: string;
    avatar: string;
    role: string;
    specialty: string;
    toolsAllowed: string;
    memoryScope: string;
  }> = {}
) {
  const agent = {
    id: 'agent-1',
    workspaceId: 'ws-1',
    name: 'Test Agent',
    systemPrompt: 'You are helpful.',
    chatModel: 'llama3',
    chatModelProvider: 'ollama',
    embeddingModel: 'nomic-embed-text',
    embeddingModelProvider: 'ollama',
    avatar: '🧠',
    role: 'Analyst',
    specialty: 'Data analysis',
    toolsAllowed: JSON.stringify(['search', 'calculator']),
    memoryScope: 'workspace',
    ...overrides,
  };

  sqlite
    .prepare(
      `INSERT INTO workspace_agents
        (id, workspace_id, name, system_prompt, chat_model, chat_model_provider,
         embedding_model, embedding_model_provider, avatar, role, specialty,
         tools_allowed, memory_scope)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      agent.id,
      agent.workspaceId,
      agent.name,
      agent.systemPrompt,
      agent.chatModel,
      agent.chatModelProvider,
      agent.embeddingModel,
      agent.embeddingModelProvider,
      agent.avatar,
      agent.role,
      agent.specialty,
      agent.toolsAllowed,
      agent.memoryScope
    );

  return agent;
}

// ----------------------------------------------------------------
// Tests
// ----------------------------------------------------------------

describe('AgentConfigLoader', () => {
  let sqlite: Database.Database;
  let db: ReturnType<typeof drizzle>;
  let loader: AgentConfigLoader;

  beforeEach(() => {
    const testDb = createTestDb();
    sqlite = testDb.sqlite;
    db = testDb.db;

    // Create a loader that uses the in-memory db
    loader = new AgentConfigLoader(db as any);

    seedWorkspace(sqlite);
  });

  afterEach(() => {
    sqlite.close();
  });

  // ----------------------------------------------------------------
  // 404 — missing agent
  // ----------------------------------------------------------------

  it('throws AgentNotFoundError (404) when agent does not exist', async () => {
    await expect(loader.loadAgent('nonexistent-agent', 'ws-1')).rejects.toThrow(
      AgentNotFoundError
    );
  });

  it('AgentNotFoundError has statusCode 404', async () => {
    try {
      await loader.loadAgent('nonexistent-agent', 'ws-1');
    } catch (err) {
      expect(err).toBeInstanceOf(AgentNotFoundError);
      expect((err as AgentNotFoundError).statusCode).toBe(404);
    }
  });

  // ----------------------------------------------------------------
  // 403 — workspace mismatch
  // ----------------------------------------------------------------

  it('throws AgentWorkspaceMismatchError (403) when workspaceId does not match', async () => {
    seedWorkspace(sqlite, 'ws-other');
    seedAgent(sqlite, { id: 'agent-1', workspaceId: 'ws-1' });

    await expect(loader.loadAgent('agent-1', 'ws-other')).rejects.toThrow(
      AgentWorkspaceMismatchError
    );
  });

  it('AgentWorkspaceMismatchError has statusCode 403', async () => {
    seedWorkspace(sqlite, 'ws-other');
    seedAgent(sqlite, { id: 'agent-1', workspaceId: 'ws-1' });

    try {
      await loader.loadAgent('agent-1', 'ws-other');
    } catch (err) {
      expect(err).toBeInstanceOf(AgentWorkspaceMismatchError);
      expect((err as AgentWorkspaceMismatchError).statusCode).toBe(403);
    }
  });

  // ----------------------------------------------------------------
  // Success — correct field mapping
  // ----------------------------------------------------------------

  it('returns a correctly mapped AgentConfig on success', async () => {
    seedAgent(sqlite);

    const config = await loader.loadAgent('agent-1', 'ws-1');

    expect(config).toMatchObject({
      id: 'agent-1',
      workspaceId: 'ws-1',
      name: 'Test Agent',
      avatar: '🧠',
      role: 'Analyst',
      specialty: 'Data analysis',
      systemPrompt: 'You are helpful.',
      chatModel: 'llama3',
      chatModelProvider: 'ollama',
      embeddingModel: 'nomic-embed-text',
      embeddingModelProvider: 'ollama',
      toolsAllowed: ['search', 'calculator'],
      memoryScope: 'workspace',
    });
  });

  it('returns default avatar when avatar column is null', async () => {
    sqlite
      .prepare(
        `INSERT INTO workspace_agents (id, workspace_id, name, avatar)
         VALUES (?, ?, ?, NULL)`
      )
      .run('agent-null-avatar', 'ws-1', 'No Avatar Agent');

    const config = await loader.loadAgent('agent-null-avatar', 'ws-1');
    expect(config.avatar).toBe('🤖');
  });

  it('returns empty toolsAllowed array when column is null', async () => {
    sqlite
      .prepare(
        `INSERT INTO workspace_agents (id, workspace_id, name, tools_allowed)
         VALUES (?, ?, ?, NULL)`
      )
      .run('agent-no-tools', 'ws-1', 'No Tools Agent');

    const config = await loader.loadAgent('agent-no-tools', 'ws-1');
    expect(config.toolsAllowed).toEqual([]);
  });

  it('returns workspace memoryScope as default when column is null', async () => {
    sqlite
      .prepare(
        `INSERT INTO workspace_agents (id, workspace_id, name, memory_scope)
         VALUES (?, ?, ?, NULL)`
      )
      .run('agent-no-scope', 'ws-1', 'No Scope Agent');

    const config = await loader.loadAgent('agent-no-scope', 'ws-1');
    expect(config.memoryScope).toBe('workspace');
  });

  it('correctly maps agent-scoped memoryScope', async () => {
    seedAgent(sqlite, { id: 'agent-scoped', memoryScope: 'agent' });

    const config = await loader.loadAgent('agent-scoped', 'ws-1');
    expect(config.memoryScope).toBe('agent');
  });

  it('correctly maps user-scoped memoryScope', async () => {
    seedAgent(sqlite, { id: 'agent-user-scoped', memoryScope: 'user' });

    const config = await loader.loadAgent('agent-user-scoped', 'ws-1');
    expect(config.memoryScope).toBe('user');
  });
});
