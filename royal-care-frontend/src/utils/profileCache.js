// Simple client-side cache for user profile data
class ProfileCache {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  // Get cached profile data if it exists and is still valid
  get(userId) {
    const cached = this.cache.get(userId);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > this.cacheTimeout) {
      this.cache.delete(userId);
      return null;
    }

    return cached.data;
  }

  // Set profile data in cache
  set(userId, data) {
    this.cache.set(userId, {
      data,
      timestamp: Date.now(),
    });
  }

  // Clear cache for a specific user
  clear(userId) {
    if (userId) {
      this.cache.delete(userId);
    } else {
      this.cache.clear();
    }
  }

  // Check if profile data is cached and valid
  has(userId) {
    return this.get(userId) !== null;
  }
}

// Export a singleton instance
export const profileCache = new ProfileCache();
