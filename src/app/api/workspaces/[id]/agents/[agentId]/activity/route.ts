import { NextRequest, NextResponse } from 'next/server';
import activityLogger from '@/lib/workspace/agentActivityLogger';

// GET /api/workspaces/[id]/agents/[agentId]/activity?page=1
// Returns paginated activity log for the agent (Req 2.8)
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string; agentId: string }> }
) {
  try {
    const params = await context.params;
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1);

    const result = await activityLogger.getLog(params.agentId, page);
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching agent activity log:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch agent activity log' },
      { status: 500 }
    );
  }
}
