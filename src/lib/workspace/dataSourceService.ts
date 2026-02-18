import { eq } from 'drizzle-orm';
import db from '@/lib/db';
import { workspaceDataSources } from '@/lib/db/schema';
import { DataSourceConnection } from '@/lib/types/workspace';
import { randomUUID } from 'crypto';

// Database clients will be imported dynamically to avoid errors if not installed
let PgClient: any;
let MysqlClient: any;
let SqliteDatabase: any;

try {
  const pg = require('pg');
  PgClient = pg.Client;
} catch (e) {
  PgClient = null;
}

try {
  const mysql = require('mysql2/promise');
  MysqlClient = mysql;
} catch (e) {
  MysqlClient = null;
}

try {
  const sqlite = require('better-sqlite3');
  SqliteDatabase = sqlite;
} catch (e) {
  SqliteDatabase = null;
}

export interface CreateConnectionDTO {
  workspaceId: string;
  name: string;
  type: 'postgresql' | 'mysql' | 'sqlite';
  config: {
    host?: string;
    port?: number;
    database: string;
    username?: string;
    password?: string;
  };
  createdBy: string;
}

export interface TestConnectionResult {
  success: boolean;
  error?: string;
  message?: string;
}

export interface DatabaseColumn {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: any;
}

export interface DatabaseTable {
  name: string;
  columns: DatabaseColumn[];
}

export interface DatabaseSchema {
  tables: DatabaseTable[];
}

export interface QueryResult {
  rows: any[];
  rowCount: number;
  fields: Array<{ name: string; dataTypeID: number }>;
}

export class DataSourceService {
  async testConnection(
    type: 'postgresql' | 'mysql' | 'sqlite',
    config: CreateConnectionDTO['config']
  ): Promise<TestConnectionResult> {
    try {
      if (type === 'sqlite') {
        return await this.testSQLiteConnection(config);
      } else if (type === 'mysql') {
        return await this.testMySQLConnection(config);
      } else {
        return await this.testPostgreSQLConnection(config);
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Connection failed',
      };
    }
  }

  private async testPostgreSQLConnection(
    config: CreateConnectionDTO['config']
  ): Promise<TestConnectionResult> {
    if (!PgClient) {
      return {
        success: false,
        error: 'PostgreSQL client not installed. Please install pg package.',
      };
    }

    const client = new PgClient({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.username,
      password: config.password,
      connectionTimeoutMillis: 5000,
    });

    try {
      await client.connect();
      await client.query('SELECT 1');
      await client.end();
      return { success: true, message: 'PostgreSQL connection successful' };
    } catch (error: any) {
      try { await client.end(); } catch (e) {}
      return { success: false, error: error.message || 'PostgreSQL connection failed' };
    }
  }

  private async testMySQLConnection(
    config: CreateConnectionDTO['config']
  ): Promise<TestConnectionResult> {
    if (!MysqlClient) {
      return {
        success: false,
        error: 'MySQL client not installed. Please install mysql2 package.',
      };
    }

    try {
      const connection = await MysqlClient.createConnection({
        host: config.host,
        port: config.port,
        database: config.database,
        user: config.username,
        password: config.password,
        connectTimeout: 5000,
      });
      await connection.query('SELECT 1');
      await connection.end();
      return { success: true, message: 'MySQL connection successful' };
    } catch (error: any) {
      return { success: false, error: error.message || 'MySQL connection failed' };
    }
  }

  private async testSQLiteConnection(
    config: CreateConnectionDTO['config']
  ): Promise<TestConnectionResult> {
    if (!SqliteDatabase) {
      return {
        success: false,
        error: 'SQLite client not installed. Please install better-sqlite3 package.',
      };
    }

    try {
      const sqliteDb = new SqliteDatabase(config.database, { readonly: true });
      sqliteDb.prepare('SELECT 1').get();
      sqliteDb.close();
      return { success: true, message: 'SQLite connection successful' };
    } catch (error: any) {
      return { success: false, error: error.message || 'SQLite connection failed' };
    }
  }

  async fetchSchema(connectionId: string): Promise<DatabaseSchema | null> {
    const connection = await this.getConnection(connectionId);
    if (!connection) return null;

    if (connection.type === 'sqlite') {
      return await this.fetchSQLiteSchema(connection);
    } else if (connection.type === 'postgresql') {
      return await this.fetchPostgreSQLSchema(connection);
    }
    return null;
  }

  private async fetchSQLiteSchema(connection: any): Promise<DatabaseSchema | null> {
    if (!SqliteDatabase) return null;

    try {
      const sqliteDb = new SqliteDatabase(connection.config.database, { readonly: true });
      const tableRows = sqliteDb.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
        ORDER BY name
      `).all();

      const tables: DatabaseTable[] = [];
      for (const tableRow of tableRows) {
        const tableName = (tableRow as any).name;
        const columnRows = sqliteDb.prepare(`PRAGMA table_info(${tableName})`).all();
        const columns: DatabaseColumn[] = columnRows.map((col: any) => ({
          name: col.name,
          type: col.type,
          nullable: !col.notnull,
          defaultValue: col.dflt_value,
        }));
        tables.push({ name: tableName, columns });
      }

      sqliteDb.close();
      const schema: DatabaseSchema = { tables };

      await db.update(workspaceDataSources).set({
        schema: JSON.stringify(schema),
        lastTested: new Date().toISOString(),
      }).where(eq(workspaceDataSources.id, connection.id));

      return schema;
    } catch (error) {
      console.error('Error fetching SQLite schema:', error);
      return null;
    }
  }

  private async fetchPostgreSQLSchema(connection: any): Promise<DatabaseSchema | null> {
    if (!PgClient) return null;

    const client = new PgClient({
      host: connection.config.host,
      port: connection.config.port,
      database: connection.config.database,
      user: connection.config.username,
      password: connection.config.password,
      connectionTimeoutMillis: 5000,
    });

    try {
      await client.connect();
      const result = await client.query(`
        SELECT t.table_name, c.column_name, c.data_type, c.is_nullable
        FROM information_schema.tables t
        JOIN information_schema.columns c ON t.table_name = c.table_name AND t.table_schema = c.table_schema
        WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
        ORDER BY t.table_name, c.ordinal_position
      `);
      await client.end();

      const tablesMap = new Map<string, DatabaseColumn[]>();
      for (const row of result.rows) {
        if (!tablesMap.has(row.table_name)) tablesMap.set(row.table_name, []);
        tablesMap.get(row.table_name)!.push({
          name: row.column_name,
          type: row.data_type,
          nullable: row.is_nullable === 'YES',
        });
      }

      const schema: DatabaseSchema = {
        tables: Array.from(tablesMap.entries()).map(([name, columns]) => ({ name, columns })),
      };

      await db.update(workspaceDataSources).set({
        schema: JSON.stringify(schema),
        lastTested: new Date().toISOString(),
      }).where(eq(workspaceDataSources.id, connection.id));

      return schema;
    } catch (error: any) {
      try { await client.end(); } catch (e) {}
      throw new Error(`Failed to fetch schema: ${error.message}`);
    }
  }

  async createConnection(data: CreateConnectionDTO): Promise<DataSourceConnection> {
    const id = randomUUID();
    const now = new Date().toISOString();

    const testResult = await this.testConnection(data.type, data.config);
    if (!testResult.success) {
      throw new Error(`Connection test failed: ${testResult.error}`);
    }

    const connectionData = {
      id,
      workspaceId: data.workspaceId,
      name: data.name,
      type: data.type,
      config: data.config,
      schema: null,
      status: 'active' as const,
      lastTested: now,
      createdBy: data.createdBy,
      createdAt: now,
    };

    await db.insert(workspaceDataSources).values(connectionData);
    this.fetchSchema(id).catch(console.error);

    return {
      id,
      workspaceId: data.workspaceId,
      name: data.name,
      type: data.type,
      config: data.config,
      schema: null,
      status: 'active',
      lastTested: new Date(now),
      createdBy: data.createdBy,
      createdAt: new Date(now),
    };
  }

  async getConnection(connectionId: string): Promise<DataSourceConnection | null> {
    const result = await db.select().from(workspaceDataSources)
      .where(eq(workspaceDataSources.id, connectionId)).limit(1);

    if (result.length === 0) return null;

    const conn = result[0];
    const config = typeof conn.config === 'string' ? JSON.parse(conn.config) : conn.config;
    const schema = typeof conn.schema === 'string' && conn.schema ? JSON.parse(conn.schema) : conn.schema;
    const columns = typeof conn.columns === 'string' && conn.columns ? JSON.parse(conn.columns) : conn.columns;

    return {
      id: conn.id,
      workspaceId: conn.workspaceId,
      name: conn.name,
      type: conn.type as any,
      config,
      schema,
      rowCount: conn.rowCount || undefined,
      columns: columns || undefined,
      status: (conn.status || 'active') as any,
      lastTested: conn.lastTested ? new Date(conn.lastTested) : undefined,
      createdBy: conn.createdBy,
      createdAt: new Date(conn.createdAt),
    };
  }

  async listConnections(workspaceId: string): Promise<DataSourceConnection[]> {
    const results = await db.select().from(workspaceDataSources)
      .where(eq(workspaceDataSources.workspaceId, workspaceId))
      .orderBy(workspaceDataSources.createdAt);

    return results.map((conn) => {
      const config = typeof conn.config === 'string' ? JSON.parse(conn.config) : conn.config;
      const schema = typeof conn.schema === 'string' && conn.schema ? JSON.parse(conn.schema) : conn.schema;
      const columns = typeof conn.columns === 'string' && conn.columns ? JSON.parse(conn.columns) : conn.columns;
      return {
        id: conn.id,
        workspaceId: conn.workspaceId,
        name: conn.name,
        type: conn.type as any,
        config,
        schema,
        rowCount: conn.rowCount || undefined,
        columns: columns || undefined,
        status: (conn.status || 'active') as any,
        lastTested: conn.lastTested ? new Date(conn.lastTested) : undefined,
        createdBy: conn.createdBy,
        createdAt: new Date(conn.createdAt),
      };
    });
  }

  async deleteConnection(connectionId: string): Promise<boolean> {
    // Get connection first to check if it's a CSV type
    const connection = await this.getConnection(connectionId);
    
    if (connection?.type === 'csv' && connection.config.filePath) {
      // Delete the SQLite database file
      const fs = require('fs');
      try {
        if (fs.existsSync(connection.config.filePath)) {
          fs.unlinkSync(connection.config.filePath);
        }
      } catch (e) {
        console.error('Error deleting CSV database file:', e);
      }
    }
    
    const result = await db.delete(workspaceDataSources)
      .where(eq(workspaceDataSources.id, connectionId));
    return result.changes > 0;
  }

  /**
   * Execute a SQL query on a data source
   */
  async executeQuery(
    connectionId: string,
    sql: string
  ): Promise<{ success: boolean; rows?: any[]; columns?: string[]; error?: string }> {
    const connection = await this.getConnection(connectionId);
    if (!connection) {
      return { success: false, error: 'Connection not found' };
    }

    if (connection.type === 'csv') {
      // CSV queries are handled by csvDataService
      return { success: false, error: 'Use csvDataService for CSV queries' };
    }

    if (connection.type === 'sqlite') {
      return await this.executeSQLiteQuery(connection, sql);
    } else if (connection.type === 'postgresql') {
      return await this.executePostgreSQLQuery(connection, sql);
    } else if (connection.type === 'mysql') {
      return await this.executeMySQLQuery(connection, sql);
    }

    return { success: false, error: 'Unsupported database type' };
  }

  private async executeSQLiteQuery(
    connection: DataSourceConnection,
    sql: string
  ): Promise<{ success: boolean; rows?: any[]; columns?: string[]; error?: string }> {
    if (!SqliteDatabase) {
      return { success: false, error: 'SQLite not available' };
    }

    try {
      const sqliteDb = new SqliteDatabase(connection.config.database, { readonly: true });
      const rows = sqliteDb.prepare(sql).all();
      const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
      sqliteDb.close();
      return { success: true, rows, columns };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  private async executePostgreSQLQuery(
    connection: DataSourceConnection,
    sql: string
  ): Promise<{ success: boolean; rows?: any[]; columns?: string[]; error?: string }> {
    if (!PgClient) {
      return { success: false, error: 'PostgreSQL client not available' };
    }

    const client = new PgClient({
      host: connection.config.host,
      port: connection.config.port,
      database: connection.config.database,
      user: connection.config.username,
      password: connection.config.password,
      connectionTimeoutMillis: 10000,
    });

    try {
      await client.connect();
      const result = await client.query(sql);
      await client.end();
      const columns = result.fields?.map((f: any) => f.name) || [];
      return { success: true, rows: result.rows, columns };
    } catch (error: any) {
      try { await client.end(); } catch (e) {}
      return { success: false, error: error.message };
    }
  }

  private async executeMySQLQuery(
    connection: DataSourceConnection,
    sql: string
  ): Promise<{ success: boolean; rows?: any[]; columns?: string[]; error?: string }> {
    if (!MysqlClient) {
      return { success: false, error: 'MySQL client not available' };
    }

    try {
      const conn = await MysqlClient.createConnection({
        host: connection.config.host,
        port: connection.config.port,
        database: connection.config.database,
        user: connection.config.username,
        password: connection.config.password,
        connectTimeout: 10000,
      });
      const [rows, fields] = await conn.query(sql);
      await conn.end();
      const columns = (fields as any[])?.map((f: any) => f.name) || [];
      return { success: true, rows: rows as any[], columns };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}

export const dataSourceService = new DataSourceService();
