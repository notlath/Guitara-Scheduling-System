import { NavLink, Outlet } from "react-router-dom";
import rcLogo from "../assets/images/rc_logo.jpg";
import "../styles/MainLayout.css";

const MainLayout = () => {
  return (
    <div className="main-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="logo">
          <img src={rcLogo} alt="Royal Care Logo" />
        </div>
        <nav className="nav-links">
          <NavLink to="/bookings" activeClassName="active-link">
            Bookings
          </NavLink>
          <NavLink to="/attendance" activeClassName="active-link">
            Attendance
          </NavLink>
          <NavLink to="/sales-reports" activeClassName="active-link">
            Sales & Reports
          </NavLink>
          <NavLink to="/inventory" activeClassName="active-link">
            Inventory
          </NavLink>
        </nav>
        <div className="bottom-links">
          <NavLink to="/settings" activeClassName="active-link">
            Settings
          </NavLink>
          <NavLink to="/profile" activeClassName="active-link">
            Profile
          </NavLink>
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
