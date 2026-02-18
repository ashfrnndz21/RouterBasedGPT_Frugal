import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import db from '@/lib/db';
import { workspaceDataSources } from '@/lib/db/schema';
import {
  parseCSV,
  parseExcel,
  createSQLiteFromData,
  getCSVPreview,
} from '@/lib/workspace/csvDataService';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const workspaceId = params.id;
    
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const name = formData.get('name') as string | null;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    
    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size exceeds 50MB limit' },
        { status: 400 }
      );
    }
    
    // Get file extension
    const fileName = file.name;
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    if (!extension || !['csv', 'xlsx', 'xls', 'tsv'].includes(extension)) {
      return NextResponse.json(
        { error: 'Unsupported file type. Please upload CSV, XLSX, XLS, or TSV files.' },
        { status: 400 }
      );
    }
    
    // Parse file based on type
    let parseResult;
    
    if (extension === 'csv' || extension === 'tsv') {
      const content = await file.text();
      parseResult = await parseCSV(content);
    } else {
      // Excel file
      const buffer = Buffer.from(await file.arrayBuffer());
      parseResult = await parseExcel(buffer);
    }
    
    if (!parseResult.success || !parseResult.data || !parseResult.columns) {
      return NextResponse.json(
        { error: parseResult.error || 'Failed to parse file' },
        { status: 400 }
      );
    }
    
    // Generate table name from file name or provided name
    const tableName = (name || fileName.replace(/\.[^/.]+$/, ''))
      .replace(/[^a-zA-Z0-9_]/g, '_')
      .toLowerCase()
      .substring(0, 50);
    
    // Create SQLite database from parsed data
    const dbConfig = await createSQLiteFromData(
      workspaceId,
      tableName,
      parseResult.columns,
      parseResult.data,
      fileName
    );
    
    if (!dbConfig) {
      return NextResponse.json(
        { error: 'Failed to create database from file' },
        { status: 500 }
      );
    }
    
    // Store data source in database
    const id = randomUUID();
    const now = new Date().toISOString();
    
    const dataSourceData = {
      id,
      workspaceId,
      name: name || fileName.replace(/\.[^/.]+$/, ''),
      type: 'csv' as const,
      config: {
        filePath: dbConfig.filePath,
        tableName: dbConfig.tableName,
        originalFileName: fileName,
        database: dbConfig.dbPath,
      },
      schema: {
        tables: [{
          name: dbConfig.tableName,
          columns: parseResult.columns.map(col => ({
            name: col.name,
            type: col.type,
            nullable: true,
          })),
        }],
      },
      rowCount: parseResult.rowCount,
      columns: parseResult.columns.map(col => ({ name: col.name, type: col.type })),
      status: 'active' as const,
      lastTested: now,
      createdBy: 'user',
      createdAt: now,
    };
    
    await db.insert(workspaceDataSources).values(dataSourceData);
    
    // Get preview data
    const preview = await getCSVPreview(dbConfig.dbPath, dbConfig.tableName, 10);
    
    return NextResponse.json({
      id,
      name: dataSourceData.name,
      type: 'csv',
      rowCount: parseResult.rowCount,
      columns: parseResult.columns,
      preview: preview.success ? preview.rows : [],
      status: 'active',
      createdAt: now,
    }, { status: 201 });
    
  } catch (error: any) {
    console.error('Error uploading CSV:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload file' },
      { status: 500 }
    );
  }
}
