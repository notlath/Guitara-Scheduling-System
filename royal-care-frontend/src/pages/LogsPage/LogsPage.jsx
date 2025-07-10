import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";
import pageTitles from "../../constants/pageTitles";
import { API_BASE_URL } from "../../constants/apiConfig";
import PageLayout from "../../globals/PageLayout";
import LayoutRow from "../../globals/LayoutRow";
import TabSwitcher from "../../globals/TabSwitcher";
import DataTable from "../../globals/DataTable";
import ServerPagination from "../../components/ServerPagination";
import { getToken } from "../../utils/tokenManager";
import { formatLogTimestamp } from "../../utils/timezoneUtils";
import { MdRefresh } from "react-icons/md";
import rcLogo from "../../assets/images/rc_logo.jpg";
import styles from "./LogsPage.module.css";

const LogsPage = () => {
  console.log('📋 LogsPage rendering/mounting');
  
  // Force initialization of all state on component mount
  const [activeTab, setActiveTab] = useState("Authentication");
  const [inventoryLogs, setInventoryLogs] = useState([]);
  const [authLogs, setAuthLogs] = useState([]);
  const [appointmentLogs, setAppointmentLogs] = useState([]);
  const [dataLogs, setDataLogs] = useState([]);
  const [paymentLogs, setPaymentLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true); // Start with loading state active
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  
  // Per-tab pagination state to maintain separate page states
  const [tabPagination, setTabPagination] = useState({
    Authentication: { currentPage: 1, totalPages: 1 },
    Appointment: { currentPage: 1, totalPages: 1 },
    Payment: { currentPage: 1, totalPages: 1 },
    Data: { currentPage: 1, totalPages: 1 },
    Inventory: { currentPage: 1, totalPages: 1 },
  });
  
  const itemsPerPage = 20;
  
  // Helper functions to get/set pagination for active tab
  const getCurrentPage = () => tabPagination[activeTab]?.currentPage || 1;
  const getTotalPages = () => tabPagination[activeTab]?.totalPages || 1;
  
  const setCurrentPage = (page) => {
    setTabPagination(prev => ({
      ...prev,
      [activeTab]: { ...prev[activeTab], currentPage: page }
    }));
  };
  
  const setTotalPages = (pages) => {
    setTabPagination(prev => ({
      ...prev,
      [activeTab]: { ...prev[activeTab], totalPages: pages }
    }));
  };

  const tabs = [
    "Authentication",
    "Appointment",
    "Payment",
    "Data",
    "Inventory",
  ];

  const getAuthToken = () => {
    return getToken();
  };

  const axiosAuth = axios.create();
  
  // Enhanced token management with retry using different formats
  axiosAuth.interceptors.request.use((config) => {
    // Force token refresh on each request to ensure latest token is used
    const token = getAuthToken();
    
    if (token && token !== "undefined" && token.trim() !== "") {
      // Set the token with Bearer format by default
      config.headers["Authorization"] = `Bearer ${token}`;
      console.log("🔑 Setting auth header:", `Bearer ${token.substring(0, 10)}...`);
      
      // Always set content-type for consistent handling
      config.headers["Content-Type"] = "application/json";
    } else {
      console.warn("⚠️ No valid auth token found");
      delete config.headers["Authorization"];
    }
    
    // Add timestamp to prevent caching issues
    config.params = { 
      ...config.params,
      _t: new Date().getTime()
    };
    
    return config;
  });
  
  // Add response interceptor to handle auth errors and retry with different token format
  axiosAuth.interceptors.response.use(
    response => response,
    async error => {
      const originalRequest = error.config;
      const token = getAuthToken();
      
      // If error is 401 and we haven't retried already and have a valid token
      if (error.response?.status === 401 && 
          !originalRequest._retry && 
          token && token !== "undefined" && token.trim() !== "") {
        
        originalRequest._retry = true;
        
        // If we tried Bearer format first, now try Token format
        if (
          originalRequest.headers["Authorization"] &&
          typeof originalRequest.headers["Authorization"] === "string" &&
          originalRequest.headers["Authorization"].startsWith('Bearer')
        ) {
          console.log('🔄 Retrying with Token format instead of Bearer');
          originalRequest.headers["Authorization"] = `Token ${token}`;
          return axiosAuth(originalRequest);
        }
      }
      
      return Promise.reject(error);
    }
  );

  // Unified logs system implementation - all tabs now fetch real logs from the backend
  // Each tab displays only timestamp and description columns from real backend data
  // Logs are triggered by real events in the system:
  //  - Authentication: Login/logout events
  //  - Appointment: Appointment creation
  //  - Payment: Payment verification
  //  - Data: New data registration (therapists, etc.)
  //  - Inventory: Material usage
  

  // Keep track of API error to prevent continuous retries
  const [apiError, setApiError] = useState({ auth: false, inventory: false, appointment: false, data: false, payment: false });

  // Reset API error when changing tabs
  useEffect(() => {
    setApiError(prev => ({...prev, [activeTab.toLowerCase()]: false}));
  }, [activeTab]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        showExportDropdown &&
        !event.target.closest(`.${styles.exportDropdown}`)
      ) {
        setShowExportDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showExportDropdown]);
  
  // Extract fetch logic to a reusable function
  const fetchTabData = async (tabName, page, skipLoadingState = false) => {
    // Don't show loading state if skipLoadingState is true (useful for background refreshes)
    if (!skipLoadingState) {
      setIsLoading(true);
    }
    
    console.log(`🚀 Fetching logs for ${tabName} tab (page ${page})...`);
    
    // Check for API error
    const currentApiError = apiError[tabName.toLowerCase()];
    if (currentApiError) {
      console.log(`⚠️ Skipping fetch for ${tabName} due to previous API error`);
      setIsLoading(false);
      return;
    }
    
    // Clear any previous data immediately to avoid stale data being displayed
    switch (tabName) {
      case "Authentication":
        setAuthLogs([]);
        break;
      case "Appointment":
        setAppointmentLogs([]);
        break;
      case "Payment":
        setPaymentLogs([]);
        break;
      case "Data":
        setDataLogs([]);
        break;
      case "Inventory":
        setInventoryLogs([]);
        break;
    }
    
    try {
      // Map frontend tab names to actual database log_type values
      const logTypeMapping = {
        'Authentication': 'authentication',
        'Appointment': 'appointment',
        'Payment': 'payment', 
        'Data': 'data',
        'Inventory': 'inventory'
      };
      
      const actualLogType = logTypeMapping[tabName] || tabName.toLowerCase();
      
      // Add explicit ordering to ensure newest logs are shown first
      const url = `${API_BASE_URL}/system-logs/?log_type=${actualLogType}&page=${page}&page_size=${itemsPerPage}&ordering=-timestamp`;
      
      console.log(`📞 API Request: ${url}`);
      
      // Get token for authentication
      const token = getAuthToken();
      console.log(`🔑 Token available: ${!!token}, preview: ${token ? token.substring(0, 10) + '...' : 'NO TOKEN'}`);
      
      if (!token) {
        throw new Error("No authentication token found. Please log in.");
      }
      
      const response = await axiosAuth.get(url);
      console.log(`✅ API Response for ${tabName}:`, response.data);
      
      let logs = [];
      if (Array.isArray(response.data)) {
        logs = response.data;
      } else if (response.data && response.data.results) {
        logs = response.data.results;
        if (response.data.count !== undefined) {
          setTotalPages(Math.ceil(response.data.count / itemsPerPage));
        }
      }
      
      console.log(`📋 Setting ${logs.length} logs for ${tabName}`);
      
      // Update the appropriate state based on the tab
      switch (tabName) {
        case "Authentication":
          setAuthLogs(logs);
          break;
        case "Appointment":
          setAppointmentLogs(logs);
          break;
        case "Payment":
          setPaymentLogs(logs);
          break;
        case "Data":
          setDataLogs(logs);
          break;
        case "Inventory":
          setInventoryLogs(logs);
          break;
      }
      
      // Reset error state for this tab
      setApiError(prev => ({ ...prev, [tabName.toLowerCase()]: false }));
      
    } catch (err) {
      console.error(`❌ Error fetching ${tabName} logs:`, err);
      console.error(`❌ Error details:`, err.response ? err.response.data : 'No response data');
      
      if (err.response && err.response.status === 401) {
        console.error(`🔒 Authentication error (401)`);
        alert("Your session has expired. Please log in again to view logs.");
      }
      
      setApiError(prev => ({ ...prev, [tabName.toLowerCase()]: true }));
      
      // Clear logs for the tab
      switch (tabName) {
        case "Authentication":
          setAuthLogs([]);
          break;
        case "Appointment":
          setAppointmentLogs([]);
          break;
        case "Payment":
          setPaymentLogs([]);
          break;
        case "Data":
          setDataLogs([]);
          break;
        case "Inventory":
          setInventoryLogs([]);
          break;
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Export functions for current tab logs
  const getCurrentTabLogs = () => {
    switch (activeTab) {
      case "Authentication":
        return authLogs;
      case "Appointment":
        return appointmentLogs;
      case "Payment":
        return paymentLogs;
      case "Data":
        return dataLogs;
      case "Inventory":
        return inventoryLogs;
      default:
        return [];
    }
  };

  const exportLogsToCSV = () => {
    const currentLogs = getCurrentTabLogs();
    if (currentLogs.length === 0) {
      alert(`No ${activeTab.toLowerCase()} logs data to export.`);
      return;
    }

    const csvData = currentLogs.map((log) => {
      const formattedTimestamp = formatLogTimestamp(log.timestamp);
      let description = log.description || "No description";
      
      // For inventory logs, enhance description if needed
      if (activeTab === "Inventory") {
        const metadata = log.metadata || log.additional_data || {};
        const materialsSummary = metadata.materials_summary;
        const appointmentId = metadata.appointment_id;
        
        if (log.action_type === "appointment_materials_usage" || materialsSummary) {
          description = `Materials for Appointment #${appointmentId || ""}: ${materialsSummary}`;
        } else {
          const operatorName = metadata.operator_name || metadata.performed_by || log.user || "Unknown User";
          description = `Material Usage (Appointment): ${
            log.item_name || 
            (metadata.item_name) || 
            log.product_name || 
            log.item || 
            "Unknown Item"
          } - ${
            log.quantity_used || 
            metadata.quantity_used || 
            0
          } ${log.unit || metadata.unit || ""} used by ${operatorName}`.trim();
        }
      }

      return {
        Timestamp: formattedTimestamp,
        Description: description,
      };
    });

    const csvContent = convertToCSV(csvData);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const fileName = `${activeTab.toLowerCase()}-logs-${new Date().toISOString().split("T")[0]}.csv`;
    saveAs(blob, fileName);
  };

  const exportLogsToExcel = () => {
    const currentLogs = getCurrentTabLogs();
    if (currentLogs.length === 0) {
      alert(`No ${activeTab.toLowerCase()} logs data to export.`);
      return;
    }

    const excelData = currentLogs.map((log) => {
      const formattedTimestamp = formatLogTimestamp(log.timestamp);
      let description = log.description || "No description";
      
      // For inventory logs, enhance description if needed
      if (activeTab === "Inventory") {
        const metadata = log.metadata || log.additional_data || {};
        const materialsSummary = metadata.materials_summary;
        const appointmentId = metadata.appointment_id;
        
        if (log.action_type === "appointment_materials_usage" || materialsSummary) {
          description = `Materials for Appointment #${appointmentId || ""}: ${materialsSummary}`;
        } else {
          const operatorName = metadata.operator_name || metadata.performed_by || log.user || "Unknown User";
          description = `Material Usage (Appointment): ${
            log.item_name || 
            (metadata.item_name) || 
            log.product_name || 
            log.item || 
            "Unknown Item"
          } - ${
            log.quantity_used || 
            metadata.quantity_used || 
            0
          } ${log.unit || metadata.unit || ""} used by ${operatorName}`.trim();
        }
      }

      return {
        Timestamp: formattedTimestamp,
        Description: description,
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `${activeTab} Logs`);
    const fileName = `${activeTab.toLowerCase()}-logs-${new Date().toISOString().split("T")[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  const exportLogsToPDF = () => {
    const currentLogs = getCurrentTabLogs();
    if (currentLogs.length === 0) {
      alert(`No ${activeTab.toLowerCase()} logs data to export.`);
      return;
    }

    const data = currentLogs.map((log) => {
      const formattedTimestamp = formatLogTimestamp(log.timestamp);
      let description = log.description || "No description";
      
      // For inventory logs, enhance description if needed
      if (activeTab === "Inventory") {
        const metadata = log.metadata || log.additional_data || {};
        const materialsSummary = metadata.materials_summary;
        const appointmentId = metadata.appointment_id;
        
        if (log.action_type === "appointment_materials_usage" || materialsSummary) {
          description = `Materials for Appointment #${appointmentId || ""}: ${materialsSummary}`;
        } else {
          const operatorName = metadata.operator_name || metadata.performed_by || log.user || "Unknown User";
          description = `Material Usage (Appointment): ${
            log.item_name || 
            (metadata.item_name) || 
            log.product_name || 
            log.item || 
            "Unknown Item"
          } - ${
            log.quantity_used || 
            metadata.quantity_used || 
            0
          } ${log.unit || metadata.unit || ""} used by ${operatorName}`.trim();
        }
      }

      return [formattedTimestamp, description];
    });

    const headers = ["Timestamp", "Description"];
    const reportTitle = `${activeTab} Logs Report`;

    // Generate print-friendly HTML content
    const printContent = `
      <div class="print-content">
        <header>
          <div class="header-img-container">
            <img src="${rcLogo}" alt="Royal Care" />
          </div>
          <div class="header-details">
            <h3>Royal Care Home Service Message</h3>
            <div>
              <p>38 Kalinangan St., Caniogan, Pasig</p>
              <p><a href='mailto:royalcareinpasig@gmail.com'>royalcareinpasig@gmail.com</a></p>
              <p>0917 345 6294</p>
            </div>
          </div>
        </header>

        <div class="header">
          <h1>${reportTitle}</h1>
          <p>Generated on: ${new Date().toLocaleDateString()}</p>
        </div>
        <div class="table-container">
          <table>
            <thead>
              <tr>
                ${headers.map((header) => `<th>${header}</th>`).join("")}
              </tr>
            </thead>
            <tbody>
              ${data
                .map(
                  (row) => `
                <tr>
                  ${row.map((cell) => `<td>${cell}</td>`).join("")}
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
        </div>
        <div class="footer">
          <p>Total Records: ${data.length}</p>
        </div>
      </div>
      <style>
        @media screen {
          .print-content {
            display: none;
          }
        }

        @media print {
          @page {
            size: Letter;
            margin: 0.5in;
          }

          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          body {
            margin: 0;
            padding: 0;
            font-family: Arial, sans-serif;
            -webkit-print-color-adjust: exact !important;
          }

          body * {
            visibility: hidden;
            display: none;
          }

          .print-content {
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
            print-color-adjust: exact !important;
            display: block;
            border-radius: 1rem;
            overflow: hidden;
            border: 1px solid var(--border-color);
            padding-bottom: 1rem;
          }

          .print-content, .print-content * {
            visibility: visible;
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
            print-color-adjust: exact !important;
            display: block;
          }

          .print-content header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: #f6f2f1 !important;
            background-color: #f6f2f1 !important;
            color: #ffffff !important;
            padding: 2rem;
            margin-bottom: 20px;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .print-content header .header-img-container img {
            border-radius: 0.5rem;
            display: block;
            aspect-ratio: 1 / 1;
            height: 80px;
            width: 80px;
          }

          .print-content header .header-details {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
            text-align: right;
          }

          .print-content header .header-details div {
            display: flex;
            flex-direction: column;
            text-align: right;
          }

          .print-content header h3 {
            color: #000000 !important;
            margin: 0;
            -webkit-print-color-adjust: exact !important;
          }

          .print-content header p {
            color: #00000070 !important;
            margin: 0;
            font-size: 12px;
            -webkit-print-color-adjust: exact !important;
          }

          .print-content header p a {
            color: #00000070 !important;
            margin: 0;
            -webkit-print-color-adjust: exact !important;
            text-decoration: none;
          }

          .print-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: auto;
            transform: none;
            box-sizing: border-box;
            page-break-inside: avoid;
            display: block;
          }

          .print-content .header {
            margin-bottom: 20px;
            text-align: center;
            display: block;
          }

          .print-content .header h1 {
            font-size: 18px;
            color: #000 !important;
            font-weight: bold;
            display: block;
          }

          .print-content .header p {
            font-size: 12px;
            color: #666 !important;
            display: block;
          }

          .print-content .table-container {
            width: 100%;
            padding: 0 1rem;
            display: block;
          }

          .print-content table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
            margin: 0;
            table-layout: fixed;
            display: table;
          }

          .print-content thead {
            display: table-header-group;
          }

          .print-content tbody {
            display: table-row-group;
          }

          .print-content tr {
            display: table-row;
            page-break-inside: avoid;
          }

          .print-content th, .print-content td {
            display: table-cell;
            border: 1px solid var(--border-color) !important;
            padding: 8px 6px;
            text-align: left;
            vertical-align: top;
            word-wrap: break-word;
            overflow-wrap: break-word;
            hyphens: auto;
          }

          .print-content th {
            background-color: #f5f5f5 !important;
            font-weight: bold;
            font-size: 11px;
            text-align: center;
          }

          .print-content td {
            font-size: 10px;
          }

          .print-content .footer {
            margin-top: 20px;
            text-align: center;
            font-size: 10px;
            color: #666 !important;
            page-break-inside: avoid;
            display: block;
          }

          .print-content .footer p {
            margin: 0;
            display: block;
          }
        }
      </style>
    `;

    // Add print content to the page
    document.body.insertAdjacentHTML("beforeend", printContent);

    // Trigger print dialog
    window.print();

    // Clean up after printing
    const cleanup = () => {
      const printElements = document.querySelectorAll('.print-content');
      printElements.forEach(el => el.remove());
    };

    // Clean up after print dialog is closed
    setTimeout(cleanup, 100);
  };

  const convertToCSV = (data) => {
    if (data.length === 0) return "";

    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(","),
      ...data.map((row) =>
        headers
          .map((header) => {
            const value = row[header];
            return typeof value === "string" && value.includes(",")
              ? `"${value}"`
              : value;
          })
          .join(",")
      ),
    ];

    return csvRows.join("\n");
  };

  // Fetch logs when tab is selected or pagination changes
  useEffect(() => {
    console.log(`🔄 Tab/page change: ${activeTab}, page ${getCurrentPage()}`);
    fetchTabData(activeTab, getCurrentPage());
    
    // Set up polling for auto-refresh (every 30 seconds)
    const refreshInterval = setInterval(() => {
      console.log('🔄 Auto-refreshing logs...');
      fetchTabData(activeTab, getCurrentPage(), true); // Skip loading state for background refresh
    }, 30000);
    
    // Clean up interval on component unmount or when dependencies change
    return () => clearInterval(refreshInterval);
  }, [activeTab, getCurrentPage(), itemsPerPage]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sample columns for all log types - only timestamp and description
  const getColumns = () => {
    return [
      { key: "timestamp", label: "Timestamp" },
      { key: "description", label: "Description" },
    ];
  };

  // Get data based on active tab - only show real backend data
  const getTabData = useMemo(() => {
    // Helper function to format log entries consistently across all tabs
    const formatSystemLog = (log, index) => {
      try {
        const formattedTimestamp = formatLogTimestamp(log.timestamp);
        
        // Create clean, readable descriptions
        let cleanDescription = log.description || "No description";
        
        // Parse common patterns and simplify them
        if (cleanDescription.includes("Create") && cleanDescription.includes(":")) {
          // Handle format like "Create driver: Juan Dela Cruz" or "Create therapist: Maria Therapist"
          const parts = cleanDescription.split(":");
          if (parts.length >= 2) {
            const role = parts[0].replace("Create ", "").trim(); // This is the role (driver, therapist, etc.)
            const name = parts[1].trim(); // This is the actual person's name
            cleanDescription = `${name} registered as ${role}`;
          }
        }
        

        // Handle authentication logs
        if (log.log_type === 'authentication') {
          if (cleanDescription.includes("successful login")) {
            const userMatch = cleanDescription.match(/(.+?)\s+successful login/);
            if (userMatch) {
              cleanDescription = `${userMatch[1]} logged in`;
            }
          } else if (cleanDescription.includes("successful logout")) {
            const userMatch = cleanDescription.match(/(.+?)\s+successful logout/);
            if (userMatch) {
              cleanDescription = `${userMatch[1]} logged out`;
            }
          }
        }
        
        return {
          id: log.id || index + 1,
          timestamp: formattedTimestamp,
          description: cleanDescription,
        };
        
      } catch (err) {
        console.error(`Error formatting log entry:`, err, log);
        return {
          id: index + 1,
          timestamp: formatLogTimestamp(null),
          description: "Error formatting log entry",
        };
      }
    };
    
    try {
      if (activeTab === "Inventory" && inventoryLogs && inventoryLogs.length > 0) {
        console.log(`Processing ${inventoryLogs.length} inventory logs`);
        return inventoryLogs.map((log, index) => {
          try {
            // Check if this is a consolidated materials log from our new format
            const metadata = log.metadata || log.additional_data || {};
            const materialsSummary = metadata.materials_summary;
            const appointmentId = metadata.appointment_id;
            const operatorName = metadata.operator_name || metadata.performed_by || log.user || "Unknown User";
            
            // Use the new consolidated format if available
            if (log.action_type === "appointment_materials_usage" || materialsSummary) {
              return {
                id: index + 1,
                timestamp: formatLogTimestamp(log.timestamp || log.date || log.created_at),
                description: `Materials for Appointment #${appointmentId || ""}: ${materialsSummary}`,
              };
            } 
            // Otherwise fall back to the old format
            else {
              return {
                id: index + 1,
                timestamp: formatLogTimestamp(log.timestamp || log.date || log.created_at),
                description: `Material Usage (Appointment): ${
                  log.item_name || 
                  (metadata.item_name) || 
                  log.product_name || 
                  log.item || 
                  "Unknown Item"
                } - ${
                  log.quantity_used || 
                  metadata.quantity_used || 
                  0
                } ${log.unit || metadata.unit || ""} used by ${operatorName}`.trim(),
              };
            }
            
          } catch (err) {
            console.error(`Error processing inventory log:`, err, log);
            return {
              id: index + 1,
              timestamp: formatLogTimestamp(null),
              description: "Error processing inventory log entry",
            };
          }
        });
      } else if (activeTab === "Authentication" && authLogs && authLogs.length > 0) {
        console.log(`Processing ${authLogs.length} authentication logs`);
        return authLogs.map((log, index) => formatSystemLog(log, index));
      } else if (activeTab === "Appointment" && appointmentLogs && appointmentLogs.length > 0) {
        console.log(`Processing ${appointmentLogs.length} appointment logs`);
        return appointmentLogs.map((log, index) => formatSystemLog(log, index));
      } else if (activeTab === "Data" && dataLogs && dataLogs.length > 0) {
        console.log(`Processing ${dataLogs.length} data logs`);
        return dataLogs.map((log, index) => formatSystemLog(log, index));
      } else if (activeTab === "Payment" && paymentLogs && paymentLogs.length > 0) {
        console.log(`Processing ${paymentLogs.length} payment logs`);
        return paymentLogs.map((log, index) => formatSystemLog(log, index));
      } else {
        console.log(`No logs found for ${activeTab} tab or logs array is empty`);
        return [];
      }
    } catch (err) {
      console.error(`Error in getTabData:`, err);
      return [];
    }
  }, [activeTab, inventoryLogs, authLogs, appointmentLogs, dataLogs, paymentLogs]);

  // Initialize the page and load data when component first mounts
  useEffect(() => {
    document.title = pageTitles.logs;
    
    // Force immediate data load when component mounts
    const loadInitialData = async () => {
      console.log('🔄 Component mounted - initializing data and token');
      
      // Reset any API errors on mount
      setApiError({ auth: false, inventory: false, appointment: false, data: false, payment: false });
      
      // Force a token check/refresh on component mount
      const token = getAuthToken();
      if (!token) {
        console.warn('⚠️ No token available on mount');
        // Still attempt to fetch - the error handling in fetchTabData will show appropriate message
      }
      
      console.log('🚀 Initial data load for', activeTab);
      
      // Initial data fetch for the current active tab
      try {
        // Wait a brief moment to ensure all React state is properly initialized
        setTimeout(() => {
          fetchTabData(activeTab, 1);
        }, 100);
      } catch (err) {
        console.error('❌ Error during initial data load:', err);
      }
    };
    
    loadInitialData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Function to manually refresh the current tab data
  const handleManualRefresh = () => {
    console.log('🔄 Manual refresh triggered');
    setIsLoading(true);
    fetchTabData(activeTab, getCurrentPage());
  };

  // Don't reset pagination when tab changes - maintain separate pagination per tab
  // useEffect(() => {
  //   setCurrentPage(1); // Reset to first page when changing tabs
  // }, [activeTab]);

  return (
    <PageLayout>
      <LayoutRow title="History Logs">
        <button 
          className={"secondary-action-btn"} 
          onClick={handleManualRefresh}
          disabled={isLoading}
          style={{ marginRight: 8 }}
        >
          <span className={"primary-action-icon"}>
            <MdRefresh size={20} />
          </span>{" "}
          Refresh
        </button>
      </LayoutRow>
      <TabSwitcher
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(newTab) => {
          setActiveTab(newTab);
          // Reset to page 1 when changing tabs and force immediate data refresh
          setCurrentPage(1);
          // Data will be loaded by the useEffect that depends on activeTab
        }}
      />
      <div className={styles.logsTable}>
        <DataTable
          columns={getColumns()}
          data={getTabData}
          noDataText={`No ${activeTab.toLowerCase()} logs available.`}
          isLoading={isLoading}
        />
        
        {/* Pagination Controls - Inside table container */}
        {getTotalPages() > 1 && (
          <div style={{ marginTop: "20px", display: "flex", flexDirection: "column", alignItems: "center" }}>
            <ServerPagination
              currentPage={getCurrentPage()}
              totalPages={getTotalPages()}
              hasNext={getCurrentPage() < getTotalPages()}
              hasPrevious={getCurrentPage() > 1}
              onPageChange={setCurrentPage}
              className="logs-pagination"
            />
          </div>
        )}
      </div>

      {/* Export Controls - Outside the table container */}
      {!isLoading && getCurrentTabLogs().length > 0 && (
          <div className={styles.exportContainer}>
            <div className={styles.exportDropdown}>
              <div>
                <button
                  className={styles.exportButton}
                  onClick={() => setShowExportDropdown(!showExportDropdown)}
                >
                  Export ▼
                </button>
              </div>
              {showExportDropdown && (
                <div className={styles.dropdownMenu}>
                  <button
                    className={styles.dropdownItem}
                    onClick={() => {
                      exportLogsToCSV();
                      setShowExportDropdown(false);
                    }}
                  >
                    📄 Export to CSV
                  </button>
                  <button
                    className={styles.dropdownItem}
                    onClick={() => {
                      exportLogsToExcel();
                      setShowExportDropdown(false);
                    }}
                  >
                    📊 Export to Excel
                  </button>
                  <button
                    className={styles.dropdownItem}
                    onClick={() => {
                      exportLogsToPDF();
                      setShowExportDropdown(false);
                    }}
                  >
                    🖨️ Print Report
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
    </PageLayout>
  );
};

export default LogsPage;
