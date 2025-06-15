/**
 * Performance monitoring utility for tracking data fetching performance
 * Helps identify bottlenecks and optimize data loading
 */

class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.startTimes = new Map();
    this.thresholds = {
      api_call: 3000, // 3 seconds
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

    // Log performance warning if threshold exceeded
    if (metric.isSlowPerformance) {
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
