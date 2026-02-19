import { NextRequest, NextResponse } from 'next/server';
import dashboardAggregator from '@/lib/workspace/dashboardAggregator';

// GET /api/workspaces/[id]/dashboard
// Returns full WorkspaceDashboardMetrics (Req 6.1, 6.5)
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const metrics = await dashboardAggregator.getMetrics(params.id);
    return NextResponse.json(metrics);
  } catch (error: any) {
    console.error('Error fetching dashboard metrics:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch dashboard metrics' },
      { status: 500 }
    );
  }
}
