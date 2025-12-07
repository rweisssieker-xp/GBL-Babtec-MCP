import { RateLimiterMemory } from 'rate-limiter-flexible';
import { RateLimitError } from '../utils/errors.js';
import type { ToolContext } from '../server/mcp-server.js';
import logger from '../utils/logger.js';

export class RateLimiter {
  private limiter: RateLimiterMemory;
  private enabled: boolean;

  constructor(maxRequests: number, windowMs: number, enabled: boolean = true) {
    this.enabled = enabled;
    this.limiter = new RateLimiterMemory({
      points: maxRequests,
      duration: Math.floor(windowMs / 1000), // Convert to seconds
    });
  }

  async checkLimit(context: ToolContext): Promise<void> {
    if (!this.enabled) {
      return;
    }

    const key = context.userId || 'anonymous';

    try {
      await this.limiter.consume(key);
      logger.debug('Rate limit check passed', { userId: key });
    } catch (error) {
      if (error instanceof Error && error.message.includes('Rate limiter')) {
        const rateLimiterError = error as { msBeforeNext?: number };
        const retryAfter = rateLimiterError.msBeforeNext
          ? Math.ceil(rateLimiterError.msBeforeNext / 1000)
          : undefined;

        logger.warn('Rate limit exceeded', { userId: key, retryAfter });
        throw new RateLimitError(retryAfter);
      }
      throw error;
    }
  }

  reset(key: string): void {
    this.limiter.delete(key);
  }
}

