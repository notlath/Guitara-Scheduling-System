/**
 * Performance Monitor Component
 * Tracks and displays real-time performance metrics for the Operator Dashboard
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { usePerformanceTracker } from "../hooks/usePerformanceOptimization";
import "./PerformanceMonitor.css";

const PerformanceMonitor = ({
  componentName = "OperatorDashboard",
  enabled = false,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [performanceData, setPerformanceData] = useState({
    renderCount: 0,
    averageRenderTime: 0,
    memoryUsage: 0,
    reRenderReasons: [],
    slowOperations: [],
  });

  const { getMetrics } = usePerformanceTracker(componentName, {
    trackRenders: enabled,
    trackUpdates: enabled,
    slowRenderThreshold: 16,
  });

  const observerRef = useRef(null);
  const updateIntervalRef = useRef(null);
  const getMetricsRef = useRef(getMetrics);

  // Keep getMetrics ref updated
  useEffect(() => {
    getMetricsRef.current = getMetrics;
  }, [getMetrics]);

  // Stabilized metrics update function that doesn't change on every render
  const updateMetrics = useCallback(() => {
    if (!enabled) return;

    try {
      const metrics = getMetricsRef.current();
      setPerformanceData((prev) => ({
        ...prev,
        renderCount: metrics.renderCount || 0,
        averageRenderTime: parseFloat(metrics.avgRenderTime || 0),
      }));
    } catch (error) {
      console.warn("Failed to update performance metrics:", error);
    }
  }, [enabled]);

  // Update metrics periodically instead of on every render
  useEffect(() => {
    if (!enabled) return;

    // Update metrics immediately
    updateMetrics();

    // Then update every 2 seconds
    updateIntervalRef.current = setInterval(updateMetrics, 2000);

    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
        updateIntervalRef.current = null;
      }
    };
  }, [enabled, updateMetrics]);

  // Memory usage monitoring - stabilized
  useEffect(() => {
    if (!enabled || !window.performance?.memory) return;

    const updateMemoryUsage = () => {
      try {
        const memory = window.performance.memory;
        const memoryUsage = Math.round(memory.usedJSHeapSize / 1024 / 1024); // MB

        setPerformanceData((prev) => ({
          ...prev,
          memoryUsage,
        }));
      } catch (error) {
        console.warn("Failed to get memory usage:", error);
      }
    };

    // Update immediately
    updateMemoryUsage();

    // Then update every 3 seconds (less frequent to reduce overhead)
    const interval = setInterval(updateMemoryUsage, 3000);
    return () => clearInterval(interval);
  }, [enabled]);

  // Detect slow operations - stabilized
  useEffect(() => {
    if (!enabled) return;

    const handlePerformanceEntries = (list) => {
      try {
        const entries = list.getEntries();
        const slowOps = entries
          .filter((entry) => entry.duration > 50) // Operations slower than 50ms
          .map((entry) => ({
            name: entry.name,
            duration: Math.round(entry.duration),
            timestamp: Date.now(),
          }))
          .slice(0, 5); // Keep only last 5

        if (slowOps.length > 0) {
          setPerformanceData((prev) => ({
            ...prev,
            slowOperations: [...prev.slowOperations.slice(-4), ...slowOps],
          }));
        }
      } catch (error) {
        console.warn("Error processing performance entries:", error);
      }
    };

    let observer = null;
    try {
      observer = new PerformanceObserver(handlePerformanceEntries);
      observer.observe({ entryTypes: ["measure", "navigation"] });
      observerRef.current = observer;
    } catch (error) {
      console.warn("Performance Observer not supported:", error);
    }

    return () => {
      if (observer) {
        observer.disconnect();
      }
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
    };
  }, [enabled]); // Only depend on enabled

  // Keyboard shortcut to toggle visibility
  useEffect(() => {
    if (!enabled) return;

    const handleKeyPress = (event) => {
      // Ctrl + Shift + P to toggle performance monitor
      if (event.ctrlKey && event.shiftKey && event.key === "P") {
        event.preventDefault();
        setIsVisible((prev) => !prev);
      }
    };

    document.addEventListener("keydown", handleKeyPress);
    return () => document.removeEventListener("keydown", handleKeyPress);
  }, [enabled]);

  if (!enabled || !isVisible) {
    return enabled ? (
      <div
        className="performance-monitor-toggle"
        title="Press Ctrl+Shift+P to show performance monitor"
      >
        📊
      </div>
    ) : null;
  }

  const getPerformanceColor = (renderTime) => {
    if (renderTime < 16) return "#4CAF50"; // Green - Good
    if (renderTime < 33) return "#FF9800"; // Orange - Warning
    return "#F44336"; // Red - Poor
  };

  return (
    <div className="performance-monitor">
      <div className="performance-monitor-header">
        <h4>⚡ Performance Monitor</h4>
        <button
          className="close-btn"
          onClick={() => setIsVisible(false)}
          title="Close (Ctrl+Shift+P)"
        >
          ×
        </button>
      </div>

      <div className="performance-metrics">
        <div className="metric">
          <span className="metric-label">Renders:</span>
          <span className="metric-value">{performanceData.renderCount}</span>
        </div>

        <div className="metric">
          <span className="metric-label">Avg Render:</span>
          <span
            className="metric-value"
            style={{
              color: getPerformanceColor(performanceData.averageRenderTime),
            }}
          >
            {performanceData.averageRenderTime.toFixed(1)}ms
          </span>
        </div>

        {window.performance?.memory && (
          <div className="metric">
            <span className="metric-label">Memory:</span>
            <span className="metric-value">
              {performanceData.memoryUsage}MB
            </span>
          </div>
        )}
      </div>

      {performanceData.slowOperations.length > 0 && (
        <div className="slow-operations">
          <h5>🐌 Slow Operations</h5>
          <div className="slow-ops-list">
            {performanceData.slowOperations.slice(-3).map((op, index) => (
              <div key={index} className="slow-op">
                <span className="op-name">{op.name}</span>
                <span className="op-duration">{op.duration}ms</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="performance-tips">
        <div className="tip">
          <strong>Green (&lt;16ms):</strong> Excellent performance
        </div>
        <div className="tip">
          <strong>Orange (16-33ms):</strong> Acceptable but could be better
        </div>
        <div className="tip">
          <strong>Red (&gt;33ms):</strong> Performance issues - check for
          unnecessary re-renders
        </div>
      </div>
    </div>
  );
};

export default PerformanceMonitor;
