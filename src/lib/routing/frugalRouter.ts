import fs from 'fs';
import { BaseMessage } from '@langchain/core/messages';
import { Embeddings } from '@langchain/core/embeddings';
import computeSimilarity from '../utils/computeSimilarity';

export type RoutingPath = 'canned' | 'cache' | 'rag-tier1' | 'rag-tier2';

export interface RouterDecision {
  path: RoutingPath;
  confidence: number;
  reasoning?: string;
}

export interface RouterExample {
  text: string;
  tier: 'nano' | 'micro' | 'full';
  embedding?: number[];
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

/** Tier → RoutingPath mapping */
const TIER_TO_PATH: Record<RouterExample['tier'], RoutingPath> = {
  nano: 'cache',
  micro: 'rag-tier1',
  full: 'rag-tier2',
};

/** Escalation order */
const TIER_ESCALATION: Record<RouterExample['tier'], RouterExample['tier']> = {
  nano: 'micro',
  micro: 'full',
  full: 'full',
};

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
  private examples: RouterExample[] = [];
  private embeddings: Embeddings;
  confidenceThreshold: number;
  private examplesPath: string;

  constructor(embeddings: Embeddings, examplesPath?: string) {
    this.embeddings = embeddings;
    this.confidenceThreshold = 0.70;
    this.examplesPath = examplesPath ?? './config/router-examples.json';
  }

  /**
   * Load examples from JSON and compute embeddings for each entry.
   * Falls back to heuristic (empty examples) if file is missing or malformed.
   */
  async loadExamples(): Promise<void> {
    try {
      const raw = fs.readFileSync(this.examplesPath, 'utf8');
      const parsed: unknown = JSON.parse(raw);

      if (!Array.isArray(parsed)) {
        console.warn('[FrugalRouter] router-examples.json is not an array — falling back to heuristic');
        return;
      }

      const valid: RouterExample[] = parsed.filter(
        (e): e is RouterExample =>
          typeof e === 'object' &&
          e !== null &&
          typeof (e as RouterExample).text === 'string' &&
          ['nano', 'micro', 'full'].includes((e as RouterExample).tier),
      );

      if (valid.length === 0) {
        console.warn('[FrugalRouter] No valid examples found in router-examples.json — falling back to heuristic');
        return;
      }

      // Compute embeddings for all examples
      const texts = valid.map((e) => e.text);
      const embeddings = await this.embeddings.embedDocuments(texts);

      this.examples = valid.map((e, i) => ({ ...e, embedding: embeddings[i] }));
    } catch (err) {
      console.warn(`[FrugalRouter] Failed to load router-examples.json — falling back to heuristic: ${err}`);
    }
  }

  /**
   * Route a query to the appropriate processing path.
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

    // 2. Fall back to heuristic if not enough examples
    if (this.examples.length < 3) {
      return this.classifyByHeuristic(trimmedQuery);
    }

    // 3. Embed query and classify by similarity
    const [queryEmbedding] = await this.embeddings.embedDocuments([trimmedQuery]);
    return this.classifyBySimilarity(queryEmbedding);
  }

  /**
   * Classify by cosine similarity against loaded examples.
   * Escalates one tier if best similarity < confidenceThreshold.
   */
  classifyBySimilarity(queryEmbedding: number[]): RouterDecision {
    let bestSimilarity = -Infinity;
    let bestTier: RouterExample['tier'] = 'nano';

    for (const example of this.examples) {
      if (!example.embedding) continue;
      const sim = computeSimilarity(queryEmbedding, example.embedding);
      if (sim > bestSimilarity) {
        bestSimilarity = sim;
        bestTier = example.tier;
      }
    }

    const confidence = bestSimilarity;

    if (confidence < this.confidenceThreshold) {
      const escalatedTier = TIER_ESCALATION[bestTier];
      return {
        path: TIER_TO_PATH[escalatedTier],
        confidence,
        reasoning: `Low confidence (${confidence.toFixed(3)}) — escalated from ${bestTier} to ${escalatedTier}`,
      };
    }

    return {
      path: TIER_TO_PATH[bestTier],
      confidence,
      reasoning: `Similarity match to ${bestTier} tier (confidence: ${confidence.toFixed(3)})`,
    };
  }

  /**
   * Classify using the original regex/length heuristic.
   * Used when fewer than 3 examples are loaded.
   */
  classifyByHeuristic(query: string): RouterDecision {
    const complexity = this.classifyComplexity(query);

    if (complexity === 'high') {
      return {
        path: 'rag-tier2',
        confidence: 0.85,
        reasoning: 'Complex reasoning or analysis required (heuristic)',
      };
    }

    return {
      path: 'cache',
      confidence: 0.9,
      reasoning: 'Simple or medium complexity query (heuristic)',
    };
  }

  /**
   * Check if query matches a canned response pattern.
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
   * Classify query complexity using regex and length signals.
   */
  private classifyComplexity(query: string): 'simple' | 'medium' | 'high' {
    const hasComplexPattern = COMPLEX_PATTERNS.some((pattern) => pattern.test(query));
    if (hasComplexPattern) return 'high';

    const hasSimplePattern = SIMPLE_PATTERNS.some((pattern) => pattern.test(query));
    if (hasSimplePattern) return 'simple';

    const wordCount = query.split(/\s+/).length;
    const hasMultipleSentences = query.split(/[.!?]+/).length > 2;

    if (wordCount > 20 || hasMultipleSentences) return 'high';

    return 'medium';
  }

  /**
   * Get the canned response for a query (if applicable).
   */
  getCannedResponse(query: string): string | null {
    return this.checkCannedResponses(query.trim());
  }
}

export default FrugalRouter;
