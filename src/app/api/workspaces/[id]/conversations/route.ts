import { NextRequest, NextResponse } from 'next/server';
import { conversationService } from '@/lib/workspace/conversationService';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const body = await request.json();

    if (!body.title || typeof body.title !== 'string') {
      return NextResponse.json({ error: 'Conversation title is required' }, { status: 400 });
    }

    if (!body.createdBy || typeof body.createdBy !== 'string') {
      return NextResponse.json({ error: 'Creator ID is required' }, { status: 400 });
    }

    const conversation = await conversationService.createConversation({
      id: body.id, // Optional: use provided ID (chatId) or generate new one
      workspaceId: params.id,
      agentId: body.agentId, // Optional: agent to use for this conversation
      title: body.title,
      createdBy: body.createdBy,
    });

    return NextResponse.json(conversation, { status: 201 });
  } catch (error: any) {
    console.error('Error creating conversation:', error);
    return NextResponse.json({ error: error.message || 'Failed to create conversation' }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const conversations = await conversationService.listConversations(params.id);
    return NextResponse.json({ conversations }, { status: 200 });
  } catch (error: any) {
    console.error('Error listing conversations:', error);
    return NextResponse.json({ error: error.message || 'Failed to list conversations' }, { status: 500 });
  }
}
