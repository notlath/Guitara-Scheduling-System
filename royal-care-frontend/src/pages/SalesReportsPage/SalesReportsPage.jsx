import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import pageTitles from "../../constants/pageTitles";
import { fetchAppointments } from "../../features/scheduling/schedulingSlice";
import LayoutRow from "../../globals/LayoutRow";
import PageLayout from "../../globals/PageLayout";
import "../../globals/TabSwitcher.css";
import styles from "./SalesReportsPage.module.css";

const SalesReportsPage = () => {
  const dispatch = useDispatch();
  const { appointments } = useSelector((state) => state.scheduling);

  const [currentView, setCurrentView] = useState("Total Revenue");
  const [currentPeriod, setCurrentPeriod] = useState("Daily");

  const views = ["Total Revenue", "Commission", "Customer List", "Services"];
  const periods = ["Daily", "Weekly", "Monthly"];

  useEffect(() => {
    document.title = pageTitles.salesReports;
    // Fetch appointments data for calculations
    dispatch(fetchAppointments());
  }, [dispatch]);

  // Debug effect to log appointments data when it changes
  useEffect(() => {
    if (appointments && appointments.length > 0) {
      console.log("=== APPOINTMENTS DATA LOADED ===");
      console.log("Total appointments:", appointments.length);

      // Find today's appointments
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const todayAppointments = appointments.filter((apt) => {
        const aptDate = new Date(apt.date);
        const aptDateOnly = new Date(
          aptDate.getFullYear(),
          aptDate.getMonth(),
          aptDate.getDate()
        );
        return aptDateOnly.getTime() === today.getTime();
      });

      console.log("Today's appointments:", todayAppointments.length);

      if (todayAppointments.length > 0) {
        console.log(
          "Today's appointments details:",
          todayAppointments.map((apt) => ({
            id: apt.id,
            date: apt.date,
            status: apt.status,
            clientName: apt.client_details
              ? `${apt.client_details.first_name || ""} ${
                  apt.client_details.last_name || ""
                }`.trim()
              : "No client details",
          }))
        );

        const completedToday = todayAppointments.filter(
          (apt) => apt.status === "completed"
        );
        console.log("Completed appointments today:", completedToday.length);

        if (completedToday.length > 0) {
          console.log("✅ COMPLETED TODAY:", completedToday);
        } else {
          console.log("❌ NO COMPLETED APPOINTMENTS TODAY");
          console.log("Status values found:", [
            ...new Set(todayAppointments.map((apt) => apt.status)),
          ]);
        }
      } else {
        console.log("❌ NO APPOINTMENTS FOR TODAY");
        console.log(
          "Sample dates from appointments:",
          appointments.slice(0, 5).map((apt) => apt.date)
        );
      }
    }
  }, [appointments]);

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

      // Current month appointments
      currentItems = paidAppointments.filter((apt) => {
        const aptDate = new Date(apt.date);
        return aptDate >= startOfMonth && aptDate < endOfMonth;
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

  // Calculate customer list data based on current period
  const customerListData = useMemo(() => {
    if (!appointments || appointments.length === 0) {
      console.log("Customer List: No appointments data available");
      return {
        items: [],
      };
    }

    console.log(
      "Customer List: Processing",
      appointments.length,
      "appointments"
    );

    // Log sample appointment data structure for debugging
    if (appointments.length > 0) {
      console.log("Sample appointment structure:", {
        sampleAppointment: appointments[0],
        dateField: appointments[0].date,
        statusField: appointments[0].status,
        clientDetailsField: appointments[0].client_details,
      });
    }

    const now = new Date();
    let currentItems = [];

    if (currentPeriod === "Daily") {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);

      console.log("=== CUSTOMER LIST DAILY FILTER DEBUG ===");
      console.log("Today date object:", {
        today: today.toISOString(),
        todayTime: today.getTime(),
        todayDateString: today.toDateString(),
      });

      console.log("Total appointments to check:", appointments.length);

      // Current day appointments - for daily, we only show completed appointments
      currentItems = appointments.filter((apt) => {
        const aptDate = new Date(apt.date);
        const aptDateOnly = new Date(
          aptDate.getFullYear(),
          aptDate.getMonth(),
          aptDate.getDate()
        );

        const isToday = aptDateOnly.getTime() === today.getTime();
        const isCompleted =
          apt.status && apt.status.toLowerCase().includes("completed");
        const passesFilter = isToday && isCompleted;

        // Enhanced debug logging - log ALL appointments for today, regardless of status
        if (isToday) {
          console.log("📅 TODAY'S APPOINTMENT FOUND:", {
            id: apt.id,
            originalDate: apt.date,
            parsedDate: aptDate.toISOString(),
            dateOnly: aptDateOnly.toISOString(),
            status: apt.status,
            isCompleted: isCompleted,
            passesFilter: passesFilter,
            clientName: apt.client_details
              ? `${apt.client_details.first_name || ""} ${
                  apt.client_details.last_name || ""
                }`.trim()
              : "No client details",
            clientId: apt.client_details?.id || "No client ID",
          });
        }

        // Also log the first few appointments regardless to check date parsing
        if (appointments.indexOf(apt) < 5) {
          console.log("Sample appointment parsing:", {
            id: apt.id,
            originalDate: apt.date,
            parsedDate: aptDate.toISOString(),
            dateOnly: aptDateOnly.toISOString(),
            isToday: isToday,
            status: apt.status,
          });
        }

        return passesFilter;
      });

      console.log(
        "Filtered completed appointments for today:",
        currentItems.length
      );
      if (currentItems.length > 0) {
        console.log(
          "Completed appointments details:",
          currentItems.map((apt) => ({
            id: apt.id,
            date: apt.date,
            status: apt.status,
            clientName: apt.client_details
              ? `${apt.client_details.first_name || ""} ${
                  apt.client_details.last_name || ""
                }`.trim()
              : "Unknown",
          }))
        );
      }
    } else if (currentPeriod === "Weekly") {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 7);

      // Current week appointments
      currentItems = appointments.filter((apt) => {
        const aptDate = new Date(apt.date);
        return aptDate >= startOfWeek && aptDate < endOfWeek;
      });
    } else if (currentPeriod === "Monthly") {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

      // Current month appointments
      currentItems = appointments.filter((apt) => {
        const aptDate = new Date(apt.date);
        return aptDate >= startOfMonth && aptDate < endOfMonth;
      });
    }

    // Group by client and count appointments
    const groupedByClient = {};

    console.log(
      "Customer List - Processing appointments:",
      currentItems.length
    );

    currentItems.forEach((apt) => {
      const clientName =
        `${apt.client_details?.first_name || ""} ${
          apt.client_details?.last_name || ""
        }`.trim() || "Unknown Client";

      const clientKey = `${clientName}_${apt.client_details?.id || "unknown"}`;

      console.log("Processing client:", {
        aptId: apt.id,
        clientName,
        clientKey,
        clientDetails: apt.client_details,
      });

      if (!groupedByClient[clientKey]) {
        groupedByClient[clientKey] = {
          clientName,
          address: apt.client_details?.address || "Not provided",
          contactNumber: apt.client_details?.phone_number || "Not provided",
          appointmentCount: 0,
          appointments: [],
        };
      }
      groupedByClient[clientKey].appointmentCount += 1;
      groupedByClient[clientKey].appointments.push(apt);
    });

    const formattedItems = Object.values(groupedByClient);

    console.log("Customer List - Final grouped items:", formattedItems);

    return {
      items: formattedItems,
    };
  }, [appointments, currentPeriod]);

  // Calculate services data based on current period
  const servicesData = useMemo(() => {
    if (!appointments || appointments.length === 0) {
      return {
        items: [],
      };
    }

    const now = new Date();
    let currentItems = [];

    if (currentPeriod === "Daily") {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      // Current day appointments - all appointments for today
      currentItems = appointments.filter((apt) => {
        const aptDate = new Date(apt.date);
        return (
          aptDate >= today &&
          aptDate < new Date(today.getTime() + 24 * 60 * 60 * 1000)
        );
      });
    } else if (currentPeriod === "Weekly") {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 7);

      // Current week appointments
      currentItems = appointments.filter((apt) => {
        const aptDate = new Date(apt.date);
        return aptDate >= startOfWeek && aptDate < endOfWeek;
      });
    } else if (currentPeriod === "Monthly") {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

      // Current month appointments
      currentItems = appointments.filter((apt) => {
        const aptDate = new Date(apt.date);
        return aptDate >= startOfMonth && aptDate < endOfMonth;
      });
    }

    // Group by service and count appointments
    const groupedByService = {};
    currentItems.forEach((apt) => {
      // Handle multiple services per appointment
      if (apt.services_details && Array.isArray(apt.services_details)) {
        apt.services_details.forEach((service) => {
          const serviceName = service.name || "Unknown Service";
          const serviceKey = `${serviceName}_${service.id || "unknown"}`;

          if (!groupedByService[serviceKey]) {
            groupedByService[serviceKey] = {
              serviceName,
              appointmentCount: 0,
              appointments: [],
            };
          }
          groupedByService[serviceKey].appointmentCount += 1;
          groupedByService[serviceKey].appointments.push(apt);
        });
      }
    });

    // Sort by appointment count (most popular first)
    const formattedItems = Object.values(groupedByService).sort(
      (a, b) => b.appointmentCount - a.appointmentCount
    );

    return {
      items: formattedItems,
    };
  }, [appointments, currentPeriod]);

  const renderCommissionView = () => {
    const { currentTotal, items, comparison } = commissionData;

    return (
      <div className={styles.dataTableWrapper}>
        <div
          style={{
            padding: "var(--spacing-md)",
            borderBottom: "1px solid var(--background-100)",
          }}
        >
          <h3
            style={{
              margin: "0 0 var(--spacing-xs) 0",
              fontSize: "var(--font-size-xl)",
              fontWeight: "700",
            }}
          >
            ₱
            {currentTotal.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </h3>
          <p
            className={`${styles.comparison} ${styles[comparison]}`}
            style={{
              margin: "0",
              fontSize: "var(--font-size-sm)",
              color: "var(--muted)",
            }}
          >
            {comparison === "higher" && "Higher than last period"}
            {comparison === "lower" && "Lower than last period"}
            {comparison === "same" && "Same as last period"}
            {comparison === "no-data" && "No previous data available"}
          </p>
        </div>

        <table className={styles.dataTable}>
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
                <td
                  colSpan={currentPeriod === "Daily" ? 4 : 4}
                  className={styles.noData}
                >
                  No commission data available for this period
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  };

  const renderTotalRevenueView = () => {
    const { currentTotal, items, comparison } = revenueData;

    return (
      <div className={styles.dataTableWrapper}>
        <div
          style={{
            padding: "var(--spacing-md)",
            borderBottom: "1px solid var(--background-100)",
          }}
        >
          <h3
            style={{
              margin: "0 0 var(--spacing-xs) 0",
              fontSize: "var(--font-size-xl)",
              fontWeight: "700",
            }}
          >
            ₱
            {currentTotal.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </h3>
          <p
            className={`${styles.comparison} ${styles[comparison]}`}
            style={{
              margin: "0",
              fontSize: "var(--font-size-sm)",
              color: "var(--muted)",
            }}
          >
            {comparison === "higher" && "Higher than last period"}
            {comparison === "lower" && "Lower than last period"}
            {comparison === "same" && "Same as last period"}
            {comparison === "no-data" && "No previous data available"}
          </p>
        </div>

        <table className={styles.dataTable}>
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
                <td
                  colSpan={currentPeriod === "Daily" ? 4 : 4}
                  className={styles.noData}
                >
                  No revenue data available for this period
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  };

  const renderCustomerListView = () => {
    const { items } = customerListData;

    return (
      <div className={styles.dataTableWrapper}>
        <div
          style={{
            padding: "var(--spacing-md)",
            borderBottom: "1px solid var(--background-100)",
          }}
        >
          <h3
            style={{
              margin: "0 0 var(--spacing-xs) 0",
              fontSize: "var(--font-size-xl)",
              fontWeight: "700",
            }}
          >
            Customer List - {currentPeriod}
          </h3>
          <p
            style={{
              margin: "0",
              fontSize: "var(--font-size-sm)",
              color: "var(--muted)",
            }}
          >
            {currentPeriod === "Daily" &&
              "Showing clients with completed appointments today"}
            {currentPeriod === "Weekly" &&
              "Showing clients with appointments this week"}
            {currentPeriod === "Monthly" &&
              "Showing clients with appointments this month"}
          </p>
        </div>

        <table className={styles.dataTable}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Address</th>
              <th>Contact Number</th>
              <th>Number of Appointments</th>
            </tr>
          </thead>
          <tbody>
            {items.length > 0 ? (
              items.map((item, index) => (
                <tr key={index}>
                  <td>{item.clientName}</td>
                  <td>{item.address}</td>
                  <td>{item.contactNumber}</td>
                  <td>{item.appointmentCount}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className={styles.noData}>
                  No customers found for this period
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  };

  const renderServicesView = () => {
    const { items } = servicesData;

    return (
      <div className={styles.dataTableWrapper}>
        <div
          style={{
            padding: "var(--spacing-md)",
            borderBottom: "1px solid var(--background-100)",
          }}
        >
          <h3
            style={{
              margin: "0 0 var(--spacing-xs) 0",
              fontSize: "var(--font-size-xl)",
              fontWeight: "700",
            }}
          >
            Services - {currentPeriod}
          </h3>
          <p
            style={{
              margin: "0",
              fontSize: "var(--font-size-sm)",
              color: "var(--muted)",
            }}
          >
            {currentPeriod === "Daily" && "Showing services booked today"}
            {currentPeriod === "Weekly" && "Showing services booked this week"}
            {currentPeriod === "Monthly" &&
              "Showing services booked this month"}
          </p>
        </div>

        <table className={styles.dataTable}>
          <thead>
            <tr>
              <th>Services</th>
              <th>Number of Appointments</th>
            </tr>
          </thead>
          <tbody>
            {items.length > 0 ? (
              items.map((item, index) => (
                <tr key={index}>
                  <td>{item.serviceName}</td>
                  <td>{item.appointmentCount}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={2} className={styles.noData}>
                  No services found for this period
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <PageLayout>
      <LayoutRow title="Sales & Reports Dashboard">
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
      </LayoutRow>

      <div
        className="view-selector"
        style={{ marginBottom: "var(--spacing-md)" }}
      >
        {periods.map((period) => (
          <button
            key={period}
            className={`${styles.periodBtn} ${
              currentPeriod === period ? "active" : ""
            }`}
            onClick={() => setCurrentPeriod(period)}
          >
            {period}
          </button>
        ))}
      </div>

      <div>
        {currentView === "Commission" && renderCommissionView()}
        {currentView === "Total Revenue" && renderTotalRevenueView()}
        {currentView === "Customer List" && renderCustomerListView()}
        {currentView === "Services" && renderServicesView()}
      </div>
    </PageLayout>
  );
};

export default SalesReportsPage;
