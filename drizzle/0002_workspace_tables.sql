-- Workspace tables for PTT Spaces
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

CREATE TABLE IF NOT EXISTS workspace_conversations (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  message_count INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_conversations_workspace ON workspace_conversations(workspace_id);

CREATE TABLE IF NOT EXISTS workspace_messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES workspace_conversations(id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  sources TEXT DEFAULT '[]',
  metadata TEXT DEFAULT '{}',
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON workspace_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_workspace ON workspace_messages(workspace_id);

CREATE TABLE IF NOT EXISTS workspace_documents (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK(file_type IN ('pdf', 'txt')),
  content TEXT,
  embeddings TEXT DEFAULT '[]',
  uploaded_by TEXT NOT NULL,
  uploaded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  file_size INTEGER
);

CREATE INDEX IF NOT EXISTS idx_documents_workspace ON workspace_documents(workspace_id);

CREATE TABLE IF NOT EXISTS workspace_data_sources (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('postgresql', 'mysql', 'sqlite')),
  config TEXT NOT NULL,
  schema TEXT,
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'error', 'testing')),
  last_tested TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_data_sources_workspace ON workspace_data_sources(workspace_id);

CREATE TABLE IF NOT EXISTS workspace_pins (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  message_id TEXT NOT NULL REFERENCES workspace_messages(id) ON DELETE CASCADE,
  title TEXT,
  category TEXT,
  pinned_by TEXT NOT NULL,
  pinned_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pins_workspace ON workspace_pins(workspace_id);

-- GenBI tables
CREATE TABLE IF NOT EXISTS semantic_models (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  data_source_id TEXT NOT NULL REFERENCES workspace_data_sources(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  mdl_content TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_semantic_models_workspace ON semantic_models(workspace_id);
CREATE INDEX IF NOT EXISTS idx_semantic_models_datasource ON semantic_models(data_source_id);

CREATE TABLE IF NOT EXISTS genbi_queries (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  conversation_id TEXT REFERENCES workspace_conversations(id) ON DELETE CASCADE,
  data_source_id TEXT NOT NULL REFERENCES workspace_data_sources(id) ON DELETE CASCADE,
  nl_query TEXT NOT NULL,
  generated_sql TEXT NOT NULL,
  sql_explanation TEXT,
  status TEXT NOT NULL CHECK(status IN ('pending', 'success', 'error')),
  result_row_count INTEGER,
  execution_time_ms INTEGER,
  error_message TEXT,
  model_tier TEXT CHECK(model_tier IN ('tier1', 'tier2')),
  estimated_cost INTEGER,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_genbi_queries_workspace ON genbi_queries(workspace_id);
CREATE INDEX IF NOT EXISTS idx_genbi_queries_datasource ON genbi_queries(data_source_id);
CREATE INDEX IF NOT EXISTS idx_genbi_queries_conversation ON genbi_queries(conversation_id);

CREATE TABLE IF NOT EXISTS saved_queries (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  nl_query TEXT NOT NULL,
  sql TEXT NOT NULL,
  chart_config TEXT,
  tags TEXT DEFAULT '[]',
  is_public INTEGER DEFAULT 0,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_saved_queries_workspace ON saved_queries(workspace_id);

CREATE TABLE IF NOT EXISTS sql_cache (
  id TEXT PRIMARY KEY,
  query_hash TEXT NOT NULL UNIQUE,
  nl_query TEXT NOT NULL,
  generated_sql TEXT NOT NULL,
  data_source_type TEXT NOT NULL,
  schema_version TEXT,
  hit_count INTEGER DEFAULT 0,
  last_used TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sql_cache_hash ON sql_cache(query_hash);
