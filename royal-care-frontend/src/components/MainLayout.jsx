import { useEffect, useState } from "react";
import {
  MdAccessTime,
  MdBarChart,
  MdBusiness,
  MdCalendarMonth,
  MdDevices,
  MdEmail,
  MdHelpOutline,
  MdInfoOutline,
  MdInventory,
  MdKeyboardArrowDown,
  MdMenuBook,
  MdPeople,
  MdPerson,
  MdQuestionAnswer,
  MdSchedule,
  MdSettings,
  MdTableChart,
} from "react-icons/md";
import { useSelector } from "react-redux";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import rcLogo from "../assets/images/rc_logo.jpg";
import "../styles/MainLayout.css";

const MainLayout = () => {
  // Add location tracker for debugging
  const location = useLocation();
  const [showHelpSublinks, setShowHelpSublinks] = useState(false);
  const [showAboutSublinks, setShowAboutSublinks] = useState(false);
  const [showSettingsSublinks, setShowSettingsSublinks] = useState(false); // State for settings sublinks
  // Get current user from Redux store
  const { user } = useSelector((state) => state.auth);

  // Check if user is therapist or driver
  const isTherapistOrDriver =
    user && (user.role === "therapist" || user.role === "driver");

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
    setShowSettingsSublinks(false); // Close settings sublinks
  };

  const toggleAboutSublinks = (e) => {
    e.preventDefault();
    setShowAboutSublinks(!showAboutSublinks);
    setShowHelpSublinks(false); // Close other sublinks when opening this one
    setShowSettingsSublinks(false); // Close settings sublinks
  };

  const toggleSettingsSublinks = (e) => {
    e.preventDefault();
    setShowSettingsSublinks(!showSettingsSublinks);
    setShowHelpSublinks(false);
    setShowAboutSublinks(false);
  };

  // Helper function to get the appropriate dashboard route based on user role
  const getDashboardRoute = () => {
    if (!user) return "/dashboard";

    switch (user.role) {
      case "operator":
        // Operators use the main dashboard (OperatorDashboard)
        return "/dashboard";
      case "therapist":
        // Therapists use the specific TherapistDashboard
        return "/dashboard";
      case "driver":
        // Drivers use the DriverDashboard
        return "/dashboard";
      default:
        return "/dashboard";
    }
  };

  const handleLogoClick = () => {
    const route = getDashboardRoute();
    console.log(
      `Logo clicked - User role: ${user?.role}, Redirecting to: ${route}`
    );
  };

  return (
    <div className="main-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="logo">
          <NavLink to={getDashboardRoute()} onClick={handleLogoClick}>
            <img src={rcLogo} alt="Royal Care Logo" />
          </NavLink>
        </div>
        <nav className="nav-links">
          {isTherapistOrDriver ? (
            <>
              <NavLink
                to="/dashboard/scheduling"
                className={({ isActive }) => {
                  console.log("Schedule link active state:", isActive);
                  return isActive ? "active-link" : "";
                }}
                onClick={() => {
                  console.log(
                    "Schedule link clicked, navigating to /dashboard/scheduling"
                  );
                }}
              >
                <MdSchedule
                  style={{ marginRight: "0.5em", fontSize: "1.2em" }}
                />
                Schedule
              </NavLink>
              <NavLink
                to="/dashboard/attendance"
                className={({ isActive }) => (isActive ? "active-link" : "")}
              >
                <MdAccessTime
                  style={{ marginRight: "0.5em", fontSize: "1.2em" }}
                />
                Attendance
              </NavLink>
            </>
          ) : (
            <>
              <NavLink
                to="/dashboard/scheduling"
                className={({ isActive }) => {
                  console.log("Bookings link active state:", isActive);
                  return isActive ? "active-link" : "";
                }}
                onClick={() => {
                  console.log(
                    "Bookings link clicked, navigating to /dashboard/scheduling"
                  );
                }}
              >
                <MdCalendarMonth
                  style={{ marginRight: "0.5em", fontSize: "1.2em" }}
                />
                Bookings
              </NavLink>
              <NavLink
                to="/dashboard/attendance"
                className={({ isActive }) => (isActive ? "active-link" : "")}
              >
                <MdAccessTime
                  style={{ marginRight: "0.5em", fontSize: "1.2em" }}
                />
                Attendance
              </NavLink>
            </>
          )}
          {!isTherapistOrDriver && (
            <>
              <NavLink
                to="/dashboard/sales-reports"
                className={({ isActive }) => (isActive ? "active-link" : "")}
              >
                <MdBarChart
                  style={{ marginRight: "0.5em", fontSize: "1.2em" }}
                />
                Sales & Reports
              </NavLink>
              <NavLink
                to="/dashboard/inventory"
                className={({ isActive }) => (isActive ? "active-link" : "")}
              >
                <MdInventory
                  style={{ marginRight: "0.5em", fontSize: "1.2em" }}
                />
                Inventory
              </NavLink>
            </>
          )}
        </nav>
        <div className="divider"></div>
        <div className="bottom-links">
          <NavLink
            to="/dashboard/profile"
            className={({ isActive }) => (isActive ? "active-link" : "")}
          >
            <MdPerson style={{ marginRight: "0.5em", fontSize: "1.2em" }} />
            Profile
          </NavLink>
          {/* Settings Section with Sublinks */}
          <a
            href="#"
            className="sidebar-link sublink-parent"
            onClick={toggleSettingsSublinks}
          >
            <span className="sidebar-link-content">
              <MdSettings style={{ marginRight: "0.5em", fontSize: "1.2em" }} />
              Settings
            </span>
            <span
              className={`dropdown-icon ${showSettingsSublinks ? "open" : ""}`}
            >
              <MdKeyboardArrowDown style={{ fontSize: "1.2em" }} />
            </span>
          </a>
          <div className={`sublinks${showSettingsSublinks ? " open" : ""}`}>
            <NavLink
              to="/dashboard/settings/account"
              className={({ isActive }) => (isActive ? "active-link" : "")}
            >
              <MdPerson style={{ marginRight: "0.5em", fontSize: "1.2em" }} />
              Account
            </NavLink>
            {!isTherapistOrDriver && (
              <NavLink
                to="/dashboard/settings/data"
                className={({ isActive }) => (isActive ? "active-link" : "")}
              >
                {/* Changed icon to MdTableChart for data management */}
                <MdTableChart
                  style={{ marginRight: "0.5em", fontSize: "1.2em" }}
                />
                Data
              </NavLink>
            )}
          </div>

          {/* Help Section with Sublinks */}
          <a
            href="#"
            className="sidebar-link sublink-parent"
            onClick={toggleHelpSublinks}
          >
            <span className="sidebar-link-content">
              <MdHelpOutline
                style={{ marginRight: "0.5em", fontSize: "1.2em" }}
              />
              Help
            </span>
            <span className={`dropdown-icon ${showHelpSublinks ? "open" : ""}`}>
              <MdKeyboardArrowDown style={{ fontSize: "1.2em" }} />
            </span>
          </a>
          <div className={`sublinks${showHelpSublinks ? " open" : ""}`}>
            <NavLink
              to="/dashboard/help/user-guide"
              className={({ isActive }) => (isActive ? "active-link" : "")}
            >
              <MdMenuBook style={{ marginRight: "0.5em", fontSize: "1.2em" }} />
              User Guide
            </NavLink>
            <NavLink
              to="/dashboard/help/faqs"
              className={({ isActive }) => (isActive ? "active-link" : "")}
            >
              <MdQuestionAnswer
                style={{ marginRight: "0.5em", fontSize: "1.2em" }}
              />
              FAQs
            </NavLink>
            <NavLink
              to="/dashboard/help/contact"
              className={({ isActive }) => (isActive ? "active-link" : "")}
            >
              <MdEmail style={{ marginRight: "0.5em", fontSize: "1.2em" }} />
              Email Support
            </NavLink>
          </div>

          {/* About Section with Sublinks */}
          <a
            href="#"
            className="sidebar-link sublink-parent"
            onClick={toggleAboutSublinks}
          >
            <span className="sidebar-link-content">
              <MdInfoOutline
                style={{ marginRight: "0.5em", fontSize: "1.2em" }}
              />
              About
            </span>
            <span
              className={`dropdown-icon ${showAboutSublinks ? "open" : ""}`}
            >
              <MdKeyboardArrowDown style={{ fontSize: "1.2em" }} />
            </span>
          </a>
          <div className={`sublinks${showAboutSublinks ? " open" : ""}`}>
            <NavLink
              to="/dashboard/about/company"
              className={({ isActive }) => (isActive ? "active-link" : "")}
            >
              <MdBusiness style={{ marginRight: "0.5em", fontSize: "1.2em" }} />
              Company Information
            </NavLink>
            <NavLink
              to="/dashboard/about/system"
              className={({ isActive }) => (isActive ? "active-link" : "")}
            >
              <MdDevices style={{ marginRight: "0.5em", fontSize: "1.2em" }} />
              System Information
            </NavLink>
            <NavLink
              to="/dashboard/about/developers"
              className={({ isActive }) => (isActive ? "active-link" : "")}
            >
              <MdPeople style={{ marginRight: "0.5em", fontSize: "1.2em" }} />
              Developer Information
            </NavLink>
          </div>
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
