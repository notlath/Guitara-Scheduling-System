import { useEffect } from "react";
import "../../styles/Placeholders.css";

const FAQsPage = () => {
  useEffect(() => {
    document.title = "FAQs | Royal Care";
  }, []);

  return (
    <div className="placeholder-container">
      <div className="placeholder-content">
        <h1>Frequently Asked Questions</h1>
        <p className="placeholder-text">
          This page is currently under development. The FAQs section will
          include:
        </p>
        <ul className="placeholder-list">
          <li>Common questions about booking procedures</li>
          <li>Questions about accessibility and accommodations</li>
          <li>Account management FAQs</li>
          <li>Scheduling and availability questions</li>
          <li>System requirements and technical support</li>
        </ul>
        <p className="placeholder-coming-soon">Coming soon...</p>
        <div className="placeholder-loader"></div>
      </div>
    </div>
  );
};

export default FAQsPage;
