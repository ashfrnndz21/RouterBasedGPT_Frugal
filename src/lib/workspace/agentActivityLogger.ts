/**
 * AgentActivityLogger — records per-agent actions for the activity log.
 * Requirements: 2.7, 2.8
 */
import { eq, desc, count } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import defaultDb from '@/lib/db';
import { agentActivityLog } from '@/lib/db/schema';

type DbInstance = typeof defaultDb;

// ============================================================
// Types
// ============================================================

export type AgentActionType =
  | 'query_answered'
  | 'document_read'
  | 'data_analyzed'
  | 'handoff_sent'
  | 'handoff_received';

export interface AgentActivityEntry {
  id: string;
  agentId: string;
  workspaceId: string;
  conversationId: string;
  messageId: string;
  actionType: AgentActionType;
  metadata: Record<string, unknown>;
  createdAt: string;
}

// ============================================================
// Row → AgentActivityEntry mapper
// ============================================================

function rowToEntry(row: typeof agentActivityLog.$inferSelect): AgentActivityEntry {
  return {
    id: row.id,
    agentId: row.agentId,
    workspaceId: row.workspaceId,
    conversationId: row.conversationId ?? '',
    messageId: row.messageId ?? '',
    actionType: row.actionType as AgentActionType,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    createdAt: row.createdAt,
  };
}

// ============================================================
// AgentActivityLogger
// ============================================================

export class AgentActivityLogger {
  private readonly db: DbInstance;

  constructor(db: DbInstance = defaultDb) {
    this.db = db;
  }

  /**
   * Records an agent action into agent_activity_log. Req 2.7
   */
  async record(
    entry: Omit<AgentActivityEntry, 'id' | 'createdAt'>
  ): Promise<void> {
    const id = randomUUID();
    const now = new Date().toISOString();

    await this.db.insert(agentActivityLog).values({
      id,
      agentId: entry.agentId,
      workspaceId: entry.workspaceId,
      conversationId: entry.conversationId || null,
      messageId: entry.messageId || null,
      actionType: entry.actionType,
      metadata: entry.metadata,
      createdAt: now,
    });
  }

  /**
   * Returns paginated activity log entries for an agent, ordered by created_at DESC.
   * Page size is 20. Req 2.8
   */
  async getLog(
    agentId: string,
    page: number
  ): Promise<{ entries: AgentActivityEntry[]; total: number }> {
    const PAGE_SIZE = 20;
    const offset = (page - 1) * PAGE_SIZE;

    const [rows, totalRows] = await Promise.all([
      this.db
        .select()
        .from(agentActivityLog)
        .where(eq(agentActivityLog.agentId, agentId))
        .orderBy(desc(agentActivityLog.createdAt))
        .limit(PAGE_SIZE)
        .offset(offset),
      this.db
        .select({ value: count() })
        .from(agentActivityLog)
        .where(eq(agentActivityLog.agentId, agentId)),
    ]);

    return {
      entries: rows.map(rowToEntry),
      total: totalRows[0]?.value ?? 0,
    };
  }
}

export default new AgentActivityLogger();
