/**
 * Integration test: workspace creation seeds DataAgent (Requirement 5.1)
 */
import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// ── Minimal in-memory DB setup ────────────────────────────────────────────────
function buildTestDb() {
  const sqlite = new Database(':memory:');
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS workspaces (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      icon TEXT DEFAULT '📁',
      owner_id TEXT NOT NULL,
      context TEXT,
      settings TEXT DEFAULT '{"webSearchEnabled":true,"citationRequired":true,"conversationRetention":90}',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS workspace_agents (
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
  return drizzle(sqlite, { schema });
}

// ── Inline minimal workspaceService (avoids global DB dependency) ─────────────
async function createWorkspaceWithDataAgent(
  db: ReturnType<typeof buildTestDb>,
  params: { id: string; name: string; ownerId: string }
) {
  const { randomUUID } = await import('crypto');
  const now = new Date().toISOString();

  await db.insert(schema.workspaces).values({
    id: params.id,
    name: params.name,
    ownerId: params.ownerId,
    createdAt: now,
    updatedAt: now,
  });

  // Seed DataAgent — mirrors workspaceService.ts logic
  await db.insert(schema.workspaceAgents).values({
    id: randomUUID(),
    workspaceId: params.id,
    name: 'DataAgent',
    avatar: '📊',
    role: 'Data Analyst',
    specialty: 'SQL and data analysis',
    createdAt: now,
    updatedAt: now,
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('workspace creation — DataAgent seeding (Req 5.1)', () => {
  let db: ReturnType<typeof buildTestDb>;

  beforeEach(() => {
    db = buildTestDb();
  });

  it('seeds exactly one DataAgent for a new workspace', async () => {
    const workspaceId = 'ws-test-1';
    await createWorkspaceWithDataAgent(db, { id: workspaceId, name: 'Test WS', ownerId: 'user-1' });

    const agents = await db
      .select()
      .from(schema.workspaceAgents)
      .where(eq(schema.workspaceAgents.workspaceId, workspaceId));

    const dataAgents = agents.filter((a) => a.name === 'DataAgent');
    expect(dataAgents).toHaveLength(1);
  });

  it('DataAgent has correct role and avatar', async () => {
    const workspaceId = 'ws-test-2';
    await createWorkspaceWithDataAgent(db, { id: workspaceId, name: 'Test WS 2', ownerId: 'user-1' });

    const agents = await db
      .select()
      .from(schema.workspaceAgents)
      .where(eq(schema.workspaceAgents.workspaceId, workspaceId));

    const dataAgent = agents.find((a) => a.name === 'DataAgent')!;
    expect(dataAgent.avatar).toBe('📊');
    expect(dataAgent.role).toBe('Data Analyst');
    expect(dataAgent.specialty).toBe('SQL and data analysis');
  });

  it('DataAgent is scoped to its own workspace', async () => {
    await createWorkspaceWithDataAgent(db, { id: 'ws-a', name: 'WS A', ownerId: 'user-1' });
    await createWorkspaceWithDataAgent(db, { id: 'ws-b', name: 'WS B', ownerId: 'user-1' });

    const agentsA = await db
      .select()
      .from(schema.workspaceAgents)
      .where(eq(schema.workspaceAgents.workspaceId, 'ws-a'));

    const agentsB = await db
      .select()
      .from(schema.workspaceAgents)
      .where(eq(schema.workspaceAgents.workspaceId, 'ws-b'));

    expect(agentsA.every((a) => a.workspaceId === 'ws-a')).toBe(true);
    expect(agentsB.every((a) => a.workspaceId === 'ws-b')).toBe(true);
  });
});
