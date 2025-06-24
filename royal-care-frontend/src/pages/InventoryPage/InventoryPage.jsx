import axios from "axios";
import { useEffect, useState } from "react";
import { MdAdd } from "react-icons/md";
import pageTitles from "../../constants/pageTitles";
import DataTable from "../../globals/DataTable";
import LayoutRow from "../../globals/LayoutRow";
import PageLayout from "../../globals/PageLayout";
import { getToken } from "../../utils/tokenManager";
import styles from "./InventoryPage.module.css";
import { MenuItem, Select } from "./MUISelect";

const API_BASE_URL = import.meta.env.PROD
  ? "https://charismatic-appreciation-production.up.railway.app"
  : (import.meta.env.VITE_API_BASE_URL || "http://localhost:8000").replace(
      "/api",
      ""
    );
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
    size_per_unit: "",
  });
  const [inventoryItems, setInventoryItems] = useState([]);
  const [showUsageLog, setShowUsageLog] = useState(false);
  const [usageLogs, setUsageLogs] = useState([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [restockItem, setRestockItem] = useState(null);
  const [restockAmount, setRestockAmount] = useState(0);
  const [restockNotes, setRestockNotes] = useState("");
  const [activeTab] = useState("inventory"); // Only use activeTab if needed
  // const [lastAddedId, setLastAddedId] = useState(null); // Unused, remove highlight tracking

  useEffect(() => {
    document.title = pageTitles.inventory;
    fetchInventory();
  }, []);

  useEffect(() => {
    if (showUsageLog) {
      fetchUsageLogs();
    }
  }, [showUsageLog]);

  const fetchInventory = async () => {
    try {
      const res = await axiosAuth.get(INVENTORY_API_URL);
      // Ensure inventoryItems is always an array
      let items = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data.results)
        ? res.data.results
        : [];
      setInventoryItems(items);
    } catch {
      setInventoryItems([]); // fallback to empty array
    }
  };

  // Fetch all usage logs, handling pagination
  const fetchUsageLogs = async () => {
    let allLogs = [];
    let nextUrl = `${INVENTORY_API_URL}usage-log/`;
    try {
      while (nextUrl) {
        const res = await axiosAuth.get(nextUrl);
        if (Array.isArray(res.data)) {
          allLogs = allLogs.concat(res.data);
          break;
        } else {
          allLogs = allLogs.concat(res.data.results || []);
          nextUrl = res.data.next;
        }
      }
      setUsageLogs(allLogs);
    } catch {
      setUsageLogs([]);
    }
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    try {
      const res = await axiosAuth.post(INVENTORY_API_URL, {
        name: newItem.name,
        category: newItem.category,
        current_stock: newItem.current_stock,
        min_stock: newItem.min_stock,
        unit: newItem.unit,
        cost_per_unit: newItem.cost_per_unit,
        size_per_unit: newItem.size_per_unit,
      });
      setInventoryItems([...inventoryItems, res.data]);
      setShowAddModal(false);
      setNewItem({
        name: "",
        category: "",
        current_stock: 0,
        min_stock: 0,
        unit: "",
        cost_per_unit: 0,
        size_per_unit: "",
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
      const res = await axiosAuth.put(
        `${INVENTORY_API_URL}${updatedItem.id}/`,
        updatedItem
      );
      setInventoryItems(
        inventoryItems.map((item) =>
          item.id === updatedItem.id ? res.data : item
        )
      );
      setShowEditModal(false);
      setEditItem(null);
    } catch {
      showError("Failed to update item.");
    }
  };

  const handleRestockClick = (item) => {
    setRestockItem(item);
    setRestockAmount(0);
    setShowRestockModal(true);
  };

  const handleRestockSave = async () => {
    if (!restockItem) return;
    try {
      await axiosAuth.post(`${INVENTORY_API_URL}${restockItem.id}/restock/`, {
        amount: restockAmount,
        notes: restockNotes || undefined,
      });
      fetchInventory();
      if (showUsageLog) fetchUsageLogs(); // Refresh usage log if visible
      setShowRestockModal(false);
      setRestockItem(null);
      setRestockAmount(0);
      setRestockNotes("");
    } catch {
      showError("Failed to restock item.");
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
    { key: "currentStock", label: "Current Stock" },
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
            Restock
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
    let notes = log.notes && log.notes.trim() !== "" ? log.notes : "-";
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
        {!showUsageLog && activeTab === "inventory" && (
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
        {!showUsageLog && activeTab === "inventory" && (
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
        {!showUsageLog && activeTab === "inventory" && (
          <div className={styles["inventory-table-container"]}>
            <DataTable
              columns={columns}
              data={tableData}
              noDataText="No inventory items found."
            />
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
                <div style={{ display: "flex", gap: 16 }}>
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
                    <label>Size per Unit</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newItem.size_per_unit}
                      onChange={(e) =>
                        setNewItem({
                          ...newItem,
                          size_per_unit:
                            e.target.value === ""
                              ? ""
                              : parseFloat(e.target.value),
                        })
                      }
                      placeholder="e.g., 500"
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
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    justifyContent: "flex-end",
                    marginTop: 20,
                  }}
                >
                  <button
                    type="button"
                    className={styles["cancel-button"]}
                    onClick={() => setShowAddModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className={styles["save-button"]}>
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
              <h2>Edit Item</h2>
              <button
                className={styles["close-modal"]}
                onClick={() => setShowEditModal(false)}
              >
                Close
              </button>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleEditSave(editItem);
                }}
              >
                <label>
                  Name:{" "}
                  <input
                    value={editItem.name}
                    onChange={(e) =>
                      setEditItem({ ...editItem, name: e.target.value })
                    }
                  />
                </label>
                <br />
                <label>
                  Category:{" "}
                  <input
                    value={editItem.category}
                    onChange={(e) =>
                      setEditItem({ ...editItem, category: e.target.value })
                    }
                  />
                </label>
                <br />
                <label>
                  Current Stock:{" "}
                  <input
                    type="number"
                    value={editItem.current_stock}
                    onChange={(e) =>
                      setEditItem({
                        ...editItem,
                        current_stock: Number(e.target.value),
                      })
                    }
                  />
                </label>
                <br />
                <label>
                  Min Stock:{" "}
                  <input
                    type="number"
                    value={editItem.min_stock}
                    onChange={(e) =>
                      setEditItem({
                        ...editItem,
                        min_stock: Number(e.target.value),
                      })
                    }
                  />
                </label>
                <br />
                <label>
                  Unit:{" "}
                  <input
                    value={editItem.unit}
                    onChange={(e) =>
                      setEditItem({ ...editItem, unit: e.target.value })
                    }
                  />
                </label>
                <br />
                <label>
                  Size per Unit:{" "}
                  <input
                    type="text"
                    value={editItem.size_per_unit || ""}
                    onChange={(e) =>
                      setEditItem({
                        ...editItem,
                        size_per_unit: e.target.value,
                      })
                    }
                  />
                </label>
                <br />
                <label>
                  Cost Per Unit:{" "}
                  <input
                    type="number"
                    value={editItem.cost_per_unit}
                    onChange={(e) =>
                      setEditItem({
                        ...editItem,
                        cost_per_unit: Number(e.target.value),
                      })
                    }
                  />
                </label>
                <br />
                <button type="submit">Save</button>
              </form>
            </div>
          </div>
        )}

        {/* Restock Item Modal */}
        {showRestockModal && restockItem && (
          <div className={styles["modal-overlay"]}>
            <div className={styles["modal-content"]}>
              <h2>Restock Item</h2>
              <button
                className={styles["close-modal"]}
                onClick={() => setShowRestockModal(false)}
              >
                Close
              </button>
              <div>Item: {restockItem.name}</div>
              <div>
                Current Stock: {restockItem.current_stock} {restockItem.unit}
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleRestockSave();
                }}
              >
                <label>
                  Amount to Add:{" "}
                  <input
                    type="number"
                    value={restockAmount === 0 ? "" : restockAmount}
                    onChange={(e) =>
                      setRestockAmount(
                        e.target.value === "" ? 0 : Number(e.target.value)
                      )
                    }
                    min={1}
                    placeholder="Enter amount"
                  />
                </label>
                <br />
                <label>
                  Notes (optional):{" "}
                  <input
                    type="text"
                    value={restockNotes}
                    onChange={(e) => setRestockNotes(e.target.value)}
                    placeholder="Enter notes (optional)"
                  />
                </label>
                <br />
                <button type="submit">Restock</button>
              </form>
            </div>
          </div>
        )}

        {/* Usage Log Section */}
        {showUsageLog && (
          <div className={styles["inventory-table-container"]}>
            <DataTable
              columns={usageLogColumns}
              data={usageLogTableData}
              noDataText="No usage logs found."
            />
          </div>
        )}
      </div>
    </PageLayout>
  );
};

export default InventoryPage;
