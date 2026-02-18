import { NextRequest, NextResponse } from 'next/server';
import { dataSourceService } from '@/lib/workspace/dataSourceService';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();

    if (!body.type || !['postgresql', 'mysql', 'sqlite'].includes(body.type)) {
      return NextResponse.json(
        { error: 'Valid database type (postgresql/mysql/sqlite) is required' },
        { status: 400 }
      );
    }

    if (!body.config) {
      return NextResponse.json(
        { error: 'Database configuration is required' },
        { status: 400 }
      );
    }

    // For PostgreSQL and MySQL, require host and database
    if (body.type !== 'sqlite') {
      if (!body.config.host || !body.config.database) {
        return NextResponse.json(
          { error: 'Host and database name are required' },
          { status: 400 }
        );
      }
    } else {
      // For SQLite, require database path
      if (!body.config.database) {
        return NextResponse.json(
          { error: 'Database file path is required' },
          { status: 400 }
        );
      }
    }

    const result = await dataSourceService.testConnection(body.type, body.config);

    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error: any) {
    console.error('Error testing connection:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Connection test failed' },
      { status: 500 }
    );
  }
}
