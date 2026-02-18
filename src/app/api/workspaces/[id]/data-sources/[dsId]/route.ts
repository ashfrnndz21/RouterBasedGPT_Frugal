import { NextRequest, NextResponse } from 'next/server';
import { dataSourceService } from '@/lib/workspace/dataSourceService';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string; dsId: string }> }
) {
  try {
    const params = await context.params;
    const dataSource = await dataSourceService.getConnection(params.dsId);
    
    if (!dataSource) {
      return NextResponse.json({ error: 'Data source not found' }, { status: 404 });
    }
    
    return NextResponse.json(dataSource);
  } catch (error: any) {
    console.error('Error getting data source:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get data source' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; dsId: string }> }
) {
  try {
    const params = await context.params;
    const success = await dataSourceService.deleteConnection(params.dsId);
    
    if (!success) {
      return NextResponse.json({ error: 'Data source not found' }, { status: 404 });
    }
    
    return NextResponse.json({ message: 'Data source deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting data source:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete data source' },
      { status: 500 }
    );
  }
}
