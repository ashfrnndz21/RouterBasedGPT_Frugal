import { NextRequest, NextResponse } from 'next/server';
import { conversationService } from '@/lib/workspace/conversationService';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string; convId: string }> }
) {
  try {
    const params = await context.params;
    const body = await request.json();

    if (!body.role || !['user', 'assistant'].includes(body.role)) {
      return NextResponse.json({ error: 'Valid role (user/assistant) is required' }, { status: 400 });
    }

    if (!body.content || typeof body.content !== 'string') {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 });
    }

    const message = await conversationService.addMessage({
      conversationId: params.convId,
      workspaceId: params.id,
      role: body.role,
      content: body.content,
      sources: body.sources,
      metadata: body.metadata,
      createdBy: body.createdBy || 'user',
    });

    return NextResponse.json(message, { status: 201 });
  } catch (error: any) {
    console.error('Error adding message:', error);
    return NextResponse.json({ error: error.message || 'Failed to add message' }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string; convId: string }> }
) {
  try {
    const params = await context.params;
    const messages = await conversationService.getMessages(params.convId);
    return NextResponse.json({ messages }, { status: 200 });
  } catch (error: any) {
    console.error('Error getting messages:', error);
    return NextResponse.json({ error: error.message || 'Failed to get messages' }, { status: 500 });
  }
}
