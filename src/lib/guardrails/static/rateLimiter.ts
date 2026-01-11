/**
 * Rate Limiter - Enforces rate limits per identifier (IP, chatId, etc.)
 */

import { GuardrailResult, GuardrailViolationCode } from '../types';

interface RateLimitEntry {
  count: number;
  resetAt: number;
  burstCount: number;
  burstResetAt: number;
  hourCount: number;
  hourResetAt: number;
}

export class RateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map();
  private requestsPerMinute: number;
  private requestsPerHour: number;
  private burstLimit: number;
  private burstWindowSeconds: number;

  constructor(
    requestsPerMinute: number,
    requestsPerHour: number,
    burstLimit: number,
    burstWindowSeconds: number = 10
  ) {
    this.requestsPerMinute = requestsPerMinute;
    this.requestsPerHour = requestsPerHour;
    this.burstLimit = burstLimit;
    this.burstWindowSeconds = burstWindowSeconds;
  }

  /**
   * Check if request is within rate limits
   */
  check(identifier: string): GuardrailResult {
    const now = Date.now();
    let entry = this.limits.get(identifier);

    // Initialize or reset expired entries
    if (!entry || now > entry.resetAt) {
      entry = {
        count: 0,
        resetAt: now + 60000, // 1 minute
        burstCount: 0,
        burstResetAt: now + this.burstWindowSeconds * 1000,
        hourCount: entry?.hourCount || 0,
        hourResetAt: entry?.hourResetAt || now + 3600000, // 1 hour
      };
    }

    // Reset hour counter if expired
    if (now > entry.hourResetAt) {
      entry.hourCount = 0;
      entry.hourResetAt = now + 3600000;
    }

    // Check burst limit (most restrictive)
    if (now < entry.burstResetAt) {
      if (entry.burstCount >= this.burstLimit) {
        const retryAfter = Math.ceil((entry.burstResetAt - now) / 1000);
        return {
          allowed: false,
          code: GuardrailViolationCode.RATE_LIMIT_EXCEEDED,
          reason: `Too many requests. Maximum ${this.burstLimit} requests per ${this.burstWindowSeconds} seconds. Please wait ${retryAfter} second${retryAfter !== 1 ? 's' : ''}.`,
          metadata: {
            type: 'burst',
            retryAfter,
            limit: this.burstLimit,
            window: this.burstWindowSeconds,
          },
        };
      }
      entry.burstCount++;
    } else {
      // Reset burst window
      entry.burstCount = 1;
      entry.burstResetAt = now + this.burstWindowSeconds * 1000;
    }

    // Check per-minute limit
    if (entry.count >= this.requestsPerMinute) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      return {
        allowed: false,
        code: GuardrailViolationCode.RATE_LIMIT_EXCEEDED,
        reason: `Rate limit exceeded. Maximum ${this.requestsPerMinute} requests per minute. Please wait ${retryAfter} second${retryAfter !== 1 ? 's' : ''}.`,
        metadata: {
          type: 'minute',
          retryAfter,
          limit: this.requestsPerMinute,
        },
      };
    }

    // Check per-hour limit
    if (entry.hourCount >= this.requestsPerHour) {
      const retryAfter = Math.ceil((entry.hourResetAt - now) / 1000);
      return {
        allowed: false,
        code: GuardrailViolationCode.RATE_LIMIT_EXCEEDED,
        reason: `Rate limit exceeded. Maximum ${this.requestsPerHour} requests per hour. Please wait ${Math.ceil(retryAfter / 60)} minute${Math.ceil(retryAfter / 60) !== 1 ? 's' : ''}.`,
        metadata: {
          type: 'hour',
          retryAfter,
          limit: this.requestsPerHour,
        },
      };
    }

    // Increment counters
    entry.count++;
    entry.hourCount++;
    this.limits.set(identifier, entry);

    return {
      allowed: true,
      reason: 'OK',
      metadata: {
        remaining: {
          minute: this.requestsPerMinute - entry.count,
          hour: this.requestsPerHour - entry.hourCount,
          burst: this.burstLimit - entry.burstCount,
        },
      },
    };
  }

  /**
   * Clear rate limit for an identifier (useful for testing)
   */
  clear(identifier: string): void {
    this.limits.delete(identifier);
  }

  /**
   * Clear all rate limits
   */
  clearAll(): void {
    this.limits.clear();
  }

  /**
   * Get current rate limit status for an identifier
   */
  getStatus(identifier: string): {
    minute: { count: number; limit: number; resetAt: number };
    hour: { count: number; limit: number; resetAt: number };
    burst: { count: number; limit: number; resetAt: number };
  } | null {
    const entry = this.limits.get(identifier);
    if (!entry) return null;

    return {
      minute: {
        count: entry.count,
        limit: this.requestsPerMinute,
        resetAt: entry.resetAt,
      },
      hour: {
        count: entry.hourCount,
        limit: this.requestsPerHour,
        resetAt: entry.hourResetAt,
      },
      burst: {
        count: entry.burstCount,
        limit: this.burstLimit,
        resetAt: entry.burstResetAt,
      },
    };
  }
}
