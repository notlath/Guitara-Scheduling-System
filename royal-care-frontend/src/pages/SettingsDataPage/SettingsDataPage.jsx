import { useEffect, useState } from "react";
import { MdAdd, MdClose } from "react-icons/md";
import { FormField } from "../../globals/FormField";
import LayoutRow from "../../globals/LayoutRow";
import "../../globals/LayoutRow.css";
import PageLayout from "../../globals/PageLayout";
import {
  registerDriver,
  registerMaterial,
  registerOperator,
  registerService,
  registerTherapist,
} from "../../services/api";
import "../../styles/Placeholders.css";
import "../../styles/Settings.css";
import { sanitizeFormInput } from "../../utils/formSanitization";
import styles from "./SettingsDataPage.module.css";

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
const PRESSURE_OPTIONS = ["hard", "medium", "soft"];
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

// Add fetch functions for each tab - Updated to use proper data endpoints
const fetchers = {
  Therapists: async () => {
    const token = localStorage.getItem("knoxToken");
    const res = await fetch("http://localhost:8000/api/scheduling/staff/", {
      headers: {
        Authorization: `Token ${token}`,
        "Content-Type": "application/json",
      },
    });
    if (!res.ok) return [];
    const data = await res.json();
    // Filter for therapists only and map to frontend table fields
    return data
      .filter((item) => item.role === "therapist")
      .map((item) => ({
        Username: item.username,
        Name: `${item.first_name || ""} ${item.last_name || ""}`.trim(),
        Email: item.email,
        Contact: item.phone_number || "-",
        Specialization: item.specialization || "-",
        Pressure: item.massage_pressure || "-",
      }));
  },
  Drivers: async () => {
    const token = localStorage.getItem("knoxToken");
    const res = await fetch("http://localhost:8000/api/scheduling/staff/", {
      headers: {
        Authorization: `Token ${token}`,
        "Content-Type": "application/json",
      },
    });
    if (!res.ok) return [];
    const data = await res.json();
    // Filter for drivers only and map to frontend table fields
    return data
      .filter((item) => item.role === "driver")
      .map((item) => ({
        Username: item.username,
        Name: `${item.first_name || ""} ${item.last_name || ""}`.trim(),
        Email: item.email,
        Contact: item.phone_number || "-",
        Specialization: item.motorcycle_plate || "N/A",
        Pressure: "N/A",
      }));
  },
  Operators: async () => {
    // Operators need to fetch from users endpoint since they're not in staff
    const token = localStorage.getItem("knoxToken");
    const res = await fetch("http://localhost:8000/api/auth/users/", {
      headers: {
        Authorization: `Token ${token}`,
        "Content-Type": "application/json",
      },
    });
    if (!res.ok) return [];
    const data = await res.json();
    // Filter for operators only
    return data
      .filter((item) => item.role === "operator")
      .map((item) => ({
        Username: item.username,
        Name: `${item.first_name || ""} ${item.last_name || ""}`.trim(),
        Email: item.email,
        Contact: item.phone_number || "-",
        Specialization: "N/A",
        Pressure: "N/A",
      }));
  },
  Services: async () => {
    const token = localStorage.getItem("knoxToken");
    const res = await fetch("http://localhost:8000/api/scheduling/services/", {
      headers: {
        Authorization: `Token ${token}`,
        "Content-Type": "application/json",
      },
    });
    if (!res.ok) return [];
    const data = await res.json();
    // Map backend fields to frontend table fields
    return data.map((item) => ({
      Name: item.name,
      Description: item.description || "-",
      Duration:
        item.duration !== undefined && item.duration !== null
          ? `${item.duration} min`
          : "-",
      Price:
        item.price !== undefined && item.price !== null
          ? `₱${item.price}`
          : "-",
      Materials:
        Array.isArray(item.materials) && item.materials.length > 0
          ? item.materials.map((mat) => mat.name || mat).join(", ")
          : "-",
    }));
  },
  Materials: async () => {
    // Materials might be part of services or a separate endpoint
    const token = localStorage.getItem("knoxToken");
    // Try to get materials from registration endpoint first as fallback
    const res = await fetch(
      "http://localhost:8000/api/registration/register/material/",
      {
        headers: {
          Authorization: `Token ${token}`,
          "Content-Type": "application/json",
        },
      }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.map((item) => ({
      Username: "-",
      Name: item.name,
      Email: "-",
      Contact: "-",
      Specialization: item.description || "-",
      Pressure: "-",
    }));
  },
};

const SettingsDataPage = () => {
  const [activeTab, setActiveTab] = useState(TABS[0]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({});
  const [successPrompt, setSuccessPrompt] = useState("");
  const [tableData, setTableData] = useState(TAB_PLACEHOLDERS);

  useEffect(() => {
    document.title = `${activeTab} | Royal Care`;
    // Fetch data for the active tab
    fetchers[activeTab]()
      .then((data) => {
        setTableData((prev) => ({ ...prev, [activeTab]: data }));
      })
      .catch(() => {
        setTableData((prev) => ({ ...prev, [activeTab]: [] }));
      });
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
    setFormData((prev) => {
      if (type === "checkbox") {
        return { ...prev, [name]: checked };
      }
      // Do not trim or sanitize on every keystroke for description
      if (name === "firstName" || name === "lastName") {
        return { ...prev, [name]: value };
      }
      return { ...prev, [name]: value };
    });
  };

  const handleMultiSelectChange = (e) => {
    const options = Array.from(e.target.selectedOptions, (opt) => opt.value);
    setFormData((prev) => ({ ...prev, materials: options }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Sanitize only on submit
    let sanitized = { ...formData };
    if (sanitized.description) {
      sanitized.description = sanitizeFormInput(sanitized.description);
    }
    // Parse duration as integer if present
    if (sanitized.duration !== undefined && sanitized.duration !== "") {
      sanitized.duration = parseInt(sanitized.duration, 10);
      if (isNaN(sanitized.duration)) sanitized.duration = 0;
    }
    // Ensure price is a number
    if (sanitized.price !== undefined && sanitized.price !== "") {
      sanitized.price = Number(sanitized.price);
    }
    // Materials: ensure array of objects with name
    if (sanitized.materials && Array.isArray(sanitized.materials)) {
      sanitized.materials = sanitized.materials.map((mat) => ({ name: mat }));
    }
    let apiCall;
    let payload = { ...sanitized };
    setSuccessPrompt("");
    try {
      switch (activeTab) {
        case "Therapists":
          apiCall = registerTherapist;
          payload = {
            first_name: sanitized.firstName,
            last_name: sanitized.lastName,
            username: sanitized.username,
            email: sanitized.email,
            specialization: sanitized.specialization,
            pressure: sanitized.pressure,
          };
          break;
        case "Drivers":
          apiCall = registerDriver;
          payload = {
            first_name: sanitized.firstName,
            last_name: sanitized.lastName,
            username: sanitized.username,
            email: sanitized.email,
          };
          break;
        case "Operators":
          apiCall = registerOperator;
          payload = {
            first_name: sanitized.firstName,
            last_name: sanitized.lastName,
            username: sanitized.username,
            email: sanitized.email,
          };
          break;
        case "Materials":
          apiCall = registerMaterial;
          payload = {
            name: sanitized.name,
            description: sanitized.description,
          };
          break;
        case "Services":
          apiCall = registerService;
          payload = {
            name: sanitized.name,
            description: sanitized.description,
            duration: sanitized.duration,
            price: sanitized.price,
            materials: sanitized.materials || [],
          };
          break;
        default:
          return;
      }
      const response = await apiCall(payload);
      setShowModal(false);

      // Handle different types of success responses
      if (response?.data?.fallback) {
        setSuccessPrompt(
          "Registered successfully! (Note: Stored locally due to database connectivity issues)"
        );
      } else {
        setSuccessPrompt("Registered successfully!");
      }
    } catch (err) {
      setSuccessPrompt(
        err?.errorMessage || err?.error || "Registration failed"
      );
      setTimeout(() => setSuccessPrompt(""), 3000);
      console.error("[handleSubmit] Registration error:", err);
    }
    // Always refresh table after registration, even if there was an error
    try {
      fetchers[activeTab]()
        .then((data) => {
          console.log(
            "[handleSubmit] Data returned by fetcher after registration:",
            data
          );
          setTableData((prev) => ({ ...prev, [activeTab]: data }));
        })
        .catch((fetchErr) => {
          setTableData((prev) => ({ ...prev, [activeTab]: [] }));
          console.error("[handleSubmit] Fetcher error:", fetchErr);
        });
      setTimeout(() => {
        fetchers[activeTab]()
          .then((data) => {
            console.log(
              "[handleSubmit] Data returned by fetcher after 1s delay:",
              data
            );
            setTableData((prev) => ({ ...prev, [activeTab]: data }));
          })
          .catch((fetchErr) => {
            setTableData((prev) => ({ ...prev, [activeTab]: [] }));
            console.error("[handleSubmit] Delayed fetcher error:", fetchErr);
          });
      }, 1000);
    } catch (outerErr) {
      console.error("[handleSubmit] Outer fetcher error:", outerErr);
    }
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
                inputProps={{ autoComplete: "off", maxLength: 50 }}
              />
              <FormField
                name="lastName"
                label="Last Name"
                value={formData.lastName || ""}
                onChange={handleInputChange}
                inputProps={{ autoComplete: "off", maxLength: 50 }}
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
                  {opt.charAt(0).toUpperCase() + opt.slice(1)}
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
                inputProps={{ autoComplete: "off", maxLength: 50 }}
              />
              <FormField
                name="lastName"
                label="Last Name"
                value={formData.lastName || ""}
                onChange={handleInputChange}
                inputProps={{ autoComplete: "off", maxLength: 50 }}
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

  // Cache table config to avoid multiple calls
  const tableConfig = getTableConfig();

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
                {tableConfig.columns.map((col) => (
                  <th key={col.key} scope="col">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableData[activeTab] && tableData[activeTab].length > 0 ? (
                tableData[activeTab].map((row, idx) => (
                  <tr key={idx}>
                    {tableConfig.columns.map((col) => (
                      <td key={col.key}>
                        {row[col.key] !== undefined ? row[col.key] : "-"}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={tableConfig.columns.length}
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
