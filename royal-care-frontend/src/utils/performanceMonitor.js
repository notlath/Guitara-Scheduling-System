/**
 * Performance monitoring utility for tracking data fetching performance
 * Helps identify bottlenecks and optimize data loading
 */

class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.startTimes = new Map();
    this.thresholds = {
      api_call: 15000, // 15 seconds (increased from 5 seconds for slow backend)
      render_time: 100, // 100ms
      data_processing: 500, // 500ms
    };
  }

  /**
   * Start tracking a performance metric
   * @param {string} key - Unique identifier for the metric
   * @param {string} type - Type of metric (api_call, render_time, data_processing)
   */
  startTracking(key, type = "api_call") {
    const startTime = performance.now();
    this.startTimes.set(key, { startTime, type });

    console.log(`⏱️ Performance: Started tracking ${key} (${type})`);
  }

  /**
   * End tracking and record the metric
   * @param {string} key - Unique identifier for the metric
   * @param {Object} metadata - Additional data to store with the metric
   */
  endTracking(key, metadata = {}) {
    const startData = this.startTimes.get(key);
    if (!startData) {
      console.warn(`⚠️ Performance: No start time found for ${key}`);
      return;
    }

    const endTime = performance.now();
    const duration = endTime - startData.startTime;
    const { type } = startData;

    // Store the metric
    if (!this.metrics.has(type)) {
      this.metrics.set(type, []);
    }

    const metric = {
      key,
      duration,
      timestamp: Date.now(),
      threshold: this.thresholds[type],
      isSlowPerformance: duration > this.thresholds[type],
      ...metadata,
    };

    this.metrics.get(type).push(metric);
    this.startTimes.delete(key);

    // Check for long-running operations and issue warnings
    const isLongRunning = this.checkForLongRunningOperation(
      key,
      type,
      duration
    );

    // Enhanced logging based on performance
    if (isLongRunning) {
      console.warn(
        `🐌 Performance Warning: ${key} took ${duration.toFixed(
          2
        )}ms (threshold: ${this.thresholds[type]}ms)`,
        metadata
      );
    } else {
      console.log(
        `✅ Performance: ${key} completed in ${duration.toFixed(2)}ms`,
        metadata
      );
    }

    return metric;
  }

  /**
   * Check for long-running operations and issue warnings
   * @param {string} key - Unique identifier for the operation
   * @param {string} type - Type of operation
   * @param {number} duration - Duration of the operation in ms
   */
  checkForLongRunningOperation(key, type, duration) {
    const threshold = this.thresholds[type] || 3000;

    if (duration > threshold) {
      const warningLevel = duration > threshold * 2 ? "error" : "warn";
      const method = warningLevel === "error" ? console.error : console.warn;

      method(
        `🐌 Performance ${warningLevel.toUpperCase()}: ${key} took ${Math.round(
          duration
        )}ms ` +
          `(threshold: ${threshold}ms, ${Math.round(
            (duration / threshold) * 100
          )}% over)`
      );

      // Trigger custom event for UI feedback
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("longRunningOperation", {
            detail: {
              key,
              type,
              duration,
              threshold,
              level: warningLevel,
            },
          })
        );
      }
    }

    return duration > threshold;
  }

  /**
   * Get performance statistics for a given metric type
   * @param {string} type - Type of metric to analyze
   * @returns {Object} Statistics including average, min, max, and percentiles
   */
  getStatistics(type) {
    const metrics = this.metrics.get(type) || [];
    if (metrics.length === 0) {
      return { count: 0, average: 0, min: 0, max: 0, p95: 0, p99: 0 };
    }

    const durations = metrics.map((m) => m.duration).sort((a, b) => a - b);
    const count = durations.length;
    const sum = durations.reduce((acc, d) => acc + d, 0);

    const p95Index = Math.floor(count * 0.95);
    const p99Index = Math.floor(count * 0.99);

    return {
      count,
      average: Math.round(sum / count),
      min: Math.round(durations[0]),
      max: Math.round(durations[count - 1]),
      p95: Math.round(durations[p95Index] || 0),
      p99: Math.round(durations[p99Index] || 0),
      slowOperations: metrics.filter(
        (m) => m.duration > (this.thresholds[type] || 3000)
      ).length,
    };
  }

  /**
   * Get performance summary for a specific type
   * @param {string} type - Type of metrics to analyze
   * @returns {Object} Performance summary
   */
  getPerformanceSummary(type) {
    const metrics = this.metrics.get(type) || [];
    if (metrics.length === 0) {
      return { type, count: 0, average: 0, slowCount: 0 };
    }

    const durations = metrics.map((m) => m.duration);
    const average = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    const slowCount = metrics.filter((m) => m.isSlowPerformance).length;
    const min = Math.min(...durations);
    const max = Math.max(...durations);

    return {
      type,
      count: metrics.length,
      average: average.toFixed(2),
      min: min.toFixed(2),
      max: max.toFixed(2),
      slowCount,
      slowPercentage: ((slowCount / metrics.length) * 100).toFixed(1),
    };
  }

  /**
   * Get all performance summaries
   * @returns {Object} All performance summaries
   */
  getAllSummaries() {
    const summaries = {};
    for (const type of this.metrics.keys()) {
      summaries[type] = this.getPerformanceSummary(type);
    }
    return summaries;
  }

  /**
   * Log performance report to console
   */
  logPerformanceReport() {
    console.group("📊 Performance Report");

    const summaries = this.getAllSummaries();

    for (const [type, summary] of Object.entries(summaries)) {
      console.group(`📈 ${type.toUpperCase()} Performance`);
      console.log(`Total operations: ${summary.count}`);
      console.log(`Average duration: ${summary.average}ms`);
      console.log(`Min/Max duration: ${summary.min}ms / ${summary.max}ms`);
      console.log(
        `Slow operations: ${summary.slowCount} (${summary.slowPercentage}%)`
      );
      console.groupEnd();
    }

    console.groupEnd();
  }

  /**
   * Clear all metrics (useful for testing)
   */
  clearMetrics() {
    this.metrics.clear();
    this.startTimes.clear();
    console.log("🧹 Performance: All metrics cleared");
  }

  /**
   * Set custom threshold for a metric type
   * @param {string} type - Metric type
   * @param {number} threshold - Threshold in milliseconds
   */
  setThreshold(type, threshold) {
    this.thresholds[type] = threshold;
    console.log(`⚙️ Performance: Threshold for ${type} set to ${threshold}ms`);
  }
}

// Create singleton instance
const performanceMonitor = new PerformanceMonitor();

export default performanceMonitor;
