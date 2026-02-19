import { NextRequest, NextResponse } from 'next/server';
import brainService from '@/lib/workspace/workspaceBrainService';

// GET /api/workspaces/[id]/memory?page=1
// Returns paginated memory timeline (Req 1.8)
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1);

    const result = await brainService.getTimeline(params.id, page);
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching memory timeline:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch memory timeline' },
      { status: 500 }
    );
  }
}

// POST /api/workspaces/[id]/memory
// Indexes a new memory entry (Req 1.2)
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const body = await request.json();

    const { content, scope, agentId, userId, sourceConversationId, sourceMessageId } = body;

    if (!content || typeof content !== 'string') {
      return NextResponse.json({ error: 'content is required' }, { status: 400 });
    }

    if (!scope || !['workspace', 'agent', 'user'].includes(scope)) {
      return NextResponse.json(
        { error: 'scope must be one of: workspace, agent, user' },
        { status: 400 }
      );
    }

    const entry = await brainService.indexFact({
      workspaceId: params.id,
      content,
      scope,
      agentId: agentId ?? null,
      userId: userId ?? null,
      sourceConversationId: sourceConversationId ?? null,
      sourceMessageId: sourceMessageId ?? null,
      embedding: null,
      pinned: false,
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (error: any) {
    console.error('Error indexing memory entry:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to index memory entry' },
      { status: 500 }
    );
  }
}
