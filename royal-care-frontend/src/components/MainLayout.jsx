import { useEffect } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import rcLogo from "../assets/images/rc_logo.jpg";
import "../styles/MainLayout.css";

const MainLayout = () => {
  // Add location tracker for debugging
  const location = useLocation();

  useEffect(() => {
    console.log("Current location:", location.pathname);

    // Add extra debugging information
    console.log("Route params:", location);
    console.log(
      "Router matching current location:",
      location.pathname === "/dashboard/scheduling",
    );
  }, [location]);

  return (
    <div className="main-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="logo">
          <img src={rcLogo} alt="Royal Care Logo" />
        </div>
        <nav className="nav-links">
          <NavLink
            to="/bookings"
            className={({ isActive }) => (isActive ? "active-link" : "")}
          >
            Bookings
          </NavLink>
          <NavLink
            to="/dashboard/scheduling"
            className={({ isActive }) => {
              console.log("Scheduling link active state:", isActive);
              return isActive ? "active-link" : "";
            }}
            onClick={() => {
              console.log(
                "Scheduling link clicked, navigating to /dashboard/scheduling",
              );
            }}
          >
            Scheduling
          </NavLink>
          <NavLink
            to="/attendance"
            className={({ isActive }) => (isActive ? "active-link" : "")}
          >
            Attendance
          </NavLink>
          <NavLink
            to="/sales-reports"
            className={({ isActive }) => (isActive ? "active-link" : "")}
          >
            Sales & Reports
          </NavLink>
          <NavLink
            to="/inventory"
            className={({ isActive }) => (isActive ? "active-link" : "")}
          >
            Inventory
          </NavLink>
        </nav>
        <div className="bottom-links">
          <NavLink to="/settings">Settings</NavLink>
          <NavLink to="/profile">Profile</NavLink>
        </div>
      </aside>

      {/* Main Content */}
      <main className="content">
        <div className="content-body">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default MainLayout;
