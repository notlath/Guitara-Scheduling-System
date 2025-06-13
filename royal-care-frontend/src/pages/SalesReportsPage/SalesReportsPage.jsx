import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchAppointments } from "../../features/scheduling/schedulingSlice";
import styles from "./SalesReportsPage.module.css";

const SalesReportsPage = () => {
  const dispatch = useDispatch();
  const [activeView, setActiveView] = useState("total_revenue");
  const [timePeriod, setTimePeriod] = useState("daily");

  const { appointments, loading } = useSelector((state) => state.scheduling);

  useEffect(() => {
    document.title = "Sales & Reports | Royal Care";
    // Fetch appointments data for calculations
    dispatch(fetchAppointments());
  }, [dispatch]);

  // Helper functions for date calculations
  const getCurrentPeriodData = useMemo(() => {
    if (!appointments || appointments.length === 0) return [];

    const now = new Date();
    let currentData = [];

    switch (timePeriod) {
      case "daily": {
        // Today's appointments
        const today = now.toISOString().split("T")[0];
        currentData = appointments.filter(
          (apt) =>
            apt.date === today &&
            (apt.status === "completed" || apt.status === "payment_completed")
        );
        break;
      }

      case "weekly": {
        // Current week's appointments
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);

        currentData = appointments.filter((apt) => {
          const aptDate = new Date(apt.date);
          return (
            aptDate >= startOfWeek &&
            aptDate <= endOfWeek &&
            (apt.status === "completed" || apt.status === "payment_completed")
          );
        });
        break;
      }

      case "monthly": {
        // Current month's appointments
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        currentData = appointments.filter((apt) => {
          const aptDate = new Date(apt.date);
          return (
            aptDate >= startOfMonth &&
            aptDate <= endOfMonth &&
            (apt.status === "completed" || apt.status === "payment_completed")
          );
        });
        break;
      }

      default:
        currentData = [];
    }

    return currentData;
  }, [appointments, timePeriod]);

  // Helper function to get previous period data for comparison
  const getPreviousPeriodData = useMemo(() => {
    if (!appointments || appointments.length === 0) return [];

    const now = new Date();
    let previousData = [];

    switch (timePeriod) {
      case "daily": {
        // Yesterday's appointments
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split("T")[0];

        previousData = appointments.filter(
          (apt) =>
            apt.date === yesterdayStr &&
            (apt.status === "completed" || apt.status === "payment_completed")
        );
        break;
      }

      case "weekly": {
        // Previous week's appointments
        const startOfLastWeek = new Date(now);
        startOfLastWeek.setDate(now.getDate() - now.getDay() - 7);
        startOfLastWeek.setHours(0, 0, 0, 0);

        const endOfLastWeek = new Date(startOfLastWeek);
        endOfLastWeek.setDate(startOfLastWeek.getDate() + 6);
        endOfLastWeek.setHours(23, 59, 59, 999);

        previousData = appointments.filter((apt) => {
          const aptDate = new Date(apt.date);
          return (
            aptDate >= startOfLastWeek &&
            aptDate <= endOfLastWeek &&
            (apt.status === "completed" || apt.status === "payment_completed")
          );
        });
        break;
      }

      case "monthly": {
        // Previous month's appointments
        const startOfLastMonth = new Date(
          now.getFullYear(),
          now.getMonth() - 1,
          1
        );
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

        previousData = appointments.filter((apt) => {
          const aptDate = new Date(apt.date);
          return (
            aptDate >= startOfLastMonth &&
            aptDate <= endOfLastMonth &&
            (apt.status === "completed" || apt.status === "payment_completed")
          );
        });
        break;
      }

      default:
        previousData = [];
    }

    return previousData;
  }, [appointments, timePeriod]);

  // Calculate total revenue
  const calculateRevenue = (appointmentData) => {
    return appointmentData.reduce((total, apt) => {
      // Use payment_amount if available, otherwise calculate from services
      if (apt.payment_amount) {
        return total + parseFloat(apt.payment_amount);
      } else if (apt.services_details && apt.services_details.length > 0) {
        const serviceTotal = apt.services_details.reduce((sum, service) => {
          return sum + (parseFloat(service.price) || 0);
        }, 0);
        return total + serviceTotal;
      } else if (apt.total_price) {
        return total + parseFloat(apt.total_price);
      }
      return total;
    }, 0);
  };

  const currentRevenue = calculateRevenue(getCurrentPeriodData);
  const previousRevenue = calculateRevenue(getPreviousPeriodData);
  const revenueComparison =
    currentRevenue > previousRevenue ? "higher" : "lower";

  // Format currency
  const formatCurrency = (amount) => {
    return `₱${parseFloat(amount).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Group appointments by client for display
  const getClientRevenueData = () => {
    const clientGroups = getCurrentPeriodData.reduce((groups, apt) => {
      const clientName = apt.client_details
        ? `${apt.client_details.first_name} ${apt.client_details.last_name}`
        : "Unknown Client";

      if (!groups[clientName]) {
        groups[clientName] = [];
      }
      groups[clientName].push(apt);
      return groups;
    }, {});

    return Object.entries(clientGroups)
      .map(([clientName, clientAppointments]) => {
        const totalRevenue = calculateRevenue(clientAppointments);

        let timeInfo = "";
        if (timePeriod === "daily") {
          // Show time for daily view
          timeInfo = clientAppointments.map((apt) => apt.start_time).join(", ");
        } else if (timePeriod === "weekly") {
          // Show days for weekly view
          const days = [
            ...new Set(
              clientAppointments.map((apt) => {
                const date = new Date(apt.date);
                return date.toLocaleDateString("en-US", { weekday: "short" });
              })
            ),
          ];
          timeInfo = days.join(", ");
        } else {
          // Show week ranges for monthly view
          const weeks = [
            ...new Set(
              clientAppointments.map((apt) => {
                const date = new Date(apt.date);
                const startOfWeek = new Date(date);
                startOfWeek.setDate(date.getDate() - date.getDay());
                const endOfWeek = new Date(startOfWeek);
                endOfWeek.setDate(startOfWeek.getDate() + 6);

                return `${startOfWeek.getDate()}/${
                  startOfWeek.getMonth() + 1
                } - ${endOfWeek.getDate()}/${endOfWeek.getMonth() + 1}`;
              })
            ),
          ];
          timeInfo = weeks.join(", ");
        }

        return {
          clientName,
          totalRevenue,
          timeInfo,
          appointmentCount: clientAppointments.length,
        };
      })
      .sort((a, b) => b.totalRevenue - a.totalRevenue);
  };

  const renderTotalRevenueView = () => {
    const clientData = getClientRevenueData();

    return (
      <div className={styles.revenueView}>
        <div className={styles.revenueHeader}>
          <h2>Total Revenue: {formatCurrency(currentRevenue)}</h2>
          <p
            className={`${styles.revenueComparison} ${styles[revenueComparison]}`}
          >
            {formatCurrency(Math.abs(currentRevenue - previousRevenue))}{" "}
            {revenueComparison} than last{" "}
            {timePeriod === "daily"
              ? "day"
              : timePeriod === "weekly"
              ? "week"
              : "month"}
          </p>
        </div>

        <div className={styles.revenueTable}>
          <div className={styles.tableHeader}>
            <div className={styles.headerCell}>Date/Time</div>
            <div className={styles.headerCell}>Client Name</div>
            <div className={styles.headerCell}>Revenue</div>
          </div>

          {clientData.length === 0 ? (
            <div className={styles.noData}>
              No revenue data for this {timePeriod} period
            </div>
          ) : (
            clientData.map((client, index) => (
              <div key={index} className={styles.tableRow}>
                <div className={styles.tableCell}>{client.timeInfo}</div>
                <div className={styles.tableCell}>{client.clientName}</div>
                <div className={`${styles.tableCell} ${styles.revenueAmount}`}>
                  {formatCurrency(client.totalRevenue)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  const renderCommissionView = () => {
    return (
      <div className={styles.commissionView}>
        <h2>Commission Report</h2>
        <p className={styles.comingSoon}>
          Commission calculations will be implemented in the next update.
        </p>
      </div>
    );
  };

  const renderCustomerListView = () => {
    return (
      <div className={styles.customerListView}>
        <h2>Customer List</h2>
        <p className={styles.comingSoon}>
          Customer analytics will be implemented in the next update.
        </p>
      </div>
    );
  };

  const renderServicesView = () => {
    return (
      <div className={styles.servicesView}>
        <h2>Services Report</h2>
        <p className={styles.comingSoon}>
          Service performance analytics will be implemented in the next update.
        </p>
      </div>
    );
  };

  const renderActiveView = () => {
    switch (activeView) {
      case "total_revenue":
        return renderTotalRevenueView();
      case "commission":
        return renderCommissionView();
      case "customer_list":
        return renderCustomerListView();
      case "services":
        return renderServicesView();
      default:
        return renderTotalRevenueView();
    }
  };

  if (loading) {
    return (
      <div className={`${styles.salesReportsPage} ${styles.loading}`}>
        <div className={styles.loadingSpinner}></div>
        <p>Loading sales data...</p>
      </div>
    );
  }

  return (
    <div className={styles.salesReportsPage}>
      <div className={styles.salesHeader}>
        <h1>Sales & Reports</h1>
      </div>

      <div className={styles.controlsSection}>
        <div className={styles.viewTabs}>
          <button
            className={`${styles.tabButton} ${
              activeView === "total_revenue" ? styles.active : ""
            }`}
            onClick={() => setActiveView("total_revenue")}
          >
            Total Revenue
          </button>
          <button
            className={`${styles.tabButton} ${
              activeView === "commission" ? styles.active : ""
            }`}
            onClick={() => setActiveView("commission")}
          >
            Commission
          </button>
          <button
            className={`${styles.tabButton} ${
              activeView === "customer_list" ? styles.active : ""
            }`}
            onClick={() => setActiveView("customer_list")}
          >
            Customer List
          </button>
          <button
            className={`${styles.tabButton} ${
              activeView === "services" ? styles.active : ""
            }`}
            onClick={() => setActiveView("services")}
          >
            Services
          </button>
        </div>

        <div className={styles.timePeriodSelector}>
          <button
            className={`${styles.periodButton} ${
              timePeriod === "daily" ? styles.active : ""
            }`}
            onClick={() => setTimePeriod("daily")}
          >
            Daily
          </button>
          <button
            className={`${styles.periodButton} ${
              timePeriod === "weekly" ? styles.active : ""
            }`}
            onClick={() => setTimePeriod("weekly")}
          >
            Weekly
          </button>
          <button
            className={`${styles.periodButton} ${
              timePeriod === "monthly" ? styles.active : ""
            }`}
            onClick={() => setTimePeriod("monthly")}
          >
            Monthly
          </button>
        </div>
      </div>

      <div className={styles.contentSection}>{renderActiveView()}</div>
    </div>
  );
};

export default SalesReportsPage;
