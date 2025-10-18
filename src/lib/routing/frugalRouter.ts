import { BaseMessage } from '@langchain/core/messages';

export type RoutingPath = 'canned' | 'cache' | 'rag-tier1' | 'rag-tier2';

export interface RouterDecision {
  path: RoutingPath;
  confidence: number;
  reasoning?: string;
}

interface CannedResponse {
  pattern: RegExp;
  response: string;
}

const CANNED_RESPONSES: CannedResponse[] = [
  {
    pattern: /^(hi|hello|hey|greetings|good morning|good afternoon|good evening)[\s!.?]*$/i,
    response: "Hello! I'm your AI search assistant. Ask me anything and I'll search for answers with citations.",
  },
  {
    pattern: /^(what can you do|help|how does this work|what are you|who are you)[\s!.?]*$/i,
    response: "I can search the web and your documents to answer questions. Just type your question and I'll provide sourced answers with citations. I use intelligent routing to give you fast, cost-effective responses.",
  },
  {
    pattern: /^(thanks|thank you|thx)[\s!.?]*$/i,
    response: "You're welcome! Feel free to ask me anything else.",
  },
];

// Patterns that indicate complex reasoning requirements
const COMPLEX_PATTERNS = [
  /\b(explain|analyze|compare|contrast|evaluate|implications|consequences)\b/i,
  /\b(why|how does|what are the reasons|what causes)\b.*\b(work|happen|occur)\b/i,
  /\b(relationship between|connection between|difference between)\b/i,
  /\b(pros and cons|advantages and disadvantages)\b/i,
];

// Patterns that indicate simple factual queries
const SIMPLE_PATTERNS = [
  /^(what is|who is|when is|where is|define)\b/i,
  /^(list|name|tell me)\b/i,
  /\b(capital|population|founded|born|died)\b/i,
];

/**
 * FrugalRouter - Intelligent query routing to minimize costs
 * 
 * Routes queries to the most cost-effective processing path:
 * - Canned responses for greetings/meta queries (near-zero cost)
 * - Cache for repeated/similar queries (low cost)
 * - Tier 1 model for simple knowledge queries (medium cost)
 * - Tier 2 model for complex reasoning (high cost)
 */
export class FrugalRouter {
  /**
   * Route a query to the appropriate processing path
   */
  async route(query: string, history: BaseMessage[]): Promise<RouterDecision> {
    const trimmedQuery = query.trim();
    
    // 1. Check for canned responses (greetings, meta queries)
    const cannedResponse = this.checkCannedResponses(trimmedQuery);
    if (cannedResponse) {
      return {
        path: 'canned',
        confidence: 1.0,
        reasoning: 'Simple greeting or meta query',
      };
    }
    
    // 2. Check query complexity
    const complexity = this.classifyComplexity(trimmedQuery);
    
    // 3. Route based on complexity
    if (complexity === 'high') {
      return {
        path: 'rag-tier2',
        confidence: 0.85,
        reasoning: 'Complex reasoning or analysis required',
      };
    }
    
    // 4. Default to cache check + tier1 for simple/medium queries
    return {
      path: 'cache',
      confidence: 0.9,
      reasoning: 'Simple or medium complexity query',
    };
  }
  
  /**
   * Check if query matches a canned response pattern
   */
  private checkCannedResponses(query: string): string | null {
    for (const { pattern, response } of CANNED_RESPONSES) {
      if (pattern.test(query)) {
        return response;
      }
    }
    return null;
  }
  
  /**
   * Classify query complexity
   */
  private classifyComplexity(query: string): 'simple' | 'medium' | 'high' {
    // Check for complex patterns
    const hasComplexPattern = COMPLEX_PATTERNS.some(pattern => pattern.test(query));
    if (hasComplexPattern) {
      return 'high';
    }
    
    // Check for simple patterns
    const hasSimplePattern = SIMPLE_PATTERNS.some(pattern => pattern.test(query));
    if (hasSimplePattern) {
      return 'simple';
    }
    
    // Check query length and structure
    const wordCount = query.split(/\s+/).length;
    const hasMultipleSentences = query.split(/[.!?]+/).length > 2;
    
    if (wordCount > 20 || hasMultipleSentences) {
      return 'high';
    }
    
    // Default to medium complexity
    return 'medium';
  }
  
  /**
   * Get the canned response for a query (if applicable)
   */
  getCannedResponse(query: string): string | null {
    return this.checkCannedResponses(query.trim());
  }
}

export default FrugalRouter;
