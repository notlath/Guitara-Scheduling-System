import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { logout } from "../features/auth/authSlice";

const DriverDashboard = () => {
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
      <h1>Driver Dashboard</h1>
      <p>Welcome to the Driver Dashboard!</p>
      <button onClick={handleLogout}>Logout</button>
    </div>
  );
};

export default DriverDashboard;
