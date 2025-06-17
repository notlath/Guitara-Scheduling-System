/**
 * Chart Data Helper Functions for Sales Reports
 * Prepares data for different chart views and time periods
 */

/**
 * Prepare chart data for different views and periods
 * @param {Array} appointments - Array of appointment objects
 * @param {string} currentView - Current view (Total Revenue, Commission, Customer List, Services)
 * @param {string} currentPeriod - Current period (Daily, Weekly, Monthly)
 * @returns {Array} Formatted chart data
 */
export const prepareChartData = (appointments, currentView, currentPeriod) => {
  if (!appointments || appointments.length === 0) {
    return [];
  }

  const now = new Date();
  let chartData = [];

  if (currentView === "Total Revenue" || currentView === "Commission") {
    const COMMISSION_RATE = currentView === "Commission" ? 0.4 : 1;
    const paidAppointments = appointments.filter(
      (apt) => apt.payment_status === "paid" && apt.payment_amount > 0
    );

    if (currentPeriod === "Daily") {
      // Last 7 days
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(now.getDate() - i);
        date.setHours(0, 0, 0, 0);

        const nextDate = new Date(date);
        nextDate.setDate(date.getDate() + 1);

        const dayAppointments = paidAppointments.filter((apt) => {
          const aptDate = new Date(apt.date);
          return aptDate >= date && aptDate < nextDate;
        });

        const total = dayAppointments.reduce(
          (sum, apt) =>
            sum + parseFloat(apt.payment_amount || 0) * COMMISSION_RATE,
          0
        );

        chartData.push({
          period: date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          }),
          [currentView === "Commission" ? "commission" : "revenue"]: total,
          date: date.toISOString().split("T")[0],
        });
      }
    } else if (currentPeriod === "Weekly") {
      // Last 4 weeks
      for (let i = 3; i >= 0; i--) {
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay() - i * 7);
        weekStart.setHours(0, 0, 0, 0);

        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 7);

        const weekAppointments = paidAppointments.filter((apt) => {
          const aptDate = new Date(apt.date);
          return aptDate >= weekStart && aptDate < weekEnd;
        });

        const total = weekAppointments.reduce(
          (sum, apt) =>
            sum + parseFloat(apt.payment_amount || 0) * COMMISSION_RATE,
          0
        );

        chartData.push({
          period: `Week ${4 - i}`,
          [currentView === "Commission" ? "commission" : "revenue"]: total,
          weekRange: `${weekStart.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })} - ${weekEnd.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })}`,
        });
      }
    } else if (currentPeriod === "Monthly") {
      // Last 6 months
      for (let i = 5; i >= 0; i--) {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);

        const monthAppointments = paidAppointments.filter((apt) => {
          const aptDate = new Date(apt.date);
          return aptDate >= monthStart && aptDate < monthEnd;
        });

        const total = monthAppointments.reduce(
          (sum, apt) =>
            sum + parseFloat(apt.payment_amount || 0) * COMMISSION_RATE,
          0
        );

        chartData.push({
          period: monthStart.toLocaleDateString("en-US", {
            month: "short",
            year: "numeric",
          }),
          [currentView === "Commission" ? "commission" : "revenue"]: total,
          month: monthStart.getMonth(),
          year: monthStart.getFullYear(),
        });
      }
    }
  } else if (currentView === "Services") {
    // Get current period appointments
    let currentItems = getCurrentPeriodAppointments(
      appointments,
      currentPeriod,
      now
    );

    // Group by service
    const serviceMap = {};
    currentItems.forEach((apt) => {
      if (apt.services_details && Array.isArray(apt.services_details)) {
        apt.services_details.forEach((service) => {
          const serviceName = service.name || "Unknown Service";
          serviceMap[serviceName] = (serviceMap[serviceName] || 0) + 1;
        });
      }
    });

    chartData = Object.entries(serviceMap)
      .map(([serviceName, count]) => ({
        serviceName:
          serviceName.length > 15
            ? serviceName.substring(0, 15) + "..."
            : serviceName,
        appointmentCount: count,
        fullServiceName: serviceName,
      }))
      .sort((a, b) => b.appointmentCount - a.appointmentCount)
      .slice(0, 10); // Top 10 services
  } else if (currentView === "Customer List") {
    // Get current period appointments
    let currentItems = getCurrentPeriodAppointments(
      appointments,
      currentPeriod,
      now
    );

    // Group by client
    const clientMap = {};
    currentItems.forEach((apt) => {
      const clientName =
        `${apt.client_details?.first_name || ""} ${
          apt.client_details?.last_name || ""
        }`.trim() || "Unknown Client";
      const shortName =
        clientName.length > 20
          ? clientName.substring(0, 20) + "..."
          : clientName;
      clientMap[shortName] = (clientMap[shortName] || 0) + 1;
    });

    chartData = Object.entries(clientMap)
      .map(([clientName, count]) => ({
        clientName,
        appointmentCount: count,
      }))
      .sort((a, b) => b.appointmentCount - a.appointmentCount)
      .slice(0, 10); // Top 10 clients
  }

  return chartData;
};

/**
 * Helper function to get appointments for current period
 * @param {Array} appointments - Array of appointment objects
 * @param {string} period - Time period (Daily, Weekly, Monthly)
 * @param {Date} now - Current date
 * @returns {Array} Filtered appointments for the period
 */
const getCurrentPeriodAppointments = (appointments, period, now) => {
  if (period === "Daily") {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    return appointments.filter((apt) => {
      const aptDate = new Date(apt.date);
      return aptDate >= today && aptDate < tomorrow;
    });
  } else if (period === "Weekly") {
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);

    return appointments.filter((apt) => {
      const aptDate = new Date(apt.date);
      return aptDate >= startOfWeek && aptDate < endOfWeek;
    });
  } else if (period === "Monthly") {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    return appointments.filter((apt) => {
      const aptDate = new Date(apt.date);
      return aptDate >= startOfMonth && aptDate < endOfMonth;
    });
  }

  return appointments;
};

/**
 * Get date range information for display
 * @param {string} period - Time period (Daily, Weekly, Monthly)
 * @returns {Object} Date range information
 */
export const getDateRangeInfo = (period) => {
  const now = new Date();

  if (period === "Daily") {
    return {
      start: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
      end: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
      label: now.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    };
  } else if (period === "Weekly") {
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    return {
      start: startOfWeek,
      end: endOfWeek,
      label: `${startOfWeek.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })} - ${endOfWeek.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })}`,
    };
  } else if (period === "Monthly") {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    return {
      start: startOfMonth,
      end: endOfMonth,
      label: now.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
      }),
    };
  }

  return {
    start: now,
    end: now,
    label: "Unknown Period",
  };
};
