import { useState } from "react";
import {
  MdBarChart,
  MdBusiness,
  MdDashboard,
  MdDevices,
  MdEmail,
  MdHelpOutline,
  MdInfoOutline,
  MdInventory,
  MdKeyboardArrowDown,
  MdMenuBook,
  MdNotifications,
  MdPeople,
  MdPerson,
  MdQuestionAnswer,
  MdSchedule,
  MdTableChart,
  MdEventAvailable,
  MdCalendarMonth,
} from "react-icons/md";
import { useSelector } from "react-redux";
import { NavLink, Outlet } from "react-router-dom";
import rcLogo from "../assets/images/rc_logo.jpg";
import "../styles/MainLayout.css";

const MainLayout = () => {
  const [showHelpSublinks, setShowHelpSublinks] = useState(false);
  const [showAboutSublinks, setShowAboutSublinks] = useState(false);
  const { user } = useSelector((state) => state.auth);
  const unreadNotificationCount = useSelector(
    (state) => state.scheduling?.unreadNotificationCount || 0
  );

  const isTherapistOrDriver =
    user && (user.role === "therapist" || user.role === "driver");

  // Toggle sublink visibility
  const toggleHelpSublinks = (e) => {
    e.preventDefault();
    setShowHelpSublinks(!showHelpSublinks);
    setShowAboutSublinks(false);
  };

  const toggleAboutSublinks = (e) => {
    e.preventDefault();
    setShowAboutSublinks(!showAboutSublinks);
    setShowHelpSublinks(false);
  };

  // Get dashboard route based on user role
  const getDashboardRoute = () => "/dashboard";

  return (
    <div className="main-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="logo">
          <NavLink to={getDashboardRoute()}>
            <img src={rcLogo} alt="Royal Care Logo" />
          </NavLink>
        </div>
        <div className="notification-link">
          <NavLink
            to="/dashboard/notifications"
            className={({ isActive }) => (isActive ? "active-link" : "")}
          >
            <MdNotifications className="main-layout__sidebar-icon" />
            Notifications
            {unreadNotificationCount > 0 && (
              <span className="tab-count">{unreadNotificationCount}</span>
            )}
          </NavLink>
        </div>
        <div className="divider"></div>
        <nav className="nav-links">
          <NavLink
            to="/dashboard"
            end
            className={({ isActive }) => (isActive ? "active-link" : "")}
          >
            <MdDashboard className="main-layout__sidebar-icon" />
            Dashboard
          </NavLink>
          {isTherapistOrDriver ? (
            <>
              <NavLink
                to="/dashboard/scheduling"
                className={({ isActive }) => (isActive ? "active-link" : "")}
              >
                <MdSchedule className="main-layout__sidebar-icon" />
                Schedule
              </NavLink>
              <NavLink
                to="/dashboard/attendance"
                className={({ isActive }) => (isActive ? "active-link" : "")}
              >
                <MdEventAvailable className="main-layout__sidebar-icon" />
                Attendance
              </NavLink>
            </>
          ) : (
            <>
              <NavLink
                to="/dashboard/scheduling"
                className={({ isActive }) => (isActive ? "active-link" : "")}
              >
                <MdCalendarMonth className="main-layout__sidebar-icon" />
                Bookings
              </NavLink>
              <NavLink
                to="/dashboard/attendance"
                className={({ isActive }) => (isActive ? "active-link" : "")}
              >
                <MdEventAvailable className="main-layout__sidebar-icon" />
                Attendance
              </NavLink>
              <div className="divider"></div>
              <NavLink
                to="/dashboard/sales-reports"
                className={({ isActive }) => (isActive ? "active-link" : "")}
              >
                <MdBarChart className="main-layout__sidebar-icon" />
                Sales & Reports
              </NavLink>
              <NavLink
                to="/dashboard/inventory"
                className={({ isActive }) => (isActive ? "active-link" : "")}
              >
                <MdInventory className="main-layout__sidebar-icon" />
                Inventory
              </NavLink>
              <NavLink
                to="/dashboard/settings/data"
                className={({ isActive }) => (isActive ? "active-link" : "")}
              >
                <MdTableChart className="main-layout__sidebar-icon" />
                Data
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
            <MdPerson className="main-layout__sidebar-icon" />
            Profile
          </NavLink>
          {/* Help Section with Sublinks */}
          <a
            href="#"
            className="sidebar-link sublink-parent"
            onClick={toggleHelpSublinks}
          >
            <span className="sidebar-link-content">
              <MdHelpOutline className="main-layout__sidebar-icon" />
              Help
            </span>
            <span className={`dropdown-icon ${showHelpSublinks ? "open" : ""}`}>
              <MdKeyboardArrowDown className="main-layout__dropdown-arrow" />
            </span>
          </a>
          <div className={`sublinks${showHelpSublinks ? " open" : ""}`}>
            <NavLink
              to="/dashboard/help/user-guide"
              className={({ isActive }) => (isActive ? "active-link" : "")}
            >
              <MdMenuBook className="main-layout__sidebar-icon" />
              User Guide
            </NavLink>
            <NavLink
              to="/dashboard/help/faqs"
              className={({ isActive }) => (isActive ? "active-link" : "")}
            >
              <MdQuestionAnswer className="main-layout__sidebar-icon" />
              FAQs
            </NavLink>
            <NavLink
              to="/dashboard/help/contact"
              className={({ isActive }) => (isActive ? "active-link" : "")}
            >
              <MdEmail className="main-layout__sidebar-icon" />
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
              <MdInfoOutline className="main-layout__sidebar-icon" />
              About
            </span>
            <span
              className={`dropdown-icon ${showAboutSublinks ? "open" : ""}`}
            >
              <MdKeyboardArrowDown className="main-layout__dropdown-arrow" />
            </span>
          </a>
          <div className={`sublinks${showAboutSublinks ? " open" : ""}`}>
            <NavLink
              to="/dashboard/about/company"
              className={({ isActive }) => (isActive ? "active-link" : "")}
            >
              <MdBusiness className="main-layout__sidebar-icon" />
              Company Information
            </NavLink>
            <NavLink
              to="/dashboard/about/system"
              className={({ isActive }) => (isActive ? "active-link" : "")}
            >
              <MdDevices className="main-layout__sidebar-icon" />
              System Information
            </NavLink>
            <NavLink
              to="/dashboard/about/developers"
              className={({ isActive }) => (isActive ? "active-link" : "")}
            >
              <MdPeople className="main-layout__sidebar-icon" />
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
