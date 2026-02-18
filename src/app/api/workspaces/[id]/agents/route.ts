import { NextRequest, NextResponse } from 'next/server';
import agentService from '@/lib/workspace/agentService';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const agents = await agentService.getAgentsByWorkspace(params.id);

    return NextResponse.json(agents, { status: 200 });
  } catch (error: any) {
    console.error('Error getting agents:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get agents' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const body = await request.json();

    // Validation
    if (!body.name || typeof body.name !== 'string') {
      return NextResponse.json(
        { error: 'Agent name is required' },
        { status: 400 }
      );
    }

    if (body.name.length > 100) {
      return NextResponse.json(
        { error: 'Agent name must be 100 characters or less' },
        { status: 400 }
      );
    }

    if (body.systemPrompt && body.systemPrompt.length > 10000) {
      return NextResponse.json(
        { error: 'System prompt must be 10,000 characters or less' },
        { status: 400 }
      );
    }

    const agent = await agentService.createAgent({
      workspaceId: params.id,
      name: body.name,
      description: body.description,
      systemPrompt: body.systemPrompt,
      chatModel: body.chatModel,
      chatModelProvider: body.chatModelProvider,
      embeddingModel: body.embeddingModel,
      embeddingModelProvider: body.embeddingModelProvider,
      isDefault: body.isDefault,
    });

    return NextResponse.json(agent, { status: 201 });
  } catch (error: any) {
    console.error('Error creating agent:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create agent' },
      { status: 500 }
    );
  }
}
