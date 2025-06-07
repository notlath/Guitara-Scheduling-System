import "../../styles/Placeholders.css";
import "../../styles/Settings.css";

const SettingsDataPage = () => {
  return (
    <div className="settings-container">
      <div className="settings-content">
        <h1>Data Settings</h1>
        <div className="tab-pane">
          <p className="placeholder-text">
            This section will contain data management options such as:
          </p>
          <ul className="placeholder-list">
            <li>Export account data</li>
            <li>Import data</li>
            <li>Download activity logs</li>
            <li>Data privacy controls</li>
            <li>Delete account/data</li>
          </ul>
          <p className="placeholder-coming-soon">Coming soon...</p>
          <div className="placeholder-loader"></div>
        </div>
      </div>
    </div>
  );
};

export default SettingsDataPage;
