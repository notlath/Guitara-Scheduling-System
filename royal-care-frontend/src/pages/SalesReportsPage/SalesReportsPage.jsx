import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchAppointments } from "../../features/scheduling/schedulingSlice";
import "./SalesReportsPage.module.css";

const SalesReportsPage = () => {
  const dispatch = useDispatch();
  const { appointments } = useSelector((state) => state.scheduling);

  const [currentView, setCurrentView] = useState("Total Revenue");
  const [currentPeriod, setCurrentPeriod] = useState("Daily");

  const views = ["Total Revenue", "Commission", "Customer List", "Services"];
  const periods = ["Daily", "Weekly", "Monthly"];

  useEffect(() => {
    document.title = "Sales Reports | Royal Care";
    // Fetch appointments data for calculations
    dispatch(fetchAppointments());
  }, [dispatch]);

  // Calculate commission data based on current period
  const commissionData = useMemo(() => {
    if (!appointments || appointments.length === 0) {
      return {
        currentTotal: 0,
        previousTotal: 0,
        items: [],
        comparison: "no-data",
      };
    }

    const now = new Date();
    const COMMISSION_RATE = 0.4; // 40% commission

    // Filter paid appointments only
    const paidAppointments = appointments.filter(
      (apt) => apt.payment_status === "paid" && apt.payment_amount > 0
    );

    let currentItems = [];
    let previousItems = [];

    if (currentPeriod === "Daily") {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      // Current day appointments
      currentItems = paidAppointments.filter((apt) => {
        const aptDate = new Date(apt.date);
        return (
          aptDate >= today &&
          aptDate < new Date(today.getTime() + 24 * 60 * 60 * 1000)
        );
      });

      // Previous day appointments
      previousItems = paidAppointments.filter((apt) => {
        const aptDate = new Date(apt.date);
        return aptDate >= yesterday && aptDate < today;
      });
    } else if (currentPeriod === "Weekly") {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 7);

      const startOfPrevWeek = new Date(startOfWeek);
      startOfPrevWeek.setDate(startOfWeek.getDate() - 7);

      // Current week appointments
      currentItems = paidAppointments.filter((apt) => {
        const aptDate = new Date(apt.date);
        return aptDate >= startOfWeek && aptDate < endOfWeek;
      });

      // Previous week appointments
      previousItems = paidAppointments.filter((apt) => {
        const aptDate = new Date(apt.date);
        return aptDate >= startOfPrevWeek && aptDate < startOfWeek;
      });
    } else if (currentPeriod === "Monthly") {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const startOfPrevMonth = new Date(
        now.getFullYear(),
        now.getMonth() - 1,
        1
      );

      // Current month appointments
      currentItems = paidAppointments.filter((apt) => {
        const aptDate = new Date(apt.date);
        return aptDate >= startOfMonth && aptDate < endOfMonth;
      });

      // Previous month appointments
      previousItems = paidAppointments.filter((apt) => {
        const aptDate = new Date(apt.date);
        return aptDate >= startOfPrevMonth && aptDate < startOfMonth;
      });
    }

    // Calculate totals
    const currentTotal = currentItems.reduce(
      (sum, apt) => sum + parseFloat(apt.payment_amount || 0) * COMMISSION_RATE,
      0
    );
    const previousTotal = previousItems.reduce(
      (sum, apt) => sum + parseFloat(apt.payment_amount || 0) * COMMISSION_RATE,
      0
    );

    // Format items for display
    const formattedItems = currentItems.map((apt) => {
      const commission = parseFloat(apt.payment_amount || 0) * COMMISSION_RATE;
      const therapistName = apt.therapist_details
        ? `${apt.therapist_details.first_name} ${apt.therapist_details.last_name}`
        : apt.therapists_details
            ?.map((t) => `${t.first_name} ${t.last_name}`)
            .join(", ") || "Unknown";

      if (currentPeriod === "Daily") {
        return {
          therapistName,
          commission: commission.toFixed(2),
          time: `${apt.start_time || ""} - ${apt.end_time || ""}`,
          clientName:
            `${apt.client_details?.first_name || ""} ${
              apt.client_details?.last_name || ""
            }`.trim() || "Unknown Client",
          date: new Date(apt.date).toLocaleDateString(),
        };
      } else if (currentPeriod === "Weekly") {
        const dayName = new Date(apt.date).toLocaleDateString("en-US", {
          weekday: "long",
        });
        return {
          therapistName,
          commission: commission.toFixed(2),
          day: dayName,
          clientName:
            `${apt.client_details?.first_name || ""} ${
              apt.client_details?.last_name || ""
            }`.trim() || "Unknown Client",
          date: new Date(apt.date).toLocaleDateString(),
          time: `${apt.start_time || ""} - ${apt.end_time || ""}`,
        };
      } else {
        // Monthly - show week range
        const aptDate = new Date(apt.date);
        const startOfMonth = new Date(
          aptDate.getFullYear(),
          aptDate.getMonth(),
          1
        );
        const dayOfMonth = aptDate.getDate();
        const weekNumber = Math.ceil((dayOfMonth + startOfMonth.getDay()) / 7);
        const weekRange = `Week ${weekNumber}`;

        return {
          therapistName,
          commission: commission.toFixed(2),
          weekRange,
          clientName:
            `${apt.client_details?.first_name || ""} ${
              apt.client_details?.last_name || ""
            }`.trim() || "Unknown Client",
          date: new Date(apt.date).toLocaleDateString(),
          time: `${apt.start_time || ""} - ${apt.end_time || ""}`,
        };
      }
    });

    // Group by therapist for weekly and monthly views
    let groupedItems = formattedItems;
    if (currentPeriod === "Weekly" || currentPeriod === "Monthly") {
      const grouped = {};
      formattedItems.forEach((item) => {
        if (!grouped[item.therapistName]) {
          grouped[item.therapistName] = {
            therapistName: item.therapistName,
            commission: 0,
            appointments: [],
            date: item.date, // Use the first appointment date for grouped view
            day: currentPeriod === "Weekly" ? "This Week" : undefined,
            weekRange: currentPeriod === "Monthly" ? "This Month" : undefined,
          };
        }
        grouped[item.therapistName].commission += parseFloat(item.commission);
        grouped[item.therapistName].appointments.push(item);
      });

      groupedItems = Object.values(grouped).map((group) => ({
        ...group,
        commission: group.commission.toFixed(2),
      }));
    }

    const comparison =
      currentTotal > previousTotal
        ? "higher"
        : currentTotal < previousTotal
        ? "lower"
        : "same";

    return {
      currentTotal,
      previousTotal,
      items: groupedItems,
      comparison,
    };
  }, [appointments, currentPeriod]);

  // Calculate total revenue data based on current period
  const revenueData = useMemo(() => {
    if (!appointments || appointments.length === 0) {
      return {
        currentTotal: 0,
        previousTotal: 0,
        items: [],
        comparison: "no-data",
      };
    }

    const now = new Date();

    // Filter paid appointments only
    const paidAppointments = appointments.filter(
      (apt) => apt.payment_status === "paid" && apt.payment_amount > 0
    );

    let currentItems = [];
    let previousItems = [];

    if (currentPeriod === "Daily") {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      // Current day appointments
      currentItems = paidAppointments.filter((apt) => {
        const aptDate = new Date(apt.date);
        return (
          aptDate >= today &&
          aptDate < new Date(today.getTime() + 24 * 60 * 60 * 1000)
        );
      });

      // Previous day appointments
      previousItems = paidAppointments.filter((apt) => {
        const aptDate = new Date(apt.date);
        return aptDate >= yesterday && aptDate < today;
      });
    } else if (currentPeriod === "Weekly") {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 7);

      const startOfPrevWeek = new Date(startOfWeek);
      startOfPrevWeek.setDate(startOfWeek.getDate() - 7);

      // Current week appointments
      currentItems = paidAppointments.filter((apt) => {
        const aptDate = new Date(apt.date);
        return aptDate >= startOfWeek && aptDate < endOfWeek;
      });

      // Previous week appointments
      previousItems = paidAppointments.filter((apt) => {
        const aptDate = new Date(apt.date);
        return aptDate >= startOfPrevWeek && aptDate < startOfWeek;
      });
    } else if (currentPeriod === "Monthly") {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const startOfPrevMonth = new Date(
        now.getFullYear(),
        now.getMonth() - 1,
        1
      );

      // Current month appointments
      currentItems = paidAppointments.filter((apt) => {
        const aptDate = new Date(apt.date);
        return aptDate >= startOfMonth && aptDate < endOfMonth;
      });

      // Previous month appointments
      previousItems = paidAppointments.filter((apt) => {
        const aptDate = new Date(apt.date);
        return aptDate >= startOfPrevMonth && aptDate < startOfMonth;
      });
    }

    // Calculate totals
    const currentTotal = currentItems.reduce(
      (sum, apt) => sum + parseFloat(apt.payment_amount || 0),
      0
    );
    const previousTotal = previousItems.reduce(
      (sum, apt) => sum + parseFloat(apt.payment_amount || 0),
      0
    );

    // Format items for display - group by client for weekly and monthly
    let formattedItems = [];

    if (currentPeriod === "Daily") {
      formattedItems = currentItems.map((apt) => ({
        clientName:
          `${apt.client_details?.first_name || ""} ${
            apt.client_details?.last_name || ""
          }`.trim() || "Unknown Client",
        revenue: parseFloat(apt.payment_amount || 0).toFixed(2),
        time: `${apt.start_time || ""} - ${apt.end_time || ""}`,
        date: new Date(apt.date).toLocaleDateString(),
      }));
    } else if (currentPeriod === "Weekly") {
      const groupedByClient = {};
      currentItems.forEach((apt) => {
        const clientName =
          `${apt.client_details?.first_name || ""} ${
            apt.client_details?.last_name || ""
          }`.trim() || "Unknown Client";
        const dayName = new Date(apt.date).toLocaleDateString("en-US", {
          weekday: "long",
        });

        if (!groupedByClient[clientName]) {
          groupedByClient[clientName] = {
            clientName,
            revenue: 0,
            day: dayName,
            appointments: [],
          };
        }
        groupedByClient[clientName].revenue += parseFloat(
          apt.payment_amount || 0
        );
        groupedByClient[clientName].appointments.push(apt);
      });

      formattedItems = Object.values(groupedByClient).map((group) => ({
        ...group,
        revenue: group.revenue.toFixed(2),
      }));
    } else {
      // Monthly - group by client and show week range
      const groupedByClient = {};
      currentItems.forEach((apt) => {
        const clientName =
          `${apt.client_details?.first_name || ""} ${
            apt.client_details?.last_name || ""
          }`.trim() || "Unknown Client";
        const aptDate = new Date(apt.date);
        const startOfMonth = new Date(
          aptDate.getFullYear(),
          aptDate.getMonth(),
          1
        );
        const dayOfMonth = aptDate.getDate();
        const weekNumber = Math.ceil((dayOfMonth + startOfMonth.getDay()) / 7);
        const weekRange = `Week ${weekNumber}`;

        if (!groupedByClient[clientName]) {
          groupedByClient[clientName] = {
            clientName,
            revenue: 0,
            weekRange,
            appointments: [],
          };
        }
        groupedByClient[clientName].revenue += parseFloat(
          apt.payment_amount || 0
        );
        groupedByClient[clientName].appointments.push(apt);
      });

      formattedItems = Object.values(groupedByClient).map((group) => ({
        ...group,
        revenue: group.revenue.toFixed(2),
      }));
    }

    const comparison =
      currentTotal > previousTotal
        ? "higher"
        : currentTotal < previousTotal
        ? "lower"
        : "same";

    return {
      currentTotal,
      previousTotal,
      items: formattedItems,
      comparison,
    };
  }, [appointments, currentPeriod]);

  const renderCommissionView = () => {
    const { currentTotal, items, comparison } = commissionData;

    return (
      <div className="commission-view">
        <div className="commission-header">
          <h2>
            ₱
            {currentTotal.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </h2>
          <p className={`comparison ${comparison}`}>
            {comparison === "higher" && "Higher than last period"}
            {comparison === "lower" && "Lower than last period"}
            {comparison === "same" && "Same as last period"}
            {comparison === "no-data" && "No previous data available"}
          </p>
        </div>

        <div className="commission-table">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Therapist</th>
                <th>Commission</th>
                {currentPeriod === "Daily" && <th>Time</th>}
                {currentPeriod === "Weekly" && <th>Day</th>}
                {currentPeriod === "Monthly" && <th>Week Range</th>}
              </tr>
            </thead>
            <tbody>
              {items.length > 0 ? (
                items.map((item, index) => (
                  <tr key={index}>
                    <td>{item.date || "N/A"}</td>
                    <td>{item.therapistName || "Unknown Therapist"}</td>
                    <td>₱{item.commission}</td>
                    {currentPeriod === "Daily" && <td>{item.time}</td>}
                    {currentPeriod === "Weekly" && (
                      <td>{item.day || "This Week"}</td>
                    )}
                    {currentPeriod === "Monthly" && (
                      <td>{item.weekRange || "This Month"}</td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={currentPeriod === "Daily" ? 4 : 4}>
                    No commission data available for this period
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderTotalRevenueView = () => {
    const { currentTotal, items, comparison } = revenueData;

    return (
      <div className="revenue-view">
        <div className="revenue-header">
          <h2>
            ₱
            {currentTotal.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </h2>
          <p className={`comparison ${comparison}`}>
            {comparison === "higher" && "Higher than last period"}
            {comparison === "lower" && "Lower than last period"}
            {comparison === "same" && "Same as last period"}
            {comparison === "no-data" && "No previous data available"}
          </p>
        </div>

        <div className="revenue-table">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Client Name</th>
                <th>Revenue</th>
                {currentPeriod === "Daily" && <th>Time</th>}
                {currentPeriod === "Weekly" && <th>Day</th>}
                {currentPeriod === "Monthly" && <th>Week Range</th>}
              </tr>
            </thead>
            <tbody>
              {items.length > 0 ? (
                items.map((item, index) => (
                  <tr key={index}>
                    <td>{item.date || "N/A"}</td>
                    <td>{item.clientName || "Unknown Client"}</td>
                    <td>₱{item.revenue}</td>
                    {currentPeriod === "Daily" && <td>{item.time}</td>}
                    {currentPeriod === "Weekly" && <td>{item.day}</td>}
                    {currentPeriod === "Monthly" && <td>{item.weekRange}</td>}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={currentPeriod === "Daily" ? 4 : 4}>
                    No revenue data available for this period
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderPlaceholderView = (viewName) => {
    return (
      <div className="placeholder-container">
        <div className="placeholder-content">
          <h2>{viewName} View</h2>
          <p className="placeholder-text">
            The {viewName} view is currently under development and will be
            available soon.
          </p>
          <div className="placeholder-loader"></div>
        </div>
      </div>
    );
  };

  return (
    <div className="sales-reports-page">
      <div className="sales-reports-header">
        <h1>Sales & Reports Dashboard</h1>

        {/* View Selector */}
        <div className="view-selector">
          {views.map((view) => (
            <button
              key={view}
              className={`view-btn ${currentView === view ? "active" : ""}`}
              onClick={() => setCurrentView(view)}
            >
              {view}
            </button>
          ))}
        </div>

        {/* Period Selector */}
        <div className="period-selector">
          {periods.map((period) => (
            <button
              key={period}
              className={`period-btn ${
                currentPeriod === period ? "active" : ""
              }`}
              onClick={() => setCurrentPeriod(period)}
            >
              {period}
            </button>
          ))}
        </div>
      </div>

      <div className="sales-reports-content">
        {currentView === "Commission" && renderCommissionView()}
        {currentView === "Total Revenue" && renderTotalRevenueView()}
        {(currentView === "Customer List" || currentView === "Services") &&
          renderPlaceholderView(currentView)}
      </div>
    </div>
  );
};

export default SalesReportsPage;
