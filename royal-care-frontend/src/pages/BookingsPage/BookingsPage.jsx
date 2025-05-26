import { useEffect } from "react";

import "../../../src/styles/Placeholders.css";

const BookingsPage = () => {
  useEffect(() => {
    document.title = "Bookings | Royal Care";
  }, []);

  return (
    <div className="placeholder-container">
      <div className="placeholder-content">
        <h1>Booking Management</h1>
        <p className="placeholder-text">
          This page is currently under development. The Booking management
          system will allow you to:
        </p>
        <ul className="placeholder-list">
          <li>View all customer bookings in one place</li>
          <li>Filter bookings by date, status, or therapist</li>
          <li>Process new bookings</li>
          <li>Modify or cancel existing bookings</li>
          <li>Send booking confirmations to customers</li>
        </ul>
        <p className="placeholder-coming-soon">Coming soon...</p>
        <div className="placeholder-loader"></div>
      </div>
    </div>
  );
};

export default BookingsPage;
