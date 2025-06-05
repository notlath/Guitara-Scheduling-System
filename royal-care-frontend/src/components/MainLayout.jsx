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
          {isTherapistOrDriver ? (
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
              <MdSchedule style={{ marginRight: "0.5em", fontSize: "1.2em" }} />
              Schedule
            </NavLink>
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
          <NavLink
            to="/dashboard/settings"
            className={({ isActive }) => (isActive ? "active-link" : "")}
          >
            <MdSettings style={{ marginRight: "0.5em", fontSize: "1.2em" }} />
            Settings
          </NavLink>
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
              <MdMenuBook style={{ marginRight: "0.5em", fontSize: "1.1em" }} />
              User Guide
            </NavLink>
            <NavLink
              to="/dashboard/help/faqs"
              className={({ isActive }) => (isActive ? "active-link" : "")}
            >
              <MdQuestionAnswer
                style={{ marginRight: "0.5em", fontSize: "1.1em" }}
              />
              FAQs
            </NavLink>
            <NavLink
              to="/dashboard/help/contact"
              className={({ isActive }) => (isActive ? "active-link" : "")}
            >
              <MdEmail style={{ marginRight: "0.5em", fontSize: "1.1em" }} />
              Contact Email Support
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
              <MdBusiness style={{ marginRight: "0.5em", fontSize: "1.1em" }} />
              Company Information
            </NavLink>
            <NavLink
              to="/dashboard/about/system"
              className={({ isActive }) => (isActive ? "active-link" : "")}
            >
              <MdDevices style={{ marginRight: "0.5em", fontSize: "1.1em" }} />
              System Information
            </NavLink>
            <NavLink
              to="/dashboard/about/developers"
              className={({ isActive }) => (isActive ? "active-link" : "")}
            >
              <MdPeople style={{ marginRight: "0.5em", fontSize: "1.1em" }} />
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
