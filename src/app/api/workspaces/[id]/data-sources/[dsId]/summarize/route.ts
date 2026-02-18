import { NextRequest, NextResponse } from 'next/server';
import { getAvailableChatModelProviders } from '@/lib/providers';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string; dsId: string }> }
) {
  try {
    const body = await request.json();
    const { question, sqlQuery, columns, rows, totalRows, hasMore } = body;
    
    if (!rows || rows.length === 0) {
      return NextResponse.json({ 
        summary: 'No results found.',
        suggestedQueries: question ? [
          `Try: "Show all data from the table"`,
          `Try: "What columns are available?"`,
        ] : []
      });
    }
    
    // Generate summary using LLM
    const result = await generateSummary(question, sqlQuery, columns, rows, totalRows, hasMore);
    
    return NextResponse.json(result);
    
  } catch (error: any) {
    console.error('Error summarizing results:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to summarize results' },
      { status: 500 }
    );
  }
}

async function generateSummary(
  question: string,
  sqlQuery: string,
  columns: string[],
  rows: any[],
  totalRows: number,
  hasMore: boolean
): Promise<{ summary: string; suggestedQueries?: string[] }> {
  // Format data for the LLM
  const dataPreview = rows.slice(0, 20).map(row => {
    return columns.map(col => `${col}: ${row[col]}`).join(', ');
  }).join('\n');
  
  const systemPrompt = `You are a data analyst assistant. Summarize query results and help users explore their data.

RULES:
1. Be direct and specific with numbers and findings
2. If it's a count query (single row with count/total), state the count clearly
3. If it's a list, summarize key patterns or highlights
4. Keep the summary to 2-3 sentences max
5. Use natural language, not technical jargon
6. If there are more rows than shown, mention that the summary is based on a sample
7. Answer the original question directly

IMPORTANT - MISMATCH DETECTION:
- Compare the user's QUESTION with the SQL QUERY and RESULTS
- If the results don't seem to answer the question (e.g., user asked "how many" but got a list, or asked about specific data but got generic results), note this
- If there's a mismatch, suggest 1-2 better queries the user could ask

OUTPUT FORMAT (JSON):
{
  "summary": "Your natural language summary here",
  "suggestedQueries": ["suggested query 1", "suggested query 2"] // Only include if results don't match the question well
}`;

  const userPrompt = `User's Question: "${question || 'No question provided'}"

SQL Query Executed: ${sqlQuery || 'Not provided'}

Data Results (${rows.length} rows shown${hasMore ? `, ${totalRows} total` : ''}):
Columns: ${columns.join(', ')}

${dataPreview}

Analyze if the results properly answer the user's question. Provide a summary and suggest better queries if needed.${hasMore ? ' Note: this is a sample of the full dataset.' : ''}

Respond with valid JSON only.`;

  try {
    // Get available chat models
    const chatModels = await getAvailableChatModelProviders();
    
    // Find a working model
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
      return { summary: generateBasicSummary(columns, rows, totalRows, hasMore) };
    }
    
    const response = await model.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(userPrompt),
    ]);
    
    let content = typeof response.content === 'string' 
      ? response.content 
      : JSON.stringify(response.content);
    
    // Try to parse JSON response
    try {
      // Clean up the response - remove markdown code blocks if present
      content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(content);
      return {
        summary: parsed.summary || content,
        suggestedQueries: parsed.suggestedQueries || undefined,
      };
    } catch {
      // If not valid JSON, return as plain summary
      return { summary: content.trim() };
    }
  } catch (error: any) {
    console.error('LLM summarization failed:', error);
    return { summary: generateBasicSummary(columns, rows, totalRows, hasMore) };
  }
}

function generateBasicSummary(
  columns: string[],
  rows: any[],
  totalRows: number,
  hasMore: boolean
): string {
  if (rows.length === 0) {
    return 'No results found for your query.';
  }
  
  // Check if it's a count/aggregation result
  if (rows.length === 1 && columns.length <= 3) {
    const values = columns.map(col => {
      const val = rows[0][col];
      const colLower = col.toLowerCase();
      if (colLower.includes('count') || colLower.includes('total')) {
        return `The count is ${val}.`;
      }
      if (colLower.includes('avg') || colLower.includes('average')) {
        return `The average is ${typeof val === 'number' ? val.toFixed(2) : val}.`;
      }
      if (colLower.includes('sum')) {
        return `The sum is ${val}.`;
      }
      return `${col}: ${val}`;
    }).join(' ');
    return values;
  }
  
  // For multiple rows
  let summary = `Found ${totalRows} result${totalRows !== 1 ? 's' : ''}.`;
  
  if (hasMore) {
    summary += ` Showing analysis based on first ${rows.length} rows.`;
  }
  
  return summary;
}
