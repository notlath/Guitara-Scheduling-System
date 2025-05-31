import { useEffect } from "react";
import "../../styles/Placeholders.css";

const CompanyInfoPage = () => {
  useEffect(() => {
    document.title = "Company Information | Royal Care";
  }, []);

  return (
    <div className="placeholder-container">
      <div className="placeholder-content">
        <h1>Company Information</h1>
        <p className="placeholder-text">
          This page is currently under development. The Company Information page
          will include:
        </p>
        <ul className="placeholder-list">
          <li>History and background of Royal Care</li>
          <li>Mission, vision, and values</li>
          <li>Key management team</li>
          <li>Service locations and facilities</li>
          <li>Corporate social responsibility initiatives</li>
        </ul>
        <p className="placeholder-coming-soon">Coming soon...</p>
        <div className="placeholder-loader"></div>
      </div>
    </div>
  );
};

export default CompanyInfoPage;
