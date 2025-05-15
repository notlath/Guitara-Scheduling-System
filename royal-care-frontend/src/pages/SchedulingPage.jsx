import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import SchedulingDashboard from "../components/scheduling/SchedulingDashboard";

const SchedulingPage = () => {
  const [componentError, setComponentError] = useState(null);
  const { user } = useSelector((state) => state.auth);
  const { loading, error } = useSelector((state) => state.scheduling);

  // Add debugging to check what's happening
  useEffect(() => {
    console.log("SchedulingPage loaded");
    console.log("Current user:", user);
    console.log("Scheduling state:", { loading, error });

    // Check if the component exists without using require.resolve
    try {
      console.log("SchedulingDashboard exists:", !!SchedulingDashboard);
    } catch (err) {
      console.error("Error checking SchedulingDashboard:", err);
      setComponentError(err.message);
    }
  }, [user, loading, error]);

  // Add debugging for SchedulingDashboard component mounting
  useEffect(() => {
    const checkSchedulingDashboard = () => {
      try {
        console.log("SchedulingDashboard component loaded successfully");
        console.log("Component:", SchedulingDashboard);
        console.log("Props:", { user });
        return true;
      } catch (err) {
        console.error("Error checking SchedulingDashboard:", err);
        return false;
      }
    };

    checkSchedulingDashboard();
  }, [user]);

  // Error boundary functionality
  const renderDashboard = () => {
    try {
      return <SchedulingDashboard />;
    } catch (err) {
      console.error("Error rendering SchedulingDashboard:", err);
      setComponentError(err.message);
      return (
        <div className="error-message">
          Error rendering dashboard: {err.message}
        </div>
      );
    }
  };

  // Show loading or error states explicitly
  if (loading) {
    return (
      <div className="loading-message">Loading scheduling dashboard...</div>
    );
  }

  if (error) {
    return <div className="error-message">API Error: {error}</div>;
  }

  if (componentError) {
    return (
      <div className="error-message">Component Error: {componentError}</div>
    );
  }

  return (
    <div className="scheduling-page">
      <h2>Scheduling Dashboard</h2>
      {user ? (
        renderDashboard()
      ) : (
        <div>Please log in to view the scheduling dashboard</div>
      )}
    </div>
  );
};

export default SchedulingPage;
