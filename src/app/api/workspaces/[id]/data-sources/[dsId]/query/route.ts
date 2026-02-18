import { NextRequest, NextResponse } from 'next/server';
import { dataSourceService } from '@/lib/workspace/dataSourceService';
import { queryCSVDatabase } from '@/lib/workspace/csvDataService';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string; dsId: string }> }
) {
  try {
    const params = await context.params;
    const { dsId } = params;
    
    const body = await request.json();
    const { query, sql } = body;
    
    // Get data source
    const dataSource = await dataSourceService.getConnection(dsId);
    
    if (!dataSource) {
      return NextResponse.json({ error: 'Data source not found' }, { status: 404 });
    }
    
    // If SQL is provided directly, execute it
    // Otherwise, we'd need to generate SQL from natural language (handled by query-api)
    let sqlToExecute = sql;
    
    if (!sqlToExecute && query) {
      // For now, return an error - natural language processing will be added
      return NextResponse.json(
        { error: 'SQL query is required. Natural language processing coming soon.' },
        { status: 400 }
      );
    }
    
    if (!sqlToExecute) {
      return NextResponse.json({ error: 'Query or SQL is required' }, { status: 400 });
    }
    
    let result;
    
    if (dataSource.type === 'csv') {
      // Query CSV-backed SQLite database
      const dbPath = dataSource.config.filePath || dataSource.config.database;
      if (!dbPath) {
        return NextResponse.json({ error: 'CSV database path not found' }, { status: 500 });
      }
      
      result = await queryCSVDatabase(dbPath, sqlToExecute);
    } else {
      // Query external database
      result = await dataSourceService.executeQuery(dsId, sqlToExecute);
    }
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Query execution failed' },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      success: true,
      rows: result.rows,
      columns: result.columns,
      rowCount: result.rows?.length || 0,
    });
    
  } catch (error: any) {
    console.error('Error executing query:', error);
    return NextResponse.json(
      { error: error.message || 'Query execution failed' },
      { status: 500 }
    );
  }
}
