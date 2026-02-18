import { NextRequest, NextResponse } from 'next/server';
import { conversationService } from '@/lib/workspace/conversationService';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const pins = await conversationService.listPinnedInsights(params.id);
    return NextResponse.json({ pins }, { status: 200 });
  } catch (error: any) {
    console.error('Error listing pins:', error);
    return NextResponse.json({ error: error.message || 'Failed to list pins' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const body = await request.json();

    if (!body.messageId || typeof body.messageId !== 'string') {
      return NextResponse.json({ error: 'Message ID is required' }, { status: 400 });
    }

    const pin = await conversationService.pinMessage({
      workspaceId: params.id,
      messageId: body.messageId,
      conversationId: body.conversationId,
      content: body.content,
      pinnedBy: body.pinnedBy || 'user',
      title: body.title,
      category: body.category,
    });

    return NextResponse.json(pin, { status: 201 });
  } catch (error: any) {
    console.error('Error pinning message:', error);
    return NextResponse.json({ error: error.message || 'Failed to pin message' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pinId = searchParams.get('pinId');

    if (!pinId) {
      return NextResponse.json({ error: 'Pin ID is required' }, { status: 400 });
    }

    const success = await conversationService.unpinMessage(pinId);

    if (!success) {
      return NextResponse.json({ error: 'Pin not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Pin removed successfully' }, { status: 200 });
  } catch (error: any) {
    console.error('Error removing pin:', error);
    return NextResponse.json({ error: error.message || 'Failed to remove pin' }, { status: 500 });
  }
}
