import { useEffect } from "react";
import { useSelector } from "react-redux";
import SchedulingDashboard from "../../components/scheduling/SchedulingDashboard";
import pageTitles from "../../constants/pageTitles";

const SchedulingPage = () => {
  const { user } = useSelector((state) => state.auth);

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
