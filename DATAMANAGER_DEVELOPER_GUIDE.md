# Enhanced DataManager - Developer Quick Start Guide

## 🚀 Quick Start

### Basic Usage

```javascript
import { useDataManager } from "../hooks/useDataManager";

function MyComponent() {
  const {
    appointments,
    notifications,
    loading,
    isStaleData,
    healthStatus,
    cacheHitRate,
    forceRefresh,
  } = useDataManager("MyComponent", ["appointments", "notifications"]);

  return (
    <div>
      {loading ? "Loading..." : "Data loaded!"}
      {isStaleData && <Warning>Data may be outdated</Warning>}
      <div>Cache efficiency: {Math.round(cacheHitRate * 100)}%</div>
      <div>Health: {healthStatus}</div>
    </div>
  );
}
```

### Specialized Hooks

#### Real-time Data

```javascript
import { useRealtimeData } from "../hooks/useDataManager";

function AlertDashboard() {
  const { emergencyAlerts, vehicleStatus, notifications } =
    useRealtimeData("AlertDashboard");

  return <div>{/* Real-time alerts */}</div>;
}
```

#### Analytics Dashboard

```javascript
import { useAnalyticsData } from "../hooks/useDataManager";

function ReportsPage() {
  const { analytics, reports, appointments } = useAnalyticsData("ReportsPage", [
    "financial",
    "operational",
  ]);

  return <div>{/* Analytics dashboard */}</div>;
}
```

## 🔧 Advanced Features

### Health Monitoring

```javascript
function HealthIndicator() {
  const { healthStatus, checkHealth, hasErrors, lastError } = useDataManager(
    "HealthIndicator",
    []
  );

  const handleHealthCheck = async () => {
    const report = await checkHealth();
    console.log("Health Report:", report);
  };

  return (
    <div>
      <span className={`health-${healthStatus}`}>
        {healthStatus.toUpperCase()}
      </span>
      {hasErrors && <div>Error: {lastError}</div>}
      <button onClick={handleHealthCheck}>Check Health</button>
    </div>
  );
}
```

### Performance Analytics

```javascript
function PerformanceMonitor() {
  const {
    getAnalytics,
    getCacheStatus,
    getPerformanceReport,
    averageResponseTime,
    dataFreshness,
  } = useDataManager("PerformanceMonitor", []);

  const showAnalytics = () => {
    const analytics = getAnalytics();
    console.log("Cache Efficiency:", analytics.cacheEfficiency);
    console.log("Network Efficiency:", analytics.networkEfficiency);
    console.log("Memory Usage:", analytics.memoryUsage);
  };

  return (
    <div>
      <div>Avg Response: {averageResponseTime}ms</div>
      <div>Data Freshness: {Math.round(dataFreshness * 100)}%</div>
      <button onClick={showAnalytics}>Show Analytics</button>
    </div>
  );
}
```

## 🛠️ Development Tools

### Browser Console Commands

When in development mode, these utilities are available:

```javascript
// Access the full dataManager
window.dataManager;

// Get analytics report
window.dmAnalytics();

// Run health check
window.dmHealth();

// Performance report
window.dmReport();

// Example usage:
const analytics = window.dmAnalytics();
console.log("Cache hit rate:", analytics.cacheEfficiency);
console.log("Memory usage:", analytics.memoryUsage);
```

### Debug Information

```javascript
function DebugPanel() {
  const { metrics, isSubscribed, subscriberInfo, cacheAge, dataSource } =
    useDataManager("DebugPanel", ["appointments"]);

  return (
    <div className="debug-panel">
      <h3>Debug Info</h3>
      <div>Subscribed: {isSubscribed ? "✅" : "❌"}</div>
      <div>Data Source: {dataSource}</div>
      <div>
        Cache Age: {cacheAge ? `${Math.round(cacheAge / 1000)}s` : "N/A"}
      </div>
      <div>Health: {metrics.healthStatus}</div>
      <pre>{JSON.stringify(subscriberInfo, null, 2)}</pre>
    </div>
  );
}
```

## 📊 Performance Best Practices

### 1. Choose Appropriate Data Types

```javascript
// ✅ Good - only request what you need
const { todayAppointments } = useDataManager("TodayView", [
  "todayAppointments",
]);

// ❌ Bad - requesting unnecessary data
const { appointments, analytics, reports } = useDataManager("TodayView", [
  "appointments",
  "analytics",
  "reports",
  "settings",
]);
```

### 2. Handle Loading States

```javascript
function AppointmentsList() {
  const { appointments, loading, isRefreshing, hasImmediateData, isStaleData } =
    useDataManager("AppointmentsList", ["appointments"]);

  // Show immediate cached data while refreshing
  if (loading && !hasImmediateData) {
    return <LoadingSpinner />;
  }

  return (
    <div>
      {isRefreshing && <RefreshIndicator />}
      {isStaleData && <StaleDataWarning />}
      <AppointmentList data={appointments} />
    </div>
  );
}
```

### 3. Error Handling

```javascript
function RobustComponent() {
  const {
    appointments,
    error,
    hasErrors,
    lastError,
    forceRefresh,
    refreshIfStale,
  } = useDataManager("RobustComponent", ["appointments"]);

  if (error || hasErrors) {
    return (
      <ErrorBoundary
        error={lastError}
        onRetry={forceRefresh}
        onRefreshStale={refreshIfStale}
      />
    );
  }

  return <div>{/* Normal content */}</div>;
}
```

## 🎯 Common Patterns

### Dashboard with Multiple Data Types

```javascript
function OperatorDashboard() {
  const {
    appointments,
    notifications,
    emergencyAlerts,
    vehicleStatus,
    loading,
    healthStatus,
  } = useDashboardData("OperatorDashboard", "operator");

  return (
    <Dashboard>
      <HealthIndicator status={healthStatus} />
      <AppointmentsWidget data={appointments} loading={loading} />
      <NotificationsWidget data={notifications} />
      <AlertsWidget data={emergencyAlerts} />
      <VehicleStatusWidget data={vehicleStatus} />
    </Dashboard>
  );
}
```

### Conditional Data Loading

```javascript
function ConditionalLoader({ userRole, showAnalytics }) {
  const dataTypes = useMemo(() => {
    const types = ["appointments", "notifications"];
    if (showAnalytics) types.push("analytics", "reports");
    if (userRole === "admin") types.push("settings");
    return types;
  }, [userRole, showAnalytics]);

  const data = useDataManager("ConditionalLoader", dataTypes);

  return <div>{/* Render based on available data */}</div>;
}
```

## 🚨 Troubleshooting

### Common Issues

1. **High Memory Usage**

   ```javascript
   // Check memory status
   const analytics = window.dmAnalytics();
   if (analytics.memoryUsage.percentage > 80) {
     // Force cleanup
     window.dataManager.forceRefresh();
   }
   ```

2. **Slow Performance**

   ```javascript
   // Check response times
   const report = window.dmReport();
   console.log("Average response time:", report.averageResponseTime);

   // Check cache efficiency
   if (report.cacheHitRate < 0.3) {
     console.warn("Low cache hit rate - consider adjusting TTL");
   }
   ```

3. **Network Issues**
   ```javascript
   // Check health status
   const health = await window.dmHealth();
   if (health.status !== "healthy") {
     console.log("Issues:", health.issues);
     console.log("Recommendations:", health.recommendations);
   }
   ```

## 📈 Monitoring & Alerts

### Set Up Performance Monitoring

```javascript
function PerformanceAlert() {
  const { averageResponseTime, cacheHitRate, healthStatus } = useDataManager(
    "PerformanceAlert",
    []
  );

  useEffect(() => {
    if (averageResponseTime > 5000) {
      console.warn("Slow API responses detected");
    }
    if (cacheHitRate < 0.2) {
      console.warn("Low cache efficiency");
    }
    if (healthStatus === "degraded") {
      console.error("System health degraded");
    }
  }, [averageResponseTime, cacheHitRate, healthStatus]);

  return null; // Monitoring component
}
```

This enhanced dataManager provides enterprise-grade performance, monitoring, and resilience for your React scheduling application!
