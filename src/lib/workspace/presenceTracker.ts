/**
 * PresenceTracker — tracks user presence per workspace.
 * Requirements: 7.1, 7.2
 */
import { eq, and, gte, countDistinct } from 'drizzle-orm';
import defaultDb from '@/lib/db';
import { workspacePresence } from '@/lib/db/schema';

type DbInstance = typeof defaultDb;

// ============================================================
// PresenceTracker
// ============================================================

export class PresenceTracker {
  private readonly db: DbInstance;

  constructor(db: DbInstance = defaultDb) {
    this.db = db;
  }

  /**
   * Upserts a workspace_presence row with the current timestamp. Req 7.2
   */
  async touch(workspaceId: string, userId: string): Promise<void> {
    const now = new Date().toISOString();

    await this.db
      .insert(workspacePresence)
      .values({ workspaceId, userId, lastActiveAt: now })
      .onConflictDoUpdate({
        target: [workspacePresence.workspaceId, workspacePresence.userId],
        set: { lastActiveAt: now },
      });
  }

  /**
   * Counts distinct userIds active within the given window (in ms). Req 7.1
   */
  async getActiveCount(workspaceId: string, windowMs: number): Promise<number> {
    const cutoff = new Date(Date.now() - windowMs).toISOString();

    const result = await this.db
      .select({ count: countDistinct(workspacePresence.userId) })
      .from(workspacePresence)
      .where(
        and(
          eq(workspacePresence.workspaceId, workspaceId),
          gte(workspacePresence.lastActiveAt, cutoff)
        )
      );

    return result[0]?.count ?? 0;
  }
}

export default new PresenceTracker();
