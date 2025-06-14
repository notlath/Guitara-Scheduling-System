import React from "react";
import "./TabSwitcher.css";

const TabSwitcher = ({ tabs, activeTab, onTabChange }) => (
  <div className="tab-switcher">
    {tabs.map((tab) => (
      <button
        key={tab.value || tab}
        className={
          "tab-btn" + (activeTab === (tab.value || tab) ? " active" : "")
        }
        onClick={() => onTabChange(tab.value || tab)}
      >
        {tab.label || tab}
      </button>
    ))}
  </div>
);

export default TabSwitcher;
