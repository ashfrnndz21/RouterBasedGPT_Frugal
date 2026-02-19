import { NextRequest, NextResponse } from 'next/server';
import { conversationService } from '@/lib/workspace/conversationService';

// PATCH /api/workspaces/[id]/conversations/[convId]
// Accepts optional `tags` array — Req 3.2
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string; convId: string }> }
) {
  try {
    const params = await context.params;
    const body = await request.json();

    // Validate tags if provided
    if (body.tags !== undefined) {
      if (
        !Array.isArray(body.tags) ||
        body.tags.some((t: unknown) => typeof t !== 'string')
      ) {
        return NextResponse.json(
          { error: '`tags` must be an array of strings' },
          { status: 400 }
        );
      }
    }

    const updated = await conversationService.updateConversation(params.convId, {
      tags: body.tags,
    });

    if (!updated) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    return NextResponse.json(updated, { status: 200 });
  } catch (error: any) {
    console.error('Error updating conversation:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update conversation' },
      { status: 500 }
    );
  }
}
