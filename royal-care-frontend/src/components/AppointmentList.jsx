import { memo, useMemo, useState } from "react";
import AppointmentCard from "./AppointmentCard";

/**
 * Optimized Appointment List with Smart Pagination
 * Uses simple pagination instead of complex virtualization
 */
const AppointmentList = memo(
  ({
    appointments = [],
    loading = false,
    error = null,
    onStartAppointment,
    onPaymentVerification,
    buttonLoading = {},
    itemsPerPage = 20,
  }) => {
    const [currentPage, setCurrentPage] = useState(1);
    const [filter, setFilter] = useState("all");

    // Simple, fast filtering
    const filteredAppointments = useMemo(() => {
      if (!Array.isArray(appointments)) return [];

      switch (filter) {
        case "today": {
          const today = new Date().toISOString().split("T")[0];
          return appointments.filter((apt) => apt.date === today);
        }
        case "pending":
          return appointments.filter((apt) => apt.status === "pending");
        case "confirmed":
          return appointments.filter((apt) =>
            ["confirmed", "driver_confirmed", "therapist_confirmed"].includes(
              apt.status
            )
          );
        case "in_progress":
          return appointments.filter((apt) => apt.status === "in_progress");
        case "completed":
          return appointments.filter((apt) => apt.status === "completed");
        case "awaiting_payment":
          return appointments.filter(
            (apt) => apt.status === "awaiting_payment"
          );
        default:
          return appointments;
      }
    }, [appointments, filter]);

    // Simple pagination
    const totalPages = Math.ceil(filteredAppointments.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedAppointments = filteredAppointments.slice(
      startIndex,
      startIndex + itemsPerPage
    );

    // Reset to page 1 when filter changes
    const handleFilterChange = (newFilter) => {
      setFilter(newFilter);
      setCurrentPage(1);
    };

    if (loading) {
      return (
        <div className="appointments-loading">
          <div className="loading-spinner"></div>
          <p>Loading appointments...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="appointments-error">
          <p>Error loading appointments: {error}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      );
    }

    if (filteredAppointments.length === 0) {
      return (
        <div className="appointments-empty">
          <i className="fas fa-calendar"></i>
          <h3>No appointments found</h3>
          <p>
            {filter === "all"
              ? "No appointments have been scheduled yet."
              : `No ${filter} appointments found.`}
          </p>
        </div>
      );
    }

    return (
      <div className="appointments-list-container">
        {/* Filter Controls */}
        <div className="appointments-filters">
          <div className="filter-buttons">
            {[
              { key: "all", label: "All", count: appointments.length },
              {
                key: "today",
                label: "Today",
                count: appointments.filter(
                  (a) => a.date === new Date().toISOString().split("T")[0]
                ).length,
              },
              {
                key: "pending",
                label: "Pending",
                count: appointments.filter((a) => a.status === "pending")
                  .length,
              },
              {
                key: "confirmed",
                label: "Confirmed",
                count: appointments.filter((a) =>
                  ["confirmed", "driver_confirmed"].includes(a.status)
                ).length,
              },
              {
                key: "in_progress",
                label: "In Progress",
                count: appointments.filter((a) => a.status === "in_progress")
                  .length,
              },
              {
                key: "awaiting_payment",
                label: "Payment",
                count: appointments.filter(
                  (a) => a.status === "awaiting_payment"
                ).length,
              },
              {
                key: "completed",
                label: "Completed",
                count: appointments.filter((a) => a.status === "completed")
                  .length,
              },
            ].map((filterOption) => (
              <button
                key={filterOption.key}
                onClick={() => handleFilterChange(filterOption.key)}
                className={`filter-btn ${
                  filter === filterOption.key ? "active" : ""
                }`}
              >
                {filterOption.label} ({filterOption.count})
              </button>
            ))}
          </div>
        </div>

        {/* Results Summary */}
        <div className="appointments-summary">
          <p>
            Showing {startIndex + 1}-
            {Math.min(startIndex + itemsPerPage, filteredAppointments.length)}{" "}
            of {filteredAppointments.length} appointments
            {filter !== "all" && ` (filtered by: ${filter})`}
          </p>
        </div>

        {/* Appointment Cards */}
        <div className="appointments-grid">
          {paginatedAppointments.map((appointment) => (
            <AppointmentCard
              key={appointment.id}
              appointment={appointment}
              onStartAppointment={onStartAppointment}
              onPaymentVerification={onPaymentVerification}
              buttonLoading={buttonLoading}
            />
          ))}
        </div>

        {/* Simple Pagination */}
        {totalPages > 1 && (
          <div className="appointments-pagination">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="pagination-btn"
            >
              First
            </button>
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="pagination-btn"
            >
              Previous
            </button>

            <div className="pagination-info">
              Page {currentPage} of {totalPages}
            </div>

            <button
              onClick={() =>
                setCurrentPage((prev) => Math.min(totalPages, prev + 1))
              }
              disabled={currentPage === totalPages}
              className="pagination-btn"
            >
              Next
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="pagination-btn"
            >
              Last
            </button>
          </div>
        )}
      </div>
    );
  }
);

AppointmentList.displayName = "AppointmentList";

export default AppointmentList;
