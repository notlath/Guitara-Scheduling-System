import React from "react";
import "../styles/LayoutRow.css";

const LayoutRow = ({ title, children }) => (
  <div className="header-row">
    <h2>{title}</h2>
    {children}
  </div>
);

export default LayoutRow;
