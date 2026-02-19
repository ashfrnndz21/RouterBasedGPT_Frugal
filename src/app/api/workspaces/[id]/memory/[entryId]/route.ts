import { NextRequest, NextResponse } from 'next/server';
import brainService from '@/lib/workspace/workspaceBrainService';

// PATCH /api/workspaces/[id]/memory/[entryId]
// Updates memory entry content (Req 1.9)
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string; entryId: string }> }
) {
  try {
    const params = await context.params;
    const body = await request.json();

    if (!body.content || typeof body.content !== 'string') {
      return NextResponse.json({ error: 'content is required' }, { status: 400 });
    }

    const entry = await brainService.update(params.entryId, body.content);
    return NextResponse.json(entry, { status: 200 });
  } catch (error: any) {
    console.error('Error updating memory entry:', error);
    if (error.message?.includes('not found')) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json(
      { error: error.message || 'Failed to update memory entry' },
      { status: 500 }
    );
  }
}

// DELETE /api/workspaces/[id]/memory/[entryId]
// Deletes a memory entry (Req 1.10)
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; entryId: string }> }
) {
  try {
    const params = await context.params;
    await brainService.delete(params.entryId);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('Error deleting memory entry:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete memory entry' },
      { status: 500 }
    );
  }
}
