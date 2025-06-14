import { useEffect, useState } from "react";
import {
  MdAdd,
  MdBackup,
  MdClose,
  MdDownload,
  MdRestore,
} from "react-icons/md";
import Select from "react-select";
import MinimalLoadingIndicator from "../../components/common/MinimalLoadingIndicator";
import DataTable from "../../globals/DataTable";
import { FormField } from "../../globals/FormField";
import LayoutRow from "../../globals/LayoutRow";
import "../../globals/LayoutRow.css";
import PageLayout from "../../globals/PageLayout";
import TabSwitcher from "../../globals/TabSwitcher";
import {
  registerClient,
  registerDriver,
  registerMaterial,
  registerOperator,
  registerService,
  registerTherapist,
} from "../../services/api";
import "../../styles/LoadingConsistency.css";
import "../../styles/Placeholders.css";
import "../../styles/Settings.css";
import { sanitizeFormInput } from "../../utils/formSanitization";
import styles from "./SettingsDataPage.module.css";

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
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [backupStatus, setBackupStatus] = useState("");
  const [showBackupDropdown, setShowBackupDropdown] = useState(false);
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

  // Backup functionality
  const handleBackupData = async () => {
    setIsBackingUp(true);
    setBackupStatus("");

    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `${activeTab.toLowerCase()}_backup_${timestamp}.json`;

      // Get current data for the active tab
      const currentData = tableData[activeTab];

      if (!currentData || currentData.length === 0) {
        setBackupStatus("No data available to backup");
        return;
      }

      // Create backup object with metadata
      const backupData = {
        metadata: {
          type: activeTab,
          timestamp: new Date().toISOString(),
          count: currentData.length,
          version: "1.0",
          source: "Royal Care Scheduling System",
        },
        data: currentData,
      };

      // Create and download the backup file
      const blob = new Blob([JSON.stringify(backupData, null, 2)], {
        type: "application/json",
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setBackupStatus(`✅ Backup created: ${filename}`);
    } catch (error) {
      console.error("Backup error:", error);
      setBackupStatus(`❌ Backup failed: ${error.message}`);
    } finally {
      setIsBackingUp(false);
      setTimeout(() => setBackupStatus(""), 3000);
    }
  };

  // Backup all data at once
  const handleBackupAllData = async () => {
    setIsBackingUp(true);
    setBackupStatus("Creating complete backup...");

    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `royal_care_complete_backup_${timestamp}.json`;

      // Fetch all data types
      const allBackupData = {};
      let totalRecords = 0;

      for (const tab of TABS) {
        try {
          const data = await fetchers[tab]();
          allBackupData[tab] = data;
          totalRecords += data.length;
        } catch (error) {
          console.error(`Error fetching ${tab}:`, error);
          allBackupData[tab] = [];
        }
      }

      const completeBackup = {
        metadata: {
          type: "complete_backup",
          timestamp: new Date().toISOString(),
          totalRecords,
          dataTypes: TABS,
          version: "1.0",
          source: "Royal Care Scheduling System",
        },
        data: allBackupData,
      };

      const blob = new Blob([JSON.stringify(completeBackup, null, 2)], {
        type: "application/json",
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setBackupStatus(
        `✅ Complete backup created with ${totalRecords} records`
      );
    } catch (error) {
      console.error("Complete backup error:", error);
      setBackupStatus(`❌ Complete backup failed: ${error.message}`);
    } finally {
      setIsBackingUp(false);
      setTimeout(() => setBackupStatus(""), 5000);
    }
  };

  // Restore functionality
  const handleRestoreData = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (event) => {
      const file = event.target.files[0];
      if (!file) return;

      setIsRestoring(true);
      setBackupStatus("Restoring data...");

      try {
        const text = await file.text();
        const backupData = JSON.parse(text);

        // Validate backup format
        if (!backupData.metadata || !backupData.data) {
          throw new Error("Invalid backup file format");
        }

        if (backupData.metadata.type === "complete_backup") {
          // Handle complete backup restore
          let restoredCount = 0;
          const results = {};

          for (const [dataType, records] of Object.entries(backupData.data)) {
            if (TABS.includes(dataType) && Array.isArray(records)) {
              results[dataType] = records.length;
              restoredCount += records.length;
              // Update table data
              setTableData((prev) => ({ ...prev, [dataType]: records }));
            }
          }

          setBackupStatus(
            `✅ Restored complete backup: ${restoredCount} total records`
          );
        } else if (backupData.metadata.type === activeTab) {
          // Handle single tab restore
          if (!Array.isArray(backupData.data)) {
            throw new Error("Invalid data format in backup");
          }

          setTableData((prev) => ({ ...prev, [activeTab]: backupData.data }));
          setBackupStatus(
            `✅ Restored ${activeTab}: ${backupData.data.length} records`
          );
        } else {
          throw new Error(
            `Backup type mismatch. Expected ${activeTab}, got ${backupData.metadata.type}`
          );
        }
      } catch (error) {
        console.error("Restore error:", error);
        setBackupStatus(`❌ Restore failed: ${error.message}`);
      } finally {
        setIsRestoring(false);
        setTimeout(() => setBackupStatus(""), 5000);
      }
    };

    input.click();
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        showBackupDropdown &&
        !event.target.closest(".backup-dropdown-container")
      ) {
        setShowBackupDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showBackupDropdown]);

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
          <div
            key={`form-skeleton-${index}`}
            className={styles["form-field-skeleton"]}
          ></div>
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
        show={isLoading || isBackingUp || isRestoring}
        position="top-right"
        operation={
          isBackingUp
            ? "Creating backup..."
            : isRestoring
            ? "Restoring data..."
            : `Loading ${activeTab.toLowerCase()}`
        }
        tooltip={
          isBackingUp
            ? "Generating backup file..."
            : isRestoring
            ? "Processing backup file..."
            : `Fetching ${activeTab.toLowerCase()} data...`
        }
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

      {/* Backup Status */}
      {backupStatus && (
        <div className={styles["backup-status"]}>{backupStatus}</div>
      )}

      <div className={"global-content" + (showModal ? " faded" : "")}>
        <div className={styles["header-tabs-container"]}>
          <LayoutRow title="Data">
            <div className="action-buttons">
              {/* Backup/Restore Dropdown */}
              <div
                className="backup-dropdown-container"
                style={{ position: "relative", display: "inline-block" }}
              >
                <button
                  className="secondary-action-btn"
                  onClick={() => setShowBackupDropdown(!showBackupDropdown)}
                  disabled={isLoading || isBackingUp || isRestoring}
                  title="Backup and restore options"
                >
                  <MdBackup size={16} />
                  Backup
                </button>

                {showBackupDropdown && (
                  <div className={styles["backup-dropdown"]}>
                    <button
                      className={styles["dropdown-item"]}
                      onClick={() => {
                        setShowBackupDropdown(false);
                        handleBackupData();
                      }}
                      disabled={isBackingUp || isRestoring}
                    >
                      <MdDownload size={14} />
                      Backup {activeTab}
                    </button>

                    <button
                      className={styles["dropdown-item"]}
                      onClick={() => {
                        setShowBackupDropdown(false);
                        handleBackupAllData();
                      }}
                      disabled={isBackingUp || isRestoring}
                    >
                      <MdDownload size={14} />
                      Backup All Data
                    </button>

                    <div className={styles["dropdown-divider"]}></div>

                    <button
                      className={styles["dropdown-item"]}
                      onClick={() => {
                        setShowBackupDropdown(false);
                        handleRestoreData();
                      }}
                      disabled={isBackingUp || isRestoring}
                    >
                      <MdRestore size={14} />
                      Restore Data
                    </button>
                  </div>
                )}
              </div>

              <button
                className="primary-action-btn"
                onClick={handleAddClick}
                disabled={isLoading || isBackingUp || isRestoring}
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
          <DataTable
            columns={tableConfig.columns}
            data={tableData[activeTab]}
          />
        )}
      </div>
    </PageLayout>
  );
};

export default SettingsDataPage;
