import { useEffect } from "react";
import "../../styles/Placeholders.css";
import pageTitles from "../../constants/pageTitles";

const UserGuidePage = () => {
  useEffect(() => {
    document.title = pageTitles.userGuide;
  }, []);

  return (
    <div className="placeholder-container">
      <div className="placeholder-content">
        <h1>User Guide</h1>
        <p className="placeholder-text">
          This page is currently under development. The User Guide will provide:
        </p>
        <ul className="placeholder-list">
          <li>Step-by-step instructions for using the Royal Care system</li>
          <li>Tutorial videos for common tasks</li>
          <li>Best practices for booking management</li>
          <li>Tips for efficient workflow</li>
          <li>Keyboard shortcuts and system features</li>
        </ul>
        <p className="placeholder-coming-soon">Coming soon...</p>
        <div className="placeholder-loader"></div>
      </div>
    </div>
  );
};

export default UserGuidePage;
