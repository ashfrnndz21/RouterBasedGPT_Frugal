import { NextRequest, NextResponse } from 'next/server';
import db, { sqlite } from '@/lib/db';
import { workspaceConversations, workspaceMessages } from '@/lib/db/schema';
import { eq, and, like, inArray } from 'drizzle-orm';

// Requirements: 3.3, 3.4
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const workspaceId = params.id;
    const q = request.nextUrl.searchParams.get('q')?.trim();

    if (!q) {
      return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 });
    }

    let conversationIds: string[] = [];

    // Try FTS5 search first (Requirement 3.3)
    try {
      const ftsRows = sqlite
        .prepare(
          `SELECT DISTINCT conversation_id
           FROM workspace_messages_fts
           WHERE workspace_messages_fts MATCH ?
             AND workspace_id = ?`
        )
        .all(q, workspaceId) as Array<{ conversation_id: string }>;

      conversationIds = ftsRows.map((r) => r.conversation_id);
    } catch (ftsError) {
      // FTS unavailable — fall back to LIKE search (design doc error handling)
      console.warn('[search] FTS unavailable, falling back to LIKE search:', ftsError);

      const likeRows = await db
        .selectDistinct({ conversationId: workspaceMessages.conversationId })
        .from(workspaceMessages)
        .where(
          and(
            eq(workspaceMessages.workspaceId, workspaceId),
            like(workspaceMessages.content, `%${q}%`)
          )
        );

      conversationIds = likeRows.map((r) => r.conversationId);
    }

    if (conversationIds.length === 0) {
      return NextResponse.json({ conversations: [] });
    }

    // Fetch conversation rows including participant_agent_ids (Requirement 3.4)
    const conversations = await db
      .select({
        id: workspaceConversations.id,
        title: workspaceConversations.title,
        workspaceId: workspaceConversations.workspaceId,
        participantAgentIds: workspaceConversations.participantAgentIds,
        updatedAt: workspaceConversations.updatedAt,
      })
      .from(workspaceConversations)
      .where(
        and(
          eq(workspaceConversations.workspaceId, workspaceId),
          inArray(workspaceConversations.id, conversationIds)
        )
      );

    return NextResponse.json({ conversations });
  } catch (error: any) {
    console.error('[search] Error searching conversations:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to search conversations' },
      { status: 500 }
    );
  }
}
