import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import rcLogo from "../assets/images/rc_logo.jpg";
import "../styles/MainLayout.css";

const MainLayout = () => {
  // Add location tracker for debugging
  const location = useLocation();
  const [showHelpSublinks, setShowHelpSublinks] = useState(false);
  const [showAboutSublinks, setShowAboutSublinks] = useState(false);

  useEffect(() => {
    console.log("Current location:", location.pathname);

    // Add extra debugging information
    console.log("Route params:", location);
    console.log(
      "Router matching current location:",
      location.pathname === "/dashboard/scheduling"
    );
  }, [location]);

  // Toggle sublink visibility
  const toggleHelpSublinks = (e) => {
    e.preventDefault();
    setShowHelpSublinks(!showHelpSublinks);
    setShowAboutSublinks(false); // Close other sublinks when opening this one
  };

  const toggleAboutSublinks = (e) => {
    e.preventDefault();
    setShowAboutSublinks(!showAboutSublinks);
    setShowHelpSublinks(false); // Close other sublinks when opening this one
  };

  return (
    <div className="main-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="logo">
          <NavLink to="/dashboard">
            <img src={rcLogo} alt="Royal Care Logo" />
          </NavLink>
        </div>
        <nav className="nav-links">
          <NavLink
            to="/dashboard/scheduling"
            className={({ isActive }) => {
              console.log("Scheduling link active state:", isActive);
              return isActive ? "active-link" : "";
            }}
            onClick={() => {
              console.log(
                "Scheduling link clicked, navigating to /dashboard/scheduling"
              );
            }}
          >
            Bookings
          </NavLink>
          <NavLink
            to="/dashboard/attendance"
            className={({ isActive }) => (isActive ? "active-link" : "")}
          >
            Attendance
          </NavLink>
          <NavLink
            to="/dashboard/sales-reports"
            className={({ isActive }) => (isActive ? "active-link" : "")}
          >
            Sales & Reports
          </NavLink>
          <NavLink
            to="/dashboard/inventory"
            className={({ isActive }) => (isActive ? "active-link" : "")}
          >
            Inventory
          </NavLink>
        </nav>
        <div className="divider"></div>
        <div className="bottom-links">
          <NavLink
            to="/dashboard/settings"
            className={({ isActive }) => (isActive ? "active-link" : "")}
          >
            Settings
          </NavLink>
          <NavLink
            to="/dashboard/profile"
            className={({ isActive }) => (isActive ? "active-link" : "")}
          >
            Profile
          </NavLink>

          {/* Help Section with Sublinks */}
          <a href="#" className="sublink-parent" onClick={toggleHelpSublinks}>
            Help
            <span className={`dropdown-icon ${showHelpSublinks ? "open" : ""}`}>
              ▼
            </span>
          </a>
          {showHelpSublinks && (
            <div className="sublinks">
              <NavLink
                to="/dashboard/help/user-guide"
                className={({ isActive }) => (isActive ? "active-link" : "")}
              >
                User Guide
              </NavLink>
              <NavLink
                to="/dashboard/help/faqs"
                className={({ isActive }) => (isActive ? "active-link" : "")}
              >
                FAQs
              </NavLink>
              <NavLink
                to="/dashboard/help/contact"
                className={({ isActive }) => (isActive ? "active-link" : "")}
              >
                Contact Email Support
              </NavLink>
            </div>
          )}

          {/* About Section with Sublinks */}
          <a href="#" className="sublink-parent" onClick={toggleAboutSublinks}>
            About
            <span
              className={`dropdown-icon ${showAboutSublinks ? "open" : ""}`}
            >
              ▼
            </span>
          </a>
          {showAboutSublinks && (
            <div className="sublinks">
              <NavLink
                to="/dashboard/about/company"
                className={({ isActive }) => (isActive ? "active-link" : "")}
              >
                Company Information
              </NavLink>
              <NavLink
                to="/dashboard/about/system"
                className={({ isActive }) => (isActive ? "active-link" : "")}
              >
                System Information
              </NavLink>
              <NavLink
                to="/dashboard/about/developers"
                className={({ isActive }) => (isActive ? "active-link" : "")}
              >
                Developer Information
              </NavLink>
            </div>
          )}
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
