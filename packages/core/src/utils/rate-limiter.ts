import type { RateLimitConfig } from '../types/provider.js';

/**
 * Simple token-bucket rate limiter.
 * Consumers can provide their own implementation via the Logger/RateLimiter interfaces.
 */
export class TokenBucketRateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly maxTokens: number;
  private readonly refillRateMs: number;

  constructor(config: RateLimitConfig) {
    this.maxTokens = config.maxRequests;
    this.tokens = config.maxRequests;
    this.refillRateMs = config.windowMs / config.maxRequests;
    this.lastRefill = Date.now();
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const newTokens = Math.floor(elapsed / this.refillRateMs);
    if (newTokens > 0) {
      this.tokens = Math.min(this.maxTokens, this.tokens + newTokens);
      this.lastRefill = now;
    }
  }

  /**
   * Wait until a token is available, then consume it.
   */
  async acquire(): Promise<void> {
    this.refill();
    if (this.tokens > 0) {
      this.tokens--;
      return;
    }

    // Wait for next token
    const waitMs = this.refillRateMs - (Date.now() - this.lastRefill);
    await new Promise((resolve) => setTimeout(resolve, Math.max(0, waitMs)));
    this.refill();
    this.tokens--;
  }

  /**
   * Check if a token is available without consuming it.
   */
  canAcquire(): boolean {
    this.refill();
    return this.tokens > 0;
  }
}
