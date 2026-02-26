/**
 * Rate limiter utility for API requests
 */
export class RateLimiter {
  private tokens: number;
  private maxTokens: number;
  private refillRate: number; // tokens per second
  private lastRefill: number;

  constructor(config: { requestsPerMinute: number; burstLimit: number }) {
    this.maxTokens = config.burstLimit;
    this.tokens = this.maxTokens;
    this.refillRate = config.requestsPerMinute / 60; // convert to per second
    this.lastRefill = Date.now();
  }

  /**
   * Acquire a token, waiting if necessary.
   * Loops after waiting so that if the refill still hasn't produced a full
   * token (e.g. due to timer imprecision), we wait again rather than
   * decrementing into negative territory.
   */
  async acquire(): Promise<void> {
    while (true) {
      this.refill();

      if (this.tokens >= 1) {
        this.tokens -= 1;
        return;
      }

      // Calculate exactly how long until one token is available and wait.
      const waitTime = (1 - this.tokens) / this.refillRate * 1000;
      await new Promise(resolve => setTimeout(resolve, waitTime));
      // Loop back to refill and re-check rather than unconditionally decrementing.
    }
  }

  /**
   * Refill tokens based on elapsed time
   */
  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    const tokensToAdd = elapsed * this.refillRate;

    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

}

export default RateLimiter;