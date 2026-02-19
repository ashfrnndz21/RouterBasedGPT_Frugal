/**
 * DashboardAggregator — aggregates workspace metrics in a single batched DB query.
 * Requirements: 6.1, 6.3, 6.4, 6.5
 */
import { eq, gte, count, sql } from 'drizzle-orm';
import defaultDb from '@/lib/db';
import {
  workspaceAgents,
  workspaceConversations,
  workspaceDocuments,
  workspaceMemory,
  workspaceDataSources,
  workspaceMessages,
  workspacePins,
  agentActivityLog,
} from '@/lib/db/schema';

type DbInstance = typeof defaultDb;

// ============================================================
// Types
// ============================================================

export interface AgentPerformanceStat {
  agentId: string;
  agentName: string;
  avatar: string;
  queryCount: number;
}

export interface PinnedInsightSummary {
  id: string;
  title: string | undefined;
  content: string | undefined;
  pinnedAt: Date;
}

export interface WorkspaceDashboardMetrics {
  agentCount: number;
  recentConversationCount: number;   // conversations in last 7 days
  documentCount: number;
  memoryEntryCount: number;
  dataSourceCount: number;
  totalTokens: number;               // sum of metadata.tokensUsed from workspace_messages
  estimatedCost: number;             // totalTokens * 0.000002
  agentPerformance: AgentPerformanceStat[];
  pinnedInsights: PinnedInsightSummary[];
}

// ============================================================
// DashboardAggregator
// ============================================================

export class DashboardAggregator {
  private readonly db: DbInstance;

  constructor(db: DbInstance = defaultDb) {
    this.db = db;
  }

  /**
   * Runs all metric queries in parallel and returns the aggregated dashboard metrics.
   * Req 6.1, 6.3, 6.4, 6.5
   */
  async getMetrics(workspaceId: string): Promise<WorkspaceDashboardMetrics> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [
      agentCountRows,
      recentConvRows,
      documentCountRows,
      memoryCountRows,
      dataSourceCountRows,
      messageRows,
      activityRows,
      pinnedRows,
    ] = await Promise.all([
      // 1. Agent count
      this.db
        .select({ value: count() })
        .from(workspaceAgents)
        .where(eq(workspaceAgents.workspaceId, workspaceId)),

      // 2. Recent conversation count (last 7 days)
      this.db
        .select({ value: count() })
        .from(workspaceConversations)
        .where(
          sql`${workspaceConversations.workspaceId} = ${workspaceId}
              AND ${workspaceConversations.createdAt} >= ${sevenDaysAgo}`
        ),

      // 3. Document count
      this.db
        .select({ value: count() })
        .from(workspaceDocuments)
        .where(eq(workspaceDocuments.workspaceId, workspaceId)),

      // 4. Memory entry count
      this.db
        .select({ value: count() })
        .from(workspaceMemory)
        .where(eq(workspaceMemory.workspaceId, workspaceId)),

      // 5. Data source count
      this.db
        .select({ value: count() })
        .from(workspaceDataSources)
        .where(eq(workspaceDataSources.workspaceId, workspaceId)),

      // 6. All messages with metadata for token summing
      this.db
        .select({ metadata: workspaceMessages.metadata })
        .from(workspaceMessages)
        .where(eq(workspaceMessages.workspaceId, workspaceId)),

      // 7. Per-agent query_answered counts joined with agent info
      this.db
        .select({
          agentId: workspaceAgents.id,
          agentName: workspaceAgents.name,
          avatar: workspaceAgents.avatar,
          queryCount: count(agentActivityLog.id),
        })
        .from(workspaceAgents)
        .leftJoin(
          agentActivityLog,
          sql`${agentActivityLog.agentId} = ${workspaceAgents.id}
              AND ${agentActivityLog.actionType} = 'query_answered'`
        )
        .where(eq(workspaceAgents.workspaceId, workspaceId))
        .groupBy(workspaceAgents.id),

      // 8. Pinned insights (limit 5, ordered by pinnedAt DESC)
      this.db
        .select({
          id: workspacePins.id,
          title: workspacePins.title,
          content: workspacePins.content,
          pinnedAt: workspacePins.pinnedAt,
        })
        .from(workspacePins)
        .where(eq(workspacePins.workspaceId, workspaceId))
        .orderBy(sql`${workspacePins.pinnedAt} DESC`)
        .limit(5),
    ]);

    // Sum tokens from message metadata
    const totalTokens = messageRows.reduce((sum, row) => {
      const tokens = (row.metadata as { tokensUsed?: number } | null)?.tokensUsed ?? 0;
      return sum + tokens;
    }, 0);

    const estimatedCost = totalTokens * 0.000002;

    const agentPerformance: AgentPerformanceStat[] = activityRows.map((row) => ({
      agentId: row.agentId,
      agentName: row.agentName,
      avatar: row.avatar ?? '🤖',
      queryCount: row.queryCount,
    }));

    const pinnedInsights: PinnedInsightSummary[] = pinnedRows.map((row) => ({
      id: row.id,
      title: row.title ?? undefined,
      content: row.content ?? undefined,
      pinnedAt: new Date(row.pinnedAt),
    }));

    return {
      agentCount: agentCountRows[0]?.value ?? 0,
      recentConversationCount: recentConvRows[0]?.value ?? 0,
      documentCount: documentCountRows[0]?.value ?? 0,
      memoryEntryCount: memoryCountRows[0]?.value ?? 0,
      dataSourceCount: dataSourceCountRows[0]?.value ?? 0,
      totalTokens,
      estimatedCost,
      agentPerformance,
      pinnedInsights,
    };
  }
}

export default new DashboardAggregator();
