/**
 * DataAgentService — wraps the existing GenBI engine and exposes it as an
 * agent-compatible interface for inline @DataAgent queries.
 *
 * Requirements: 5.1, 5.2, 5.3, 5.5, 5.7, 5.8
 */
import { eq, desc } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import defaultDb from '@/lib/db';
import { workspaceDataSources, genbiQueries } from '@/lib/db/schema';
import { dataSourceService } from './dataSourceService';
import { queryCSVDatabase } from './csvDataService';
import { getAvailableChatModelProviders } from '@/lib/providers';

type DbInstance = typeof defaultDb;

// ============================================================
// Errors
// ============================================================

export class NoDataSourceError extends Error {
  constructor(workspaceId: string) {
    super(
      `No data source configured for workspace "${workspaceId}". ` +
        'Please configure a data source in the GenBI tab before using @DataAgent.'
    );
    this.name = 'NoDataSourceError';
  }
}

// ============================================================
// Types
// ============================================================

export interface InlineResultCard {
  type: 'inline_result_card';
  queryId: string;
  naturalLanguageQuery: string;
  generatedSql: string;
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  summary: string;
  executionTimeMs: number;
}

// ============================================================
// Helpers — SQL generation (mirrors generate-sql route logic)
// ============================================================

async function generateSQL(
  naturalQuery: string,
  tableName: string,
  schemaInfo: string
): Promise<string> {
  const systemPrompt = `You are a SQL expert. Generate SQLite-compatible SQL queries based on natural language questions.

IMPORTANT RULES:
1. Always use double quotes for table and column names: "table_name", "column_name"
2. Generate ONLY the SQL query, no explanations or markdown
3. Use SQLite syntax (e.g., use || for string concatenation, no ILIKE - use LIKE with LOWER())
4. For counting questions like "how many", use COUNT(*)
5. Always add LIMIT 100 unless the query specifically asks for all results or is an aggregation
6. For text matching, use LOWER() for case-insensitive matching
7. Match column names EXACTLY as shown in the schema

Database Schema:
${schemaInfo}`;

  const userPrompt = `Generate a SQL query for: "${naturalQuery}"\n\nReturn ONLY the SQL query, nothing else.`;

  try {
    const chatModels = await getAvailableChatModelProviders();
    let model: any = null;

    for (const provider of ['ollama', 'openai', 'groq', 'anthropic', 'gemini']) {
      if (chatModels[provider] && Object.keys(chatModels[provider]).length > 0) {
        model = chatModels[provider][Object.keys(chatModels[provider])[0]].model;
        break;
      }
    }
    if (!model) {
      for (const provider in chatModels) {
        if (Object.keys(chatModels[provider]).length > 0) {
          model = chatModels[provider][Object.keys(chatModels[provider])[0]].model;
          break;
        }
      }
    }

    if (!model) {
      return `SELECT * FROM "${tableName}" LIMIT 20`;
    }

    const response = await model.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(userPrompt),
    ]);

    let sql =
      typeof response.content === 'string'
        ? response.content
        : JSON.stringify(response.content);

    sql = sql.replace(/```sql\n?/gi, '').replace(/```\n?/g, '').trim();

    if (!sql.toLowerCase().startsWith('select')) {
      return `SELECT * FROM "${tableName}" LIMIT 20`;
    }

    return sql;
  } catch {
    return `SELECT * FROM "${tableName}" LIMIT 20`;
  }
}

// ============================================================
// Helpers — AI summary generation
// ============================================================

async function generateSummary(
  naturalQuery: string,
  columns: string[],
  rows: Record<string, unknown>[]
): Promise<string> {
  if (rows.length === 0) return 'No results found for your query.';

  try {
    const chatModels = await getAvailableChatModelProviders();
    let model: any = null;

    for (const provider of ['ollama', 'openai', 'groq', 'anthropic', 'gemini']) {
      if (chatModels[provider] && Object.keys(chatModels[provider]).length > 0) {
        model = chatModels[provider][Object.keys(chatModels[provider])[0]].model;
        break;
      }
    }
    if (!model) {
      for (const provider in chatModels) {
        if (Object.keys(chatModels[provider]).length > 0) {
          model = chatModels[provider][Object.keys(chatModels[provider])[0]].model;
          break;
        }
      }
    }

    if (!model) {
      return `Found ${rows.length} result${rows.length !== 1 ? 's' : ''}.`;
    }

    const preview = rows
      .slice(0, 10)
      .map((row) => columns.map((c) => `${c}: ${row[c]}`).join(', '))
      .join('\n');

    const response = await model.invoke([
      new SystemMessage(
        'You are a data analyst. Summarize the query results in 1-2 sentences. Be direct and specific.'
      ),
      new HumanMessage(
        `Question: "${naturalQuery}"\n\nResults (${rows.length} rows):\n${preview}\n\nProvide a concise summary.`
      ),
    ]);

    const content =
      typeof response.content === 'string'
        ? response.content.trim()
        : JSON.stringify(response.content);

    return content || `Found ${rows.length} result${rows.length !== 1 ? 's' : ''}.`;
  } catch {
    return `Found ${rows.length} result${rows.length !== 1 ? 's' : ''}.`;
  }
}

// ============================================================
// DataAgentService
// ============================================================

export class DataAgentService {
  private readonly db: DbInstance;

  constructor(db: DbInstance = defaultDb) {
    this.db = db;
  }

  /**
   * Handles a natural language query from @DataAgent.
   *
   * 1. Fetches the workspace's first active data source (throws NoDataSourceError if none).
   * 2. Retrieves recent genbi_queries for context (Req 5.7).
   * 3. Generates SQL via the existing GenBI LLM logic.
   * 4. Executes the SQL against the data source.
   * 5. Generates an AI summary.
   * 6. Stores the result as a genbi_query record linked to the conversation (Req 5.5).
   * 7. Returns an InlineResultCard (Req 5.3).
   *
   * Requirements: 5.1, 5.2, 5.3, 5.5, 5.7, 5.8
   */
  async handleQuery(
    naturalLanguageQuery: string,
    workspaceId: string,
    conversationId: string,
    userId: string
  ): Promise<InlineResultCard> {
    // 1. Fetch data source — Req 5.8
    const dataSources = await this.db
      .select()
      .from(workspaceDataSources)
      .where(eq(workspaceDataSources.workspaceId, workspaceId))
      .limit(1);

    if (dataSources.length === 0) {
      throw new NoDataSourceError(workspaceId);
    }

    const dataSource = dataSources[0];

    // 2. Retrieve recent genbi_queries for context — Req 5.7
    const recentQueries = await this.db
      .select({
        nlQuery: genbiQueries.naturalLanguageQuery,
        generatedSql: genbiQueries.generatedSql,
      })
      .from(genbiQueries)
      .where(eq(genbiQueries.workspaceId, workspaceId))
      .orderBy(desc(genbiQueries.createdAt))
      .limit(5);

    // Build schema info for SQL generation
    const config =
      typeof dataSource.config === 'string'
        ? JSON.parse(dataSource.config)
        : dataSource.config;
    const columns =
      typeof dataSource.columns === 'string' && dataSource.columns
        ? JSON.parse(dataSource.columns)
        : dataSource.columns;

    const tableName = config.tableName || dataSource.name;
    let schemaInfo = `Table name: "${tableName}"`;

    if (columns && columns.length > 0) {
      const colDefs = (columns as Array<{ name: string; type: string }>)
        .map((c) => `  - ${c.name} (${c.type})`)
        .join('\n');
      schemaInfo += `\nColumns:\n${colDefs}`;
    }

    // Append recent query context
    if (recentQueries.length > 0) {
      const ctx = recentQueries
        .map((q) => `Q: ${q.nlQuery}\nSQL: ${q.generatedSql}`)
        .join('\n\n');
      schemaInfo += `\n\nRecent queries for context:\n${ctx}`;
    }

    // 3. Generate SQL
    const startTime = Date.now();
    const generatedSql = await generateSQL(naturalLanguageQuery, tableName, schemaInfo);

    // 4. Execute query
    let queryResult: { success: boolean; rows?: any[]; columns?: string[]; error?: string };

    if (dataSource.type === 'csv') {
      const dbPath = config.filePath || config.database;
      queryResult = await queryCSVDatabase(dbPath, generatedSql);
    } else {
      queryResult = await dataSourceService.executeQuery(dataSource.id, generatedSql);
    }

    const executionTimeMs = Date.now() - startTime;

    if (!queryResult.success) {
      throw new Error(queryResult.error || 'Query execution failed');
    }

    const resultRows: Record<string, unknown>[] = queryResult.rows ?? [];
    const resultColumns: string[] = queryResult.columns ?? [];

    // 5. Generate AI summary
    const summary = await generateSummary(naturalLanguageQuery, resultColumns, resultRows);

    // 6. Store as genbi_query record — Req 5.5
    const queryId = randomUUID();
    const now = new Date().toISOString();

    await this.db.insert(genbiQueries).values({
      id: queryId,
      workspaceId,
      conversationId,
      dataSourceId: dataSource.id,
      naturalLanguageQuery,
      generatedSql,
      sqlExplanation: summary,
      executionStatus: 'success',
      resultRowCount: resultRows.length,
      executionTime: executionTimeMs,
      createdBy: userId,
      createdAt: now,
    });

    // 7. Return InlineResultCard — Req 5.3
    return {
      type: 'inline_result_card',
      queryId,
      naturalLanguageQuery,
      generatedSql,
      columns: resultColumns,
      rows: resultRows,
      rowCount: resultRows.length,
      summary,
      executionTimeMs,
    };
  }
}

export default new DataAgentService();
