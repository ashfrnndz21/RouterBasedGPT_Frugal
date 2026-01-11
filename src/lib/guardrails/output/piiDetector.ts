/**
 * PII Detector - Detects and optionally redacts Personal Identifiable Information
 */

import { GuardrailResult, GuardrailViolationCode } from '../types';

export interface PIIDetectionConfig {
  enabled: boolean;
  types: ('email' | 'phone' | 'ssn' | 'credit-card' | 'ip-address')[];
  action: 'block' | 'redact';
  redactionChar?: string;
}

interface PIIDetection {
  type: string;
  pattern: RegExp;
  example: string;
}

export class PIIDetector {
  private config: PIIDetectionConfig;
  private piiPatterns: Map<string, PIIDetection> = new Map();

  constructor(config: PIIDetectionConfig) {
    this.config = config;
    this.initializePatterns();
  }

  /**
   * Initialize PII detection patterns
   */
  private initializePatterns(): void {
    this.piiPatterns.set('email', {
      type: 'email',
      pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
      example: 'user@example.com',
    });

    this.piiPatterns.set('phone', {
      type: 'phone',
      pattern: /\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
      example: '(555) 123-4567',
    });

    this.piiPatterns.set('ssn', {
      type: 'ssn',
      pattern: /\b\d{3}-\d{2}-\d{4}\b/g,
      example: '123-45-6789',
    });

    this.piiPatterns.set('credit-card', {
      type: 'credit-card',
      pattern: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
      example: '1234 5678 9012 3456',
    });

    this.piiPatterns.set('ip-address', {
      type: 'ip-address',
      pattern: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
      example: '192.168.1.1',
    });
  }

  /**
   * Update configuration
   */
  updateConfig(config: PIIDetectionConfig): void {
    this.config = config;
  }

  /**
   * Check response for PII and either block or redact
   */
  async check(response: string): Promise<GuardrailResult> {
    if (!this.config.enabled || this.config.types.length === 0) {
      return { allowed: true, reason: 'PII detection disabled or no types configured' };
    }

    const detectedPII: Array<{ type: string; count: number; matches: string[] }> = [];
    let sanitizedResponse = response;
    const redactionChar = this.config.redactionChar || '***';

    // Check each enabled PII type
    for (const piiType of this.config.types) {
      const pattern = this.piiPatterns.get(piiType);
      if (!pattern) {
        console.warn(`[PIIDetector] Unknown PII type: ${piiType}`);
        continue;
      }

      const matches = response.match(pattern.pattern);
      if (matches && matches.length > 0) {
        detectedPII.push({
          type: piiType,
          count: matches.length,
          matches: [...new Set(matches)], // Remove duplicates
        });

        // If action is redact, replace PII with redaction character
        if (this.config.action === 'redact') {
          sanitizedResponse = sanitizedResponse.replace(pattern.pattern, redactionChar);
        }
      }
    }

    if (detectedPII.length > 0) {
      const totalCount = detectedPII.reduce((sum, pii) => sum + pii.count, 0);
      const typesList = detectedPII.map(pii => `${pii.type} (${pii.count})`).join(', ');

      if (this.config.action === 'block') {
        return {
          allowed: false,
          code: GuardrailViolationCode.OUTPUT_PII_DETECTED,
          reason: `Response contains PII: ${typesList}`,
          metadata: {
            detectedPII,
            totalCount,
            action: 'block',
          },
        };
      } else {
        // Redact mode - response is allowed but sanitized
        return {
          allowed: true,
          reason: `PII detected and redacted: ${typesList}`,
          filtered: sanitizedResponse,
          metadata: {
            detectedPII,
            totalCount,
            action: 'redact',
            originalLength: response.length,
            sanitizedLength: sanitizedResponse.length,
          },
        };
      }
    }

    return {
      allowed: true,
      reason: 'No PII detected',
      filtered: sanitizedResponse,
    };
  }
}
