/**
 * Guardrails Types - TypeScript interfaces for guardrails system
 */

export enum GuardrailViolationCode {
  TOKEN_LIMIT_EXCEEDED = 'TOKEN_LIMIT_EXCEEDED',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  BANNED_TOPIC = 'BANNED_TOPIC',
  BANNED_KEYWORD = 'BANNED_KEYWORD',
  CUSTOM_RULE_VIOLATION = 'CUSTOM_RULE_VIOLATION',
  CONTENT_MODERATION = 'CONTENT_MODERATION',
  ORGANIZATION_RELEVANCE = 'ORGANIZATION_RELEVANCE',
}

export interface GuardrailResult {
  allowed: boolean;
  code?: GuardrailViolationCode;
  reason: string;
  sanitized?: string;
  filtered?: string;
  metadata?: Record<string, any>;
  violations?: GuardrailViolation[];
}

export interface GuardrailViolation {
  code: GuardrailViolationCode;
  reason: string;
  metadata?: Record<string, any>;
}

export interface StaticGuardrailsConfig {
  tokenLimits: {
    enabled: boolean;
    maxInputTokens: number;
    maxContextTokens: {
      tier1: number;
      tier2: number;
    };
  };
  rateLimiting: {
    enabled: boolean;
    requestsPerMinute: number;
    requestsPerHour: number;
    burstLimit: number;
    burstWindowSeconds: number;
  };
}

export interface TopicBanningConfig {
  enabled: boolean;
  topics: string[];
  method: 'embedding' | 'llm';
  threshold: number; // 0-1 for embedding similarity
  confidenceThreshold?: number; // 0-1 for LLM confidence
  embeddingModel?: {
    provider?: string; // e.g., 'ollama', 'openai'
    model?: string; // e.g., 'bge-large', 'text-embedding-3-large'
  }; // Optional: specify embedding model for guardrails (uses best available if not specified)
}

export interface KeywordBanningConfig {
  enabled: boolean;
  keywords: string[];
  matchMode: 'exact' | 'contains' | 'regex';
  caseSensitive: boolean;
}

export interface CustomPromptRule {
  id: string;
  name: string;
  description: string;
  condition: {
    type: 'contains' | 'matches' | 'embedding-similarity';
    value: string | number;
  };
  action: {
    type: 'block' | 'modify' | 'add-context';
    prompt?: string;
  };
  enabled: boolean;
}

export interface CustomPromptsConfig {
  enabled: boolean;
  rules: CustomPromptRule[];
}

export interface ContentModerationConfig {
  enabled: boolean;
  provider: 'openai' | 'llm' | 'perspective';
  strictMode: boolean;
  threshold?: number;
}

export interface OrganizationRelevanceConfig {
  enabled: boolean;
  topics: string[];
  threshold: number;
  mode: 'allow-only' | 'block-only';
}

export interface DynamicGuardrailsConfig {
  topicBanning: TopicBanningConfig;
  keywordBanning: KeywordBanningConfig;
  customPrompts: CustomPromptsConfig;
  contentModeration: ContentModerationConfig;
  organizationRelevance: OrganizationRelevanceConfig;
}

export interface GuardrailsConfig {
  static: StaticGuardrailsConfig;
  dynamic: DynamicGuardrailsConfig;
  version: string;
  lastUpdated: number;
}

export function getDefaultGuardrailsConfig(): GuardrailsConfig {
  return {
    static: {
      tokenLimits: {
        enabled: true,
        maxInputTokens: 2000,
        maxContextTokens: {
          tier1: 8000,
          tier2: 16000,
        },
      },
      rateLimiting: {
        enabled: true,
        requestsPerMinute: 60,
        requestsPerHour: 1000,
        burstLimit: 5,
        burstWindowSeconds: 10,
      },
    },
    dynamic: {
      topicBanning: {
        enabled: false,
        topics: [],
        method: 'embedding',
        threshold: 0.75,
        confidenceThreshold: 0.7,
        embeddingModel: undefined, // Use best available if not specified
      },
      keywordBanning: {
        enabled: false,
        keywords: [],
        matchMode: 'contains',
        caseSensitive: false,
      },
      customPrompts: {
        enabled: false,
        rules: [],
      },
      contentModeration: {
        enabled: false,
        provider: 'openai',
        strictMode: false,
        threshold: 0.5,
      },
      organizationRelevance: {
        enabled: false,
        topics: [],
        threshold: 0.70,
        mode: 'allow-only',
      },
    },
    version: '1.0.0',
    lastUpdated: Date.now(),
  };
}
