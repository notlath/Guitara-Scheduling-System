/**
 * Frontend Performance Optimization Service
 * Handles caching, lazy loading, and real-time updates
 */

class FrontendPerformanceService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    this.requestQueue = new Map();
    this.performanceMetrics = {
      apiCalls: 0,
      cacheHits: 0,
      cacheMisses: 0,
      totalResponseTime: 0,
    };

    // Initialize service worker for offline caching
    this.initServiceWorker();

    // Initialize performance monitoring
    this.initPerformanceMonitoring();
  }

  /**
   * Initialize Service Worker for offline capability and caching
   */
  async initServiceWorker() {
    if ("serviceWorker" in navigator) {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js");
        console.log("Service Worker registered:", registration);
      } catch (error) {
        console.error("Service Worker registration failed:", error);
      }
    }
  }

  /**
   * Initialize performance monitoring
   */
  initPerformanceMonitoring() {
    // Monitor API call performance
    this.originalFetch = window.fetch;
    window.fetch = this.wrappedFetch.bind(this);

    // Monitor WebSocket performance
    this.monitorWebSocketPerformance();

    // Report metrics periodically
    setInterval(() => this.reportMetrics(), 60000); // Every minute
  }

  /**
   * Wrapped fetch with performance monitoring and caching
   */
  async wrappedFetch(url, options = {}) {
    const startTime = performance.now();
    const cacheKey = this.getCacheKey(url, options);

    // Check cache for GET requests
    if (!options.method || options.method === "GET") {
      const cachedData = this.getFromCache(cacheKey);
      if (cachedData) {
        this.performanceMetrics.cacheHits++;
        return new Response(JSON.stringify(cachedData), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      this.performanceMetrics.cacheMisses++;
    }

    try {
      const response = await this.originalFetch(url, options);
      const endTime = performance.now();
      const responseTime = endTime - startTime;

      this.performanceMetrics.apiCalls++;
      this.performanceMetrics.totalResponseTime += responseTime;

      // Cache successful GET responses
      if (response.ok && (!options.method || options.method === "GET")) {
        const clonedResponse = response.clone();
        const data = await clonedResponse.json();
        this.setCache(cacheKey, data);
      }

      // Log slow requests
      if (responseTime > 1000) {
        console.warn(
          `Slow API request: ${url} took ${responseTime.toFixed(2)}ms`
        );
      }

      return response;
    } catch (error) {
      console.error(`API request failed: ${url}`, error);
      throw error;
    }
  }

  /**
   * Get data from cache
   */
  getFromCache(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    if (cached) {
      this.cache.delete(key); // Remove expired cache
    }
    return null;
  }

  /**
   * Set data to cache
   */
  setCache(key, data, customTimeout = null) {
    const timeout = customTimeout || this.cacheTimeout;
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expires: Date.now() + timeout,
    });
  }

  /**
   * Generate cache key
   */
  getCacheKey(url, options) {
    const method = options.method || "GET";
    const body = options.body ? JSON.stringify(options.body) : "";
    return `${method}_${url}_${body}`;
  }

  /**
   * Invalidate cache by pattern
   */
  invalidateCacheByPattern(pattern) {
    const regex = new RegExp(pattern);
    for (const [key] of this.cache) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Optimized API request with deduplication
   */
  async optimizedApiRequest(url, options = {}) {
    const requestKey = this.getCacheKey(url, options);

    // Check if same request is already in progress
    if (this.requestQueue.has(requestKey)) {
      return this.requestQueue.get(requestKey);
    }

    // Make the request
    const requestPromise = fetch(url, options);
    this.requestQueue.set(requestKey, requestPromise);

    try {
      const response = await requestPromise;
      return response;
    } finally {
      // Remove from queue when done
      this.requestQueue.delete(requestKey);
    }
  }

  /**
   * Batch multiple API requests
   */
  async batchApiRequests(requests) {
    const startTime = performance.now();

    try {
      const promises = requests.map((req) =>
        this.optimizedApiRequest(req.url, req.options)
      );

      const responses = await Promise.all(promises);
      const endTime = performance.now();

      console.log(
        `Batch request completed in ${(endTime - startTime).toFixed(2)}ms`
      );
      return responses;
    } catch (error) {
      console.error("Batch request failed:", error);
      throw error;
    }
  }

  /**
   * Monitor WebSocket performance
   */
  monitorWebSocketPerformance() {
    const originalWebSocket = window.WebSocket;

    window.WebSocket = function (url, protocols) {
      const ws = new originalWebSocket(url, protocols);
      const connectTime = Date.now();

      ws.addEventListener("open", () => {
        const connectionTime = Date.now() - connectTime;
        console.log(`WebSocket connected in ${connectionTime}ms`);
      });

      ws.addEventListener("message", (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "heartbeat_ack") {
            // Calculate WebSocket latency
            const sentTime = new Date(data.timestamp).getTime();
            const latency = Date.now() - sentTime;
            if (latency > 100) {
              console.warn(`High WebSocket latency: ${latency}ms`);
            }
          }
        } catch (e) {
          // Ignore non-JSON messages
        }
      });

      return ws;
    };
  }

  /**
   * Preload critical resources
   */
  async preloadCriticalData() {
    const criticalEndpoints = [
      "/api/appointments/today/",
      "/api/appointments/upcoming/",
      "/api/availability/by_date/?date=" +
        new Date().toISOString().split("T")[0],
    ];

    const preloadPromises = criticalEndpoints.map((url) =>
      this.optimizedApiRequest(url).catch((error) => {
        console.warn(`Failed to preload ${url}:`, error);
        return null;
      })
    );

    await Promise.all(preloadPromises);
    console.log("Critical data preloaded");
  }

  /**
   * Intelligent cache warming
   */
  async warmCache() {
    const today = new Date().toISOString().split("T")[0];
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    const warmupEndpoints = [
      `/api/appointments/today/`,
      `/api/availability/by_date/?date=${today}`,
      `/api/availability/by_date/?date=${tomorrow}`,
      `/api/staff/available/?role=therapist&date=${today}`,
      `/api/staff/available/?role=driver&date=${today}`,
    ];

    for (const endpoint of warmupEndpoints) {
      try {
        await this.optimizedApiRequest(endpoint);
      } catch (error) {
        console.warn(`Cache warming failed for ${endpoint}:`, error);
      }
    }
  }

  /**
   * Report performance metrics
   */
  reportMetrics() {
    const avgResponseTime =
      this.performanceMetrics.totalResponseTime /
      Math.max(this.performanceMetrics.apiCalls, 1);

    const cacheHitRate =
      (this.performanceMetrics.cacheHits /
        Math.max(
          this.performanceMetrics.cacheHits +
            this.performanceMetrics.cacheMisses,
          1
        )) *
      100;

    const metrics = {
      apiCalls: this.performanceMetrics.apiCalls,
      avgResponseTime: Math.round(avgResponseTime),
      cacheHitRate: Math.round(cacheHitRate),
      cacheSize: this.cache.size,
    };

    console.log("Performance Metrics:", metrics);

    // Send metrics to backend if needed
    if (this.performanceMetrics.apiCalls > 0) {
      this.sendMetricsToBackend(metrics);
    }
  }

  /**
   * Send metrics to backend
   */
  async sendMetricsToBackend(metrics) {
    try {
      await fetch("/api/metrics/frontend/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...metrics,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href,
        }),
      });
    } catch (error) {
      console.warn("Failed to send metrics:", error);
    }
  }

  /**
   * Optimize images with lazy loading
   */
  initImageOptimization() {
    const images = document.querySelectorAll("img[data-src]");

    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src;
          img.removeAttribute("data-src");
          observer.unobserve(img);
        }
      });
    });

    images.forEach((img) => imageObserver.observe(img));
  }

  /**
   * Debounce function for search and input optimization
   */
  debounce(func, wait, immediate) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        timeout = null;
        if (!immediate) func(...args);
      };
      const callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (callNow) func(...args);
    };
  }

  /**
   * Memory optimization - clean up unused cache entries
   */
  cleanupCache() {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, value] of this.cache) {
      if (now > value.expires) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`Cleaned up ${cleanedCount} expired cache entries`);
    }

    // If cache is too large, remove oldest entries
    if (this.cache.size > 1000) {
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

      const toRemove = entries.slice(0, 200); // Remove oldest 200 entries
      toRemove.forEach(([key]) => this.cache.delete(key));

      console.log(
        `Removed ${toRemove.length} old cache entries to free memory`
      );
    }
  }

  /**
   * Initialize all optimizations
   */
  init() {
    // Preload critical data
    this.preloadCriticalData();

    // Warm cache
    setTimeout(() => this.warmCache(), 2000);

    // Initialize image optimization
    this.initImageOptimization();

    // Clean cache periodically
    setInterval(() => this.cleanupCache(), 5 * 60 * 1000); // Every 5 minutes

    console.log("Frontend Performance Service initialized");
  }
}

// Service Worker content (should be in public/sw.js)
const serviceWorkerContent = `
const CACHE_NAME = 'guitara-v1';
const urlsToCache = [
  '/',
  '/static/css/main.css',
  '/static/js/main.js',
  '/api/appointments/today/',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached version or fetch from network
        if (response) {
          // Update cache in background
          fetch(event.request).then(fetchResponse => {
            const responseClone = fetchResponse.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseClone);
            });
          });
          return response;
        }
        return fetch(event.request);
      })
  );
});
`;

// Export the service and service worker content
if (typeof module !== "undefined" && module.exports) {
  module.exports = { FrontendPerformanceService, serviceWorkerContent };
} else {
  // Browser environment
  window.FrontendPerformanceService = FrontendPerformanceService;

  // Initialize the service
  const performanceService = new FrontendPerformanceService();

  // Initialize when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () =>
      performanceService.init()
    );
  } else {
    performanceService.init();
  }
}
