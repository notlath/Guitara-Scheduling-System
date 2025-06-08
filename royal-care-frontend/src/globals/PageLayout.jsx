import React from "react";

const PageLayout = ({ children }) => (
  <div className="global-container">
    <div className="global-content">{children}</div>
  </div>
);

export default PageLayout;
