-- Add conversationId to workspace_documents table for conversation-specific document context
ALTER TABLE workspace_documents ADD COLUMN conversation_id TEXT REFERENCES workspace_conversations(id) ON DELETE CASCADE;

-- Add index for faster conversation-based queries
CREATE INDEX IF NOT EXISTS idx_documents_conversation ON workspace_documents(conversation_id);
