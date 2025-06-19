/**
 * OperatorDashboard Integration Wrapper
 * Provides backward compatibility while migrating to the new ModernOperatorDashboard
 */

import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

// Import both dashboards
import ModernOperatorDashboard from "./ModernOperatorDashboard";
import LegacyOperatorDashboard from "./OperatorDashboard"; // The existing dashboard

// Feature flag hook
const useFeatureFlag = (flagName, defaultValue = false) => {
  const [searchParams] = useSearchParams();
  const [flagValue, setFlagValue] = useState(defaultValue);

  useEffect(() => {
    // Check URL parameter first
    const urlParam = searchParams.get(flagName);
    if (urlParam !== null) {
      setFlagValue(urlParam === "true");
      return;
    }

    // Check localStorage
    const storedValue = localStorage.getItem(`feature_${flagName}`);
    if (storedValue !== null) {
      setFlagValue(storedValue === "true");
      return;
    }

    // Check environment variable (simplified)
    setFlagValue(defaultValue);
  }, [flagName, searchParams, defaultValue]);

  return flagValue;
};

const OperatorDashboard = () => {
  const useModernDashboard = useFeatureFlag("modern_dashboard", false);
  const [dashboardError, setDashboardError] = useState(null);

  // Reset error when switching dashboards
  useEffect(() => {
    setDashboardError(null);
  }, [useModernDashboard]);

  // Dashboard switcher (for development/testing)
  const DashboardSwitcher = () => {
    const isDev = window.location.hostname === "localhost";
    if (!isDev) return null;

    return (
      <div
        style={{
          position: "fixed",
          top: "10px",
          right: "10px",
          zIndex: 9999,
          background: "#007bff",
          color: "white",
          padding: "8px 12px",
          borderRadius: "4px",
          fontSize: "12px",
          cursor: "pointer",
          boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
        }}
        onClick={() => {
          const newValue = !useModernDashboard;
          localStorage.setItem("feature_modern_dashboard", newValue.toString());
          window.location.reload();
        }}
      >
        {useModernDashboard ? "Switch to Legacy" : "Switch to Modern"}
      </div>
    );
  };

  // Render dashboard based on feature flag
  if (useModernDashboard && !dashboardError) {
    return (
      <>
        <ModernOperatorDashboard />
        <DashboardSwitcher />
      </>
    );
  }

  return (
    <>
      <LegacyOperatorDashboard />
      <DashboardSwitcher />
    </>
  );
};

export default OperatorDashboard;
