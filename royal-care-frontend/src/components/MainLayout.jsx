import { useState } from "react";
import {
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
  MdTableChart,
  MdEventAvailable,
} from "react-icons/md";
import { useSelector } from "react-redux";
import { NavLink, Outlet } from "react-router-dom";
import rcLogo from "../assets/images/rc_logo.jpg";
import "../styles/MainLayout.css";

const MainLayout = () => {
  const [showHelpSublinks, setShowHelpSublinks] = useState(false);
  const [showAboutSublinks, setShowAboutSublinks] = useState(false);
  const { user } = useSelector((state) => state.auth);

  const isTherapistOrDriver =
    user && (user.role === "therapist" || user.role === "driver");

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
        <nav className="nav-links">
          {isTherapistOrDriver ? (
            <>
              <NavLink
                to="/dashboard/scheduling"
                className={({ isActive }) => (isActive ? "active-link" : "")}
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
                <MdEventAvailable
                  style={{ marginRight: "0.5em", fontSize: "1.2em" }}
                />
                Attendance
              </NavLink>
            </>
          ) : (
            <>
              <NavLink
                to="/dashboard/scheduling"
                className={({ isActive }) => (isActive ? "active-link" : "")}
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
                <MdEventAvailable
                  style={{ marginRight: "0.5em", fontSize: "1.2em" }}
                />
                Attendance
              </NavLink>
              <div className="divider"></div>
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
              <NavLink
                to="/dashboard/settings/data"
                className={({ isActive }) => (isActive ? "active-link" : "")}
              >
                <MdTableChart
                  style={{ marginRight: "0.5em", fontSize: "1.2em" }}
                />
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
            <MdPerson style={{ marginRight: "0.5em", fontSize: "1.2em" }} />
            Profile
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
