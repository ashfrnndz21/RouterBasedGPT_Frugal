/**
 * Token Limiter - Enforces token limits on input and context
 */

import { BaseMessage } from '@langchain/core/messages';
import { GuardrailResult, GuardrailViolationCode } from '../types';

export class TokenLimiter {
  private maxInputTokens: number;
  private maxContextTokens: { tier1: number; tier2: number };

  constructor(
    maxInputTokens: number,
    maxContextTokens: { tier1: number; tier2: number }
  ) {
    this.maxInputTokens = maxInputTokens;
    this.maxContextTokens = maxContextTokens;
  }

  /**
   * Estimate token count (rough approximation: ~4 characters per token)
   * In production, use tiktoken or similar for accurate counting
   */
  countTokens(text: string): number {
    // Rough estimate: ~4 characters per token for English
    return Math.ceil(text.length / 4);
  }

  /**
   * Check if input query exceeds token limit
   */
  checkInput(query: string): GuardrailResult {
    const tokens = this.countTokens(query);
    
    if (tokens > this.maxInputTokens) {
      return {
        allowed: false,
        code: GuardrailViolationCode.TOKEN_LIMIT_EXCEEDED,
        reason: `Query too long. Maximum ${this.maxInputTokens} tokens allowed, got ${tokens} tokens (approximately ${Math.ceil(query.length / 4)} characters). Please shorten your query.`,
        metadata: {
          tokens,
          limit: this.maxInputTokens,
          characters: query.length,
        },
      };
    }

    return {
      allowed: true,
      reason: 'OK',
      metadata: { tokens },
    };
  }

  /**
   * Check if conversation history exceeds context limit
   */
  checkContext(
    history: BaseMessage[],
    tier: 'tier1' | 'tier2'
  ): GuardrailResult {
    const historyTokens = history.reduce(
      (sum, msg) => sum + this.countTokens(msg.content),
      0
    );
    const limit = this.maxContextTokens[tier];

    if (historyTokens > limit) {
      return {
        allowed: false,
        code: GuardrailViolationCode.TOKEN_LIMIT_EXCEEDED,
        reason: `Conversation history too long. Maximum ${limit} tokens allowed for ${tier}, got ${historyTokens} tokens. Please start a new conversation or reduce history.`,
        metadata: {
          tokens: historyTokens,
          limit,
          tier,
        },
      };
    }

    return {
      allowed: true,
      reason: 'OK',
      metadata: { tokens: historyTokens, limit, tier },
    };
  }
}
