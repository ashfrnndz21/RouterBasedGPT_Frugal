import { NextRequest, NextResponse } from 'next/server';
import presenceTracker from '@/lib/workspace/presenceTracker';

// GET /api/workspaces/[id]/presence
// Returns count of users active in the last 5 minutes (Req 7.1)
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const activeCount = await presenceTracker.getActiveCount(params.id, 5 * 60 * 1000);
    return NextResponse.json({ activeCount });
  } catch (error: any) {
    console.error('Error fetching presence count:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch presence count' },
      { status: 500 }
    );
  }
}
