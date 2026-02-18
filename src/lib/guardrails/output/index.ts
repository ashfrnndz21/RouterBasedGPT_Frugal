/**
 * Output Guardrails - Main orchestrator for output guardrail checks
 * Checks AI responses before sending to users
 */

import { GuardrailResult, GuardrailViolationCode, OutputGuardrailsConfig } from '../types';
import { OutputKeywordBanner } from './outputKeywordBanner';
import { PIIDetector, PIIDetectionConfig } from './piiDetector';
import { PatternBlocker, PatternBlockingConfig } from './patternBlocker';

export class OutputGuardrails {
  private keywordBanner?: OutputKeywordBanner;
  private piiDetector?: PIIDetector;
  private patternBlocker?: PatternBlocker;
  private config: OutputGuardrailsConfig;

  constructor(config: OutputGuardrailsConfig) {
    this.config = config;
    this.initialize();
  }

  /**
   * Initialize output guardrails based on configuration
   */
  private initialize(): void {
    if (this.config.keywordBlocking.enabled) {
      this.keywordBanner = new OutputKeywordBanner(this.config.keywordBlocking);
    }

    if (this.config.piiDetection.enabled) {
      this.piiDetector = new PIIDetector(this.config.piiDetection as PIIDetectionConfig);
    }

    if (this.config.patternBlocking.enabled) {
      this.patternBlocker = new PatternBlocker(this.config.patternBlocking);
    }
  }

  /**
   * Update configuration and re-initialize
   */
  updateConfig(config: OutputGuardrailsConfig): void {
    this.config = config;
    this.initialize();

    // Update individual components if they exist
    if (this.keywordBanner) {
      this.keywordBanner.updateConfig(config.keywordBlocking);
    }
    if (this.piiDetector) {
      this.piiDetector.updateConfig(config.piiDetection as PIIDetectionConfig);
    }
    if (this.patternBlocker) {
      this.patternBlocker.updateConfig(config.patternBlocking);
    }
  }

  /**
   * Check partial response with sliding window (for incremental checking during streaming)
   * Uses last ~100 characters (roughly 5-6 words) to catch violations early
   */
  checkPartialResponse(fullResponse: string, windowSize: number = 100): GuardrailResult {
    if (!this.config.enabled) {
      return { allowed: true, reason: 'Output guardrails disabled' };
    }

    // Use sliding window: last N characters of the response
    const window = fullResponse.length > windowSize 
      ? fullResponse.slice(-windowSize) 
      : fullResponse;

    // 1. Keyword blocking (fastest, do first) - check the window
    if (this.keywordBanner) {
      const keywordCheck = this.keywordBanner.check(window);
      if (!keywordCheck.allowed) {
        return {
          allowed: false,
          code: keywordCheck.code,
          reason: keywordCheck.reason,
          violations: [{
            code: keywordCheck.code!,
            reason: keywordCheck.reason,
            metadata: keywordCheck.metadata,
          }],
          filtered: this.config.safeMessage,
          metadata: keywordCheck.metadata,
        };
      }
    }

    // 2. Pattern blocking - check the window
    if (this.patternBlocker) {
      const patternCheck = this.patternBlocker.check(window);
      if (!patternCheck.allowed) {
        return {
          allowed: false,
          code: patternCheck.code,
          reason: patternCheck.reason,
          violations: [{
            code: patternCheck.code!,
            reason: patternCheck.reason,
            metadata: patternCheck.metadata,
          }],
          filtered: this.config.safeMessage,
          metadata: patternCheck.metadata,
        };
      }
    }

    // Note: PII detection needs full context, so we skip it in partial checks
    // It will be checked at the end when stream completes

    return {
      allowed: true,
      reason: 'Partial check passed',
    };
  }

  /**
   * Check response against all output guardrails
   */
  async checkResponse(response: string): Promise<GuardrailResult> {
    if (!this.config.enabled) {
      return { allowed: true, reason: 'Output guardrails disabled' };
    }

    const violations: Array<{ code: GuardrailViolationCode; reason: string; metadata?: any }> = [];
    let sanitizedResponse = response;

    // 1. Keyword blocking (fastest, do first)
    if (this.keywordBanner) {
      const keywordCheck = this.keywordBanner.check(response);
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
          filtered: this.config.safeMessage,
          metadata: keywordCheck.metadata,
        };
      }
    }

    // 2. PII detection
    if (this.piiDetector) {
      const piiCheck = await this.piiDetector.check(response);
      if (!piiCheck.allowed) {
        violations.push({
          code: piiCheck.code!,
          reason: piiCheck.reason,
          metadata: piiCheck.metadata,
        });
        // If action is 'block', return violation
        if (this.config.piiDetection.action === 'block') {
          return {
            allowed: false,
            code: piiCheck.code,
            reason: piiCheck.reason,
            violations,
            filtered: this.config.safeMessage,
            metadata: piiCheck.metadata,
          };
        } else {
          // If action is 'redact', use sanitized response
          sanitizedResponse = piiCheck.filtered || sanitizedResponse;
        }
      } else if (piiCheck.filtered && piiCheck.filtered !== response) {
        // PII was redacted but response is allowed
        sanitizedResponse = piiCheck.filtered;
      }
    }

    // 3. Pattern blocking
    if (this.patternBlocker) {
      const patternCheck = this.patternBlocker.check(response);
      if (!patternCheck.allowed) {
        violations.push({
          code: patternCheck.code!,
          reason: patternCheck.reason,
          metadata: patternCheck.metadata,
        });
        return {
          allowed: false,
          code: patternCheck.code,
          reason: patternCheck.reason,
          violations,
          filtered: this.config.safeMessage,
          metadata: patternCheck.metadata,
        };
      }
    }

    // All checks passed
    return {
      allowed: true,
      reason: 'Output guardrails passed',
      filtered: sanitizedResponse, // May contain redacted PII
      violations: [],
    };
  }
}
