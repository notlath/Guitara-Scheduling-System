/**
 * DataManager Debugging Utilities
 * Provides tools for debugging and monitoring data manager performance issues
 */

import dataManager from "../services/dataManager";

/**
 * Global debug utilities for DataManager
 */
class DataManagerDebugger {
  constructor() {
    this.isDebugMode = false;
    this.logBuffer = [];
    this.maxLogBuffer = 100;
  }

  /**
   * Enable debug mode with enhanced logging
   */
  enableDebugMode() {
    this.isDebugMode = true;
    console.log("🔍 DataManager Debug Mode Enabled");

    // Add global debug utilities to window for easy access
    if (typeof window !== "undefined") {
      window.dataManagerDebug = {
        getReport: () => this.getFullReport(),
        logReport: () => this.logFullReport(),
        reset: () => dataManager.reset(),
        getSubscribers: () => dataManager.getSubscriberInfo(),
        getCircuitBreakers: () => dataManager.getCircuitBreakerStatus(),
        getCacheStatus: () => dataManager.getCacheStatus(),
        clearCache: () => dataManager.reset(),
        enableVerbose: () => this.enableVerboseLogging(),
        disableVerbose: () => this.disableVerboseLogging(),
        simulateSlowRequest: (dataType, delay) =>
          this.simulateSlowRequest(dataType, delay),
        checkPerformance: () => this.checkPerformanceIssues(),
      };

      console.log("🛠️ Debug utilities available on window.dataManagerDebug");
      this.logAvailableCommands();
    }
  }

  /**
   * Disable debug mode
   */
  disableDebugMode() {
    this.isDebugMode = false;
    console.log("🔍 DataManager Debug Mode Disabled");

    if (typeof window !== "undefined") {
      delete window.dataManagerDebug;
    }
  }

  /**
   * Log available debug commands
   */
  logAvailableCommands() {
    console.group(
      "🛠️ Available Debug Commands (use window.dataManagerDebug.*)"
    );
    console.log("• getReport() - Get comprehensive report");
    console.log("• logReport() - Log detailed report to console");
    console.log("• reset() - Reset all caches and state");
    console.log("• getSubscribers() - View current subscribers");
    console.log("• getCircuitBreakers() - Check circuit breaker status");
    console.log("• getCacheStatus() - View cache statistics");
    console.log("• clearCache() - Clear all caches");
    console.log("• enableVerbose() - Enable verbose logging");
    console.log("• disableVerbose() - Disable verbose logging");
    console.log("• checkPerformance() - Analyze performance issues");
    console.groupEnd();
  }

  /**
   * Get comprehensive report of DataManager state
   */
  getFullReport() {
    const report = dataManager.getPerformanceReport();

    // Add additional analysis
    report.analysis = this.analyzePerformance(report);
    report.recommendations = this.getRecommendations(report);

    return report;
  }

  /**
   * Log full report with analysis
   */
  logFullReport() {
    const report = this.getFullReport();

    console.group("📊 DataManager Full Debug Report");

    // Log performance analysis
    if (report.analysis.issues.length > 0) {
      console.group("⚠️ Performance Issues Detected");
      report.analysis.issues.forEach((issue, index) => {
        console.warn(`${index + 1}. ${issue.type}: ${issue.description}`);
        if (issue.impact) console.log(`   Impact: ${issue.impact}`);
        if (issue.suggestion) console.log(`   Suggestion: ${issue.suggestion}`);
      });
      console.groupEnd();
    } else {
      console.log("✅ No performance issues detected");
    }

    // Log recommendations
    if (report.recommendations.length > 0) {
      console.group("💡 Recommendations");
      report.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. ${rec}`);
      });
      console.groupEnd();
    }

    // Log standard report
    dataManager.logPerformanceReport();

    console.groupEnd();
  }

  /**
   * Analyze performance metrics for issues
   */
  analyzePerformance(report) {
    const issues = [];
    const metrics = report.performanceMetrics;

    // Check for slow API calls
    if (metrics.api_call && metrics.api_call.average > 3000) {
      issues.push({
        type: "Slow API Calls",
        description: `Average API call time is ${metrics.api_call.average}ms (>3000ms)`,
        impact: "Poor user experience, slow data loading",
        suggestion:
          "Check backend performance, consider caching, or implement pagination",
      });
    }

    // Check for too many slow operations
    if (metrics.api_call && metrics.api_call.slowCount > 5) {
      issues.push({
        type: "High Failure Rate",
        description: `${metrics.api_call.slowCount} slow operations out of ${metrics.api_call.count}`,
        impact: "Inconsistent performance",
        suggestion: "Investigate backend issues or implement circuit breaker",
      });
    }

    // Check circuit breaker status
    const circuitBreakers = report.circuitBreakers;
    Object.entries(circuitBreakers).forEach(([dataType, status]) => {
      if (status.failures > 2) {
        issues.push({
          type: "Circuit Breaker Issues",
          description: `${dataType} has ${status.failures} failures, state: ${status.state}`,
          impact: "Data unavailable or unreliable",
          suggestion: "Check backend service health for " + dataType,
        });
      }
    });

    // Check cache efficiency
    const cache = report.cache;
    const totalCacheHits = Object.values(cache).filter((c) => c.hasData).length;
    const totalCacheAttempts = Object.keys(cache).length;
    if (totalCacheAttempts > 0 && totalCacheHits / totalCacheAttempts < 0.5) {
      issues.push({
        type: "Low Cache Efficiency",
        description: `Cache hit rate: ${Math.round(
          (totalCacheHits / totalCacheAttempts) * 100
        )}%`,
        impact: "More API calls than necessary",
        suggestion:
          "Review cache TTL settings or check for cache invalidation issues",
      });
    }

    return { issues, summary: `${issues.length} issues detected` };
  }

  /**
   * Get performance recommendations
   */
  getRecommendations(report) {
    const recommendations = [];

    // General recommendations
    if (
      report.polling.isPolling &&
      Object.keys(report.subscribers).length === 0
    ) {
      recommendations.push(
        "Polling is active but no subscribers detected - potential memory leak"
      );
    }

    if (Object.keys(report.subscribers).length > 5) {
      recommendations.push(
        "Many subscribers detected - consider if all are necessary"
      );
    }

    const metrics = report.performanceMetrics;
    if (metrics.api_call && metrics.api_call.average > 5000) {
      recommendations.push(
        "Very slow API calls detected - urgent backend optimization needed"
      );
    }

    if (!report.polling.isTabVisible && report.polling.isPolling) {
      recommendations.push(
        "Tab is not visible but polling continues - good for background updates"
      );
    }

    return recommendations;
  }

  /**
   * Check for specific performance issues
   */
  checkPerformanceIssues() {
    const report = this.getFullReport();
    const issues = report.analysis.issues;

    if (issues.length === 0) {
      console.log("✅ No performance issues detected");
      return false;
    }

    console.group("⚠️ Performance Issues Summary");
    issues.forEach((issue, index) => {
      console.warn(`${index + 1}. ${issue.type}: ${issue.description}`);
    });
    console.groupEnd();

    return issues;
  }

  /**
   * Enable verbose logging
   */
  enableVerboseLogging() {
    console.log("🔊 Verbose logging enabled");
    // This could be expanded to intercept and log all dataManager operations
  }

  /**
   * Disable verbose logging
   */
  disableVerboseLogging() {
    console.log("🔇 Verbose logging disabled");
  }

  /**
   * Simulate slow request for testing
   */
  simulateSlowRequest(dataType, delay = 5000) {
    console.log(`🐌 Simulating slow ${dataType} request (${delay}ms delay)`);
    // This would need to be implemented in the actual dataManager
    // For now, just log the intent
  }
}

// Create singleton instance
const dataManagerDebugger = new DataManagerDebugger();

// Auto-enable in development (check for common development indicators)
if (
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
    window.location.hostname.includes("dev") ||
    window.location.port)
) {
  dataManagerDebugger.enableDebugMode();
}

export default dataManagerDebugger;

/**
 * Quick debug utilities for components
 */
export const debugDataManager = {
  logStatus: () => dataManager.logPerformanceReport(),
  getSubscribers: () => dataManager.getSubscriberInfo(),
  getCircuitBreakers: () => dataManager.getCircuitBreakerStatus(),
  getCacheStatus: () => dataManager.getCacheStatus(),
  reset: () => dataManager.reset(),
  enableDebug: () => dataManagerDebugger.enableDebugMode(),
  disableDebug: () => dataManagerDebugger.disableDebugMode(),
};
