import { useSelector } from "react-redux";
import SchedulingDashboard from "../components/scheduling/SchedulingDashboard";

const SchedulingPage = () => {
  const { user } = useSelector((state) => state.auth);

  return (
    <div className="scheduling-page">
      <h2>Scheduling Dashboard</h2>
      {user ? (
        <SchedulingDashboard />
      ) : (
        <div>Please log in to view the scheduling dashboard</div>
      )}
    </div>
  );
};

export default SchedulingPage;
