import React, { useState, useEffect } from "react";
import styles from "./SettingsDataPage.module.css";
import "../../styles/Placeholders.css";
import "../../styles/Settings.css";
import "../../globals/LayoutRow.css";
import { MdAdd, MdClose } from "react-icons/md";
import LayoutRow from "../../globals/LayoutRow";
import PageLayout from "../../globals/PageLayout";
import { FormField } from "../../globals/FormField";

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
            <div className={styles["flex-row-fields"]}>
              <FormField
                name="firstName"
                label="First Name"
                value={formData.firstName || ""}
                onChange={handleInputChange}
              />
              <FormField
                name="lastName"
                label="Last Name"
                value={formData.lastName || ""}
                onChange={handleInputChange}
              />
            </div>
            <FormField
              name="username"
              label="Username"
              value={formData.username || ""}
              onChange={handleInputChange}
            />
            <FormField
              name="email"
              label="Email"
              type="email"
              value={formData.email || ""}
              onChange={handleInputChange}
            />
            <FormField
              as="select"
              name="specialization"
              label="Specialization"
              value={formData.specialization || ""}
              onChange={handleInputChange}
            >
              <option value="">Select Specialization</option>
              {SPECIALIZATION_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </FormField>
            <FormField
              as="select"
              name="pressure"
              label="Pressure Level"
              value={formData.pressure || ""}
              onChange={handleInputChange}
            >
              <option value="">Select Pressure Level</option>
              {PRESSURE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </FormField>
          </>
        );
      case "Drivers":
      case "Operators":
        return (
          <>
            <div className={styles["flex-row-fields"]}>
              <FormField
                name="firstName"
                label="First Name"
                value={formData.firstName || ""}
                onChange={handleInputChange}
              />
              <FormField
                name="lastName"
                label="Last Name"
                value={formData.lastName || ""}
                onChange={handleInputChange}
              />
            </div>
            <FormField
              name="username"
              label="Username"
              value={formData.username || ""}
              onChange={handleInputChange}
            />
            <FormField
              name="email"
              label="Email"
              type="email"
              value={formData.email || ""}
              onChange={handleInputChange}
            />
          </>
        );
      case "Services":
        return (
          <>
            <FormField
              name="name"
              label="Service Name"
              value={formData.name || ""}
              onChange={handleInputChange}
            />
            <FormField
              name="description"
              label="Description"
              as="textarea"
              value={formData.description || ""}
              onChange={handleInputChange}
              inputProps={{ className: "global-form-field-textarea" }}
            />
            <FormField
              name="duration"
              label="Duration"
              value={formData.duration || ""}
              onChange={handleInputChange}
            />
            <FormField
              name="price"
              label="Price"
              value={formData.price || ""}
              onChange={handleInputChange}
            />
            <FormField
              as="select"
              name="materials"
              label="Materials"
              value={formData.materials || []}
              onChange={handleMultiSelectChange}
              multiple
              required={false}
            >
              {MATERIAL_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </FormField>
          </>
        );
      case "Materials":
        return (
          <>
            <FormField
              name="name"
              label="Material Name"
              value={formData.name || ""}
              onChange={handleInputChange}
            />
            <FormField
              name="description"
              label="Description"
              as="textarea"
              value={formData.description || ""}
              onChange={handleInputChange}
              inputProps={{ className: "global-form-field-textarea" }}
            />
          </>
        );
      default:
        return null;
    }
  };

  // Helper to get table columns and row data per tab
  const getTableConfig = () => {
    switch (activeTab) {
      case "Drivers":
      case "Operators":
        return {
          columns: [
            { key: "Username", label: "Username" },
            { key: "Name", label: "Name" },
            { key: "Email", label: "Email" },
            { key: "Contact", label: "Contact Number" },
          ],
        };
      case "Services":
        return {
          columns: [
            { key: "Name", label: "Name" },
            { key: "Description", label: "Description" },
            { key: "Duration", label: "Duration" },
            { key: "Price", label: "Price" },
            { key: "Materials", label: "Materials" },
          ],
        };
      case "Materials":
        return {
          columns: [
            { key: "Name", label: "Name" },
            { key: "Description", label: "Description" },
          ],
        };
      case "Therapists":
      default:
        return {
          columns: [
            { key: "Username", label: "Username" },
            { key: "Name", label: "Name" },
            { key: "Email", label: "Email" },
            { key: "Contact", label: "Contact Number" },
            { key: "Specialization", label: "Specialization" },
            { key: "Pressure", label: "Pressure Level" },
          ],
        };
    }
  };

  return (
    <PageLayout>
      {showModal && (
        <div className={styles["modal-overlay"]}>
          <div className={styles["modal"]}>
            <div className={styles["modal-header"]}>
              <h2>Register {TAB_SINGULARS[activeTab]}</h2>
              <button
                className={styles["close-btn"]}
                onClick={handleCloseModal}
              >
                <MdClose size={20} />
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
                {getTableConfig().columns.map((col) => (
                  <th key={col.key} scope="col">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TAB_PLACEHOLDERS[activeTab] &&
              TAB_PLACEHOLDERS[activeTab].length > 0 ? (
                TAB_PLACEHOLDERS[activeTab].map((row, idx) => (
                  <tr key={idx}>
                    {getTableConfig().columns.map((col) => (
                      <td key={col.key}>
                        {row[col.key] !== undefined ? row[col.key] : "-"}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={getTableConfig().columns.length}
                    className={styles["no-data"]}
                  >
                    No data available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </PageLayout>
  );
};

export default SettingsDataPage;
