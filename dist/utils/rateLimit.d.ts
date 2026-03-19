/**
 * Rate limiter utility for API requests
 */
export declare class RateLimiter {
    private tokens;
    private maxTokens;
    private refillRate;
    private lastRefill;
    constructor(config: {
        requestsPerMinute: number;
        burstLimit: number;
    });
    /**
     * Acquire a token, waiting if necessary.
     * Loops after waiting so that if the refill still hasn't produced a full
     * token (e.g. due to timer imprecision), we wait again rather than
     * decrementing into negative territory.
     */
    acquire(): Promise<void>;
    /**
     * Return current rate limiter state (tokens available, estimated wait, etc.).
     */
    getStatus(): {
        tokens_available: number;
        max_tokens: number;
        refill_rate_per_minute: number;
        estimated_wait_ms: number;
    };
    /**
     * Refill tokens based on elapsed time
     */
    private refill;
}
export default RateLimiter;
//# sourceMappingURL=rateLimit.d.ts.map