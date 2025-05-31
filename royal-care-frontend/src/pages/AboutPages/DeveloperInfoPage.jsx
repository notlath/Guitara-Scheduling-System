import { useEffect } from "react";
import "../../styles/Placeholders.css";

const DeveloperInfoPage = () => {
  useEffect(() => {
    document.title = "Developer Information | Royal Care";
  }, []);

  return (
    <div className="placeholder-container">
      <div className="placeholder-content">
        <h1>Developer Information</h1>
        <p className="placeholder-text">
          This page is currently under development. The Developer Information
          page will include:
        </p>
        <ul className="placeholder-list">
          <li>Meet the development team</li>
          <li>Technology stack and implementation details</li>
          <li>API documentation references</li>
          <li>Third-party integrations</li>
          <li>GitHub repository and contribution guidelines</li>
        </ul>
        <p className="placeholder-coming-soon">Coming soon...</p>
        <div className="placeholder-loader"></div>
      </div>
    </div>
  );
};

export default DeveloperInfoPage;
