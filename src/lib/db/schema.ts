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

  sources: text('sources', {
    mode: 'json',
  })
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
  createdAt: text('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
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
    createdAt: text('created_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
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
    agentId: text('agent_id')
      .references(() => workspaceAgents.id, { onDelete: 'set null' }),
    title: text('title').notNull(),
    createdBy: text('created_by').notNull(),
    createdAt: text('created_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    messageCount: integer('message_count').default(0),
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
    sources: text('sources', { mode: 'json' })
      .$type<any[]>()
      .default(sql`'[]'`),
    metadata: text('metadata', { mode: 'json' })
      .$type<{
        documentsSearched?: string[];
        databasesQueried?: string[];
        tokensUsed?: number;
      }>()
      .default(sql`'{}'`),
    createdBy: text('created_by').notNull(),
    createdAt: text('created_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
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
    conversationId: text('conversation_id')
      .references(() => workspaceConversations.id, { onDelete: 'cascade' }),
    filename: text('filename').notNull(),
    fileType: text('file_type', { enum: ['pdf', 'txt'] }).notNull(),
    content: text('content'),
    embeddings: text('embeddings', { mode: 'json' })
      .$type<number[]>()
      .default(sql`'[]'`),
    uploadedBy: text('uploaded_by').notNull(),
    uploadedAt: text('uploaded_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    fileSize: integer('file_size'),
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
        host?: string;
        port?: number;
        database?: string;
        username?: string;
        password?: string;
        // CSV-specific fields
        filePath?: string;
        tableName?: string;
        originalFileName?: string;
      }>()
      .notNull(),
    schema: text('schema', { mode: 'json' }).$type<any>(),
    // CSV metadata
    rowCount: integer('row_count'),
    columns: text('columns', { mode: 'json' }).$type<Array<{ name: string; type: string }>>(),
    status: text('status', { enum: ['active', 'error', 'testing'] }).default('active'),
    lastTested: text('last_tested'),
    createdBy: text('created_by').notNull(),
    createdAt: text('created_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
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
    messageId: text('message_id').notNull(), // Reference to main chat message, not workspace messages
    conversationId: text('conversation_id'), // Reference to the chat/conversation
    content: text('content'), // Store the message content directly
    title: text('title'),
    category: text('category'),
    pinnedBy: text('pinned_by').notNull(),
    pinnedAt: text('pinned_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
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
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    dataSourceId: text('data_source_id')
      .notNull()
      .references(() => workspaceDataSources.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    mdlContent: text('mdl_content').notNull(),
    version: integer('version').default(1),
    createdBy: text('created_by').notNull(),
    createdAt: text('created_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
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
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    conversationId: text('conversation_id')
      .references(() => workspaceConversations.id, { onDelete: 'cascade' }),
    dataSourceId: text('data_source_id')
      .notNull()
      .references(() => workspaceDataSources.id, { onDelete: 'cascade' }),
    naturalLanguageQuery: text('nl_query').notNull(),
    generatedSql: text('generated_sql').notNull(),
    sqlExplanation: text('sql_explanation'),
    executionStatus: text('status', { 
      enum: ['pending', 'success', 'error'] 
    }).notNull(),
    resultRowCount: integer('result_row_count'),
    executionTime: integer('execution_time_ms'),
    errorMessage: text('error_message'),
    modelTier: text('model_tier', { enum: ['tier1', 'tier2'] }),
    estimatedCost: integer('estimated_cost'),
    createdBy: text('created_by').notNull(),
    createdAt: text('created_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
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
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    naturalLanguageQuery: text('nl_query').notNull(),
    sql: text('sql').notNull(),
    chartConfig: text('chart_config', { mode: 'json' })
      .$type<ChartConfig>(),
    tags: text('tags', { mode: 'json' })
      .$type<string[]>()
      .default(sql`'[]'`),
    isPublic: integer('is_public', { mode: 'boolean' }).default(false),
    createdBy: text('created_by').notNull(),
    createdAt: text('created_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
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
    lastUsed: text('last_used')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    createdAt: text('created_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    hashIdx: index('idx_sql_cache_hash').on(table.queryHash),
  })
);
