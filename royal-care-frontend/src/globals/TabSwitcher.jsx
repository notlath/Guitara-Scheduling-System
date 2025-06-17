import { memo, useCallback } from "react";
import "./TabSwitcher.css";

const TabSwitcher = memo(({ tabs, activeTab, onTabChange }) => {
  const handleTabClick = useCallback(
    (tabKey) => {
      onTabChange(tabKey);
    },
    [onTabChange]
  );

  return (
    <div className="tab-switcher">
      {tabs.map((tab, index) => {
        // Handle different tab formats: string, {value, label}, {id, label}
        const tabKey = tab.id || tab.value || tab;
        const tabLabel = tab.label || tab;
        const isActive = activeTab === tabKey;

        // Ensure we always have a valid string key
        const safeKey = typeof tabKey === "string" ? tabKey : `tab-${index}`;

        return (
          <button
            key={safeKey}
            className={"tab-btn" + (isActive ? " active" : "")}
            onClick={() => handleTabClick(tabKey)}
          >
            {tabLabel}
            {tab.count !== undefined && (
              <span className="tab-count">{tab.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
});

TabSwitcher.displayName = "TabSwitcher";

export default TabSwitcher;
