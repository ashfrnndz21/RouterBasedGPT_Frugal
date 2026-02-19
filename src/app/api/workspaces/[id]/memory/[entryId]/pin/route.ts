import { NextRequest, NextResponse } from 'next/server';
import brainService from '@/lib/workspace/workspaceBrainService';

// POST /api/workspaces/[id]/memory/[entryId]/pin
// Toggles pin on a memory entry (Req 1.5)
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string; entryId: string }> }
) {
  try {
    const params = await context.params;
    const body = await request.json();

    if (typeof body.pinned !== 'boolean') {
      return NextResponse.json({ error: 'pinned (boolean) is required' }, { status: 400 });
    }

    const entry = await brainService.pin(params.entryId, body.pinned);
    return NextResponse.json(entry, { status: 200 });
  } catch (error: any) {
    console.error('Error toggling memory pin:', error);
    if (error.message?.includes('not found')) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json(
      { error: error.message || 'Failed to toggle memory pin' },
      { status: 500 }
    );
  }
}
