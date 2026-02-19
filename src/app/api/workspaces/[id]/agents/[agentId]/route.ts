import { NextRequest, NextResponse } from 'next/server';
import agentService from '@/lib/workspace/agentService';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string; agentId: string }> }
) {
  try {
    const params = await context.params;
    const agent = await agentService.getAgentById(params.agentId);

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    return NextResponse.json(agent, { status: 200 });
  } catch (error: any) {
    console.error('Error getting agent:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get agent' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string; agentId: string }> }
) {
  try {
    const params = await context.params;
    const body = await request.json();

    // Validation
    if (body.name !== undefined) {
      if (typeof body.name !== 'string' || body.name.length === 0) {
        return NextResponse.json(
          { error: 'Agent name cannot be empty' },
          { status: 400 }
        );
      }
      if (body.name.length > 100) {
        return NextResponse.json(
          { error: 'Agent name must be 100 characters or less' },
          { status: 400 }
        );
      }
    }

    if (body.systemPrompt !== undefined && body.systemPrompt.length > 10000) {
      return NextResponse.json(
        { error: 'System prompt must be 10,000 characters or less' },
        { status: 400 }
      );
    }

    const agent = await agentService.updateAgent(params.agentId, {
      name: body.name,
      description: body.description,
      systemPrompt: body.systemPrompt,
      chatModel: body.chatModel,
      chatModelProvider: body.chatModelProvider,
      embeddingModel: body.embeddingModel,
      embeddingModelProvider: body.embeddingModelProvider,
      avatar: body.avatar,
      role: body.role,
      specialty: body.specialty,
      toolsAllowed: body.toolsAllowed,
      memoryScope: body.memoryScope,
    });

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    return NextResponse.json(agent, { status: 200 });
  } catch (error: any) {
    console.error('Error updating agent:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update agent' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; agentId: string }> }
) {
  try {
    const params = await context.params;
    await agentService.deleteAgent(params.agentId);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('Error deleting agent:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete agent' },
      { status: 500 }
    );
  }
}
