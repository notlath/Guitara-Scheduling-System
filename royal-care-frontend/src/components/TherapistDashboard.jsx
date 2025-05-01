import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { logout } from "../features/auth/authSlice";

const TherapistDashboard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const handleLogout = () => {
    localStorage.removeItem("knoxToken");
    localStorage.removeItem("user");
    dispatch(logout());
    navigate("/");
  };

  return (
    <div>
      <h1>Therapist Dashboard</h1>
      <p>Welcome to the Therapist Dashboard!</p>
      <button onClick={handleLogout}>Logout</button>
    </div>
  );
};

export default TherapistDashboard;
