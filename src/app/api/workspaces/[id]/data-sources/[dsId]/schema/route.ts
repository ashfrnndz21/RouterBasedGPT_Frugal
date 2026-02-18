import { NextRequest, NextResponse } from 'next/server';
import { dataSourceService } from '@/lib/workspace/dataSourceService';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string; dsId: string }> }
) {
  try {
    const params = await context.params;
    const schema = await dataSourceService.fetchSchema(params.dsId);

    if (!schema) {
      return NextResponse.json({ error: 'Failed to fetch schema' }, { status: 404 });
    }

    return NextResponse.json({ schema }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching schema:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch schema' }, { status: 500 });
  }
}
