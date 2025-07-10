import { useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useEffect, useState } from "react";
import { MdAdd, MdRefresh } from "react-icons/md";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";
import ServerPagination from "../../components/ServerPagination";
import pageTitles from "../../constants/pageTitles";
import { API_BASE_URL } from "../../constants/apiConfig";
import DataTable from "../../globals/DataTable";
import LayoutRow from "../../globals/LayoutRow";
import PageLayout from "../../globals/PageLayout";
import { useInventoryItems } from "../../hooks/useInventoryItems";
import {
  useAddInventoryItem,
  useRestockInventoryItem,
  useUpdateInventoryItem,
} from "../../hooks/useInventoryMutations";
import { getToken } from "../../utils/tokenManager";
import styles from "./InventoryPage.module.css";
import { MenuItem, Select } from "./MUISelect";
import rcLogo from "../../assets/images/rc_logo.jpg";

const INVENTORY_API_URL = `${API_BASE_URL}/inventory/`;

const getAuthToken = () => {
  // Use the centralized token manager
  return getToken();
};

const axiosAuth = axios.create();
axiosAuth.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token && token !== "undefined" && token.trim() !== "") {
    config.headers["Authorization"] = `Token ${token}`;
  } else {
    // Explicitly remove Authorization header if no valid token
    delete config.headers["Authorization"];
  }
  return config;
});

const InventoryPage = () => {
  // TanStack Query hooks for data fetching and mutations
  const {
    data: inventoryData,
    isLoading: inventoryLoading,
    isRefetching: inventoryRefetching,
    error: inventoryError,
  } = useInventoryItems();
  const updateInventoryMutation = useUpdateInventoryItem();
  const restockInventoryMutation = useRestockInventoryItem();
  const addInventoryMutation = useAddInventoryItem();
  const queryClient = useQueryClient();

  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItem, setNewItem] = useState({
    name: "",
    category: "",
    current_stock: 0,
    min_stock: 0,
    unit: "",
    cost_per_unit: 0,
  });
  const [showUsageLog, setShowUsageLog] = useState(false);
  const [usageLogs, setUsageLogs] = useState([]);
  const [usageLogPagination, setUsageLogPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 20  // Increased from 10 to 20 for better pagination
  });
  const [isLoadingUsageLogs, setIsLoadingUsageLogs] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [restockItem, setRestockItem] = useState(null);
  const [restockAmount, setRestockAmount] = useState(0);
  const [restockNotes, setRestockNotes] = useState("");
  const [restockType, setRestockType] = useState("regular"); // "regular" or "empty"
  const [isRestockLoading, setIsRestockLoading] = useState(false);
  // Removed activeTab constant; use showUsageLog directly in conditionals

  // Get inventory items from TanStack Query data
  const inventoryItems = Array.isArray(inventoryData) ? inventoryData : [];

  // Debug logging
  // console.log('InventoryPage Debug:', {
  //   inventoryData,
  //   inventoryLoading,
  //   inventoryError,
  //   inventoryItems,
  //   itemsLength: inventoryItems.length,
  //   timestamp: new Date().toISOString()
  // });

  useEffect(() => {
    document.title = pageTitles.inventory;
    // No need to manually fetch - TanStack Query handles this
  }, []);

  useEffect(() => {
    if (showUsageLog) {
      fetchUsageLogs(1); // Start with page 1
    }
  }, [showUsageLog]);

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

  // Fetch usage logs with pagination (action_type='restock')
  const fetchUsageLogs = async (page = 1) => {
    setIsLoadingUsageLogs(true);
    try {
      const response = await axiosAuth.get(
        `${INVENTORY_API_URL}usage-log/?action_type=restock&page=${page}&page_size=20`
      );
      
      if (Array.isArray(response.data)) {
        // Non-paginated response
        setUsageLogs(response.data);
        setUsageLogPagination({
          currentPage: 1,
          totalPages: 1,
          totalItems: response.data.length,
          itemsPerPage: 20
        });
      } else {
        // Paginated response
        setUsageLogs(response.data.results || []);
        setUsageLogPagination({
          currentPage: page,
          totalPages: Math.ceil((response.data.count || 0) / 20),
          totalItems: response.data.count || 0,
          itemsPerPage: 20
        });
      }
    } catch (error) {
      console.error('Failed to fetch usage logs:', error);
      setUsageLogs([]);
      setUsageLogPagination({
        currentPage: 1,
        totalPages: 1,
        totalItems: 0,
        itemsPerPage: 20
      });
    } finally {
      setIsLoadingUsageLogs(false);
    }
  };

  const handleUsageLogPageChange = (newPage) => {
    if (newPage >= 1 && newPage <= usageLogPagination.totalPages) {
      fetchUsageLogs(newPage);
    }
  };

  // Export functions for usage logs
  const exportUsageLogsToCSV = () => {
    if (usageLogs.length === 0) {
      alert("No usage logs data to export.");
      return;
    }

    const csvData = usageLogs.map((log) => {
      const dateObj = new Date(log.timestamp || log.date || log.created_at || Date.now());
      let notes = log.notes && log.notes.trim() !== "" ? log.notes : "-";
      
      // Remove default system messages from notes
      if (notes.includes("Refilled from empty containers.")) {
        const userNotePart = notes.replace("Refilled from empty containers.", "").trim();
        notes = userNotePart || "-";
      }

      return {
        Date: dateObj.toISOString().split("T")[0],
        Time: dateObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        "Product Name": log.item_name || log.product_name || log.item || "-",
        "Quantity Refilled": `${log.quantity_used} ${pluralizeUnit(log.quantity_used, log.unit || "")}`.trim(),
        Notes: notes,
      };
    });

    const csvContent = convertToCSV(csvData);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const fileName = `usage-logs-${new Date().toISOString().split("T")[0]}.csv`;
    saveAs(blob, fileName);
  };

  const exportUsageLogsToExcel = () => {
    if (usageLogs.length === 0) {
      alert("No usage logs data to export.");
      return;
    }

    const excelData = usageLogs.map((log) => {
      const dateObj = new Date(log.timestamp || log.date || log.created_at || Date.now());
      let notes = log.notes && log.notes.trim() !== "" ? log.notes : "-";
      
      // Remove default system messages from notes
      if (notes.includes("Refilled from empty containers.")) {
        const userNotePart = notes.replace("Refilled from empty containers.", "").trim();
        notes = userNotePart || "-";
      }

      return {
        Date: dateObj.toISOString().split("T")[0],
        Time: dateObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        "Product Name": log.item_name || log.product_name || log.item || "-",
        "Quantity Refilled": `${log.quantity_used} ${pluralizeUnit(log.quantity_used, log.unit || "")}`.trim(),
        Notes: notes,
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Usage Logs");
    const fileName = `usage-logs-${new Date().toISOString().split("T")[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  const exportUsageLogsToPDF = () => {
    if (usageLogs.length === 0) {
      alert("No usage logs data to export.");
      return;
    }

    const data = usageLogs.map((log) => {
      const dateObj = new Date(log.timestamp || log.date || log.created_at || Date.now());
      let notes = log.notes && log.notes.trim() !== "" ? log.notes : "-";
      
      // Remove default system messages from notes
      if (notes.includes("Refilled from empty containers.")) {
        const userNotePart = notes.replace("Refilled from empty containers.", "").trim();
        notes = userNotePart || "-";
      }

      return [
        dateObj.toISOString().split("T")[0],
        dateObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        log.item_name || log.product_name || log.item || "-",
        `${log.quantity_used} ${pluralizeUnit(log.quantity_used, log.unit || "")}`.trim(),
        notes,
      ];
    });

    const headers = ["Date", "Time", "Product Name", "Quantity Refilled", "Notes"];
    const reportTitle = "Inventory Usage Logs Report";

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

  const handleAddItem = async (e) => {
    e.preventDefault();
    try {
      await addInventoryMutation.mutateAsync({
        name: newItem.name,
        category: newItem.category,
        current_stock: newItem.current_stock,
        min_stock: newItem.min_stock,
        unit: newItem.unit,
        cost_per_unit: newItem.cost_per_unit,
      });
      setShowAddModal(false);
      setNewItem({
        name: "",
        category: "",
        current_stock: 0,
        min_stock: 0,
        unit: "",
        cost_per_unit: 0,
      });
    } catch {
      showError("Failed to add item.");
    }
  };

  const handleEditClick = (item) => {
    setEditItem(item);
    setShowEditModal(true);
  };

  const handleEditSave = async (updatedItem) => {
    try {
      // console.log('Saving inventory update:', updatedItem);
      await updateInventoryMutation.mutateAsync(updatedItem);
      // console.log('Inventory update successful, cache should be cleared and refetched');
      setShowEditModal(false);
      setEditItem(null);
    } catch (error) {
      console.error("Inventory update failed:", error);
      showError("Failed to update item.");
    }
  };

  const handleRestockClick = (item) => {
    setRestockItem(item);
    setRestockAmount(0);
    setRestockNotes("");
    // Check if item has empty containers and set the default type
    if (item.empty > 0) {
      setRestockType("empty");
    } else {
      setRestockType("regular");
    }
    setShowRestockModal(true);
  };

  const handleRestockSave = async () => {
    if (!restockItem) return;
    setIsRestockLoading(true);
    try {
      if (restockType === "empty") {
        // Use the empty refill API endpoint
        const response = await axiosAuth.post(
          `${INVENTORY_API_URL}${restockItem.id}/refill_from_empty/`,
          {
            amount: restockAmount,
            notes: restockNotes || undefined,
          }
        );

        if (response.data.status === "refilled_from_empty") {
          // Invalidate cache to refresh data
          queryClient.invalidateQueries({ queryKey: ["inventory-items"] });

          if (showUsageLog) fetchUsageLogs(usageLogPagination.currentPage); // Refresh usage log if visible
          setShowRestockModal(false);
          setRestockItem(null);
          setRestockAmount(0);
          setRestockNotes("");
          setRestockType("regular");

          // Show success message
          alert(
            response.data.message || "Empty containers refilled successfully!"
          );
        }
      } else {
        // Use regular restock mutation
        await restockInventoryMutation.mutateAsync({
          itemId: restockItem.id,
          amount: restockAmount,
          notes: restockNotes || undefined,
        });
        if (showUsageLog) fetchUsageLogs(usageLogPagination.currentPage); // Refresh usage log if visible
        setShowRestockModal(false);
        setRestockItem(null);
        setRestockAmount(0);
        setRestockNotes("");
        setRestockType("regular");
      }
    } catch (error) {
      console.error("Restock failed:", error);
      showError(error.response?.data?.error || "Failed to refill item.");
    } finally {
      setIsRestockLoading(false);
    }
  };

  const categories = [
    "all",
    "Oils & Lotions",
    "Linens",
    "Hygiene",
    "Equipment",
    ...Array.from(new Set(inventoryItems.map((item) => item.category))).filter(
      (cat) =>
        !["Oils & Lotions", "Linens", "Hygiene", "Equipment", "all"].includes(
          cat
        )
    ),
  ];

  const filteredItems = Array.isArray(inventoryItems)
    ? inventoryItems.filter((item) => {
        const matchesCategory =
          selectedCategory === "all" || item.category === selectedCategory;
        const matchesSearch = (item.name || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase());
        return matchesCategory && matchesSearch;
      })
    : [];

  const sortedFilteredItems = [...filteredItems].sort((a, b) => {
    if (a.name && b.name) {
      return a.name.localeCompare(b.name);
    }
    return 0;
  });

  const getStockStatus = (item) => {
    // Use backend field names
    if (item.current_stock <= item.min_stock) {
      return { status: "low", label: "Low Stock", class: "stock-low" };
    } else if (item.current_stock <= item.min_stock * 1.5) {
      return {
        status: "warning",
        label: "Getting Low",
        class: "stock-medium",
      };
    } else {
      return { status: "good", label: "In Stock", class: "stock-high" };
    }
  };

  const getInventoryStats = () => {
    const totalItems = inventoryItems.length;
    const lowStockItems = inventoryItems.filter(
      (item) => item.current_stock <= item.min_stock
    ).length;
    const totalValue = inventoryItems.reduce(
      (sum, item) => sum + item.current_stock * item.cost_per_unit,
      0
    );
    const categoryCount = new Set(inventoryItems.map((item) => item.category))
      .size;

    return { totalItems, lowStockItems, totalValue, categories: categoryCount };
  };

  const stats = getInventoryStats();

  // Define columns for DataTable
  const columns = [
    { key: "name", label: "Item Name" },
    { key: "category", label: "Category" },
    { key: "currentStock", label: "In Stock" },
    { key: "inUse", label: "In Use" },
    { key: "empty", label: "Empty" },
    { key: "minStock", label: "Min Stock" },
    { key: "status", label: "Status" },
    { key: "costPerUnit", label: "Cost/Unit" },
    { key: "totalValue", label: "Total Value" },
    { key: "actions", label: "Actions" },
  ];

  const usageLogColumns = [
    { key: "date", label: "Date" },
    { key: "time", label: "Time" },
    { key: "productName", label: "Product Name" },
    { key: "quantityRefilled", label: "Quantity Refilled" },
    { key: "notes", label: "Notes" },
  ];

  // Prepare data for DataTable
  const tableData = sortedFilteredItems.map((item) => {
    const stockStatus = getStockStatus(item);
    return {
      name: (
        <div className={styles["item-name"]}>
          {item.name}
          {item.expiry_date && (
            <div className={styles["expiry-date"]}>
              Expires: {new Date(item.expiry_date).toLocaleDateString()}
            </div>
          )}
        </div>
      ),
      category: item.category,
      currentStock: `${item.current_stock} ${item.unit}`,
      inUse: `${item.in_use || 0} ${item.unit}`,
      empty: `${item.empty || 0} ${item.unit}`,
      minStock: `${item.min_stock} ${item.unit}`,
      status: (
        <span className={styles[stockStatus.class]}>{stockStatus.label}</span>
      ),
      costPerUnit:
        item.cost_per_unit !== undefined && item.cost_per_unit !== null
          ? `₱${Number(item.cost_per_unit).toFixed(2)}`
          : "",
      totalValue:
        item.current_stock !== undefined &&
        item.cost_per_unit !== undefined &&
        item.current_stock !== null &&
        item.cost_per_unit !== null
          ? `₱${(
              Number(item.current_stock) * Number(item.cost_per_unit)
            ).toFixed(2)}`
          : "",
      actions: (
        <div className={styles["item-actions"]}>
          <button
            className={styles["edit-button"]}
            onClick={() => handleEditClick(item)}
          >
            Edit
          </button>
          <button
            className={styles["restock-button"]}
            onClick={() => handleRestockClick(item)}
          >
            Refill
          </button>
        </div>
      ),
    };
  });

  // Irregular plural mappings for units
  const irregularPlurals = {
    piece: "pieces",
    bottle: "bottles",
    leaf: "leaves",
    mouse: "mice",
    // Add more irregulars as needed
    pieces: "piece",
    bottles: "bottle",
    leaves: "leaf",
    mice: "mouse",
  };

  // Pluralize unit helper
  const pluralizeUnit = (quantity, unit) => {
    if (!unit) return "";
    const lowerUnit = unit.toLowerCase();
    if (quantity === 1) {
      // Singular form
      if (irregularPlurals[lowerUnit]) {
        // If already plural, convert to singular
        if (["pieces", "bottles", "leaves", "mice"].includes(lowerUnit)) {
          return irregularPlurals[lowerUnit];
        }
      }
      // Remove trailing 's' for regular plurals
      if (unit.endsWith("s")) {
        return unit.slice(0, -1);
      }
      return unit;
    } else {
      // Plural form
      if (irregularPlurals[lowerUnit]) {
        // If singular, convert to plural
        if (["piece", "bottle", "leaf", "mouse"].includes(lowerUnit)) {
          return irregularPlurals[lowerUnit];
        }
      }
      // Add 's' if not already plural
      if (!unit.endsWith("s")) return unit + "s";
      return unit;
    }
  };

  const usageLogTableData = usageLogs.map((log) => {
    const dateObj = new Date(
      log.timestamp || log.date || log.created_at || Date.now()
    );
    let quantity = log.quantity_used;
    // Only show user-provided notes, not default system messages
    let notes = log.notes && log.notes.trim() !== "" ? log.notes : "-";
    
    // Remove default system messages from notes
    if (notes.includes("Refilled from empty containers.")) {
      // Extract only the user part after the system message
      const userNotePart = notes.replace("Refilled from empty containers.", "").trim();
      notes = userNotePart || "-";
    }
    
    const unit = log.unit || "";
    return {
      date: dateObj.toISOString().split("T")[0],
      time: dateObj.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      productName: log.item_name || log.product_name || log.item || "-",
      quantityRefilled: `${quantity} ${pluralizeUnit(quantity, unit)}`.trim(),
      notes: notes,
    };
  });

  const showError = (msg) => {
    // Optionally, implement a toast or alert here
    console.error(msg);
  };

  return (
    <PageLayout>
      <div className={styles["inventory-page"]}>
        <LayoutRow title={showUsageLog ? "Usage Logs" : "Inventory Management"}>
          <div className={"action-buttons"}>
            {showUsageLog ? (
              <button
                className={styles["back-arrow-btn"]}
                onClick={() => setShowUsageLog(false)}
                style={{ marginRight: 16 }}
                aria-label="Back to Inventory List"
              >
                &#8592; {/* Unicode left arrow */}
              </button>
            ) : (
              <>
                <button
                  className={"secondary-action-btn"}
                  onClick={() => setShowUsageLog(true)}
                  style={{ marginRight: 8 }}
                >
                  View Usage Log
                </button>
                <button
                  className={"secondary-action-btn"}
                  onClick={() => {
                    // console.log('Manual refresh clicked - invalidating cache and refetching...');
                    // Invalidate cache to trigger refetch while keeping data visible
                    queryClient.invalidateQueries({
                      queryKey: ["inventory-items"],
                    });
                  }}
                  style={{ marginRight: 8 }}
                >
                  <span className={"primary-action-icon"}>
                    <MdRefresh size={20} />
                  </span>{" "}
                  Refresh
                </button>
                <button
                  className={"primary-action-btn"}
                  onClick={() => setShowAddModal(true)}
                >
                  <span className={"primary-action-icon"}>
                    <MdAdd size={20} />
                  </span>{" "}
                  Add
                </button>
              </>
            )}
          </div>
        </LayoutRow>

        {/* Inventory Statistics */}
        {!showUsageLog && (
          <div className={styles["inventory-stats"]}>
            <div className={styles["stat-card"]}>
              <div className={styles["stat-number"]}>{stats.totalItems}</div>
              <div className={styles["stat-label"]}>Total Items</div>
            </div>
            <div className={styles["stat-card"]}>
              <div className={styles["stat-number"]}>{stats.categories}</div>
              <div className={styles["stat-label"]}>Categories</div>
            </div>
            <div className={styles["stat-card"] + " " + styles["warning"]}>
              <div className={styles["stat-number"]}>{stats.lowStockItems}</div>
              <div className={styles["stat-label"]}>Low Stock Alerts</div>
            </div>
            <div className={styles["stat-card"]}>
              <div className={styles["stat-number"]}>
                {typeof stats.totalValue === "number" &&
                !isNaN(stats.totalValue)
                  ? `₱${stats.totalValue.toFixed(2)}`
                  : ""}
              </div>
              <div className={styles["stat-label"]}>Total Inventory Value</div>
            </div>
          </div>
        )}

        {/* Controls */}
        {!showUsageLog && (
          <div className={styles["inventory-controls"]}>
            <input
              type="text"
              placeholder="Search items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles["search-input"]}
              style={{ minWidth: 220, marginRight: 12 }}
            />
            <Select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className={styles["category-select"]}
              size="small"
              displayEmpty
              sx={{
                minWidth: 180,
                background: "#f7f7fa",
                borderRadius: "8px",
                border: "1px solid #e0e0e0",
                fontSize: "1rem",
                height: "40px",
                boxShadow: "none",
                ".MuiOutlinedInput-notchedOutline": {
                  border: "none",
                },
                "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                  border: "1px solid #bdbdbd",
                },
                ".MuiSelect-select": {
                  padding: "10px 14px",
                  display: "flex",
                  alignItems: "center",
                },
              }}
            >
              {categories.map((category) => (
                <MenuItem key={category} value={category}>
                  {category === "all" ? "All Categories" : category}
                </MenuItem>
              ))}
            </Select>
          </div>
        )}

        {/* Inventory Table */}
        {!showUsageLog && (
          <div className={styles["inventory-table-container"]}>
            {/* Show loading state only when there's no data yet (initial load) */}
            {inventoryLoading && !inventoryData ? (
              <div style={{ textAlign: "center", padding: "20px" }}>
                Loading inventory items...
              </div>
            ) : inventoryError ? (
              <div
                style={{ textAlign: "center", padding: "20px", color: "red" }}
              >
                Error loading inventory: {inventoryError.message}
              </div>
            ) : (
              <div>
                {/* Show subtle refetching indicator when updating in background */}
                {inventoryRefetching && inventoryData && (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "5px",
                      backgroundColor: "#f0f8ff",
                      border: "1px solid #e0e0e0",
                      borderRadius: "4px",
                      marginBottom: "10px",
                      fontSize: "14px",
                      color: "#666",
                    }}
                  >
                    🔄 Updating inventory data...
                  </div>
                )}
                <DataTable
                  columns={columns}
                  data={tableData}
                  noDataText="No inventory items found."
                />
              </div>
            )}
          </div>
        )}

        {/* Add Item Modal */}
        {showAddModal && (
          <div className={styles["modal-overlay"]}>
            <div className={styles["modal-content"]}>
              <div className={styles["modal-header"]}>
                <h3>Add New Inventory Item</h3>
                <button
                  className={styles["close-button"]}
                  onClick={() => setShowAddModal(false)}
                >
                  ×
                </button>
              </div>
              <form onSubmit={handleAddItem}>
                <div className={styles["form-group"]}>
                  <label>Item Name</label>
                  <input
                    type="text"
                    value={newItem.name}
                    onChange={(e) =>
                      setNewItem({ ...newItem, name: e.target.value })
                    }
                    required
                  />
                </div>
                <div className={styles["form-group"]}>
                  <label>Category</label>
                  <Select
                    value={newItem.category}
                    onChange={(e) =>
                      setNewItem({ ...newItem, category: e.target.value })
                    }
                    displayEmpty
                    size="small"
                    style={{ width: "100%", background: "#fff" }}
                  >
                    <MenuItem value="">
                      <em>Select Category</em>
                    </MenuItem>
                    {categories
                      .filter((cat) => cat !== "all")
                      .map((category) => (
                        <MenuItem key={category} value={category}>
                          {category}
                        </MenuItem>
                      ))}
                  </Select>
                </div>
                <div style={{ display: "flex", gap: 16 }}>
                  <div className={styles["form-group"]}>
                    <label>Current Stock</label>
                    <input
                      type="number"
                      value={newItem.current_stock}
                      onChange={(e) =>
                        setNewItem({
                          ...newItem,
                          current_stock: parseInt(e.target.value),
                        })
                      }
                      required
                    />
                  </div>
                  <div className={styles["form-group"]}>
                    <label>Minimum Stock</label>
                    <input
                      type="number"
                      value={newItem.min_stock}
                      onChange={(e) =>
                        setNewItem({
                          ...newItem,
                          min_stock: parseInt(e.target.value),
                        })
                      }
                      required
                    />
                  </div>
                </div>
                <div className={styles["form-group"]}>
                  <label>Unit</label>
                  <input
                    type="text"
                    value={newItem.unit}
                    onChange={(e) =>
                      setNewItem({ ...newItem, unit: e.target.value })
                    }
                    placeholder="e.g., bottles, pieces, kg"
                    required
                  />
                </div>
                <div className={styles["form-group"]}>
                  <label>Cost per Unit</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newItem.cost_per_unit}
                    onChange={(e) =>
                      setNewItem({
                        ...newItem,
                        cost_per_unit: parseFloat(e.target.value),
                      })
                    }
                    required
                  />
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    marginTop: 20,
                  }}
                >
                  <button type="submit" className={styles["action-btn"]}>
                    Add Item
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Item Modal */}
        {showEditModal && editItem && (
          <div className={styles["modal-overlay"]}>
            <div className={styles["modal-content"]}>
              <div className={styles["modal-header"]}>
                <h3>Edit Inventory Item</h3>
                <button
                  className={styles["close-button"]}
                  onClick={() => setShowEditModal(false)}
                >
                  ×
                </button>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleEditSave(editItem);
                }}
              >
                <div className={styles["form-group"]}>
                  <label>Item Name</label>
                  <input
                    type="text"
                    value={editItem.name}
                    onChange={(e) =>
                      setEditItem({ ...editItem, name: e.target.value })
                    }
                    required
                  />
                </div>
                <div className={styles["form-group"]}>
                  <label>Category</label>
                  <Select
                    value={editItem.category}
                    onChange={(e) =>
                      setEditItem({ ...editItem, category: e.target.value })
                    }
                    displayEmpty
                    size="small"
                    style={{ width: "100%", background: "#fff" }}
                  >
                    <MenuItem value="">
                      <em>Select Category</em>
                    </MenuItem>
                    {categories
                      .filter((cat) => cat !== "all")
                      .map((category) => (
                        <MenuItem key={category} value={category}>
                          {category}
                        </MenuItem>
                      ))}
                  </Select>
                </div>
                <div style={{ display: "flex", gap: 16 }}>
                  <div className={styles["form-group"]}>
                    <label>Current Stock</label>
                    <input
                      type="number"
                      value={editItem.current_stock}
                      onChange={(e) =>
                        setEditItem({
                          ...editItem,
                          current_stock: Number(e.target.value),
                        })
                      }
                      required
                    />
                  </div>
                  <div className={styles["form-group"]}>
                    <label>Minimum Stock</label>
                    <input
                      type="number"
                      value={editItem.min_stock}
                      onChange={(e) =>
                        setEditItem({
                          ...editItem,
                          min_stock: Number(e.target.value),
                        })
                      }
                      required
                    />
                  </div>
                </div>
                <div className={styles["form-group"]}>
                  <label>Unit</label>
                  <input
                    type="text"
                    value={editItem.unit}
                    onChange={(e) =>
                      setEditItem({ ...editItem, unit: e.target.value })
                    }
                    placeholder="e.g., bottles, pieces, kg"
                    required
                  />
                </div>
                <div className={styles["form-group"]}>
                  <label>Cost per Unit</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editItem.cost_per_unit}
                    onChange={(e) =>
                      setEditItem({
                        ...editItem,
                        cost_per_unit: Number(e.target.value),
                      })
                    }
                    required
                  />
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    marginTop: 20,
                  }}
                >
                  <button type="submit" className={styles["action-btn"]}>
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Restock Item Modal */}
        {showRestockModal && restockItem && (
          <div className={styles["modal-overlay"]}>
            <div className={styles["modal-content"]}>
              <div className={styles["modal-header"]}>
                <h3>
                  {restockType === "empty"
                    ? "Refill from Empty Containers"
                    : "Refill Item"}
                </h3>
                <button
                  className={styles["close-button"]}
                  onClick={() => setShowRestockModal(false)}
                  disabled={isRestockLoading}
                >
                  ×
                </button>
              </div>
              <div className={styles["form-group"]}>
                <label>Item</label>
                <input
                  type="text"
                  value={restockItem.name}
                  disabled
                  style={{ background: "#f5f5f5", color: "#666" }}
                />
              </div>
              <div className={styles["form-group"]}>
                <label>Current Stock</label>
                <input
                  type="text"
                  value={`${restockItem.current_stock} ${restockItem.unit}`}
                  disabled
                  style={{ background: "#f5f5f5", color: "#666" }}
                />
              </div>
              {/* Show empty containers info if available */}
              {restockItem.empty > 0 && (
                <div className={styles["form-group"]}>
                  <label>Empty Containers Available</label>
                  <input
                    type="text"
                    value={`${restockItem.empty} ${restockItem.unit}`}
                    disabled
                    style={{ background: "#f5f5f5", color: "#666" }}
                  />
                </div>
              )}
              {/* Show refill type selector if item has empty containers */}
              {restockItem.empty > 0 && (
                <div className={styles["form-group"]}>
                  <label>Refill Type</label>
                  <select
                    value={restockType}
                    onChange={(e) => {
                      setRestockType(e.target.value);
                      setRestockAmount(0); // Reset amount when switching type
                    }}
                    disabled={isRestockLoading}
                    style={{
                      width: "100%",
                      padding: "10px",
                      border: "1px solid #ddd",
                      borderRadius: "4px",
                      background: "#fff",
                    }}
                  >
                    <option value="regular">
                      Regular Refill (Add new stock)
                    </option>
                    <option value="empty">Refill from Empty Containers</option>
                  </select>
                </div>
              )}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleRestockSave();
                }}
              >
                <div className={styles["form-group"]}>
                  <label>
                    {restockType === "empty"
                      ? "Amount to Refill from Empty"
                      : "Amount to Add"}
                  </label>
                  <input
                    type="number"
                    value={restockAmount === 0 ? "" : restockAmount}
                    onChange={(e) =>
                      setRestockAmount(
                        e.target.value === "" ? 0 : Number(e.target.value)
                      )
                    }
                    min={1}
                    max={
                      restockType === "empty" ? restockItem.empty : undefined
                    }
                    placeholder={
                      restockType === "empty"
                        ? "Enter amount to refill from empty"
                        : "Enter amount to add"
                    }
                    disabled={isRestockLoading}
                    required
                  />
                  {restockType === "empty" && (
                    <small style={{ color: "#666", fontSize: "12px" }}>
                      Maximum: {restockItem.empty} empty containers available
                    </small>
                  )}
                </div>
                <div className={styles["form-group"]}>
                  <label>Notes (optional)</label>
                  <input
                    type="text"
                    value={restockNotes}
                    onChange={(e) => setRestockNotes(e.target.value)}
                    placeholder="Enter refill notes (optional)"
                    disabled={isRestockLoading}
                  />
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    marginTop: 20,
                  }}
                >
                  <button
                    type="submit"
                    className={styles["action-btn"]}
                    disabled={isRestockLoading}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    {isRestockLoading && (
                      <div
                        style={{
                          width: "16px",
                          height: "16px",
                          border: "2px solid rgba(255, 255, 255, 0.3)",
                          borderRadius: "50%",
                          borderTopColor: "white",
                          animation: "spin 1s linear infinite",
                        }}
                      ></div>
                    )}
                    {isRestockLoading
                      ? "Processing..."
                      : restockType === "empty"
                      ? "Refill from Empty"
                      : "Refill Item"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Usage Log Section */}
        {showUsageLog && (
          <>
            <div className={styles["inventory-table-container"]}>
              {isLoadingUsageLogs ? (
                <div style={{ textAlign: "center", padding: "20px" }}>
                  Loading usage logs...
                </div>
              ) : (
                <>
                  <DataTable
                    columns={usageLogColumns}
                    data={usageLogTableData}
                    noDataText="No usage logs found."
                  />
                  
                  {/* Pagination Controls using ServerPagination component */}
                  {usageLogPagination.totalPages > 1 && (
                    <div style={{ marginTop: "20px", display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <ServerPagination
                        currentPage={usageLogPagination.currentPage}
                        totalPages={usageLogPagination.totalPages}
                        hasNext={usageLogPagination.currentPage < usageLogPagination.totalPages}
                        hasPrevious={usageLogPagination.currentPage > 1}
                        onPageChange={handleUsageLogPageChange}
                        className="inventory-usage-log-pagination"
                      />
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Export Controls - Outside the table container */}
            {!isLoadingUsageLogs && usageLogs.length > 0 && (
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
                          exportUsageLogsToCSV();
                          setShowExportDropdown(false);
                        }}
                      >
                        📄 Export to CSV
                      </button>
                      <button
                        className={styles.dropdownItem}
                        onClick={() => {
                          exportUsageLogsToExcel();
                          setShowExportDropdown(false);
                        }}
                      >
                        📊 Export to Excel
                      </button>
                      <button
                        className={styles.dropdownItem}
                        onClick={() => {
                          exportUsageLogsToPDF();
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
          </>
        )}
      </div>
    </PageLayout>
  );
};

export default InventoryPage;
