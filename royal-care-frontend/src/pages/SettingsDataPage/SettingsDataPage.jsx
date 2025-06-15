import { useEffect, useState } from "react";
import { MdAdd, MdClose } from "react-icons/md";
import { FormField } from "../../globals/FormField";
import LayoutRow from "../../globals/LayoutRow";
import "../../globals/LayoutRow.css";
import PageLayout from "../../globals/PageLayout";
import {
  registerClient,
  registerDriver,
  registerMaterial,
  registerOperator,
  registerService,
  registerTherapist,
} from "../../services/api";
import "../../styles/Placeholders.css";
import "../../styles/Settings.css";
import "../../styles/LoadingConsistency.css";
import { sanitizeFormInput } from "../../utils/formSanitization";
import styles from "./SettingsDataPage.module.css";
import DataTable from "../../globals/DataTable";
import Select from "react-select";
import TabSwitcher from "../../globals/TabSwitcher";
import MinimalLoadingIndicator from "../../components/common/MinimalLoadingIndicator";

const TABS = [
  "Therapists",
  "Drivers",
  "Operators",
  "Clients",
  "Services",
  "Materials",
];

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
  Clients: "Client",
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
    // Operators need to fetch from registration endpoint
    const token = localStorage.getItem("knoxToken");
    const res = await fetch(
      "http://localhost:8000/api/registration/register/operator/",
      {
        headers: {
          Authorization: `Token ${token}`,
          "Content-Type": "application/json",
        },
      }
    );
    if (!res.ok) return [];
    const data = await res.json();
    // Map registration data to frontend table fields
    return data.map((item) => ({
      Username: item.username || "-",
      Name: `${item.first_name || ""} ${item.last_name || ""}`.trim() || "-",
      Email: item.email || "-",
      Contact: "-", // Registration table doesn't have phone numbers
      Specialization: "N/A",
      Pressure: "N/A",
    }));
  },
  Clients: async () => {
    const token = localStorage.getItem("knoxToken");
    const res = await fetch(
      "http://localhost:8000/api/registration/register/client/",
      {
        headers: {
          Authorization: `Token ${token}`,
          "Content-Type": "application/json",
        },
      }
    );
    if (!res.ok) return [];
    const data = await res.json();
    // Map backend fields to frontend table fields
    return data.map((item) => ({
      Name: item.Name || "-",
      Email: item.Email || "-",
      Address: item.Address || "-",
      Contact: item.Contact || "-",
      Notes: item.Notes || "-",
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
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tableData, setTableData] = useState({
    Therapists: [],
    Drivers: [],
    Operators: [],
    Clients: [],
    Services: [],
    Materials: [],
  });

  useEffect(() => {
    document.title = `${activeTab} | Royal Care`;
    // Fetch data for the active tab
    setIsLoading(true);
    fetchers[activeTab]()
      .then((data) => {
        setTableData((prev) => ({ ...prev, [activeTab]: data }));
      })
      .catch(() => {
        setTableData((prev) => ({ ...prev, [activeTab]: [] }));
      })
      .finally(() => {
        setIsLoading(false);
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

  // const handleMultiSelectChange = (e) => {
  //   const options = Array.from(e.target.selectedOptions, (opt) => opt.value);
  //   setFormData((prev) => ({ ...prev, materials: options }));
  // };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
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
        case "Clients":
          apiCall = registerClient;
          payload = {
            first_name: sanitized.firstName,
            last_name: sanitized.lastName,
            email: sanitized.email,
            phone_number: sanitized.phoneNumber,
            address: sanitized.address,
            notes: sanitized.notes || "",
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
    } finally {
      setIsSubmitting(false);
    }
    
    // Always refresh table after registration, even if there was an error
    setIsLoading(true);
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
        })
        .finally(() => {
          setIsLoading(false);
        });
      setTimeout(() => {
        setIsLoading(true);
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
          })
          .finally(() => {
            setIsLoading(false);
          });
      }, 1000);
    } catch (outerErr) {
      console.error("[handleSubmit] Outer fetcher error:", outerErr);
    }
    setTimeout(() => setSuccessPrompt(""), 2000);
  };

  // Simple skeleton loader for table (like BookingsPage)
  const renderTableSkeleton = () => {
    const tableConfig = getTableConfig();
    const skeletonRows = Array.from({ length: 5 }, (_, index) => (
      <tr key={`skeleton-${index}`} className={styles["table-skeleton-row"]}>
        {tableConfig.columns.map((col) => (
          <td key={`skeleton-${index}-${col.key}`}>
            <div className={styles["table-skeleton-cell"]}></div>
          </td>
        ))}
      </tr>
    ));

    return (
      <div className={styles["data-table-wrapper"]}>
        <table className={styles["data-table"]}>
          <thead>
            <tr className={styles["thead-row"]}>
              {tableConfig.columns.map((col) => (
                <th key={col.key} scope="col">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{skeletonRows}</tbody>
        </table>
      </div>
    );
  };

  // Simple skeleton loader for form
  const renderFormSkeleton = () => {
    let fieldCount = 4; // Default for most forms
    
    switch (activeTab) {
      case "Therapists":
        fieldCount = 6;
        break;
      case "Clients":
        fieldCount = 6;
        break;
      case "Services":
        fieldCount = 5;
        break;
      case "Materials":
        fieldCount = 2;
        break;
      default:
        fieldCount = 4;
    }

    return (
      <div className={styles["form-skeleton"]}>
        {Array.from({ length: fieldCount }, (_, index) => (
          <div key={`form-skeleton-${index}`} className={styles["form-field-skeleton"]}></div>
        ))}
        <div className={styles["form-button-skeleton"]}></div>
      </div>
    );
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
      case "Clients":
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
              name="email"
              label="Email"
              type="email"
              value={formData.email || ""}
              onChange={handleInputChange}
              inputProps={{ maxLength: 100 }}
            />
            <FormField
              name="address"
              label="Address"
              value={formData.address || ""}
              onChange={handleInputChange}
              inputProps={{ maxLength: 200 }}
            />
            <FormField
              name="phoneNumber"
              label="Contact Number"
              value={formData.phoneNumber || ""}
              onChange={handleInputChange}
              inputProps={{ maxLength: 20 }}
            />
            <FormField
              name="notes"
              label="Notes"
              as="textarea"
              value={formData.notes || ""}
              onChange={handleInputChange}
              inputProps={{
                className: "global-form-field-textarea",
                maxLength: 500,
                rows: 3,
              }}
              required={false}
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
            <div className="global-form-field-group">
              <div className="global-form-field-label-row">
                <label
                  className="global-form-field-label"
                  htmlFor="materials-select"
                >
                  Materials
                </label>
              </div>
              <Select
                id="materials-select"
                isMulti
                options={MATERIAL_OPTIONS.map((opt) => ({
                  label: opt,
                  value: opt,
                }))}
                value={(formData.materials || []).map((mat) => ({
                  label: mat,
                  value: mat,
                }))}
                onChange={(selected) => {
                  setFormData((prev) => ({
                    ...prev,
                    materials: selected ? selected.map((s) => s.value) : [],
                  }));
                }}
                placeholder="Select materials..."
                classNamePrefix="react-select"
                styles={{ menu: (base) => ({ ...base, zIndex: 9999 }) }}
              />
            </div>
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
      case "Clients":
        return {
          columns: [
            { key: "Name", label: "Name" },
            { key: "Email", label: "Email" },
            { key: "Address", label: "Address" },
            { key: "Contact", label: "Contact Number" },
            { key: "Notes", label: "Notes" },
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
      <MinimalLoadingIndicator 
        show={isLoading} 
        position="top-right" 
        operation={`Loading ${activeTab.toLowerCase()}`}
        tooltip={`Fetching ${activeTab.toLowerCase()} data...`}
      />
      
      {showModal && (
        <div className={styles["modal-overlay"]}>
          <div className={styles["modal"]}>
            <div className={styles["modal-header"]}>
              <h2>Register {TAB_SINGULARS[activeTab]}</h2>
              <button
                className={styles["close-btn"]}
                onClick={handleCloseModal}
                disabled={isSubmitting}
              >
                <MdClose size={20} />
              </button>
            </div>
            <form className={styles["modal-form"]} onSubmit={handleSubmit}>
              {isSubmitting ? renderFormSkeleton() : renderFormFields()}
              <button 
                type="submit" 
                className="action-btn" 
                disabled={isSubmitting}
              >
                {isSubmitting ? "Registering..." : "Register"}
              </button>
            </form>
          </div>
        </div>
      )}
      
      {successPrompt && (
        <div className={styles["success-prompt"]}>{successPrompt}</div>
      )}
      
      <div className={"global-content" + (showModal ? " faded" : "")}>
        <div className={styles["header-tabs-container"]}>
          <LayoutRow title="Data">
            <div className="action-buttons">
              <button 
                className="primary-action-btn" 
                onClick={handleAddClick}
                disabled={isLoading}
              >
                <span className="primary-action-icon">
                  <MdAdd size={20} />
                </span>{" "}
                Add
              </button>
            </div>
          </LayoutRow>
          <TabSwitcher
            tabs={TABS.map((tab) => ({ label: tab, value: tab }))}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        </div>
        
        {isLoading ? (
          renderTableSkeleton()
        ) : (
          <DataTable columns={tableConfig.columns} data={tableData[activeTab]} />
        )}
      </div>
    </PageLayout>
  );
};

export default SettingsDataPage;
