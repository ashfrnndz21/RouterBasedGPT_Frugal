import { NextRequest, NextResponse } from 'next/server';
import { dataSourceService } from '@/lib/workspace/dataSourceService';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const dataSources = await dataSourceService.listConnections(params.id);
    return NextResponse.json({ dataSources }, { status: 200 });
  } catch (error: any) {
    console.error('Error listing data sources:', error);
    return NextResponse.json({ error: error.message || 'Failed to list data sources' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const body = await request.json();

    if (!body.name || typeof body.name !== 'string') {
      return NextResponse.json({ error: 'Data source name is required' }, { status: 400 });
    }

    if (!body.type || !['postgresql', 'mysql', 'sqlite'].includes(body.type)) {
      return NextResponse.json({ error: 'Valid type (postgresql/mysql/sqlite) is required' }, { status: 400 });
    }

    if (!body.config || !body.config.database) {
      return NextResponse.json({ error: 'Database configuration is required' }, { status: 400 });
    }

    const dataSource = await dataSourceService.createConnection({
      workspaceId: params.id,
      name: body.name,
      type: body.type,
      config: body.config,
      createdBy: body.createdBy || 'user',
    });

    return NextResponse.json(dataSource, { status: 201 });
  } catch (error: any) {
    console.error('Error creating data source:', error);
    return NextResponse.json({ error: error.message || 'Failed to create data source' }, { status: 500 });
  }
}
