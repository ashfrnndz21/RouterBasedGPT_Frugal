/**
 * Pattern Blocker - Blocks responses matching custom regex patterns
 */

import { GuardrailResult, GuardrailViolationCode } from '../types';

export interface PatternBlockingConfig {
  enabled: boolean;
  patterns: Array<{
    id: string;
    name: string;
    pattern: string; // regex pattern
    description?: string;
  }>;
}

export class PatternBlocker {
  private config: PatternBlockingConfig;

  constructor(config: PatternBlockingConfig) {
    this.config = config;
  }

  /**
   * Update configuration
   */
  updateConfig(config: PatternBlockingConfig): void {
    this.config = config;
  }

  /**
   * Check if response matches any blocked pattern
   */
  check(response: string): GuardrailResult {
    if (!this.config.enabled || this.config.patterns.length === 0) {
      return { allowed: true, reason: 'Pattern blocking disabled or no patterns configured' };
    }

    const matchedPatterns: Array<{ id: string; name: string; description?: string }> = [];

    for (const patternConfig of this.config.patterns) {
      try {
        const regex = new RegExp(patternConfig.pattern, 'gi'); // Case-insensitive by default
        if (regex.test(response)) {
          matchedPatterns.push({
            id: patternConfig.id,
            name: patternConfig.name,
            description: patternConfig.description,
          });
        }
      } catch (error) {
        console.error(`[PatternBlocker] Invalid regex pattern "${patternConfig.name}": ${patternConfig.pattern}`, error);
        // Continue checking other patterns even if one is invalid
        continue;
      }
    }

    if (matchedPatterns.length > 0) {
      const namesList = matchedPatterns.map(p => p.name).join(', ');
      return {
        allowed: false,
        code: GuardrailViolationCode.OUTPUT_PATTERN_BLOCKED,
        reason: `Response matches blocked pattern${matchedPatterns.length > 1 ? 's' : ''}: ${namesList}`,
        metadata: {
          matchedPatterns,
        },
      };
    }

    return {
      allowed: true,
      reason: 'No blocked patterns detected',
    };
  }
}
