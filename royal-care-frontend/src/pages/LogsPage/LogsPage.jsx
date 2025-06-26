import React, { useEffect, useState } from "react";
import pageTitles from "../../constants/pageTitles";
import PageLayout from "../../globals/PageLayout";
import LayoutRow from "../../globals/LayoutRow";
import TabSwitcher from "../../globals/TabSwitcher";
import DataTable from "../../globals/DataTable";
import "./LogsPage.module.css"; // Import the CSS module for styling

const LogsPage = () => {
  const [activeTab, setActiveTab] = useState("Authentication");

  const tabs = [
    "Authentication",
    "Appointment",
    "Payment",
    "Data",
    "Inventory",
  ];

  // Sample columns for each log type
  const getColumns = (tabType) => {
    switch (tabType) {
      case "Authentication":
        return [
          { key: "timestamp", label: "Timestamp" },
          { key: "user", label: "User" },
          { key: "action", label: "Action" },
          { key: "status", label: "Status" },
          { key: "ip", label: "IP Address" },
        ];
      case "Appointment":
        return [
          { key: "timestamp", label: "Timestamp" },
          { key: "appointmentId", label: "Appointment ID" },
          { key: "client", label: "Client" },
          { key: "therapist", label: "Therapist" },
          { key: "action", label: "Action" },
        ];
      case "Payment":
        return [
          { key: "timestamp", label: "Timestamp" },
          { key: "transactionId", label: "Transaction ID" },
          { key: "client", label: "Client" },
          { key: "amount", label: "Amount" },
          { key: "status", label: "Status" },
        ];
      case "Data":
        return [
          { key: "timestamp", label: "Timestamp" },
          { key: "table", label: "Table" },
          { key: "operation", label: "Operation" },
          { key: "user", label: "User" },
          { key: "recordId", label: "Record ID" },
        ];
      case "Inventory":
        return [
          { key: "timestamp", label: "Timestamp" },
          { key: "item", label: "Item" },
          { key: "quantity", label: "Quantity" },
          { key: "action", label: "Action" },
          { key: "user", label: "User" },
        ];
      default:
        return [];
    }
  };

  // Sample data - in a real app, this would come from an API
  const getSampleData = () => {
    // For now, return empty array - this is where you'd fetch real log data
    return [];
  };

  useEffect(() => {
    document.title = pageTitles.logs;
  }, []);

  return (
    <PageLayout>
      <LayoutRow title="History Logs"></LayoutRow>
      <TabSwitcher
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
      <div className="logs-table">
        <DataTable
          columns={getColumns(activeTab)}
          data={getSampleData()}
          noDataText={`No ${activeTab.toLowerCase()} logs available.`}
        />
      </div>
    </PageLayout>
  );
};

export default LogsPage;
