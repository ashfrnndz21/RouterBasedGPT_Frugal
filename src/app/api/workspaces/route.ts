import { NextRequest, NextResponse } from 'next/server';
import { workspaceService } from '@/lib/workspace/workspaceService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.name || typeof body.name !== 'string') {
      return NextResponse.json({ error: 'Workspace name is required' }, { status: 400 });
    }

    if (!body.ownerId || typeof body.ownerId !== 'string') {
      return NextResponse.json({ error: 'Owner ID is required' }, { status: 400 });
    }

    if (body.name.length === 0 || body.name.length > 100) {
      return NextResponse.json({ error: 'Workspace name must be between 1 and 100 characters' }, { status: 400 });
    }

    const workspace = await workspaceService.createWorkspace({
      id: body.id,
      name: body.name,
      description: body.description,
      icon: body.icon,
      ownerId: body.ownerId,
      context: body.context,
      settings: body.settings,
    });

    return NextResponse.json(workspace, { status: 201 });
  } catch (error: any) {
    console.error('Error creating workspace:', error);
    return NextResponse.json({ error: error.message || 'Failed to create workspace' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const workspaces = await workspaceService.listUserWorkspaces(userId);
    return NextResponse.json({ workspaces }, { status: 200 });
  } catch (error: any) {
    console.error('Error listing workspaces:', error);
    return NextResponse.json({ error: error.message || 'Failed to list workspaces' }, { status: 500 });
  }
}
