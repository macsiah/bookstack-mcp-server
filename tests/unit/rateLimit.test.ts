import { RateLimiter } from '../../src/utils/rateLimit';

describe('RateLimiter', () => {
  it('should allow requests within burst limit immediately', async () => {
    const limiter = new RateLimiter({ requestsPerMinute: 60, burstLimit: 5 });
    const start = Date.now();

    for (let i = 0; i < 5; i++) {
      await limiter.acquire();
    }

    const elapsed = Date.now() - start;
    // All 5 within burst should complete quickly (< 200ms)
    expect(elapsed).toBeLessThan(200);
  });

  it('should throttle requests beyond the burst limit', async () => {
    // Very low rate: 6 req/min = 1 per 10s; burst = 1
    const limiter = new RateLimiter({ requestsPerMinute: 6, burstLimit: 1 });

    const start = Date.now();
    await limiter.acquire(); // uses burst token immediately
    await limiter.acquire(); // must wait for refill
    const elapsed = Date.now() - start;

    // Second acquire should have waited > 1s (10s/token * 1 token)
    // Use a generous lower bound of 500ms to avoid flakiness in CI
    expect(elapsed).toBeGreaterThan(500);
  }, 20000);
});
