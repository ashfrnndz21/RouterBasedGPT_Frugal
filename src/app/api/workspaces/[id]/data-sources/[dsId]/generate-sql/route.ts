import { NextRequest, NextResponse } from 'next/server';
import { dataSourceService } from '@/lib/workspace/dataSourceService';
import { getAvailableChatModelProviders } from '@/lib/providers';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { queryCSVDatabase } from '@/lib/workspace/csvDataService';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string; dsId: string }> }
) {
  try {
    const params = await context.params;
    const { dsId } = params;
    
    const body = await request.json();
    const { query } = body;
    
    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }
    
    // Get data source to understand the schema
    const dataSource = await dataSourceService.getConnection(dsId);
    
    if (!dataSource) {
      return NextResponse.json({ error: 'Data source not found' }, { status: 404 });
    }
    
    // Build schema context for SQL generation
    const dsTableName = dataSource.config.tableName || dataSource.name;
    let schemaInfo = '';
    let sampleData = '';
    
    if (dataSource.columns && dataSource.columns.length > 0) {
      const columnDefs = dataSource.columns.map(col => `  - ${col.name} (${col.type})`).join('\n');
      schemaInfo = `Table name: "${dsTableName}"\nColumns:\n${columnDefs}`;
      
      // Fetch 2-3 sample rows to help LLM understand the data
      try {
        const dbPath = dataSource.config.filePath || dataSource.config.database;
        if (dbPath && dataSource.type === 'csv') {
          const sampleResult = await queryCSVDatabase(dbPath, `SELECT * FROM "${dsTableName}" LIMIT 3`);
          if (sampleResult.success && sampleResult.rows && sampleResult.rows.length > 0) {
            const headers = dataSource.columns.map(c => c.name).join(' | ');
            const rows = sampleResult.rows.map(row => 
              dataSource.columns!.map(c => String(row[c.name] ?? 'NULL')).join(' | ')
            ).join('\n');
            sampleData = `\n\nSample Data (first ${sampleResult.rows.length} rows):\n${headers}\n${rows}`;
          }
        }
      } catch (e) {
        console.warn('Could not fetch sample data:', e);
      }
    }
    
    // Generate SQL using LLM
    const sql = await generateSQLWithLLM(query, dsTableName, schemaInfo + sampleData);
    
    return NextResponse.json({ sql });
    
  } catch (error: any) {
    console.error('Error generating SQL:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate SQL' },
      { status: 500 }
    );
  }
}

/**
 * Generate SQL using LLM
 */
async function generateSQLWithLLM(
  naturalQuery: string,
  tableName: string,
  schemaInfo: string
): Promise<string> {
  const systemPrompt = `You are a SQL expert. Generate SQLite-compatible SQL queries based on natural language questions.

IMPORTANT RULES:
1. Always use double quotes for table and column names: "table_name", "column_name"
2. Generate ONLY the SQL query, no explanations or markdown
3. Use SQLite syntax (e.g., use || for string concatenation, no ILIKE - use LIKE with LOWER())
4. For counting questions like "how many", use COUNT(*)
5. For filtering, use WHERE clause with appropriate conditions
6. Always add LIMIT 100 unless the query specifically asks for all results or is an aggregation
7. Look at the SAMPLE DATA to understand actual column values and data patterns
8. For text matching, use LOWER() for case-insensitive matching
9. Match column names EXACTLY as shown in the schema

Database Schema and Sample Data:
${schemaInfo}

Examples:
- "How many are from India?" → SELECT COUNT(*) as count FROM "${tableName}" WHERE LOWER("country") LIKE '%india%'
- "Show top 5 by sales" → SELECT * FROM "${tableName}" ORDER BY "sales" DESC LIMIT 5
- "What is the average age?" → SELECT AVG("age") as average_age FROM "${tableName}"
- "List all unique countries" → SELECT DISTINCT "country" FROM "${tableName}"
- "How many people?" → SELECT COUNT(*) as total FROM "${tableName}"`;

  const userPrompt = `Generate a SQL query for: "${naturalQuery}"

Look at the sample data to understand the actual values in the columns. Return ONLY the SQL query, nothing else.`;

  try {
    // Get available chat models
    const chatModels = await getAvailableChatModelProviders();
    
    // Find a working model - prefer ollama, then openai, then any available
    let model = null;
    const preferredProviders = ['ollama', 'openai', 'groq', 'anthropic', 'gemini'];
    
    for (const provider of preferredProviders) {
      if (chatModels[provider] && Object.keys(chatModels[provider]).length > 0) {
        const modelKey = Object.keys(chatModels[provider])[0];
        model = chatModels[provider][modelKey].model;
        break;
      }
    }
    
    // Fallback to any available model
    if (!model) {
      for (const provider in chatModels) {
        if (Object.keys(chatModels[provider]).length > 0) {
          const modelKey = Object.keys(chatModels[provider])[0];
          model = chatModels[provider][modelKey].model;
          break;
        }
      }
    }
    
    if (!model) {
      console.warn('No LLM model available, using fallback SQL generation');
      return generateBasicSQL(naturalQuery, tableName, schemaInfo);
    }
    
    const response = await model.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(userPrompt),
    ]);
    
    let sql = typeof response.content === 'string' 
      ? response.content 
      : JSON.stringify(response.content);
    
    // Clean up the response - remove markdown code blocks if present
    sql = sql.replace(/```sql\n?/gi, '').replace(/```\n?/g, '').trim();
    
    // Validate it looks like SQL
    if (!sql.toLowerCase().startsWith('select')) {
      console.warn('Invalid SQL generated, using fallback');
      return generateBasicSQL(naturalQuery, tableName, schemaInfo);
    }
    
    return sql;
  } catch (error: any) {
    console.error('LLM SQL generation failed:', error);
    // Fallback to basic generation
    return generateBasicSQL(naturalQuery, tableName, schemaInfo);
  }
}

/**
 * Fallback basic SQL generation
 */
function generateBasicSQL(query: string, tableName: string, schemaInfo: string): string {
  const lowerQuery = query.toLowerCase();
  const safeTableName = `"${tableName}"`;
  
  // Extract column names from schema
  const columnMatches = schemaInfo.match(/- (\w+) \(/g) || [];
  const columns = columnMatches.map(m => m.replace('- ', '').replace(' (', ''));
  
  // Check for count/how many
  if (lowerQuery.includes('how many') || lowerQuery.includes('count')) {
    // Look for a filter condition
    const countryWords = ['india', 'usa', 'uk', 'china', 'japan', 'germany', 'france', 'canada', 'australia'];
    for (const country of countryWords) {
      if (lowerQuery.includes(country)) {
        // Find a country-like column
        const countryCol = columns.find(c => 
          c.toLowerCase().includes('country') || 
          c.toLowerCase().includes('nation') ||
          c.toLowerCase().includes('location')
        ) || columns[0];
        return `SELECT COUNT(*) as count FROM ${safeTableName} WHERE LOWER("${countryCol}") LIKE '%${country}%'`;
      }
    }
    return `SELECT COUNT(*) as count FROM ${safeTableName}`;
  }
  
  // Check for average
  if (lowerQuery.includes('average') || lowerQuery.includes('avg')) {
    const numCol = columns.find(c => 
      c.toLowerCase().includes('age') || 
      c.toLowerCase().includes('salary') ||
      c.toLowerCase().includes('amount') ||
      c.toLowerCase().includes('price')
    );
    if (numCol) {
      return `SELECT AVG("${numCol}") as average FROM ${safeTableName}`;
    }
  }
  
  // Check for sum/total
  if (lowerQuery.includes('sum') || lowerQuery.includes('total')) {
    const numCol = columns.find(c => 
      c.toLowerCase().includes('amount') || 
      c.toLowerCase().includes('salary') ||
      c.toLowerCase().includes('price') ||
      c.toLowerCase().includes('value')
    );
    if (numCol) {
      return `SELECT SUM("${numCol}") as total FROM ${safeTableName}`;
    }
  }
  
  // Default
  return `SELECT * FROM ${safeTableName} LIMIT 20`;
}
