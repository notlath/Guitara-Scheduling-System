import { useEffect, useState } from "react";
import "./InventoryPage.css";

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
    document.title = "Inventory | Royal Care";
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

  return (
    <div className="inventory-page">
      <div className="inventory-header">
        <h1>Inventory Management</h1>
        <button className="add-item-btn" onClick={() => setShowAddModal(true)}>
          Add New Item
        </button>
      </div>

      {/* Inventory Statistics */}
      <div className="inventory-stats">
        <div className="stat-card">
          <div className="stat-number">{stats.totalItems}</div>
          <div className="stat-label">Total Items</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.categories}</div>
          <div className="stat-label">Categories</div>
        </div>
        <div className="stat-card warning">
          <div className="stat-number">{stats.lowStockItems}</div>
          <div className="stat-label">Low Stock Alerts</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">${stats.totalValue.toFixed(2)}</div>
          <div className="stat-label">Total Inventory Value</div>
        </div>
      </div>

      {/* Controls */}
      <div className="inventory-controls">
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search items, suppliers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="category-filter">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="category-select"
          >
            {categories.map((category) => (
              <option key={category} value={category}>
                {category === "all" ? "All Categories" : category}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="inventory-table-container">
        <table className="inventory-table">
          <thead>
            <tr>
              <th>Item Name</th>
              <th>Category</th>
              <th>Current Stock</th>
              <th>Min Stock</th>
              <th>Status</th>
              <th>Supplier</th>
              <th>Cost/Unit</th>
              <th>Total Value</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((item) => {
              const stockStatus = getStockStatus(item);
              return (
                <tr key={item.id}>
                  <td>
                    <div className="item-name">
                      {item.name}
                      {item.expiryDate && (
                        <div className="expiry-date">
                          Expires:{" "}
                          {new Date(item.expiryDate).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </td>
                  <td>{item.category}</td>
                  <td>
                    {item.currentStock} {item.unit}
                  </td>
                  <td>
                    {item.minStock} {item.unit}
                  </td>
                  <td>
                    <span className={`status-badge ${stockStatus.class}`}>
                      {stockStatus.label}
                    </span>
                  </td>
                  <td>{item.supplier}</td>
                  <td>${item.costPerUnit.toFixed(2)}</td>
                  <td>${(item.currentStock * item.costPerUnit).toFixed(2)}</td>
                  <td>
                    <div className="item-actions">
                      <button className="action-btn edit">Edit</button>
                      <button className="action-btn restock">Restock</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add Item Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Add New Inventory Item</h3>
              <button
                className="close-btn"
                onClick={() => setShowAddModal(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleAddItem} className="modal-form">
              <div className="form-group">
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
              <div className="form-group">
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
              <div className="form-row">
                <div className="form-group">
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
                <div className="form-group">
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
              <div className="form-row">
                <div className="form-group">
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
                <div className="form-group">
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
              <div className="form-group">
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
              <div className="modal-actions">
                <button type="button" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit">Add Item</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryPage;
