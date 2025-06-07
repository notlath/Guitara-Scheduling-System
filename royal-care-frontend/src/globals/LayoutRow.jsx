import React from "react";
import "../globals/LayoutRow.css";

const LayoutRow = ({ title, children }) => (
  <div className="header-row">
    <h2>{title}</h2>
    {children}
  </div>
);

export default LayoutRow;
