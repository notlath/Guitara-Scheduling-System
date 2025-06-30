import { useEffect, useState } from "react";
import { shallowEqual, useDispatch } from "react-redux";
import { NavLink } from "react-router-dom";
import "../../../src/styles/Placeholders.css";
import MinimalLoadingIndicator from "../../components/common/MinimalLoadingIndicator";
import pageTitles from "../../constants/pageTitles";
import {
  fetchAppointments,
  fetchTodayAppointments,
  fetchUpcomingAppointments,
} from "../../features/scheduling/schedulingSlice";
import TabSwitcher from "../../globals/TabSwitcher";
import { useOptimizedSelector } from "../../hooks/usePerformanceOptimization";
import "./BookingsPage.css";

const BookingsPage = () => {
  const dispatch = useDispatch();
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const schedulingState = useOptimizedSelector(
    (state) => state.scheduling,
    shallowEqual
  );
  const { appointments, todayAppointments, upcomingAppointments, loading } =
    schedulingState;

  useEffect(() => {
    document.title = pageTitles.bookings;
    // Load appointment data
    dispatch(fetchAppointments());
    dispatch(fetchTodayAppointments());
    dispatch(fetchUpcomingAppointments());
  }, [dispatch]);

  // Filter appointments based on active filter
  const getFilteredAppointments = () => {
    let appointmentList = [];

    switch (activeFilter) {
      case "today":
        appointmentList = todayAppointments || [];
        break;
      case "upcoming":
        appointmentList = upcomingAppointments || [];
        break;
      case "pending":
        appointmentList = (appointments || []).filter(
          (apt) => apt.status === "pending"
        );
        break;
      case "confirmed":
        appointmentList = (appointments || []).filter(
          (apt) => apt.status === "confirmed"
        );
        break;
      case "completed":
        appointmentList = (appointments || []).filter(
          (apt) => apt.status === "completed"
        );
        break;
      default:
        appointmentList = appointments || [];
    }

    // Apply search filter
    if (searchTerm) {
      appointmentList = appointmentList.filter(
        (apt) =>
          apt.client_details?.first_name
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          apt.client_details?.last_name
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          apt.services_details?.some((service) =>
            service.name?.toLowerCase().includes(searchTerm.toLowerCase())
          )
      );
    }

    return appointmentList;
  };

  const filteredAppointments = getFilteredAppointments();

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "pending":
        return "status-pending";
      case "confirmed":
        return "status-confirmed";
      case "completed":
        return "status-completed";
      case "cancelled":
        return "status-cancelled";
      case "rejected":
        return "status-rejected";
      default:
        return "status-default";
    }
  };

  return (
    <div className="bookings-page">
      <div className="bookings-header">
        <h1>Booking Management</h1>
        <div className="bookings-actions">
          <NavLink to="/dashboard/scheduling" className="create-booking-btn">
            Create New Booking
          </NavLink>
        </div>
      </div>

      <div className="bookings-controls">
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search by client name or service..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <TabSwitcher
          tabs={[
            {
              label: `All Bookings (${appointments?.length || 0})`,
              value: "all",
            },
            {
              label: `Today (${todayAppointments?.length || 0})`,
              value: "today",
            },
            {
              label: `Upcoming (${upcomingAppointments?.length || 0})`,
              value: "upcoming",
            },
            { label: "Pending", value: "pending" },
            { label: "Confirmed", value: "confirmed" },
            { label: "Completed", value: "completed" },
          ]}
          activeTab={activeFilter}
          onTabChange={setActiveFilter}
        />
      </div>

      <div className="bookings-content">
        <MinimalLoadingIndicator
          show={loading}
          position="top-right"
          size="small"
          variant="subtle"
          tooltip="Loading bookings..."
        />
        {loading && filteredAppointments.length === 0 ? (
          <div className="loading-state">
            <p>Loading bookings...</p>
          </div>
        ) : filteredAppointments.length === 0 ? (
          <div className="empty-state">
            <h3>No bookings found</h3>
            <p>
              {searchTerm
                ? `No bookings match your search for "${searchTerm}"`
                : `No ${
                    activeFilter === "all" ? "" : activeFilter
                  } bookings found`}
            </p>
            {activeFilter === "all" && !searchTerm && (
              <NavLink
                to="/dashboard/scheduling"
                className="create-first-booking-btn"
              >
                Create Your First Booking
              </NavLink>
            )}
          </div>
        ) : (
          <div className="bookings-grid">
            {filteredAppointments.map((appointment) => (
              <div key={appointment.id} className="booking-card">
                <div className="booking-header">
                  <h3>
                    {appointment.client_details?.first_name}{" "}
                    {appointment.client_details?.last_name}
                  </h3>
                  <span
                    className={`status-badge ${getStatusBadgeClass(
                      appointment.status
                    )}`}
                  >
                    {appointment.status}
                  </span>
                </div>

                <div className="booking-details">
                  <div className="detail-row">
                    <span className="label">Date:</span>
                    <span className="value">
                      {new Date(appointment.date).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Time:</span>
                    <span className="value">
                      {appointment.start_time} - {appointment.end_time}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Service:</span>
                    <span className="value">
                      {appointment.services_details
                        ?.map((s) => s.name)
                        .join(", ") || "N/A"}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Therapist:</span>
                    <div className="value">
                      {appointment.therapists_details &&
                      appointment.therapists_details.length > 0 ? (
                        <div className="therapist-list">
                          {appointment.therapists_details.map((therapist) => (
                            <div key={therapist.id} className="therapist-name">
                              {therapist.first_name} {therapist.last_name}
                              {therapist.specialization && (
                                <span className="therapist-specialization">
                                  {" "}
                                  ({therapist.specialization})
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : appointment.therapist_details ? (
                        <div className="therapist-name">
                          {appointment.therapist_details?.first_name ||
                            "Unknown"}{" "}
                          {appointment.therapist_details?.last_name ||
                            "Therapist"}
                          {appointment.therapist_details?.specialization && (
                            <span className="therapist-specialization">
                              {" "}
                              ({appointment.therapist_details.specialization})
                            </span>
                          )}
                        </div>
                      ) : (
                        "Not assigned"
                      )}
                    </div>
                  </div>
                  {appointment.driver_details && (
                    <div className="detail-row">
                      <span className="label">Driver:</span>
                      <span className="value">
                        {appointment.driver_details?.first_name || "Unknown"}{" "}
                        {appointment.driver_details?.last_name || "Driver"}
                      </span>
                    </div>
                  )}
                  <div className="detail-row">
                    <span className="label">Duration:</span>
                    <span className="value">
                      {appointment.duration} minutes
                    </span>
                  </div>
                </div>

                <div className="booking-actions">
                  <NavLink
                    to={`/dashboard/scheduling?edit=${appointment.id}`}
                    className="edit-btn"
                  >
                    Edit
                  </NavLink>
                  <button
                    className="view-btn"
                    onClick={() => {
                      // Could open a modal or navigate to detailed view
                      console.log("View appointment details:", appointment.id);
                    }}
                  >
                    View Details
                  </button>
                </div>

                <div className="booking-meta">
                  <small>
                    Created:{" "}
                    {new Date(appointment.created_at).toLocaleDateString()}
                  </small>
                  {appointment.updated_at !== appointment.created_at && (
                    <small>
                      Updated:{" "}
                      {new Date(appointment.updated_at).toLocaleDateString()}
                    </small>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bookings-summary">
        <div className="summary-stats">
          <div className="stat-item">
            <span className="stat-number">{appointments?.length || 0}</span>
            <span className="stat-label">Total Bookings</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">
              {todayAppointments?.length || 0}
            </span>
            <span className="stat-label">Today's Bookings</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">
              {
                (appointments || []).filter((apt) => apt.status === "pending")
                  .length
              }
            </span>
            <span className="stat-label">Pending</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">
              {
                (appointments || []).filter((apt) => apt.status === "confirmed")
                  .length
              }
            </span>
            <span className="stat-label">Confirmed</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingsPage;
