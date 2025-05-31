import { useEffect } from "react";
import "../../styles/Placeholders.css";

const ContactPage = () => {
  useEffect(() => {
    document.title = "Contact Support | Royal Care";
  }, []);

  return (
    <div className="placeholder-container">
      <div className="placeholder-content">
        <h1>Contact Email Support</h1>
        <p className="placeholder-text">
          This page is currently under development. The Contact Support page
          will include:
        </p>
        <ul className="placeholder-list">
          <li>Email support form for technical issues</li>
          <li>Priority level options for urgent matters</li>
          <li>File attachment capabilities for screenshots</li>
          <li>Support ticket tracking system</li>
          <li>Typical response time information</li>
        </ul>
        <p className="placeholder-coming-soon">Coming soon...</p>
        <div className="placeholder-loader"></div>
      </div>
    </div>
  );
};

export default ContactPage;
