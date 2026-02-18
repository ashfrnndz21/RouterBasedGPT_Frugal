import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { randomUUID } from 'crypto';

// Ensure uploads directory exists
const GENBI_UPLOADS_DIR = path.join(process.cwd(), 'uploads', 'genbi');

export interface ParsedColumn {
  name: string;
  type: 'text' | 'integer' | 'real' | 'boolean';
  sampleValues: any[];
}

export interface ParseResult {
  success: boolean;
  error?: string;
  data?: any[];
  columns?: ParsedColumn[];
  rowCount?: number;
  filePath?: string;
  tableName?: string;
}

export interface CSVDataSourceConfig {
  filePath: string;
  tableName: string;
  originalFileName: string;
  dbPath: string;
}

// Dynamic import for better-sqlite3 to avoid issues
let Database: any;
try {
  Database = require('better-sqlite3');
} catch (e) {
  Database = null;
}

/**
 * Ensure the uploads directory exists for a workspace
 */
export function ensureUploadDir(workspaceId: string): string {
  const workspaceDir = path.join(GENBI_UPLOADS_DIR, workspaceId);
  if (!fs.existsSync(workspaceDir)) {
    fs.mkdirSync(workspaceDir, { recursive: true });
  }
  return workspaceDir;
}

/**
 * Infer column type from sample values
 */
function inferColumnType(values: any[]): 'text' | 'integer' | 'real' | 'boolean' {
  const nonNullValues = values.filter(v => v !== null && v !== undefined && v !== '');
  
  if (nonNullValues.length === 0) return 'text';
  
  // Check for boolean
  const booleanValues = nonNullValues.filter(v => {
    const lower = String(v).toLowerCase();
    return lower === 'true' || lower === 'false' || lower === '1' || lower === '0' || lower === 'yes' || lower === 'no';
  });
  if (booleanValues.length === nonNullValues.length) return 'boolean';
  
  // Check for integer
  const integerValues = nonNullValues.filter(v => {
    const num = Number(v);
    return !isNaN(num) && Number.isInteger(num);
  });
  if (integerValues.length === nonNullValues.length) return 'integer';
  
  // Check for real/float
  const realValues = nonNullValues.filter(v => {
    const num = Number(v);
    return !isNaN(num);
  });
  if (realValues.length === nonNullValues.length) return 'real';
  
  return 'text';
}

/**
 * Sanitize column name for SQL
 */
function sanitizeColumnName(name: string): string {
  // Remove special characters and replace spaces with underscores
  let sanitized = name
    .replace(/[^a-zA-Z0-9_\s]/g, '')
    .replace(/\s+/g, '_')
    .toLowerCase()
    .trim();
  
  // Ensure it doesn't start with a number
  if (/^\d/.test(sanitized)) {
    sanitized = 'col_' + sanitized;
  }
  
  // Ensure it's not empty
  if (!sanitized) {
    sanitized = 'column';
  }
  
  return sanitized;
}

/**
 * Parse CSV file content
 */
export async function parseCSV(fileContent: string): Promise<ParseResult> {
  return new Promise((resolve) => {
    Papa.parse(fileContent, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          resolve({
            success: false,
            error: results.errors.map(e => e.message).join(', '),
          });
          return;
        }
        
        const data = results.data as any[];
        if (data.length === 0) {
          resolve({
            success: false,
            error: 'No data found in CSV file',
          });
          return;
        }
        
        // Get column names from first row
        const columnNames = Object.keys(data[0]);
        
        // Infer column types from sample data (first 100 rows)
        const sampleSize = Math.min(100, data.length);
        const columns: ParsedColumn[] = columnNames.map(name => {
          const sampleValues = data.slice(0, sampleSize).map(row => row[name]);
          return {
            name: sanitizeColumnName(name),
            type: inferColumnType(sampleValues),
            sampleValues: sampleValues.slice(0, 5),
          };
        });
        
        resolve({
          success: true,
          data,
          columns,
          rowCount: data.length,
        });
      },
      error: (error: Error) => {
        resolve({
          success: false,
          error: error.message,
        });
      },
    });
  });
}

/**
 * Parse Excel file
 */
export async function parseExcel(buffer: Buffer): Promise<ParseResult> {
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    
    // Get first sheet
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return {
        success: false,
        error: 'No sheets found in Excel file',
      };
    }
    
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { defval: null });
    
    if (data.length === 0) {
      return {
        success: false,
        error: 'No data found in Excel file',
      };
    }
    
    // Get column names
    const columnNames = Object.keys(data[0] as object);
    
    // Infer column types
    const sampleSize = Math.min(100, data.length);
    const columns: ParsedColumn[] = columnNames.map(name => {
      const sampleValues = data.slice(0, sampleSize).map((row: any) => row[name]);
      return {
        name: sanitizeColumnName(name),
        type: inferColumnType(sampleValues),
        sampleValues: sampleValues.slice(0, 5),
      };
    });
    
    return {
      success: true,
      data: data as any[],
      columns,
      rowCount: data.length,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to parse Excel file',
    };
  }
}

/**
 * Create SQLite database and table from parsed data
 */
export async function createSQLiteFromData(
  workspaceId: string,
  tableName: string,
  columns: ParsedColumn[],
  data: any[],
  originalFileName: string
): Promise<CSVDataSourceConfig | null> {
  if (!Database) {
    console.error('better-sqlite3 not available');
    return null;
  }
  
  const uploadDir = ensureUploadDir(workspaceId);
  const dbId = randomUUID();
  const dbPath = path.join(uploadDir, `${dbId}.db`);
  const sanitizedTableName = sanitizeColumnName(tableName);
  
  try {
    const db = new Database(dbPath);
    
    // Create table
    const columnDefs = columns.map(col => {
      const sqlType = col.type === 'integer' ? 'INTEGER' 
        : col.type === 'real' ? 'REAL' 
        : col.type === 'boolean' ? 'INTEGER'
        : 'TEXT';
      return `"${col.name}" ${sqlType}`;
    }).join(', ');
    
    db.exec(`CREATE TABLE "${sanitizedTableName}" (${columnDefs})`);
    
    // Prepare insert statement
    const placeholders = columns.map(() => '?').join(', ');
    const insertStmt = db.prepare(
      `INSERT INTO "${sanitizedTableName}" VALUES (${placeholders})`
    );
    
    // Get original column names mapping
    const originalColumnNames = Object.keys(data[0] || {});
    
    // Insert data in transaction for better performance
    const insertMany = db.transaction((rows: any[]) => {
      for (const row of rows) {
        const values = columns.map((col, idx) => {
          const originalName = originalColumnNames[idx];
          let value = row[originalName];
          
          // Convert boolean strings
          if (col.type === 'boolean') {
            const lower = String(value).toLowerCase();
            if (lower === 'true' || lower === 'yes' || lower === '1') return 1;
            if (lower === 'false' || lower === 'no' || lower === '0') return 0;
            return null;
          }
          
          return value;
        });
        insertStmt.run(values);
      }
    });
    
    insertMany(data);
    db.close();
    
    return {
      filePath: dbPath,
      tableName: sanitizedTableName,
      originalFileName,
      dbPath,
    };
  } catch (error: any) {
    console.error('Error creating SQLite database:', error);
    // Cleanup on error
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
    return null;
  }
}

/**
 * Query a CSV-backed SQLite database
 */
export async function queryCSVDatabase(
  dbPath: string,
  sql: string
): Promise<{ success: boolean; rows?: any[]; columns?: string[]; error?: string }> {
  if (!Database) {
    return { success: false, error: 'SQLite not available' };
  }
  
  if (!fs.existsSync(dbPath)) {
    return { success: false, error: 'Database file not found' };
  }
  
  try {
    const db = new Database(dbPath, { readonly: true });
    const stmt = db.prepare(sql);
    const rows = stmt.all();
    const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
    db.close();
    
    return {
      success: true,
      rows,
      columns,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Query execution failed',
    };
  }
}

/**
 * Get preview data from CSV database
 */
export async function getCSVPreview(
  dbPath: string,
  tableName: string,
  limit: number = 10
): Promise<{ success: boolean; rows?: any[]; columns?: string[]; error?: string }> {
  return queryCSVDatabase(dbPath, `SELECT * FROM "${tableName}" LIMIT ${limit}`);
}

/**
 * Get table schema from CSV database
 */
export async function getCSVSchema(
  dbPath: string,
  tableName: string
): Promise<{ success: boolean; columns?: Array<{ name: string; type: string }>; error?: string }> {
  if (!Database) {
    return { success: false, error: 'SQLite not available' };
  }
  
  if (!fs.existsSync(dbPath)) {
    return { success: false, error: 'Database file not found' };
  }
  
  try {
    const db = new Database(dbPath, { readonly: true });
    const columns = db.prepare(`PRAGMA table_info("${tableName}")`).all();
    db.close();
    
    return {
      success: true,
      columns: columns.map((col: any) => ({
        name: col.name,
        type: col.type,
      })),
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to get schema',
    };
  }
}

/**
 * Delete CSV database file
 */
export async function deleteCSVDatabase(dbPath: string): Promise<boolean> {
  try {
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
    return true;
  } catch (error) {
    console.error('Error deleting CSV database:', error);
    return false;
  }
}
