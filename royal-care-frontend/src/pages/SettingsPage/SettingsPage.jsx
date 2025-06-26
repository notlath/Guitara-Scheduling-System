import { useEffect, useState } from "react";
import "../../styles/Placeholders.css";
import "../../styles/Settings.css";
import pageTitles from "../../constants/pageTitles";
import TabSwitcher from "../../globals/TabSwitcher";

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState("general");

  useEffect(() => {
    document.title = pageTitles.settings;
  }, []);

  return (
    <div className="settings-container">
      <div className="settings-content">
        <h1>Settings</h1>

        <TabSwitcher
          tabs={[
            { label: "General", value: "general" },
            { label: "Notifications", value: "notifications" },
            { label: "Appearance", value: "appearance" },
          ]}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

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
