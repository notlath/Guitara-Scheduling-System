import { useEffect } from "react";

import "../../../src/styles/Placeholders.css";

const InventoryPage = () => {
  useEffect(() => {
    document.title = "Inventory | Royal Care";
  }, []);

  return (
    <div className="placeholder-container">
      <div className="placeholder-content">
        <h1>Inventory Management System</h1>
        <p className="placeholder-text">
          This page is currently under development. The Inventory Management
          system will allow you to:
        </p>
        <ul className="placeholder-list">
          <li>Track all supplies and equipment</li>
          <li>Monitor stock levels and receive low stock alerts</li>
          <li>Create purchase orders</li>
          <li>Manage vendor relationships</li>
          <li>Generate inventory reports</li>
        </ul>

        <div className="placeholder-stat">
          <h3>Inventory Summary</h3>
          <p>Current inventory statistics will appear here</p>
        </div>

        <table className="placeholder-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Category</th>
              <th>In Stock</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Massage Oils</td>
              <td>Supplies</td>
              <td>Data coming soon</td>
              <td>Data coming soon</td>
            </tr>
            <tr>
              <td>Towels</td>
              <td>Linens</td>
              <td>Data coming soon</td>
              <td>Data coming soon</td>
            </tr>
          </tbody>
        </table>

        <p className="placeholder-coming-soon">Coming soon...</p>
        <div className="placeholder-loader"></div>
      </div>
    </div>
  );
};

export default InventoryPage;
