/**
 * Conversation Summarizer - Creates progressive summaries of conversations
 * 
 * Uses a small, fast model to summarize conversation history, reducing
 * token costs for long conversations while maintaining context.
 */

import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { ConversationTurn } from './contextPayload';

/**
 * Summarize conversation history
 */
export async function summarizeConversation(
  history: ConversationTurn[],
  existingSummary: string,
  llm: BaseChatModel
): Promise<string> {
  if (history.length === 0) {
    return existingSummary;
  }
  
  // Format the conversation history
  const formattedHistory = history
    .map(turn => `${turn.role === 'user' ? 'User' : 'Assistant'}: ${turn.content}`)
    .join('\n\n');
  
  // Create the summarization prompt
  const prompt = createSummarizationPrompt(existingSummary, formattedHistory);
  
  try {
    // Use the LLM to create/update the summary
    const response = await llm.invoke(prompt);
    
    // Check for token usage information from Ollama
    if (response.response_metadata) {
      console.log('[Summarizer] Response metadata:', JSON.stringify(response.response_metadata, null, 2));
      if (response.response_metadata.prompt_eval_count !== undefined) {
        console.log('[Summarizer] Input tokens (prompt_eval_count):', response.response_metadata.prompt_eval_count);
      }
      if (response.response_metadata.eval_count !== undefined) {
        console.log('[Summarizer] Output tokens (eval_count):', response.response_metadata.eval_count);
      }
    }
    if (response.usage_metadata) {
      console.log('[Summarizer] Usage metadata:', JSON.stringify(response.usage_metadata, null, 2));
    }
    // Log all available properties for debugging
    console.log('[Summarizer] Response object keys:', Object.keys(response));
    console.log('[Summarizer] Response type:', response.constructor.name);
    
    const summary = typeof response.content === 'string' 
      ? response.content 
      : response.content.toString();
    
    console.log('[Summarizer] Created conversation summary:', summary.substring(0, 100) + '...');
    return summary.trim();
  } catch (error) {
    console.error('[Summarizer] Error creating summary:', error);
    // Fallback: return existing summary or create a basic one
    return existingSummary || createFallbackSummary(history);
  }
}

/**
 * Create the summarization prompt
 */
function createSummarizationPrompt(existingSummary: string, newDialogue: string): string {
  if (!existingSummary) {
    // First summary
    return `You are a conversation summarizer. Read the following dialogue and create a concise summary that captures the key topics, questions, and information discussed. Focus on facts and context that would be useful for continuing the conversation.

Dialogue:
${newDialogue}

Summary:`;
  } else {
    // Update existing summary
    return `You are a conversation summarizer. You have an existing summary of a conversation, and new dialogue has occurred. Update the summary to include the new information while keeping it concise and focused on the most relevant context.

Existing Summary:
${existingSummary}

New Dialogue:
${newDialogue}

Updated Summary:`;
  }
}

/**
 * Create a fallback summary if LLM summarization fails
 */
function createFallbackSummary(history: ConversationTurn[]): string {
  if (history.length === 0) {
    return 'No conversation history.';
  }
  
  // Extract key information from the conversation
  const userQueries = history
    .filter(turn => turn.role === 'user')
    .map(turn => turn.content);
  
  const topics = extractTopics(userQueries);
  
  return `User has asked about: ${topics.join(', ')}. Conversation includes ${history.length} turns.`;
}

/**
 * Extract topics from user queries (simple keyword extraction)
 */
function extractTopics(queries: string[]): string[] {
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
    'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'can', 'what', 'how', 'when', 'where', 'why',
    'who', 'which', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she',
    'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his',
    'her', 'its', 'our', 'their',
  ]);
  
  const wordFrequency = new Map<string, number>();
  
  for (const query of queries) {
    const words = query
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3 && !stopWords.has(word));
    
    for (const word of words) {
      wordFrequency.set(word, (wordFrequency.get(word) || 0) + 1);
    }
  }
  
  // Get top 5 most frequent words
  return Array.from(wordFrequency.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word);
}

/**
 * Determine if a summary needs updating based on new content
 */
export function shouldUpdateSummary(
  turnsSinceLastSummary: number,
  threshold: number = 5
): boolean {
  return turnsSinceLastSummary >= threshold;
}

/**
 * Estimate token savings from using summary vs full history
 */
export function estimateSummarySavings(
  fullHistoryLength: number,
  summaryLength: number,
  recentTurnsCount: number = 2
): {
  fullHistoryTokens: number;
  compactContextTokens: number;
  tokensSaved: number;
  savingsPercent: number;
} {
  // Rough estimate: 4 chars per token
  const fullHistoryTokens = Math.ceil(fullHistoryLength / 4);
  const summaryTokens = Math.ceil(summaryLength / 4);
  
  // Compact context = summary + last N turns (estimated)
  const recentTurnsTokens = Math.ceil((fullHistoryLength / 10) * recentTurnsCount);
  const compactContextTokens = summaryTokens + recentTurnsTokens;
  
  const tokensSaved = fullHistoryTokens - compactContextTokens;
  const savingsPercent = (tokensSaved / fullHistoryTokens) * 100;
  
  return {
    fullHistoryTokens,
    compactContextTokens,
    tokensSaved,
    savingsPercent: Math.max(0, savingsPercent),
  };
}
