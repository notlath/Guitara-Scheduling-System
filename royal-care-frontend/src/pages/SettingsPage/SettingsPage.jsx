import { useEffect, useState } from "react";
import "../../styles/Placeholders.css";
import "../../styles/Settings.css";

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState("general");

  useEffect(() => {
    document.title = "Settings | Royal Care";
  }, []);

  return (
    <div className="settings-container">
      <div className="settings-content">
        <h1>Settings</h1>

        <div className="settings-tabs">
          <button
            className={`tab-button ${activeTab === "general" ? "active" : ""}`}
            onClick={() => setActiveTab("general")}
          >
            General
          </button>
          <button
            className={`tab-button ${activeTab === "account" ? "active" : ""}`}
            onClick={() => setActiveTab("account")}
          >
            Account
          </button>
          <button
            className={`tab-button ${
              activeTab === "notifications" ? "active" : ""
            }`}
            onClick={() => setActiveTab("notifications")}
          >
            Notifications
          </button>
          <button
            className={`tab-button ${
              activeTab === "appearance" ? "active" : ""
            }`}
            onClick={() => setActiveTab("appearance")}
          >
            Appearance
          </button>
        </div>

        <div className="settings-tab-content">
          {activeTab === "general" && (
            <div className="tab-pane">
              <h2>General Settings</h2>
              <p className="placeholder-text">
                This section will contain general application settings such as:
              </p>
              <ul className="placeholder-list">
                <li>Language preferences</li>
                <li>Time zone settings</li>
                <li>Date and time format</li>
                <li>Default view options</li>
                <li>Automatic logout timer</li>
              </ul>
              <p className="placeholder-coming-soon">Coming soon...</p>
              <div className="placeholder-loader"></div>
            </div>
          )}

          {activeTab === "account" && (
            <div className="tab-pane">
              <h2>Account Settings</h2>
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
          )}

          {activeTab === "notifications" && (
            <div className="tab-pane">
              <h2>Notification Settings</h2>
              <p className="placeholder-text">
                This section will allow you to configure notification
                preferences:
              </p>
              <ul className="placeholder-list">
                <li>Email notification preferences</li>
                <li>In-app notification settings</li>
                <li>Alert sound options</li>
                <li>Notification frequency</li>
                <li>Custom notification thresholds</li>
              </ul>
              <p className="placeholder-coming-soon">Coming soon...</p>
              <div className="placeholder-loader"></div>
            </div>
          )}

          {activeTab === "appearance" && (
            <div className="tab-pane">
              <h2>Appearance Settings</h2>
              <p className="placeholder-text">
                This section will let you customize the application's
                appearance:
              </p>
              <ul className="placeholder-list">
                <li>Theme selection (light/dark)</li>
                <li>Color accent preferences</li>
                <li>Font size adjustment</li>
                <li>Display density options</li>
                <li>Dashboard layout customization</li>
              </ul>
              <p className="placeholder-coming-soon">Coming soon...</p>
              <div className="placeholder-loader"></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
