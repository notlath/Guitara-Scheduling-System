import { useEffect } from "react";
import { useSelector } from "react-redux";
import SchedulingDashboard from "../components/scheduling/SchedulingDashboard";

const SchedulingPage = () => {
  const { user } = useSelector((state) => state.auth);

  useEffect(() => {
    document.title = "Scheduling | Royal Care";
  }, []);

  return (
    <div className="scheduling-page">
      <h2>Booking Dashboard</h2>
      {user ? (
        <SchedulingDashboard />
      ) : (
        <div>Please log in to view the scheduling dashboard</div>
      )}
    </div>
  );
};

export default SchedulingPage;
