/**
 * Output Keyword Banner - Blocks responses containing banned keywords
 * Reuses logic from KeywordBanner but for response content
 */

import { GuardrailResult, GuardrailViolationCode, KeywordBanningConfig } from '../types';

export class OutputKeywordBanner {
  private config: KeywordBanningConfig;

  constructor(config: KeywordBanningConfig) {
    this.config = config;
  }

  /**
   * Update configuration
   */
  updateConfig(config: KeywordBanningConfig): void {
    this.config = config;
  }

  /**
   * Check if response contains banned keywords
   */
  check(response: string): GuardrailResult {
    if (!this.config.enabled || this.config.keywords.length === 0) {
      return { allowed: true, reason: 'Output keyword banning disabled or no keywords configured' };
    }

    const normalizedResponse = this.config.caseSensitive ? response : response.toLowerCase();
    const matchedKeywords: string[] = [];

    for (const keyword of this.config.keywords) {
      const normalizedKeyword = this.config.caseSensitive ? keyword : keyword.toLowerCase();
      let matched = false;

      switch (this.config.matchMode) {
        case 'exact':
          // Exact word match (word boundaries)
          const exactRegex = new RegExp(`\\b${this.escapeRegex(normalizedKeyword)}\\b`, 'i');
          matched = exactRegex.test(normalizedResponse);
          break;

        case 'contains':
          // Simple substring match
          matched = normalizedResponse.includes(normalizedKeyword);
          break;

        case 'regex':
          // Regular expression match
          try {
            const regex = new RegExp(normalizedKeyword, this.config.caseSensitive ? '' : 'i');
            matched = regex.test(response);
          } catch (error) {
            console.error(`[OutputKeywordBanner] Invalid regex pattern: ${normalizedKeyword}`, error);
            continue;
          }
          break;
      }

      if (matched) {
        matchedKeywords.push(keyword);
      }
    }

    if (matchedKeywords.length > 0) {
      return {
        allowed: false,
        code: GuardrailViolationCode.OUTPUT_KEYWORD_BLOCKED,
        reason: `Response contains banned keyword${matchedKeywords.length > 1 ? 's' : ''}: ${matchedKeywords.join(', ')}`,
        metadata: {
          matchedKeywords,
          matchMode: this.config.matchMode,
          caseSensitive: this.config.caseSensitive,
        },
      };
    }

    return {
      allowed: true,
      reason: 'No banned keywords detected in response',
    };
  }

  /**
   * Escape special regex characters
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
