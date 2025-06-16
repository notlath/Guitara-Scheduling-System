/**
 * Enhanced Memory Management & Cache Prioritization Service
 * Implements Solution #3: Intelligent cache eviction and memory optimization
 */

import dataManager from "./dataManager";

class MemoryManager {
  constructor() {
    this.memoryThresholds = {
      maxCacheSize: 1000,
      warningThreshold: 0.8, // 80% of max
      criticalThreshold: 0.95, // 95% of max
      maxRecentOperations: 50,
      maxPerformanceMetrics: 100,
    };

    this.dataTypePriorities = new Map();
    this.usagePatterns = new Map();
    this.memoryPressureState = "normal"; // normal, warning, critical
    this.cleanupInterval = null;

    this.setupDataTypePriorities();
    this.startMemoryMonitoring();
  }

  /**
   * Setup priority weights for different data types
   */
  setupDataTypePriorities() {
    this.dataTypePriorities.set("appointments", {
      weight: 100,
      description: "Critical appointment data",
      minRetention: 5 * 60 * 1000, // 5 minutes minimum
      maxAge: 30 * 60 * 1000, // 30 minutes maximum
    });

    this.dataTypePriorities.set("todayAppointments", {
      weight: 95,
      description: "Today's appointments",
      minRetention: 3 * 60 * 1000, // 3 minutes minimum
      maxAge: 15 * 60 * 1000, // 15 minutes maximum
    });

    this.dataTypePriorities.set("notifications", {
      weight: 85,
      description: "User notifications",
      minRetention: 2 * 60 * 1000, // 2 minutes minimum
      maxAge: 10 * 60 * 1000, // 10 minutes maximum
    });

    this.dataTypePriorities.set("upcomingAppointments", {
      weight: 75,
      description: "Future appointments",
      minRetention: 5 * 60 * 1000, // 5 minutes minimum
      maxAge: 60 * 60 * 1000, // 1 hour maximum
    });

    this.dataTypePriorities.set("analytics", {
      weight: 30,
      description: "Analytics and reports",
      minRetention: 1 * 60 * 1000, // 1 minute minimum
      maxAge: 10 * 60 * 1000, // 10 minutes maximum
    });

    this.dataTypePriorities.set("settings", {
      weight: 20,
      description: "Settings data",
      minRetention: 30 * 1000, // 30 seconds minimum
      maxAge: 5 * 60 * 1000, // 5 minutes maximum
    });
  }

  /**
   * Start memory monitoring and cleanup
   */
  startMemoryMonitoring() {
    // Check memory every 30 seconds
    this.cleanupInterval = setInterval(() => {
      this.checkMemoryPressure();
      this.performIntelligentCleanup();
    }, 30000);

    console.log("🧠 MemoryManager: Started memory monitoring");
  }

  /**
   * Stop memory monitoring
   */
  stopMemoryMonitoring() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    console.log("🧠 MemoryManager: Stopped memory monitoring");
  }

  /**
   * Check current memory pressure and update state
   */
  checkMemoryPressure() {
    const cacheSize = dataManager.cache?.size || 0;
    const usage = cacheSize / this.memoryThresholds.maxCacheSize;

    let newState = "normal";
    if (usage >= this.memoryThresholds.criticalThreshold) {
      newState = "critical";
    } else if (usage >= this.memoryThresholds.warningThreshold) {
      newState = "warning";
    }

    const previousState = this.memoryPressureState;
    this.memoryPressureState = newState;

    if (newState !== previousState) {
      console.log(
        `🧠 MemoryManager: Memory pressure changed from ${previousState} to ${newState} (${Math.round(
          usage * 100
        )}% usage)`
      );

      if (newState === "critical") {
        this.performEmergencyCleanup();
      } else if (newState === "warning") {
        this.performAggressiveCleanup();
      }
    }

    return {
      state: newState,
      usage,
      cacheSize,
      maxSize: this.memoryThresholds.maxCacheSize,
    };
  }

  /**
   * Intelligent cache eviction based on usage patterns and priorities
   */
  intelligentCacheEviction() {
    const now = Date.now();
    const cache = dataManager.cache;
    const cacheEntries = Array.from(cache.entries());

    if (cacheEntries.length === 0) return 0;

    // Calculate priority scores for each cache entry
    const prioritizedEntries = cacheEntries
      .map(([key, cached]) => ({
        key,
        cached,
        priority: this.calculateCachePriority(key, cached, now),
      }))
      .sort((a, b) => a.priority - b.priority); // Lower priority = evict first

    // Determine how many entries to evict based on memory pressure
    let targetEvictions = 0;

    switch (this.memoryPressureState) {
      case "critical":
        targetEvictions = Math.floor(prioritizedEntries.length * 0.5); // Remove 50%
        break;
      case "warning":
        targetEvictions = Math.floor(prioritizedEntries.length * 0.3); // Remove 30%
        break;
      default:
        targetEvictions = Math.floor(prioritizedEntries.length * 0.1); // Remove 10%
    }

    let evicted = 0;
    for (let i = 0; i < targetEvictions && i < prioritizedEntries.length; i++) {
      const entry = prioritizedEntries[i];

      // Don't evict if within minimum retention period
      const priority = this.dataTypePriorities.get(entry.key);
      if (priority && now - entry.cached.timestamp < priority.minRetention) {
        continue;
      }

      cache.delete(entry.key);
      evicted++;

      console.log(
        `🗑️ MemoryManager: Evicted low-priority cache: ${
          entry.key
        } (priority: ${entry.priority.toFixed(2)})`
      );
    }

    return evicted;
  }

  /**
   * Calculate cache priority score (lower = more likely to evict)
   */
  calculateCachePriority(key, cached, now) {
    const age = now - cached.timestamp;
    const accessCount = cached.accessCount || 1;
    const lastAccess = cached.lastAccess || cached.timestamp;
    const timeSinceLastAccess = now - lastAccess;

    // Get data type weight
    const dataTypeWeight = this.getDataTypeWeight(key);

    // Get usage frequency from patterns
    const usagePattern = this.usagePatterns.get(key) || {
      frequency: 1,
      recentUse: 0,
    };

    // Calculate component scores
    const ageScore = age / 1000 / 60; // Age in minutes (higher = lower priority)
    const accessScore = accessCount * 10; // Access count (higher = higher priority)
    const recencyScore = Math.max(0, 100 - timeSinceLastAccess / 1000 / 60); // Recent access bonus
    const typeScore = dataTypeWeight; // Data type importance
    const frequencyScore = usagePattern.frequency * 5; // Usage frequency

    // Combine scores (lower total = lower priority = more likely to evict)
    const priority =
      ageScore - accessScore - recencyScore - typeScore - frequencyScore;

    return Math.max(0, priority); // Ensure non-negative
  }

  /**
   * Get data type weight for prioritization
   */
  getDataTypeWeight(dataType) {
    const priority = this.dataTypePriorities.get(dataType);
    return priority ? priority.weight : 50; // Default weight
  }

  /**
   * Track usage patterns for intelligent caching
   */
  trackUsage(dataType, operation = "access") {
    const now = Date.now();
    const current = this.usagePatterns.get(dataType) || {
      frequency: 0,
      lastAccess: now,
      recentUse: 0,
      operations: [],
    };

    // Update usage patterns
    current.frequency++;
    current.lastAccess = now;
    current.operations.push({ type: operation, timestamp: now });

    // Keep only recent operations (last 10 minutes)
    const tenMinutesAgo = now - 10 * 60 * 1000;
    current.operations = current.operations.filter(
      (op) => op.timestamp > tenMinutesAgo
    );
    current.recentUse = current.operations.length;

    this.usagePatterns.set(dataType, current);

    // Also update cache entry access count
    const cached = dataManager.cache?.get(dataType);
    if (cached) {
      cached.accessCount = (cached.accessCount || 0) + 1;
      cached.lastAccess = now;
    }
  }

  /**
   * Perform intelligent cleanup based on current conditions
   */
  performIntelligentCleanup() {
    const memoryStatus = this.checkMemoryPressure();

    if (memoryStatus.state === "normal") {
      // Light cleanup - only remove truly expired entries
      this.cleanupExpiredEntries();
    } else {
      // More aggressive cleanup needed
      const evicted = this.intelligentCacheEviction();
      console.log(
        `🧠 MemoryManager: Intelligent cleanup completed, evicted ${evicted} entries`
      );
    }

    // Always clean up old metrics and operations
    this.cleanupOldMetrics();
  }

  /**
   * Clean up expired cache entries
   */
  cleanupExpiredEntries() {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, cached] of dataManager.cache.entries()) {
      const priority = this.dataTypePriorities.get(key);
      const maxAge = priority ? priority.maxAge : 30 * 60 * 1000; // Default 30 minutes

      if (now - cached.timestamp > maxAge) {
        dataManager.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 MemoryManager: Cleaned ${cleaned} expired cache entries`);
    }

    return cleaned;
  }

  /**
   * Clean up old performance metrics and operations
   */
  cleanupOldMetrics() {
    // Clean up usage patterns older than 1 hour
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    let patternsCleanup = 0;

    for (const [key, pattern] of this.usagePatterns.entries()) {
      if (pattern.lastAccess < oneHourAgo) {
        this.usagePatterns.delete(key);
        patternsCleanup++;
      }
    }

    if (patternsCleanup > 0) {
      console.log(
        `🧹 MemoryManager: Cleaned ${patternsCleanup} old usage patterns`
      );
    }
  }

  /**
   * Aggressive cleanup for warning state
   */
  performAggressiveCleanup() {
    console.log(
      "⚠️ MemoryManager: Performing aggressive cleanup due to memory warning"
    );

    const evicted = this.intelligentCacheEviction();
    const expired = this.cleanupExpiredEntries();
    this.cleanupOldMetrics();

    console.log(
      `⚠️ MemoryManager: Aggressive cleanup completed - evicted: ${evicted}, expired: ${expired}`
    );
  }

  /**
   * Emergency cleanup for critical memory pressure
   */
  performEmergencyCleanup() {
    console.warn(
      "🚨 MemoryManager: EMERGENCY cleanup - critical memory pressure detected!"
    );

    // More aggressive eviction
    const originalState = this.memoryPressureState;
    this.memoryPressureState = "critical";

    const evicted = this.intelligentCacheEviction();
    const expired = this.cleanupExpiredEntries();

    // Clear all usage patterns to free memory
    this.usagePatterns.clear();

    // Restore original state
    this.memoryPressureState = originalState;

    console.warn(
      `🚨 MemoryManager: Emergency cleanup completed - evicted: ${evicted}, expired: ${expired}`
    );
  }

  /**
   * Get memory usage statistics
   */
  getMemoryStats() {
    const cacheSize = dataManager.cache?.size || 0;
    const usagePatternCount = this.usagePatterns.size;

    return {
      cache: {
        size: cacheSize,
        maxSize: this.memoryThresholds.maxCacheSize,
        usage: (cacheSize / this.memoryThresholds.maxCacheSize) * 100,
        state: this.memoryPressureState,
      },
      patterns: {
        count: usagePatternCount,
        details: Object.fromEntries(this.usagePatterns),
      },
      priorities: Object.fromEntries(this.dataTypePriorities),
      recommendations: this.getMemoryRecommendations(),
    };
  }

  /**
   * Get memory optimization recommendations
   */
  getMemoryRecommendations() {
    const stats = this.getMemoryStats();
    const recommendations = [];

    if (stats.cache.usage > 90) {
      recommendations.push(
        "Critical: Consider increasing cache size or reducing data retention times"
      );
    } else if (stats.cache.usage > 80) {
      recommendations.push(
        "Warning: Monitor cache usage closely, consider cleanup optimization"
      );
    }

    if (stats.patterns.count > 100) {
      recommendations.push("Consider more frequent usage pattern cleanup");
    }

    if (recommendations.length === 0) {
      recommendations.push("Memory usage is optimal");
    }

    return recommendations;
  }

  /**
   * Manual cache optimization
   */
  optimizeCache() {
    console.log("🔧 MemoryManager: Manual cache optimization requested");

    const beforeSize = dataManager.cache?.size || 0;

    this.performIntelligentCleanup();

    const afterSize = dataManager.cache?.size || 0;
    const freed = beforeSize - afterSize;

    console.log(
      `🔧 MemoryManager: Optimization complete - freed ${freed} cache entries`
    );

    return {
      before: beforeSize,
      after: afterSize,
      freed,
      improvement: beforeSize > 0 ? (freed / beforeSize) * 100 : 0,
    };
  }

  /**
   * Reset memory manager state
   */
  reset() {
    this.usagePatterns.clear();
    this.memoryPressureState = "normal";

    console.log("🧠 MemoryManager: State reset completed");
  }
}

// Create singleton instance
const memoryManager = new MemoryManager();

export default memoryManager;
