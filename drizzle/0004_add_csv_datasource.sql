-- Add CSV support to workspace_data_sources table
-- Add row_count and columns fields for CSV metadata

-- SQLite doesn't support ALTER TABLE ADD COLUMN with complex constraints
-- So we recreate the table with new columns

CREATE TABLE IF NOT EXISTS workspace_data_sources_new (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('postgresql', 'mysql', 'sqlite', 'csv')),
  config TEXT NOT NULL,
  schema TEXT,
  row_count INTEGER,
  columns TEXT,
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'error', 'testing')),
  last_tested TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Copy existing data
INSERT OR IGNORE INTO workspace_data_sources_new (id, workspace_id, name, type, config, schema, status, last_tested, created_by, created_at)
SELECT id, workspace_id, name, type, config, schema, status, last_tested, created_by, created_at
FROM workspace_data_sources;

-- Drop old table
DROP TABLE IF EXISTS workspace_data_sources;

-- Rename new table
ALTER TABLE workspace_data_sources_new RENAME TO workspace_data_sources;

-- Recreate index
CREATE INDEX IF NOT EXISTS idx_data_sources_workspace ON workspace_data_sources(workspace_id);
