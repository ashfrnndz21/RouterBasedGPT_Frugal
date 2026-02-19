-- PTT Spaces V2 — Additive migrations
-- Requirements: 1.1, 2.2, 3.1, 4.2, 4.5, 4.8, 7.2, 8.7

-- ============================================
-- Additive columns: workspace_agents
-- ============================================
ALTER TABLE workspace_agents ADD COLUMN avatar TEXT DEFAULT '🤖';
ALTER TABLE workspace_agents ADD COLUMN role TEXT;
ALTER TABLE workspace_agents ADD COLUMN specialty TEXT;
ALTER TABLE workspace_agents ADD COLUMN tools_allowed TEXT DEFAULT '[]';
ALTER TABLE workspace_agents ADD COLUMN memory_scope TEXT DEFAULT 'workspace'
  CHECK(memory_scope IN ('workspace', 'agent', 'user'));

-- ============================================
-- Additive columns: workspace_documents
-- ============================================
ALTER TABLE workspace_documents ADD COLUMN status TEXT DEFAULT 'ready'
  CHECK(status IN ('uploading', 'indexing', 'ready', 'failed'));
ALTER TABLE workspace_documents ADD COLUMN error_message TEXT;
ALTER TABLE workspace_documents ADD COLUMN priority_agents TEXT DEFAULT '[]';

-- ============================================
-- Additive columns: workspace_conversations
-- ============================================
ALTER TABLE workspace_conversations ADD COLUMN tags TEXT DEFAULT '[]';
ALTER TABLE workspace_conversations ADD COLUMN participant_agent_ids TEXT DEFAULT '[]';

-- ============================================
-- Additive columns: workspace_messages
-- ============================================
ALTER TABLE workspace_messages ADD COLUMN agent_id TEXT REFERENCES workspace_agents(id) ON DELETE SET NULL;
ALTER TABLE workspace_messages ADD COLUMN latency_ms INTEGER;

-- ============================================
-- New table: workspace_memory
-- ============================================
CREATE TABLE IF NOT EXISTS workspace_memory (
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
CREATE INDEX IF NOT EXISTS idx_memory_workspace ON workspace_memory(workspace_id);
CREATE INDEX IF NOT EXISTS idx_memory_scope ON workspace_memory(workspace_id, scope);

-- ============================================
-- New table: workspace_document_chunks
-- ============================================
CREATE TABLE IF NOT EXISTS workspace_document_chunks (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES workspace_documents(id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_chunks_document ON workspace_document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_chunks_workspace ON workspace_document_chunks(workspace_id);

-- ============================================
-- New table: agent_activity_log
-- ============================================
CREATE TABLE IF NOT EXISTS agent_activity_log (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL REFERENCES workspace_agents(id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  conversation_id TEXT REFERENCES workspace_conversations(id) ON DELETE SET NULL,
  message_id TEXT,
  action_type TEXT NOT NULL CHECK(action_type IN ('query_answered','document_read','data_analyzed','handoff_sent','handoff_received')),
  metadata TEXT DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_activity_agent ON agent_activity_log(agent_id);
CREATE INDEX IF NOT EXISTS idx_activity_workspace ON agent_activity_log(workspace_id);

-- ============================================
-- New table: workspace_presence
-- ============================================
CREATE TABLE IF NOT EXISTS workspace_presence (
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  last_active_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (workspace_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_presence_workspace ON workspace_presence(workspace_id);

-- ============================================
-- FTS5 virtual table: workspace_messages_fts
-- ============================================
CREATE VIRTUAL TABLE IF NOT EXISTS workspace_messages_fts USING fts5(
  content,
  workspace_id UNINDEXED,
  conversation_id UNINDEXED,
  message_id UNINDEXED,
  content='workspace_messages',
  content_rowid='rowid'
);

-- Trigger to populate FTS on INSERT into workspace_messages
CREATE TRIGGER IF NOT EXISTS workspace_messages_fts_insert
AFTER INSERT ON workspace_messages BEGIN
  INSERT INTO workspace_messages_fts(rowid, content, workspace_id, conversation_id, message_id)
  VALUES (new.rowid, new.content, new.workspace_id, new.conversation_id, new.id);
END;
