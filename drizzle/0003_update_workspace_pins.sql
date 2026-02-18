-- Add content and conversationId columns to workspace_pins table
-- and remove foreign key constraint on messageId

-- SQLite doesn't support ALTER TABLE to add columns with constraints easily,
-- so we need to recreate the table

-- Create new table with updated schema
CREATE TABLE IF NOT EXISTS workspace_pins_new (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  message_id TEXT NOT NULL,
  conversation_id TEXT,
  content TEXT,
  title TEXT,
  category TEXT,
  pinned_by TEXT NOT NULL,
  pinned_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Copy data from old table if it exists
INSERT OR IGNORE INTO workspace_pins_new (id, workspace_id, message_id, title, category, pinned_by, pinned_at)
SELECT id, workspace_id, message_id, title, category, pinned_by, pinned_at
FROM workspace_pins;

-- Drop old table
DROP TABLE IF EXISTS workspace_pins;

-- Rename new table
ALTER TABLE workspace_pins_new RENAME TO workspace_pins;

-- Create index
CREATE INDEX IF NOT EXISTS idx_pins_workspace ON workspace_pins(workspace_id);
