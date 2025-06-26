import React, { useEffect } from "react";
import pageTitles from "../../constants/pageTitles";

const LogsPage = () => {
  useEffect(() => {
    document.title = pageTitles.logs;
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <h2>History Logs</h2>
      <p>This is the logs page. Display your system or activity logs here.</p>
      {/* TODO: Add logs table or log viewer here */}
    </div>
  );
};

export default LogsPage;
