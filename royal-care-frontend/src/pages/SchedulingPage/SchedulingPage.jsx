import { useEffect } from "react";
import { shallowEqual } from "react-redux";
import SchedulingDashboard from "../../components/scheduling/SchedulingDashboard";
import pageTitles from "../../constants/pageTitles";
import { useOptimizedSelector } from "../../hooks/usePerformanceOptimization";

const SchedulingPage = () => {
  const user = useOptimizedSelector((state) => state.auth.user, shallowEqual);

  useEffect(() => {
    document.title = pageTitles.scheduling;
  }, []);

  return (
    <div className="scheduling-page">
      {user ? (
        <SchedulingDashboard />
      ) : (
        <div>Please log in to view the scheduling dashboard</div>
      )}
    </div>
  );
};

export default SchedulingPage;
