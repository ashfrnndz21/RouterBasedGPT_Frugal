/**
 * Guardrails - Main orchestrator for all guardrail checks
 */

import { BaseMessage } from '@langchain/core/messages';
import { Embeddings } from '@langchain/core/embeddings';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { TokenLimiter } from './static/tokenLimiter';
import { RateLimiter } from './static/rateLimiter';
import { TopicBanner } from './dynamic/topicBanner';
import { KeywordBanner } from './dynamic/keywordBanner';
import {
  GuardrailResult,
  GuardrailViolationCode,
  GuardrailsConfig,
} from './types';

export class Guardrails {
  private tokenLimiter: TokenLimiter | null = null;
  private rateLimiter: RateLimiter | null = null;
  private topicBanner: TopicBanner | null = null;
  private keywordBanner: KeywordBanner | null = null;
  private config: GuardrailsConfig;
  private embeddings?: Embeddings;
  private llm?: BaseChatModel;

  constructor(
    config: GuardrailsConfig,
    embeddings?: Embeddings,
    llm?: BaseChatModel
  ) {
    this.config = config;
    this.embeddings = embeddings;
    this.llm = llm;
    this.initialize();
  }

  /**
   * Initialize guardrails based on configuration
   */
  private initialize(): void {
    // Static guardrails
    if (this.config.static.tokenLimits.enabled) {
      this.tokenLimiter = new TokenLimiter(
        this.config.static.tokenLimits.maxInputTokens,
        this.config.static.tokenLimits.maxContextTokens
      );
    }

    if (this.config.static.rateLimiting.enabled) {
      this.rateLimiter = new RateLimiter(
        this.config.static.rateLimiting.requestsPerMinute,
        this.config.static.rateLimiting.requestsPerHour,
        this.config.static.rateLimiting.burstLimit,
        this.config.static.rateLimiting.burstWindowSeconds
      );
    }

    // Dynamic guardrails
    if (this.config.dynamic.topicBanning.enabled && this.embeddings) {
      this.topicBanner = new TopicBanner(
        this.embeddings,
        this.config.dynamic.topicBanning,
        this.llm
      );
    }

    if (this.config.dynamic.keywordBanning.enabled) {
      this.keywordBanner = new KeywordBanner(this.config.dynamic.keywordBanning);
    }
  }

  /**
   * Update configuration and re-initialize
   */
  async updateConfig(config: GuardrailsConfig): Promise<void> {
    this.config = config;
    this.initialize();
    
    // Update dynamic guardrails if they exist
    if (this.topicBanner) {
      await this.topicBanner.updateConfig(config.dynamic.topicBanning);
    }
    if (this.keywordBanner) {
      this.keywordBanner.updateConfig(config.dynamic.keywordBanning);
    }
  }

  /**
   * Check all guardrails for a query
   */
  async check(
    query: string,
    history: BaseMessage[],
    tier: 'tier1' | 'tier2',
    identifier: string // IP, chatId, or user ID for rate limiting
  ): Promise<GuardrailResult> {
    const violations: Array<{ code: GuardrailViolationCode; reason: string; metadata?: any }> = [];

    // 1. Rate limiting (fastest check, do first)
    if (this.rateLimiter) {
      const rateCheck = this.rateLimiter.check(identifier);
      if (!rateCheck.allowed) {
        violations.push({
          code: rateCheck.code!,
          reason: rateCheck.reason,
          metadata: rateCheck.metadata,
        });
        // Rate limit violations are critical, return immediately
        return {
          allowed: false,
          code: rateCheck.code,
          reason: rateCheck.reason,
          violations,
          metadata: rateCheck.metadata,
        };
      }
    }

    // 2. Token limits
    if (this.tokenLimiter) {
      const inputCheck = this.tokenLimiter.checkInput(query);
      if (!inputCheck.allowed) {
        violations.push({
          code: inputCheck.code!,
          reason: inputCheck.reason,
          metadata: inputCheck.metadata,
        });
        return {
          allowed: false,
          code: inputCheck.code,
          reason: inputCheck.reason,
          violations,
          metadata: inputCheck.metadata,
        };
      }

      const contextCheck = this.tokenLimiter.checkContext(history, tier);
      if (!contextCheck.allowed) {
        violations.push({
          code: contextCheck.code!,
          reason: contextCheck.reason,
          metadata: contextCheck.metadata,
        });
        return {
          allowed: false,
          code: contextCheck.code,
          reason: contextCheck.reason,
          violations,
          metadata: contextCheck.metadata,
        };
      }
    }

    // 3. Keyword banning (fast, do before embeddings)
    if (this.keywordBanner) {
      const keywordCheck = this.keywordBanner.check(query);
      if (!keywordCheck.allowed) {
        violations.push({
          code: keywordCheck.code!,
          reason: keywordCheck.reason,
          metadata: keywordCheck.metadata,
        });
        return {
          allowed: false,
          code: keywordCheck.code,
          reason: keywordCheck.reason,
          violations,
          metadata: keywordCheck.metadata,
        };
      }
    }

    // 4. Topic banning (requires embeddings, slower)
    if (this.topicBanner) {
      try {
        console.log('[Guardrails] Running topic banner check...');
        const topicCheck = await this.topicBanner.check(query);
        console.log(`[Guardrails] Topic banner result: allowed=${topicCheck.allowed}, reason="${topicCheck.reason}"`);
        if (!topicCheck.allowed) {
          violations.push({
            code: topicCheck.code!,
            reason: topicCheck.reason,
            metadata: topicCheck.metadata,
          });
          console.log('[Guardrails] Query BLOCKED by topic banner');
          return {
            allowed: false,
            code: topicCheck.code,
            reason: topicCheck.reason,
            violations,
            metadata: topicCheck.metadata,
          };
        }
        console.log('[Guardrails] Query ALLOWED by topic banner');
      } catch (error) {
        console.error('[Guardrails] Topic banner check failed:', error);
        // Continue if topic check fails (fail-open)
      }
    }

    // All checks passed
    return {
      allowed: true,
      reason: 'All guardrails passed',
      violations: [],
    };
  }

  /**
   * Get current configuration
   */
  getConfig(): GuardrailsConfig {
    return this.config;
  }
}
