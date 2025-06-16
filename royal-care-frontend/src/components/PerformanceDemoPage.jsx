/**
 * Performance Demo Dashboard
 * Demonstrates all advanced performance optimization features
 */

import { useEffect, useState } from "react";
import { useSelector } from "react-redux";

// Import all performance optimization hooks and components
import { useOptimisticUpdates } from "../hooks/useOptimisticUpdates";
import { useProgressiveData } from "../hooks/useProgressiveData";
import { useSmartUX } from "../hooks/useSmartUX";
import cachePreloader from "../services/cachePreloader";
import crossTabSync from "../services/crossTabSync";
import memoryManager from "../services/memoryManager";
import AdaptiveLoadingIndicator from "./SmartLoadingStates";

import "./PerformanceDemoPage.css";

/**
 * Performance Demo Page - showcases all optimization features
 */
const PerformanceDemoPage = () => {
  const { user } = useSelector((state) => state.auth);
  const [demoData, setDemoData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeDemo, setActiveDemo] = useState("optimistic");

  // Smart UX detection
  const {
    uxState,
    performanceMetrics,
    shouldShowSkeletons,
    shouldPreloadAggressively,
    shouldReduceAnimations,
    trackOperationPerformance,
  } = useSmartUX();

  // Optimistic updates demo
  const {
    optimisticData: optimisticItems,
    addOptimistic,
    updateOptimistic,
    removeOptimistic,
    rollbackOptimistic,
    commitOptimistic,
    isOptimistic,
  } = useOptimisticUpdates(demoData, "id");

  // Progressive data loading demo
  const {
    data: progressiveData,
    isLoading: progressiveLoading,
    hasEssentialData,
    hasCompleteData,
    progress,
    loadPhase,
    loadEssential,
    loadComplete,
  } = useProgressiveData("performanceDemo", {
    essentialFields: ["id", "title", "status"],
    standardFields: ["description", "category", "priority"],
    completeFields: ["metadata", "analytics", "fullDetails"],
  });

  // Demo data simulation
  useEffect(() => {
    const generateDemoData = () => {
      return Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        title: `Task ${i + 1}`,
        description: `Description for task ${i + 1}`,
        status: ["pending", "in_progress", "completed"][
          Math.floor(Math.random() * 3)
        ],
        category: ["urgent", "normal", "low"][Math.floor(Math.random() * 3)],
        priority: Math.floor(Math.random() * 5) + 1,
        metadata: { created: new Date().toISOString() },
        analytics: { views: Math.floor(Math.random() * 100) },
        fullDetails: `Extended information for task ${i + 1}`,
      }));
    };

    setDemoData(generateDemoData());
  }, []);

  // Demo actions
  const handleOptimisticAdd = async () => {
    const startTime = Date.now();
    const newItem = {
      id: Date.now(),
      title: `New Task ${Date.now()}`,
      description: "Optimistically added task",
      status: "pending",
      category: "normal",
      priority: 3,
    };

    try {
      // Add optimistically
      addOptimistic(newItem, "add");

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Simulate 20% failure rate
      if (Math.random() < 0.2) {
        throw new Error("API call failed");
      }

      // Commit the optimistic update
      commitOptimistic(newItem.id);
      setDemoData((prev) => [...prev, newItem]);
    } catch (error) {
      console.error("Failed to add item:", error);
      rollbackOptimistic(newItem.id);
    } finally {
      trackOperationPerformance(Date.now() - startTime);
    }
  };

  const handleOptimisticUpdate = async (item) => {
    const startTime = Date.now();
    const updatedItem = {
      ...item,
      status: item.status === "pending" ? "in_progress" : "completed",
      lastModified: Date.now(),
    };

    try {
      // Update optimistically
      updateOptimistic(item.id, updatedItem, "update");

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Simulate 15% failure rate
      if (Math.random() < 0.15) {
        throw new Error("Update failed");
      }

      // Commit the optimistic update
      commitOptimistic(item.id);
      setDemoData((prev) =>
        prev.map((i) => (i.id === item.id ? updatedItem : i))
      );
    } catch (error) {
      console.error("Failed to update item:", error);
      rollbackOptimistic(item.id);
    } finally {
      trackOperationPerformance(Date.now() - startTime);
    }
  };

  const handleOptimisticDelete = async (item) => {
    const startTime = Date.now();

    try {
      // Remove optimistically
      removeOptimistic(item.id, "delete");

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Simulate 10% failure rate
      if (Math.random() < 0.1) {
        throw new Error("Delete failed");
      }

      // Commit the optimistic update
      commitOptimistic(item.id);
      setDemoData((prev) => prev.filter((i) => i.id !== item.id));
    } catch (error) {
      console.error("Failed to delete item:", error);
      rollbackOptimistic(item.id);
    } finally {
      trackOperationPerformance(Date.now() - startTime);
    }
  };

  const handleCachePreload = async () => {
    setIsLoading(true);
    const startTime = Date.now();

    try {
      await cachePreloader.preloadCriticalData(user?.role);
      await cachePreloader.preloadRouteData("/dashboard");
      console.log("Cache preloading completed");
    } catch (error) {
      console.error("Cache preloading failed:", error);
    } finally {
      setIsLoading(false);
      trackOperationPerformance(Date.now() - startTime);
    }
  };

  const handleMemoryOptimization = () => {
    const stats = memoryManager.getMemoryStats();
    console.log("Memory stats before optimization:", stats);

    memoryManager.forceCleanup();

    setTimeout(() => {
      const newStats = memoryManager.getMemoryStats();
      console.log("Memory stats after optimization:", newStats);
    }, 1000);
  };

  const handleCrossTabSync = () => {
    const testData = {
      timestamp: Date.now(),
      message: "Hello from tab!",
      user: user?.id,
    };

    crossTabSync.broadcastCacheUpdate("demo_data", testData);
    console.log("Broadcasted data to other tabs:", testData);
  };

  // Render demo sections
  const renderOptimisticDemo = () => (
    <div className="demo-section">
      <h3>Optimistic Updates Demo</h3>
      <p>Items update immediately, with rollback on failure</p>

      <div className="demo-controls">
        <button onClick={handleOptimisticAdd} className="btn-primary">
          Add Item Optimistically
        </button>
      </div>

      <div className="demo-items">
        {optimisticItems.map((item) => (
          <div
            key={item.id}
            className={`demo-item ${isOptimistic(item.id) ? "optimistic" : ""}`}
          >
            <h4>{item.title}</h4>
            <p>Status: {item.status}</p>
            {isOptimistic(item.id) && (
              <span className="optimistic-badge">Pending...</span>
            )}
            <div className="item-actions">
              <button
                onClick={() => handleOptimisticUpdate(item)}
                disabled={isOptimistic(item.id)}
                className="btn-secondary"
              >
                Update Status
              </button>
              <button
                onClick={() => handleOptimisticDelete(item)}
                disabled={isOptimistic(item.id)}
                className="btn-danger"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderProgressiveDemo = () => (
    <div className="demo-section">
      <h3>Progressive Data Loading Demo</h3>
      <p>Data loads in phases: essential → standard → complete</p>

      <div className="demo-controls">
        <button onClick={loadEssential} className="btn-primary">
          Load Essential Data
        </button>
        <button onClick={loadComplete} className="btn-secondary">
          Load Complete Data
        </button>
      </div>

      <div className="progress-info">
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <p>
          Phase: {loadPhase} | Progress: {Math.round(progress)}%
        </p>
        <p>Has Essential: {hasEssentialData ? "✅" : "❌"}</p>
        <p>Has Complete: {hasCompleteData ? "✅" : "❌"}</p>
        <p>Data Items: {progressiveData?.length || 0}</p>
      </div>

      {progressiveData && progressiveData.length > 0 && (
        <div className="progressive-data-preview">
          <h4>Loaded Data Preview:</h4>
          {progressiveData.slice(0, 3).map((item, index) => (
            <div key={index} className="data-item">
              <strong>{item.title || "Loading..."}</strong>
              {item.description && <p>{item.description}</p>}
              {item.fullDetails && <small>{item.fullDetails}</small>}
            </div>
          ))}
        </div>
      )}

      {progressiveLoading && (
        <AdaptiveLoadingIndicator
          show={true}
          hasData={hasEssentialData}
          isRefreshing={progressiveLoading}
          context="progressive"
          operation="Loading progressive data"
          priority="normal"
          userActivity={uxState.userActivity}
          connectionQuality={uxState.connectionQuality}
          devicePerformance={uxState.devicePerformance}
        />
      )}
    </div>
  );

  const renderSmartLoadingDemo = () => (
    <div className="demo-section">
      <h3>Smart Loading States Demo</h3>
      <p>Adaptive loading indicators based on context and performance</p>

      <div className="demo-controls">
        <button
          onClick={() => {
            setIsLoading(true);
            setTimeout(() => setIsLoading(false), 3000);
          }}
          className="btn-primary"
        >
          Trigger Loading State
        </button>
      </div>

      <div className="ux-metrics">
        <h4>Current UX Context:</h4>
        <ul>
          <li>Connection: {uxState.connectionQuality}</li>
          <li>Device Performance: {uxState.devicePerformance}</li>
          <li>User Activity: {uxState.userActivity}</li>
          <li>User Patience: {uxState.userPatience}</li>
          <li>
            Avg Load Time: {Math.round(performanceMetrics.averageLoadTime)}ms
          </li>
        </ul>
      </div>

      <div className="loading-examples">
        <AdaptiveLoadingIndicator
          show={isLoading}
          hasData={false}
          context="dashboard"
          operation="Loading dashboard data"
          priority="high"
          userActivity={uxState.userActivity}
          connectionQuality={uxState.connectionQuality}
          devicePerformance={uxState.devicePerformance}
        />

        <AdaptiveLoadingIndicator
          show={isLoading}
          hasData={true}
          isRefreshing={true}
          context="background"
          operation="Refreshing in background"
          priority="low"
          userActivity={uxState.userActivity}
          connectionQuality={uxState.connectionQuality}
          devicePerformance={uxState.devicePerformance}
        />
      </div>
    </div>
  );

  const renderServiceDemo = () => (
    <div className="demo-section">
      <h3>Performance Services Demo</h3>
      <p>Cache preloading, memory management, and cross-tab sync</p>

      <div className="demo-controls">
        <button onClick={handleCachePreload} className="btn-primary">
          Preload Cache
        </button>
        <button onClick={handleMemoryOptimization} className="btn-secondary">
          Optimize Memory
        </button>
        <button onClick={handleCrossTabSync} className="btn-accent">
          Sync Across Tabs
        </button>
      </div>

      {isLoading && (
        <AdaptiveLoadingIndicator
          show={true}
          hasData={false}
          context="form"
          operation="Preloading cache data"
          priority="normal"
          userActivity={uxState.userActivity}
          connectionQuality={uxState.connectionQuality}
          devicePerformance={uxState.devicePerformance}
        />
      )}
    </div>
  );

  return (
    <div className="performance-demo-page">
      <div className="demo-header">
        <h1>Performance Optimization Demo</h1>
        <p>Explore all advanced performance features</p>

        <div className="demo-tabs">
          {[
            { id: "optimistic", label: "Optimistic Updates" },
            { id: "progressive", label: "Progressive Loading" },
            { id: "smart", label: "Smart Loading" },
            { id: "services", label: "Performance Services" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveDemo(tab.id)}
              className={`tab-button ${activeDemo === tab.id ? "active" : ""}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="demo-content">
        {activeDemo === "optimistic" && renderOptimisticDemo()}
        {activeDemo === "progressive" && renderProgressiveDemo()}
        {activeDemo === "smart" && renderSmartLoadingDemo()}
        {activeDemo === "services" && renderServiceDemo()}
      </div>

      <div className="demo-footer">
        <h4>Performance Insights:</h4>
        <ul>
          <li>Should show skeletons: {shouldShowSkeletons ? "Yes" : "No"}</li>
          <li>
            Should preload aggressively:{" "}
            {shouldPreloadAggressively ? "Yes" : "No"}
          </li>
          <li>
            Should reduce animations: {shouldReduceAnimations ? "Yes" : "No"}
          </li>
          <li>Operations tracked: {performanceMetrics.operationCount}</li>
          <li>Slow operations: {performanceMetrics.slowOperations}</li>
        </ul>
      </div>
    </div>
  );
};

export default PerformanceDemoPage;
