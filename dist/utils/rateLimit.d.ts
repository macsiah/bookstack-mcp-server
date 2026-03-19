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
     * Refill tokens based on elapsed time
     */
    private refill;
}
export default RateLimiter;
//# sourceMappingURL=rateLimit.d.ts.map