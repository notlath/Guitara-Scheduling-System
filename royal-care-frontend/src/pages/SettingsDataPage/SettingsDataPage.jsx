import React, { useState, useEffect } from "react";
import styles from "./SettingsDataPage.module.css";
import "../../styles/Placeholders.css";
import "../../styles/Settings.css";
import "../../globals/LayoutRow.css";
import { MdAdd } from "react-icons/md";
import LayoutRow from "../../globals/LayoutRow";

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

const SPECIALIZATION_OPTIONS = [
  "Shiatsu Massage",
  "Combi Massage",
  "Dry Massage",
  "Foot Massage",
  "Hot Stone Service",
  "Ventosa",
];
const PRESSURE_OPTIONS = ["Hard", "Moderate", "Soft"];
const MATERIAL_OPTIONS = [
  "Oil",
  "Lavender",
  "Towel",
  "Hot Stone",
  "Ventosa Cup",
];

// Map plural tab names to their singular form for modal titles
const TAB_SINGULARS = {
  Therapists: "Therapist",
  Drivers: "Driver",
  Operators: "Operator",
  Services: "Service",
  Materials: "Material",
};

const SettingsDataPage = () => {
  const [activeTab, setActiveTab] = useState(TABS[0]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({});
  const [successPrompt, setSuccessPrompt] = useState("");

  useEffect(() => {
    document.title = `${activeTab} | Royal Care`;
  }, [activeTab]);

  const handleAddClick = () => {
    setFormData({});
    setShowModal(true);
    setSuccessPrompt("");
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setFormData({});
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === "checkbox") {
      setFormData((prev) => ({
        ...prev,
        [name]: checked,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleMultiSelectChange = (e) => {
    const options = Array.from(e.target.selectedOptions, (opt) => opt.value);
    setFormData((prev) => ({ ...prev, materials: options }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setShowModal(false);
    setSuccessPrompt("Registered successfully!");
    setTimeout(() => setSuccessPrompt(""), 2000);
  };

  const renderFormFields = () => {
    switch (activeTab) {
      case "Therapists":
        return (
          <>
            <input
              name="firstName"
              placeholder="First Name"
              value={formData.firstName || ""}
              onChange={handleInputChange}
              required
            />
            <input
              name="lastName"
              placeholder="Last Name"
              value={formData.lastName || ""}
              onChange={handleInputChange}
              required
            />
            <input
              name="username"
              placeholder="Username"
              value={formData.username || ""}
              onChange={handleInputChange}
              required
            />
            <input
              name="email"
              placeholder="Email"
              value={formData.email || ""}
              onChange={handleInputChange}
              required
            />
            <select
              name="specialization"
              value={formData.specialization || ""}
              onChange={handleInputChange}
              required
            >
              <option value="">Select Specialization</option>
              {SPECIALIZATION_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            <select
              name="pressure"
              value={formData.pressure || ""}
              onChange={handleInputChange}
              required
            >
              <option value="">Select Pressure Level</option>
              {PRESSURE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </>
        );
      case "Drivers":
      case "Operators":
        return (
          <>
            <input
              name="firstName"
              placeholder="First Name"
              value={formData.firstName || ""}
              onChange={handleInputChange}
              required
            />
            <input
              name="lastName"
              placeholder="Last Name"
              value={formData.lastName || ""}
              onChange={handleInputChange}
              required
            />
            <input
              name="username"
              placeholder="Username"
              value={formData.username || ""}
              onChange={handleInputChange}
              required
            />
            <input
              name="email"
              placeholder="Email"
              value={formData.email || ""}
              onChange={handleInputChange}
              required
            />
          </>
        );
      case "Services":
        return (
          <>
            <input
              name="name"
              placeholder="Service Name"
              value={formData.name || ""}
              onChange={handleInputChange}
              required
            />
            <input
              name="description"
              placeholder="Description"
              value={formData.description || ""}
              onChange={handleInputChange}
              required
            />
            <input
              name="duration"
              placeholder="Duration (e.g. 30 mins)"
              value={formData.duration || ""}
              onChange={handleInputChange}
              required
            />
            <input
              name="price"
              placeholder="Price (e.g. P800)"
              value={formData.price || ""}
              onChange={handleInputChange}
              required
            />
            <select
              name="materials"
              multiple
              value={formData.materials || []}
              onChange={handleMultiSelectChange}
            >
              {MATERIAL_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </>
        );
      case "Materials":
        return (
          <>
            <input
              name="name"
              placeholder="Material Name"
              value={formData.name || ""}
              onChange={handleInputChange}
              required
            />
            <input
              name="description"
              placeholder="Description"
              value={formData.description || ""}
              onChange={handleInputChange}
              required
            />
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="global-container">
      {showModal && (
        <div className={styles["modal-overlay"]}>
          <div className={styles["modal"]}>
            <div className={styles["modal-header"]}>
              <h2>Register {TAB_SINGULARS[activeTab]}</h2>
              <button
                className={styles["close-btn"]}
                onClick={handleCloseModal}
              >
                &times;
              </button>
            </div>
            <form className={styles["modal-form"]} onSubmit={handleSubmit}>
              {renderFormFields()}
              <button type="submit" className="action-btn">
                Register
              </button>
            </form>
          </div>
        </div>
      )}
      {successPrompt && (
        <div className={styles["success-prompt"]}>{successPrompt}</div>
      )}
      <div className={"global-content" + (showModal ? " faded" : "")}>
        <LayoutRow title="Data">
          <div className="action-buttons">
            <button className="primary-action-btn" onClick={handleAddClick}>
              <span className="primary-action-icon">
                <MdAdd size={20} />
              </span>{" "}
              Add
            </button>
          </div>
        </LayoutRow>
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
