import React, { useState } from "react";
import styles from "./SettingsDataPage.module.css";
import "../../styles/Placeholders.css";
import "../../styles/Settings.css";

const TABS = ["Therapists", "Drivers", "Operators", "Services", "Materials"];

const TAB_PLACEHOLDERS = {
  Therapists: [
    {
      Username: "therapist1",
      Name: "Jane Doe",
      Email: "jane@example.com",
      Contact: "09123456789",
      Specialization: "Swedish",
      Pressure: "Medium",
    },
  ],
  Drivers: [
    {
      Username: "driver1",
      Name: "John Smith",
      Email: "john@example.com",
      Contact: "09987654321",
      Specialization: "N/A",
      Pressure: "N/A",
    },
  ],
  Operators: [
    {
      Username: "operator1",
      Name: "Mary Lee",
      Email: "mary@example.com",
      Contact: "09112223333",
      Specialization: "N/A",
      Pressure: "N/A",
    },
  ],
  Services: [
    {
      Username: "-",
      Name: "Massage",
      Email: "-",
      Contact: "-",
      Specialization: "Deep Tissue",
      Pressure: "High",
    },
  ],
  Materials: [
    {
      Username: "-",
      Name: "Oil",
      Email: "-",
      Contact: "-",
      Specialization: "Lavender",
      Pressure: "-",
    },
  ],
};

const SettingsDataPage = () => {
  const [activeTab, setActiveTab] = useState(TABS[0]);

  return (
    <div className={styles["settings-container"]}>
      <div className={styles["settings-content"]}>
        <div className={styles["settings-header-row"]}>
          <h1>Data</h1>
          <button className={styles["add-btn"]}>+ Add</button>
        </div>
        <div className="tab-switcher">
          {TABS.map((tab) => (
            <button
              key={tab}
              className={"tab-btn" + (activeTab === tab ? " active" : "")}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className={styles["data-table-wrapper"]}>
          <table className={styles["data-table"]}>
            <thead>
              <tr>
                <th scope="col">Username</th>
                <th scope="col">Name</th>
                <th scope="col">Email</th>
                <th scope="col">Contact Number</th>
                <th scope="col">Specialization</th>
                <th scope="col">Pressure Level</th>
              </tr>
            </thead>
            <tbody>
              {TAB_PLACEHOLDERS[activeTab] &&
              TAB_PLACEHOLDERS[activeTab].length > 0 ? (
                TAB_PLACEHOLDERS[activeTab].map((row, idx) => (
                  <tr key={idx}>
                    <td>{row.Username}</td>
                    <td>{row.Name}</td>
                    <td>{row.Email}</td>
                    <td>{row.Contact}</td>
                    <td>{row.Specialization}</td>
                    <td>{row.Pressure}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className={styles["no-data"]}>
                    No data available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SettingsDataPage;
