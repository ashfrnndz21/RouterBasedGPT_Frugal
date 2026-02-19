/**
 * Unit tests for PresenceTracker
 * Requirements: 7.1, 7.2
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from '@/lib/db/schema';
import { PresenceTracker } from './presenceTracker';

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

    CREATE TABLE workspace_presence (
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL,
      last_active_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (workspace_id, user_id)
    );

    CREATE INDEX IF NOT EXISTS idx_presence_workspace ON workspace_presence(workspace_id);
  `);

  const db = drizzle(sqlite, { schema });
  return { sqlite, db };
}

function seedWorkspace(sqlite: Database.Database, id = 'ws-1') {
  sqlite.prepare(`INSERT INTO workspaces (id, name, owner_id) VALUES (?, ?, ?)`).run(id, 'Test WS', 'user-1');
}

// ----------------------------------------------------------------
// Tests
// ----------------------------------------------------------------

describe('PresenceTracker', () => {
  let sqlite: Database.Database;
  let tracker: PresenceTracker;

  beforeEach(() => {
    const testDb = createTestDb();
    sqlite = testDb.sqlite;
    tracker = new PresenceTracker(testDb.db as any);
    seedWorkspace(sqlite);
  });

  afterEach(() => {
    sqlite.close();
  });

  // ----------------------------------------------------------------
  // touch()
  // ----------------------------------------------------------------

  it('touch() inserts a presence row (Req 7.2)', async () => {
    await tracker.touch('ws-1', 'user-1');

    const rows = sqlite.prepare('SELECT * FROM workspace_presence').all() as any[];
    expect(rows).toHaveLength(1);
    expect(rows[0].workspace_id).toBe('ws-1');
    expect(rows[0].user_id).toBe('user-1');
    expect(rows[0].last_active_at).toBeTruthy();
  });

  it('touch() upserts — calling twice updates the timestamp (Req 7.2)', async () => {
    const before = new Date(Date.now() - 2000).toISOString();

    // Manually insert an old row
    sqlite
      .prepare(`INSERT INTO workspace_presence (workspace_id, user_id, last_active_at) VALUES (?, ?, ?)`)
      .run('ws-1', 'user-1', before);

    await tracker.touch('ws-1', 'user-1');

    const rows = sqlite.prepare('SELECT * FROM workspace_presence').all() as any[];
    expect(rows).toHaveLength(1); // still one row
    expect(rows[0].last_active_at > before).toBe(true); // timestamp updated
  });

  it('touch() creates separate rows for different users (Req 7.2)', async () => {
    await tracker.touch('ws-1', 'user-1');
    await tracker.touch('ws-1', 'user-2');

    const rows = sqlite.prepare('SELECT * FROM workspace_presence').all() as any[];
    expect(rows).toHaveLength(2);
  });

  it('touch() creates separate rows for different workspaces', async () => {
    seedWorkspace(sqlite, 'ws-2');
    await tracker.touch('ws-1', 'user-1');
    await tracker.touch('ws-2', 'user-1');

    const rows = sqlite.prepare('SELECT * FROM workspace_presence').all() as any[];
    expect(rows).toHaveLength(2);
  });

  // ----------------------------------------------------------------
  // getActiveCount()
  // ----------------------------------------------------------------

  it('getActiveCount() returns 0 when no presence rows exist (Req 7.1)', async () => {
    const count = await tracker.getActiveCount('ws-1', 5 * 60 * 1000);
    expect(count).toBe(0);
  });

  it('getActiveCount() counts users active within the window (Req 7.1)', async () => {
    const now = new Date().toISOString();
    sqlite.prepare(`INSERT INTO workspace_presence (workspace_id, user_id, last_active_at) VALUES (?, ?, ?)`).run('ws-1', 'user-1', now);
    sqlite.prepare(`INSERT INTO workspace_presence (workspace_id, user_id, last_active_at) VALUES (?, ?, ?)`).run('ws-1', 'user-2', now);

    const count = await tracker.getActiveCount('ws-1', 5 * 60 * 1000);
    expect(count).toBe(2);
  });

  it('getActiveCount() excludes users outside the window (Req 7.1)', async () => {
    const recent = new Date().toISOString();
    const old = new Date(Date.now() - 10 * 60 * 1000).toISOString(); // 10 min ago

    sqlite.prepare(`INSERT INTO workspace_presence (workspace_id, user_id, last_active_at) VALUES (?, ?, ?)`).run('ws-1', 'user-1', recent);
    sqlite.prepare(`INSERT INTO workspace_presence (workspace_id, user_id, last_active_at) VALUES (?, ?, ?)`).run('ws-1', 'user-2', old);

    const count = await tracker.getActiveCount('ws-1', 5 * 60 * 1000); // 5 min window
    expect(count).toBe(1);
  });

  it('getActiveCount() only counts users in the specified workspace (Req 7.1)', async () => {
    seedWorkspace(sqlite, 'ws-2');
    const now = new Date().toISOString();

    sqlite.prepare(`INSERT INTO workspace_presence (workspace_id, user_id, last_active_at) VALUES (?, ?, ?)`).run('ws-1', 'user-1', now);
    sqlite.prepare(`INSERT INTO workspace_presence (workspace_id, user_id, last_active_at) VALUES (?, ?, ?)`).run('ws-2', 'user-2', now);

    const count = await tracker.getActiveCount('ws-1', 5 * 60 * 1000);
    expect(count).toBe(1);
  });

  it('getActiveCount() counts each userId once even with multiple touches (Req 7.1)', async () => {
    // touch same user multiple times — should still count as 1
    await tracker.touch('ws-1', 'user-1');
    await tracker.touch('ws-1', 'user-1');
    await tracker.touch('ws-1', 'user-1');

    const count = await tracker.getActiveCount('ws-1', 5 * 60 * 1000);
    expect(count).toBe(1);
  });
});
