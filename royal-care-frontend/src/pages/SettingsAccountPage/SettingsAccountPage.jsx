import { useEffect } from "react";

import "../../styles/Placeholders.css";
import "../../styles/Settings.css";
import pageTitles from "../../constants/pageTitles";

const SettingsAccountPage = () => {
  useEffect(() => {
    document.title = pageTitles.accountSettings;
  }, []);

  return (
    <div className="settings-container">
      <div className="settings-content">
        <h1>Account Settings</h1>
        <div className="tab-pane">
          <p className="placeholder-text">
            This section will contain account management options such as:
          </p>
          <ul className="placeholder-list">
            <li>Change password</li>
            <li>Update email address</li>
            <li>Two-factor authentication settings</li>
            <li>Manage account access</li>
            <li>Session management</li>
          </ul>
          <p className="placeholder-coming-soon">Coming soon...</p>
          <div className="placeholder-loader"></div>
        </div>
      </div>
    </div>
  );
};

export default SettingsAccountPage;
