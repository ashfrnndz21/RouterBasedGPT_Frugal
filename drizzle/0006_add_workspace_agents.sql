-- Create workspace_agents table
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
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create index for workspace_agents
CREATE INDEX IF NOT EXISTS idx_agents_workspace ON workspace_agents(workspace_id);

-- Add agent_id column to workspace_conversations
ALTER TABLE workspace_conversations ADD COLUMN agent_id TEXT REFERENCES workspace_agents(id) ON DELETE SET NULL;

-- Create index for agent_id in workspace_conversations
CREATE INDEX IF NOT EXISTS idx_conversations_agent ON workspace_conversations(agent_id);
