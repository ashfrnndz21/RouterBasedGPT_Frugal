import { NextRequest, NextResponse } from 'next/server';
import { workspaceService } from '@/lib/workspace/workspaceService';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const workspace = await workspaceService.getWorkspace(params.id);

    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    return NextResponse.json(workspace, { status: 200 });
  } catch (error: any) {
    console.error('Error getting workspace:', error);
    return NextResponse.json({ error: error.message || 'Failed to get workspace' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const body = await request.json();

    if (body.name !== undefined) {
      if (typeof body.name !== 'string' || body.name.length === 0 || body.name.length > 100) {
        return NextResponse.json({ error: 'Workspace name must be between 1 and 100 characters' }, { status: 400 });
      }
    }

    const workspace = await workspaceService.updateWorkspace(params.id, {
      name: body.name,
      description: body.description,
      icon: body.icon,
      context: body.context,
      settings: body.settings,
    });

    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    return NextResponse.json(workspace, { status: 200 });
  } catch (error: any) {
    console.error('Error updating workspace:', error);
    return NextResponse.json({ error: error.message || 'Failed to update workspace' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const success = await workspaceService.deleteWorkspace(params.id);

    if (!success) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Workspace deleted successfully' }, { status: 200 });
  } catch (error: any) {
    console.error('Error deleting workspace:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete workspace' }, { status: 500 });
  }
}
