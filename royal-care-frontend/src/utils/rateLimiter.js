/**
 * Rate Limiter Utility
 * Prevents too many API requests from being made simultaneously
 */
class RateLimiter {
  constructor(maxRequests = 5, timeWindow = 1000) {
    this.maxRequests = maxRequests;
    this.timeWindow = timeWindow;
    this.requests = [];
  }

  canMakeRequest() {
    const now = Date.now();
    // Remove requests outside the time window
    this.requests = this.requests.filter(
      (time) => now - time < this.timeWindow
    );

    if (this.requests.length < this.maxRequests) {
      this.requests.push(now);
      return true;
    }
    return false;
  }

  getWaitTime() {
    if (this.requests.length === 0) return 0;
    const oldestRequest = Math.min(...this.requests);
    return Math.max(0, this.timeWindow - (Date.now() - oldestRequest));
  }

  async waitIfNeeded() {
    if (!this.canMakeRequest()) {
      const waitTime = this.getWaitTime();
      console.log(`⏳ Rate limiting: waiting ${waitTime}ms`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
      return this.waitIfNeeded(); // Retry after waiting
    }
  }
}

// Create a global rate limiter instance
export const apiRateLimiter = new RateLimiter(5, 1000); // 5 requests per second

// Helper function to make rate-limited requests
export const makeRateLimitedRequest = async (requestConfig) => {
  await apiRateLimiter.waitIfNeeded();
  const axios = (await import("axios")).default;
  return axios(requestConfig);
};

// Retry logic with exponential backoff
export const retryWithBackoff = async (
  fn,
  maxRetries = 3,
  baseDelay = 1000
) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.response?.status === 429 && i < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, i) + Math.random() * 1000;
        console.log(
          `⏳ Rate limited, retrying in ${delay}ms (attempt ${
            i + 1
          }/${maxRetries})`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
};
