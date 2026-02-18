import { NextRequest, NextResponse } from 'next/server';
import agentService from '@/lib/workspace/agentService';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string; agentId: string }> }
) {
  try {
    const params = await context.params;
    await agentService.setDefaultAgent(params.agentId, params.id);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('Error setting default agent:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to set default agent' },
      { status: 500 }
    );
  }
}
