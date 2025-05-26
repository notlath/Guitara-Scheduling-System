import "../../../src/styles/Placeholders.css";

const SalesReportsPage = () => {
  return (
    <div className="placeholder-container">
      <div className="placeholder-content">
        <h1>Sales & Reports Dashboard</h1>
        <p className="placeholder-text">
          This page is currently under development. The Sales & Reports
          dashboard will provide:
        </p>
        <ul className="placeholder-list">
          <li>Revenue analytics and forecasting</li>
          <li>Daily, weekly, and monthly sales reports</li>
          <li>Therapist performance and commission tracking</li>
          <li>Service popularity metrics</li>
          <li>Customer retention statistics</li>
        </ul>

        <div className="placeholder-chart">
          Revenue Chart Preview (Coming Soon)
        </div>

        <table className="placeholder-table">
          <thead>
            <tr>
              <th>Period</th>
              <th>Revenue</th>
              <th>Bookings</th>
              <th>Avg. Service Value</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>May 2025</td>
              <td>Data coming soon</td>
              <td>Data coming soon</td>
              <td>Data coming soon</td>
            </tr>
            <tr>
              <td>April 2025</td>
              <td>Data coming soon</td>
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

export default SalesReportsPage;
