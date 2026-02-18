/**
 * Keyword Banner - Blocks queries containing banned keywords
 */

import { GuardrailResult, GuardrailViolationCode, KeywordBanningConfig } from '../types';

export class KeywordBanner {
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
   * Check if query contains banned keywords
   */
  check(query: string): GuardrailResult {
    if (!this.config.enabled || this.config.keywords.length === 0) {
      return { allowed: true, reason: 'Keyword banning disabled or no keywords configured' };
    }

    const normalizedQuery = this.config.caseSensitive ? query : query.toLowerCase();
    const matchedKeywords: string[] = [];

    for (const keyword of this.config.keywords) {
      const normalizedKeyword = this.config.caseSensitive ? keyword : keyword.toLowerCase();
      let matched = false;

      switch (this.config.matchMode) {
        case 'exact':
          // Exact word match (word boundaries)
          const exactRegex = new RegExp(`\\b${this.escapeRegex(normalizedKeyword)}\\b`, 'i');
          matched = exactRegex.test(normalizedQuery);
          break;

        case 'contains':
          // Simple substring match
          matched = normalizedQuery.includes(normalizedKeyword);
          break;

        case 'regex':
          // Regular expression match
          try {
            const regex = new RegExp(normalizedKeyword, this.config.caseSensitive ? '' : 'i');
            matched = regex.test(query);
          } catch (error) {
            console.error(`[KeywordBanner] Invalid regex pattern: ${normalizedKeyword}`, error);
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
        code: GuardrailViolationCode.BANNED_KEYWORD,
        reason: `Query contains banned keyword${matchedKeywords.length > 1 ? 's' : ''}: ${matchedKeywords.join(', ')}`,
        metadata: {
          matchedKeywords,
          matchMode: this.config.matchMode,
          caseSensitive: this.config.caseSensitive,
        },
      };
    }

    return {
      allowed: true,
      reason: 'No banned keywords detected',
    };
  }

  /**
   * Escape special regex characters
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
