/**
 * Context Payload - Stateful conversation context that travels with each session
 * 
 * This is the core data structure that maintains conversation state across
 * multiple turns, enabling intelligent context management and cost optimization.
 */

export interface ExtractedEntity {
  type: 'product' | 'price' | 'location' | 'date' | 'person' | 'organization' | 'other';
  value: string;
  confidence: number;
  firstMentioned: number; // Turn number
  lastMentioned: number;
}

export interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  turnNumber: number;
  tokenCount?: number;
}

export interface RoutingHistory {
  turnNumber: number;
  path: 'canned' | 'cache' | 'rag-tier1' | 'rag-tier2';
  confidence: number;
  latencyMs: number;
  cacheHit: boolean;
}

export interface ContextPayload {
  // Session identification
  sessionId: string;
  chatId: string;
  
  // Conversation state
  originalQuery: string; // The very first query that started this conversation
  conversationHistory: ConversationTurn[];
  conversationSummary: string; // Progressive summary updated every 3-5 turns
  lastSummarizedTurn: number; // Track when we last summarized
  
  // Extracted context
  extractedEntities: Map<string, ExtractedEntity>;
  currentTopic: string;
  topicConfidence: number;
  
  // RAG context
  retrievedContext: string[];
  lastRAGQuery: string;
  
  // Routing and optimization
  routingHistory: RoutingHistory[];
  classifiedIntent: string;
  
  // Metadata
  createdAt: number;
  updatedAt: number;
  turnCount: number;
  
  // Cost tracking
  totalTokensUsed: number;
  estimatedCost: number;
}

/**
 * Create a new context payload for a session
 */
export function createContextPayload(
  sessionId: string,
  chatId: string,
  initialQuery: string
): ContextPayload {
  return {
    sessionId,
    chatId,
    originalQuery: initialQuery,
    conversationHistory: [],
    conversationSummary: '',
    lastSummarizedTurn: 0,
    extractedEntities: new Map(),
    currentTopic: '',
    topicConfidence: 0,
    retrievedContext: [],
    lastRAGQuery: '',
    routingHistory: [],
    classifiedIntent: '',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    turnCount: 0,
    totalTokensUsed: 0,
    estimatedCost: 0,
  };
}

/**
 * Serialize context payload for storage
 */
export function serializeContextPayload(payload: ContextPayload): string {
  return JSON.stringify({
    ...payload,
    extractedEntities: Array.from(payload.extractedEntities.entries()),
  });
}

/**
 * Deserialize context payload from storage
 */
export function deserializeContextPayload(data: string): ContextPayload {
  const parsed = JSON.parse(data);
  return {
    ...parsed,
    extractedEntities: new Map(parsed.extractedEntities),
  };
}

/**
 * Get a compact context window for LLM prompts
 * Returns only the most relevant context to minimize token usage
 */
export function getCompactContext(payload: ContextPayload, maxTurns: number = 2): {
  summary: string;
  recentHistory: ConversationTurn[];
  entities: string;
  topic: string;
} {
  // Get the last N turns
  const recentHistory = payload.conversationHistory.slice(-maxTurns);
  
  // Format entities as a concise string
  const entities = Array.from(payload.extractedEntities.values())
    .filter(e => e.confidence > 0.7)
    .map(e => `${e.type}: ${e.value}`)
    .join(', ');
  
  return {
    summary: payload.conversationSummary,
    recentHistory,
    entities,
    topic: payload.currentTopic,
  };
}

/**
 * Check if conversation needs summarization
 */
export function needsSummarization(payload: ContextPayload, threshold: number = 5): boolean {
  const turnsSinceLastSummary = payload.turnCount - payload.lastSummarizedTurn;
  return turnsSinceLastSummary >= threshold;
}

/**
 * Estimate token count for a string (rough approximation)
 * Real implementation should use tiktoken or similar
 */
export function estimateTokenCount(text: string): number {
  // Rough estimate: ~4 characters per token for English
  // This should be replaced with actual tokenizer
  return Math.ceil(text.length / 4);
}

/**
 * Calculate cost based on token usage and model tier
 */
export function calculateCost(
  inputTokens: number,
  outputTokens: number,
  modelTier: 'tier1' | 'tier2'
): number {
  // Cost per 1M tokens (adjust based on actual provider pricing)
  // Values are in dollars per 1M tokens
  const TIER1_INPUT_COST = 0.15; // $0.15 per 1M input tokens
  const TIER1_OUTPUT_COST = 0.60; // $0.60 per 1M output tokens
  const TIER2_INPUT_COST = 0.30; // $0.30 per 1M input tokens
  const TIER2_OUTPUT_COST = 1.50; // $1.50 per 1M output tokens
  
  const inputCost = modelTier === 'tier1' ? TIER1_INPUT_COST : TIER2_INPUT_COST;
  const outputCost = modelTier === 'tier1' ? TIER1_OUTPUT_COST : TIER2_OUTPUT_COST;
  
  return (inputTokens / 1_000_000) * inputCost + (outputTokens / 1_000_000) * outputCost;
}
