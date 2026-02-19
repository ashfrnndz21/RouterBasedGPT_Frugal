export interface Workspace {
  id: string;
  name: string;
  description?: string;
  icon: string;
  ownerId: string;
  context?: string;
  settings: WorkspaceSettings;
  createdAt: Date;
  updatedAt: Date;
  memberCount?: number;
  documentCount?: number;
}

export interface WorkspaceSettings {
  webSearchEnabled: boolean;
  citationRequired: boolean;
  conversationRetention?: number; // Days to keep conversation history
  responseStyle?: string;
  autoPin?: boolean;
}

export interface WorkspaceAgent {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  systemPrompt?: string;
  chatModel?: string;
  chatModelProvider?: string;
  embeddingModel?: string;
  embeddingModelProvider?: string;
  isDefault: boolean;
  avatar?: string;
  role?: string;
  specialty?: string;
  toolsAllowed?: string[];
  memoryScope?: 'workspace' | 'agent' | 'user';
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceConversation {
  id: string;
  workspaceId: string;
  agentId?: string;
  title: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  messageCount: number;
  tags?: string[];              // Req 3.1
  participantAgentIds?: string[]; // Req 3.4
}

export interface WorkspaceMessage {
  id: string;
  conversationId: string;
  workspaceId: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: any[];
  metadata?: {
    documentsSearched?: string[];
    databasesQueried?: string[];
    tokensUsed?: number;
  };
  createdBy: string;
  createdAt: Date;
}

export interface WorkspaceDocument {
  id: string;
  workspaceId: string;
  conversationId?: string; // Optional: links document to specific conversation
  filename: string;
  fileType: 'pdf' | 'txt';
  content?: string;
  embeddings?: number[];
  uploadedBy: string;
  uploadedAt: Date;
  fileSize?: number;
}

export interface DataSourceConnection {
  id: string;
  workspaceId: string;
  name: string;
  type: 'postgresql' | 'mysql' | 'sqlite' | 'csv';
  config: {
    host?: string;
    port?: number;
    database?: string;
    username?: string;
    password?: string;
    filepath?: string; // For SQLite
    // CSV-specific fields
    filePath?: string;
    tableName?: string;
    originalFileName?: string;
  };
  schema?: any;
  // CSV metadata
  rowCount?: number;
  columns?: Array<{ name: string; type: string }>;
  status: 'active' | 'error' | 'testing';
  lastTested?: Date;
  createdBy: string;
  createdAt: Date;
}

export interface PinnedInsight {
  id: string;
  workspaceId: string;
  messageId: string;
  title?: string;
  category?: string;
  pinnedBy: string;
  pinnedAt: Date;
  message?: {
    content: string;
    conversationId: string;
  };
}

// GenBI Types
export interface SemanticModel {
  id: string;
  workspaceId: string;
  dataSourceId: string;
  name: string;
  mdlContent: string;
  version: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GenBIQuery {
  id: string;
  workspaceId: string;
  conversationId?: string;
  dataSourceId: string;
  naturalLanguageQuery: string;
  generatedSql: string;
  sqlExplanation?: string;
  executionStatus: 'pending' | 'success' | 'error';
  resultRowCount?: number;
  executionTime?: number;
  errorMessage?: string;
  modelTier?: 'tier1' | 'tier2';
  estimatedCost?: number;
  createdBy: string;
  createdAt: Date;
}

export interface ChartConfig {
  type: string;
  xAxis?: string;
  yAxis?: string | string[];
  groupBy?: string;
  aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max';
  title?: string;
  colors?: string[];
}

export interface SavedQuery {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  naturalLanguageQuery: string;
  sql: string;
  chartConfig?: ChartConfig;
  tags?: string[];
  isPublic: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}
