import { useEffect } from "react";
import "../../styles/Placeholders.css";

const SystemInfoPage = () => {
  useEffect(() => {
    document.title = "System Information | Royal Care";
  }, []);

  return (
    <div className="placeholder-container">
      <div className="placeholder-content">
        <h1>System Information</h1>
        <p className="placeholder-text">
          This page is currently under development. The System Information page
          will include:
        </p>
        <ul className="placeholder-list">
          <li>Current system version and release notes</li>
          <li>Technology stack and architecture overview</li>
          <li>Security and data protection information</li>
          <li>System requirements and compatibility</li>
          <li>Planned updates and feature roadmap</li>
        </ul>
        <p className="placeholder-coming-soon">Coming soon...</p>
        <div className="placeholder-loader"></div>
      </div>
    </div>
  );
};

export default SystemInfoPage;
