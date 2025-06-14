import { useEffect, useState } from "react";
import styles from "./InventoryPage.module.css";
import pageTitles from "../../constants/pageTitles";
import DataTable from "../../globals/DataTable";
import PageLayout from "../../globals/PageLayout";
import LayoutRow from "../../globals/LayoutRow";
import { MdAdd } from "react-icons/md";

const InventoryPage = () => {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItem, setNewItem] = useState({
    name: "",
    category: "",
    currentStock: 0,
    minStock: 0,
    unit: "",
    supplier: "",
    costPerUnit: 0,
  });

  useEffect(() => {
    document.title = pageTitles.inventory;
  }, []);

  // Mock inventory data - in real app, this would come from API
  const inventoryItems = [
    {
      id: 1,
      name: "Premium Massage Oil (Lavender)",
      category: "Oils & Lotions",
      currentStock: 25,
      minStock: 10,
      unit: "bottles",
      supplier: "Wellness Supplies Co.",
      costPerUnit: 15.99,
      lastRestocked: "2024-01-15",
      expiryDate: "2025-06-15",
    },
    {
      id: 2,
      name: "Premium Massage Oil (Eucalyptus)",
      category: "Oils & Lotions",
      currentStock: 8,
      minStock: 10,
      unit: "bottles",
      supplier: "Wellness Supplies Co.",
      costPerUnit: 15.99,
      lastRestocked: "2024-01-10",
      expiryDate: "2025-06-10",
    },
    {
      id: 3,
      name: "Egyptian Cotton Towels (Large)",
      category: "Linens",
      currentStock: 45,
      minStock: 20,
      unit: "pieces",
      supplier: "Comfort Linens Ltd.",
      costPerUnit: 12.5,
      lastRestocked: "2024-01-20",
      expiryDate: null,
    },
    {
      id: 4,
      name: "Disposable Face Covers",
      category: "Hygiene",
      currentStock: 150,
      minStock: 50,
      unit: "pieces",
      supplier: "MedSupply Inc.",
      costPerUnit: 0.75,
      lastRestocked: "2024-01-18",
      expiryDate: null,
    },
    {
      id: 5,
      name: "Portable Massage Table",
      category: "Equipment",
      currentStock: 8,
      minStock: 5,
      unit: "units",
      supplier: "ProTherapy Equipment",
      costPerUnit: 299.99,
      lastRestocked: "2023-12-01",
      expiryDate: null,
    },
    {
      id: 6,
      name: "Hand Sanitizer (500ml)",
      category: "Hygiene",
      currentStock: 12,
      minStock: 15,
      unit: "bottles",
      supplier: "Health Essentials",
      costPerUnit: 8.99,
      lastRestocked: "2024-01-12",
      expiryDate: "2025-12-31",
    },
  ];

  const categories = [
    "all",
    ...new Set(inventoryItems.map((item) => item.category)),
  ];

  const filteredItems = inventoryItems.filter((item) => {
    const matchesCategory =
      selectedCategory === "all" || item.category === selectedCategory;
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.supplier.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getStockStatus = (item) => {
    if (item.currentStock <= item.minStock) {
      return { status: "low", label: "Low Stock", class: "stock-low" };
    } else if (item.currentStock <= item.minStock * 1.5) {
      return {
        status: "warning",
        label: "Getting Low",
        class: "stock-warning",
      };
    } else {
      return { status: "good", label: "In Stock", class: "stock-good" };
    }
  };

  const getInventoryStats = () => {
    const totalItems = inventoryItems.length;
    const lowStockItems = inventoryItems.filter(
      (item) => item.currentStock <= item.minStock
    ).length;
    const totalValue = inventoryItems.reduce(
      (sum, item) => sum + item.currentStock * item.costPerUnit,
      0
    );
    const categories = new Set(inventoryItems.map((item) => item.category))
      .size;

    return { totalItems, lowStockItems, totalValue, categories };
  };

  const stats = getInventoryStats();

  const handleAddItem = (e) => {
    e.preventDefault();
    // In real app, this would make an API call
    console.log("Adding new item:", newItem);
    setShowAddModal(false);
    setNewItem({
      name: "",
      category: "",
      currentStock: 0,
      minStock: 0,
      unit: "",
      supplier: "",
      costPerUnit: 0,
    });
  };

  // Define columns for DataTable
  const columns = [
    { key: "name", label: "Item Name" },
    { key: "category", label: "Category" },
    { key: "currentStock", label: "Current Stock" },
    { key: "minStock", label: "Min Stock" },
    { key: "status", label: "Status" },
    { key: "supplier", label: "Supplier" },
    { key: "costPerUnit", label: "Cost/Unit" },
    { key: "totalValue", label: "Total Value" },
    { key: "actions", label: "Actions" },
  ];

  // Prepare data for DataTable
  const tableData = filteredItems.map((item) => {
    const stockStatus = getStockStatus(item);
    return {
      name: (
        <div className={styles["item-name"]}>
          {item.name}
          {item.expiryDate && (
            <div className={styles["expiry-date"]}>
              Expires: {new Date(item.expiryDate).toLocaleDateString()}
            </div>
          )}
        </div>
      ),
      category: item.category,
      currentStock: `${item.currentStock} ${item.unit}`,
      minStock: `${item.minStock} ${item.unit}`,
      status: (
        <span className={styles[stockStatus.class]}>{stockStatus.label}</span>
      ),
      supplier: item.supplier,
      costPerUnit: `$${item.costPerUnit.toFixed(2)}`,
      totalValue: `$${(item.currentStock * item.costPerUnit).toFixed(2)}`,
      actions: (
        <div className={styles["item-actions"]}>
          <button className={styles["edit-button"]}>Edit</button>
          <button className={styles["delete-button"]}>Restock</button>
        </div>
      ),
    };
  });

  return (
    <PageLayout>
      <div className={styles["inventory-page"]}>
        <LayoutRow title="Inventory Management">
          <div className={"action-buttons"}>
            <button
              className={"primary-action-btn"}
              onClick={() => setShowAddModal(true)}
            >
              <span className={"primary-action-icon"}>
                <MdAdd size={20} />
              </span>{" "}
              Add New Item
            </button>
          </div>
        </LayoutRow>

        {/* Inventory Statistics */}
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
              ${stats.totalValue.toFixed(2)}
            </div>
            <div className={styles["stat-label"]}>Total Inventory Value</div>
          </div>
        </div>

        {/* Controls */}
        <div className={styles["inventory-controls"]}>
          <input
            type="text"
            placeholder="Search items, suppliers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles["search-input"]}
            style={{ minWidth: 220, marginRight: 12 }}
          />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className={styles["category-select"]}
            style={{ minWidth: 180 }}
          >
            {categories.map((category) => (
              <option key={category} value={category}>
                {category === "all" ? "All Categories" : category}
              </option>
            ))}
          </select>
        </div>

        {/* Inventory Table */}
        <div className={styles["inventory-table-container"]}>
          <DataTable
            columns={columns}
            data={tableData}
            noDataText="No inventory items found."
          />
        </div>

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
                  <input
                    type="text"
                    value={newItem.category}
                    onChange={(e) =>
                      setNewItem({ ...newItem, category: e.target.value })
                    }
                    required
                  />
                </div>
                <div style={{ display: "flex", gap: 16 }}>
                  <div className={styles["form-group"]}>
                    <label>Current Stock</label>
                    <input
                      type="number"
                      value={newItem.currentStock}
                      onChange={(e) =>
                        setNewItem({
                          ...newItem,
                          currentStock: parseInt(e.target.value),
                        })
                      }
                      required
                    />
                  </div>
                  <div className={styles["form-group"]}>
                    <label>Minimum Stock</label>
                    <input
                      type="number"
                      value={newItem.minStock}
                      onChange={(e) =>
                        setNewItem({
                          ...newItem,
                          minStock: parseInt(e.target.value),
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
                    <label>Cost per Unit</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newItem.costPerUnit}
                      onChange={(e) =>
                        setNewItem({
                          ...newItem,
                          costPerUnit: parseFloat(e.target.value),
                        })
                      }
                      required
                    />
                  </div>
                </div>
                <div className={styles["form-group"]}>
                  <label>Supplier</label>
                  <input
                    type="text"
                    value={newItem.supplier}
                    onChange={(e) =>
                      setNewItem({ ...newItem, supplier: e.target.value })
                    }
                    required
                  />
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
      </div>
    </PageLayout>
  );
};

export default InventoryPage;
