import { sql } from 'drizzle-orm';
import { text, integer, sqliteTable, index } from 'drizzle-orm/sqlite-core';
import { Document } from 'langchain/document';

export const messages = sqliteTable('messages', {
  id: integer('id').primaryKey(),
  role: text('type', { enum: ['assistant', 'user', 'source'] }).notNull(),
  chatId: text('chatId').notNull(),
  createdAt: text('createdAt')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  messageId: text('messageId').notNull(),
  content: text('content'),
  sources: text('sources', { mode: 'json' })
    .$type<Document[]>()
    .default(sql`'[]'`),
});

interface File {
  name: string;
  fileId: string;
}

export const chats = sqliteTable('chats', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  createdAt: text('createdAt').notNull(),
  focusMode: text('focusMode').notNull(),
  files: text('files', { mode: 'json' })
    .$type<File[]>()
    .default(sql`'[]'`),
});

// ============================================
// Enterprise Frugal Platform — Session & Cache
// ============================================

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  chatId: text('chatId').notNull(),
  payload: text('payload').notNull(),
  createdAt: text('createdAt').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updatedAt').notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const semanticCache = sqliteTable('semantic_cache', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  cacheKey: text('cacheKey').notNull().unique(),
  query: text('query').notNull(),
  queryEmbedding: text('queryEmbedding').notNull(),
  response: text('response').notNull(),
  sources: text('sources', { mode: 'json' }).$type<Document[]>().default(sql`'[]'`),
  hitCount: integer('hitCount').notNull().default(0),
  createdAt: text('createdAt').notNull().default(sql`CURRENT_TIMESTAMP`),
});

// ============================================
// Workspace Tables - PTT Spaces
// ============================================

export const workspaces = sqliteTable('workspaces', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  icon: text('icon').default('📁'),
  ownerId: text('owner_id').notNull(),
  context: text('context'),
  settings: text('settings', { mode: 'json' })
    .$type<{
      webSearchEnabled: boolean;
      citationRequired: boolean;
      conversationRetention: number;
    }>()
    .default(sql`'{"webSearchEnabled":true,"citationRequired":true,"conversationRetention":90}'`),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const workspaceAgents = sqliteTable(
  'workspace_agents',
  {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    systemPrompt: text('system_prompt'),
    chatModel: text('chat_model'),
    chatModelProvider: text('chat_model_provider'),
    embeddingModel: text('embedding_model'),
    embeddingModelProvider: text('embedding_model_provider'),
    isDefault: integer('is_default', { mode: 'boolean' }).default(false),
    // PTT Spaces V2 additions (Requirement 8.7)
    avatar: text('avatar').default('🤖'),
    role: text('role'),
    specialty: text('specialty'),
    toolsAllowed: text('tools_allowed', { mode: 'json' })
      .$type<string[]>()
      .default(sql`'[]'`),
    memoryScope: text('memory_scope', { enum: ['workspace', 'agent', 'user'] }).default('workspace'),
    createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    workspaceIdx: index('idx_agents_workspace').on(table.workspaceId),
  })
);

export const workspaceConversations = sqliteTable(
  'workspace_conversations',
  {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    agentId: text('agent_id').references(() => workspaceAgents.id, { onDelete: 'set null' }),
    title: text('title').notNull(),
    createdBy: text('created_by').notNull(),
    createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
    messageCount: integer('message_count').default(0),
    // PTT Spaces V2 additions (Requirement 3.1)
    tags: text('tags', { mode: 'json' }).$type<string[]>().default(sql`'[]'`),
    participantAgentIds: text('participant_agent_ids', { mode: 'json' })
      .$type<string[]>()
      .default(sql`'[]'`),
  },
  (table) => ({
    workspaceIdx: index('idx_conversations_workspace').on(table.workspaceId),
    agentIdx: index('idx_conversations_agent').on(table.agentId),
  })
);

export const workspaceMessages = sqliteTable(
  'workspace_messages',
  {
    id: text('id').primaryKey(),
    conversationId: text('conversation_id')
      .notNull()
      .references(() => workspaceConversations.id, { onDelete: 'cascade' }),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    role: text('role', { enum: ['user', 'assistant'] }).notNull(),
    content: text('content').notNull(),
    sources: text('sources', { mode: 'json' }).$type<any[]>().default(sql`'[]'`),
    metadata: text('metadata', { mode: 'json' })
      .$type<{ documentsSearched?: string[]; databasesQueried?: string[]; tokensUsed?: number }>()
      .default(sql`'{}'`),
    createdBy: text('created_by').notNull(),
    createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
    // PTT Spaces V2 additions (Requirements 3.5, 6.3)
    agentId: text('agent_id').references(() => workspaceAgents.id, { onDelete: 'set null' }),
    latencyMs: integer('latency_ms'),
  },
  (table) => ({
    conversationIdx: index('idx_messages_conversation').on(table.conversationId),
    workspaceIdx: index('idx_messages_workspace').on(table.workspaceId),
  })
);

export const workspaceDocuments = sqliteTable(
  'workspace_documents',
  {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    conversationId: text('conversation_id').references(() => workspaceConversations.id, { onDelete: 'cascade' }),
    filename: text('filename').notNull(),
    fileType: text('file_type', { enum: ['pdf', 'txt'] }).notNull(),
    content: text('content'),
    embeddings: text('embeddings', { mode: 'json' }).$type<number[]>().default(sql`'[]'`),
    uploadedBy: text('uploaded_by').notNull(),
    uploadedAt: text('uploaded_at').notNull().default(sql`CURRENT_TIMESTAMP`),
    fileSize: integer('file_size'),
    // PTT Spaces V2 additions (Requirements 4.2, 4.4, 4.6)
    status: text('status', { enum: ['uploading', 'indexing', 'ready', 'failed'] }).default('ready'),
    errorMessage: text('error_message'),
    priorityAgents: text('priority_agents', { mode: 'json' })
      .$type<string[]>()
      .default(sql`'[]'`),
  },
  (table) => ({
    workspaceIdx: index('idx_documents_workspace').on(table.workspaceId),
    conversationIdx: index('idx_documents_conversation').on(table.conversationId),
  })
);

export const workspaceDataSources = sqliteTable(
  'workspace_data_sources',
  {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    type: text('type', { enum: ['postgresql', 'mysql', 'sqlite', 'csv'] }).notNull(),
    config: text('config', { mode: 'json' })
      .$type<{
        host?: string; port?: number; database?: string;
        username?: string; password?: string;
        filePath?: string; tableName?: string; originalFileName?: string;
      }>()
      .notNull(),
    schema: text('schema', { mode: 'json' }).$type<any>(),
    rowCount: integer('row_count'),
    columns: text('columns', { mode: 'json' }).$type<Array<{ name: string; type: string }>>(),
    status: text('status', { enum: ['active', 'error', 'testing'] }).default('active'),
    lastTested: text('last_tested'),
    createdBy: text('created_by').notNull(),
    createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    workspaceIdx: index('idx_data_sources_workspace').on(table.workspaceId),
  })
);

export const workspacePins = sqliteTable(
  'workspace_pins',
  {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    messageId: text('message_id').notNull(),
    conversationId: text('conversation_id'),
    content: text('content'),
    title: text('title'),
    category: text('category'),
    pinnedBy: text('pinned_by').notNull(),
    pinnedAt: text('pinned_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    workspaceIdx: index('idx_pins_workspace').on(table.workspaceId),
  })
);

// ============================================
// GenBI Tables - Business Intelligence
// ============================================

export const semanticModels = sqliteTable(
  'semantic_models',
  {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
    dataSourceId: text('data_source_id').notNull().references(() => workspaceDataSources.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    mdlContent: text('mdl_content').notNull(),
    version: integer('version').default(1),
    createdBy: text('created_by').notNull(),
    createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    workspaceIdx: index('idx_semantic_models_workspace').on(table.workspaceId),
    dataSourceIdx: index('idx_semantic_models_datasource').on(table.dataSourceId),
  })
);

export const genbiQueries = sqliteTable(
  'genbi_queries',
  {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
    conversationId: text('conversation_id').references(() => workspaceConversations.id, { onDelete: 'cascade' }),
    dataSourceId: text('data_source_id').notNull().references(() => workspaceDataSources.id, { onDelete: 'cascade' }),
    naturalLanguageQuery: text('nl_query').notNull(),
    generatedSql: text('generated_sql').notNull(),
    sqlExplanation: text('sql_explanation'),
    executionStatus: text('status', { enum: ['pending', 'success', 'error'] }).notNull(),
    resultRowCount: integer('result_row_count'),
    executionTime: integer('execution_time_ms'),
    errorMessage: text('error_message'),
    modelTier: text('model_tier', { enum: ['tier1', 'tier2'] }),
    estimatedCost: integer('estimated_cost'),
    createdBy: text('created_by').notNull(),
    createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    workspaceIdx: index('idx_genbi_queries_workspace').on(table.workspaceId),
    dataSourceIdx: index('idx_genbi_queries_datasource').on(table.dataSourceId),
    conversationIdx: index('idx_genbi_queries_conversation').on(table.conversationId),
  })
);

interface ChartConfig {
  type: string;
  xAxis?: string;
  yAxis?: string | string[];
  groupBy?: string;
  aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max';
  title?: string;
  colors?: string[];
}

export const savedQueries = sqliteTable(
  'saved_queries',
  {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    naturalLanguageQuery: text('nl_query').notNull(),
    sql: text('sql').notNull(),
    chartConfig: text('chart_config', { mode: 'json' }).$type<ChartConfig>(),
    tags: text('tags', { mode: 'json' }).$type<string[]>().default(sql`'[]'`),
    isPublic: integer('is_public', { mode: 'boolean' }).default(false),
    createdBy: text('created_by').notNull(),
    createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    workspaceIdx: index('idx_saved_queries_workspace').on(table.workspaceId),
  })
);

export const sqlCache = sqliteTable(
  'sql_cache',
  {
    id: text('id').primaryKey(),
    queryHash: text('query_hash').notNull().unique(),
    naturalLanguageQuery: text('nl_query').notNull(),
    generatedSql: text('generated_sql').notNull(),
    dataSourceType: text('data_source_type').notNull(),
    schemaVersion: text('schema_version'),
    hitCount: integer('hit_count').default(0),
    lastUsed: text('last_used').notNull().default(sql`CURRENT_TIMESTAMP`),
    createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    hashIdx: index('idx_sql_cache_hash').on(table.queryHash),
  })
);

// ============================================
// PTT Spaces V2 — Additive Schema Additions
// ============================================

// workspace_memory — Workspace_Brain entries
export const workspaceMemory = sqliteTable(
  'workspace_memory',
  {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    agentId: text('agent_id').references(() => workspaceAgents.id, { onDelete: 'set null' }),
    userId: text('user_id'),
    scope: text('scope', { enum: ['workspace', 'agent', 'user'] }).notNull(),
    content: text('content').notNull(),
    embedding: text('embedding'),                    // JSON-serialized number[]
    sourceConversationId: text('source_conversation_id').references(
      () => workspaceConversations.id,
      { onDelete: 'set null' }
    ),
    sourceMessageId: text('source_message_id'),
    pinned: integer('pinned', { mode: 'boolean' }).notNull().default(false),
    createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    workspaceIdx: index('idx_memory_workspace').on(table.workspaceId),
    scopeIdx: index('idx_memory_scope').on(table.workspaceId, table.scope),
  })
);

// workspace_document_chunks — chunked document content with embeddings
export const workspaceDocumentChunks = sqliteTable(
  'workspace_document_chunks',
  {
    id: text('id').primaryKey(),
    documentId: text('document_id')
      .notNull()
      .references(() => workspaceDocuments.id, { onDelete: 'cascade' }),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    chunkIndex: integer('chunk_index').notNull(),
    content: text('content').notNull(),
    embedding: text('embedding'),                    // JSON-serialized number[]
    createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    documentIdx: index('idx_chunks_document').on(table.documentId),
    workspaceIdx: index('idx_chunks_workspace').on(table.workspaceId),
  })
);

// agent_activity_log — per-agent action records
export const agentActivityLog = sqliteTable(
  'agent_activity_log',
  {
    id: text('id').primaryKey(),
    agentId: text('agent_id')
      .notNull()
      .references(() => workspaceAgents.id, { onDelete: 'cascade' }),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    conversationId: text('conversation_id').references(() => workspaceConversations.id, {
      onDelete: 'set null',
    }),
    messageId: text('message_id'),
    actionType: text('action_type', {
      enum: ['query_answered', 'document_read', 'data_analyzed', 'handoff_sent', 'handoff_received'],
    }).notNull(),
    metadata: text('metadata', { mode: 'json' })
      .$type<Record<string, unknown>>()
      .default(sql`'{}'`),
    createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    agentIdx: index('idx_activity_agent').on(table.agentId),
    workspaceIdx: index('idx_activity_workspace').on(table.workspaceId),
  })
);

// workspace_presence — last-active tracking per user per workspace
export const workspacePresence = sqliteTable(
  'workspace_presence',
  {
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull(),
    lastActiveAt: text('last_active_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    presenceIdx: index('idx_presence_workspace').on(table.workspaceId),
  })
);
