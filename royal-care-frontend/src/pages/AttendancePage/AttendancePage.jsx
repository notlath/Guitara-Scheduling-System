import { useEffect } from "react";

import "../../../src/styles/Placeholders.css";

const AttendancePage = () => {
  useEffect(() => {
    document.title = "Attendance | Royal Care";
  }, []);

  return (
    <div className="placeholder-container">
      <div className="placeholder-content">
        <h1>Staff Attendance Tracking</h1>
        <p className="placeholder-text">
          This page is currently under development. The Attendance tracking
          system will allow you to:
        </p>
        <ul className="placeholder-list">
          <li>Track therapist and driver attendance</li>
          <li>View attendance history and patterns</li>
          <li>Generate attendance reports</li>
          <li>Manage time-off requests</li>
          <li>Monitor late arrivals and absences</li>
        </ul>

        <div className="placeholder-stat">
          <h3>Attendance Summary</h3>
          <p>Current month's attendance data will appear here</p>
        </div>

        <p className="placeholder-coming-soon">Coming soon...</p>
        <div className="placeholder-loader"></div>
      </div>
    </div>
  );
};

export default AttendancePage;
