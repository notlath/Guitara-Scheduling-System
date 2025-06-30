import { useEffect, useMemo, useState } from "react";
import { shallowEqual, useDispatch } from "react-redux";
import pageTitles from "../../constants/pageTitles";
import { fetchAppointments } from "../../features/scheduling/schedulingSlice";
import LayoutRow from "../../globals/LayoutRow";
import PageLayout from "../../globals/PageLayout";
import TabSwitcher from "../../globals/TabSwitcher";
import { useOptimizedSelector } from "../../hooks/usePerformanceOptimization";
import styles from "./SalesReportsPage.module.css";
// Export dependencies
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
// Chart components
import SalesChart from "../../components/charts/SalesChart";
import { prepareChartData } from "../../utils/chartDataHelpers";

const SalesReportsPage = () => {
  const dispatch = useDispatch();
  const appointments = useOptimizedSelector(
    (state) => state.scheduling.appointments,
    shallowEqual
  );

  const [currentView, setCurrentView] = useState("Total Revenue");
  const [currentPeriod, setCurrentPeriod] = useState("Daily");
  const [showExportDropdown, setShowExportDropdown] = useState(false);

  const views = ["Total Revenue", "Commission", "Customer List", "Services"];
  const periods = ["Daily", "Weekly", "Monthly"];

  // Helper functions to get actual date ranges
  const getDateRange = (period) => {
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
      endOfWeek.setHours(23, 59, 59, 999);

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
      endOfMonth.setHours(23, 59, 59, 999);

      return {
        start: startOfMonth,
        end: endOfMonth,
        label: now.toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
        }),
      };
    }
  };

  useEffect(() => {
    document.title = pageTitles.salesReports;
    // Fetch appointments data for calculations
    dispatch(fetchAppointments());
  }, [dispatch]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        showExportDropdown &&
        !event.target.closest(`.${styles.exportDropdown}`)
      ) {
        setShowExportDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showExportDropdown]);

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
        ? `${apt.therapist_details.first_name || ""} ${
            apt.therapist_details.last_name || ""
          }`
        : apt.therapists_details
            ?.map((t) => `${t.first_name || ""} ${t.last_name || ""}`)
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
      const dateRange = getDateRange(currentPeriod);
      const grouped = {};
      formattedItems.forEach((item) => {
        if (!grouped[item.therapistName]) {
          grouped[item.therapistName] = {
            therapistName: item.therapistName,
            commission: 0,
            appointments: [],
            date: dateRange.label, // Show actual date range instead of generic period
            day: currentPeriod === "Weekly" ? dateRange.label : undefined,
            weekRange:
              currentPeriod === "Monthly" ? dateRange.label : undefined,
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
      const dateRange = getDateRange(currentPeriod);
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
            date: dateRange.label, // Show actual date range instead of generic period
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
      const dateRange = getDateRange(currentPeriod);
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
            date: dateRange.label, // Show actual date range instead of generic period
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
      endOfWeek.setDate(endOfWeek.getDate() + 7);

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

  // Export functions
  const exportToCSV = () => {
    let data = [];
    let filename = "";

    if (currentView === "Total Revenue") {
      const { items } = revenueData;
      data = items.map((item) => ({
        Date: item.date || "N/A",
        "Client Name": item.clientName || "Unknown Client",
        Revenue: `₱${item.revenue}`,
        [`${
          currentPeriod === "Daily"
            ? "Time"
            : currentPeriod === "Weekly"
            ? "Day"
            : "Week Range"
        }`]:
          currentPeriod === "Daily"
            ? item.time
            : currentPeriod === "Weekly"
            ? item.day
            : item.weekRange || "N/A",
      }));
      filename = `total_revenue_${currentPeriod.toLowerCase()}_${
        new Date().toISOString().split("T")[0]
      }.csv`;
    } else if (currentView === "Commission") {
      const { items } = commissionData;
      data = items.map((item) => ({
        Date: item.date || "N/A",
        Therapist: item.therapistName || "Unknown Therapist",
        Commission: `₱${item.commission}`,
        [`${
          currentPeriod === "Daily"
            ? "Time"
            : currentPeriod === "Weekly"
            ? "Day"
            : "Week Range"
        }`]:
          currentPeriod === "Daily"
            ? item.time
            : currentPeriod === "Weekly"
            ? item.day
            : item.weekRange || "N/A",
      }));
      filename = `commission_${currentPeriod.toLowerCase()}_${
        new Date().toISOString().split("T")[0]
      }.csv`;
    } else if (currentView === "Customer List") {
      const { items } = customerListData;
      data = items.map((item) => ({
        Name: item.clientName,
        Address: item.address,
        "Contact Number": item.contactNumber,
        "Number of Appointments": item.appointmentCount,
      }));
      filename = `customer_list_${currentPeriod.toLowerCase()}_${
        new Date().toISOString().split("T")[0]
      }.csv`;
    } else if (currentView === "Services") {
      const { items } = servicesData;
      data = items.map((item) => ({
        Services: item.serviceName,
        "Number of Appointments": item.appointmentCount,
      }));
      filename = `services_${currentPeriod.toLowerCase()}_${
        new Date().toISOString().split("T")[0]
      }.csv`;
    }

    if (data.length === 0) {
      alert("No data available to export");
      return;
    }

    // Convert to CSV
    const csvContent = convertToCSV(data);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, filename);
  };

  const convertToCSV = (data) => {
    if (data.length === 0) return "";

    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(","),
      ...data.map((row) =>
        headers
          .map((header) => {
            const value = row[header];
            // Escape commas and quotes in CSV
            if (
              typeof value === "string" &&
              (value.includes(",") || value.includes('"'))
            ) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          })
          .join(",")
      ),
    ];

    return csvRows.join("\n");
  };

  const exportToExcel = () => {
    let data = [];
    let filename = "";

    if (currentView === "Total Revenue") {
      const { items } = revenueData;
      data = items.map((item) => ({
        Date: item.date || "N/A",
        "Client Name": item.clientName || "Unknown Client",
        Revenue: `₱${item.revenue}`,
        [`${
          currentPeriod === "Daily"
            ? "Time"
            : currentPeriod === "Weekly"
            ? "Day"
            : "Week Range"
        }`]:
          currentPeriod === "Daily"
            ? item.time
            : currentPeriod === "Weekly"
            ? item.day
            : item.weekRange || "N/A",
      }));
      filename = `total_revenue_${currentPeriod.toLowerCase()}_${
        new Date().toISOString().split("T")[0]
      }.xlsx`;
    } else if (currentView === "Commission") {
      const { items } = commissionData;
      data = items.map((item) => ({
        Date: item.date || "N/A",
        Therapist: item.therapistName || "Unknown Therapist",
        Commission: `₱${item.commission}`,
        [`${
          currentPeriod === "Daily"
            ? "Time"
            : currentPeriod === "Weekly"
            ? "Day"
            : "Week Range"
        }`]:
          currentPeriod === "Daily"
            ? item.time
            : currentPeriod === "Weekly"
            ? item.day
            : item.weekRange || "N/A",
      }));
      filename = `commission_${currentPeriod.toLowerCase()}_${
        new Date().toISOString().split("T")[0]
      }.xlsx`;
    } else if (currentView === "Customer List") {
      const { items } = customerListData;
      data = items.map((item) => ({
        Name: item.clientName,
        Address: item.address,
        "Contact Number": item.contactNumber,
        "Number of Appointments": item.appointmentCount,
      }));
      filename = `customer_list_${currentPeriod.toLowerCase()}_${
        new Date().toISOString().split("T")[0]
      }.xlsx`;
    } else if (currentView === "Services") {
      const { items } = servicesData;
      data = items.map((item) => ({
        Services: item.serviceName,
        "Number of Appointments": item.appointmentCount,
      }));
      filename = `services_${currentPeriod.toLowerCase()}_${
        new Date().toISOString().split("T")[0]
      }.xlsx`;
    }

    if (data.length === 0) {
      alert("No data available to export");
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      `${currentView} - ${currentPeriod}`
    );
    XLSX.writeFile(workbook, filename);
  };

  const exportToPDF = () => {
    let data = [];
    let filename = "";
    let headers = [];

    if (currentView === "Total Revenue") {
      const { items } = revenueData;
      headers = [
        "Date",
        "Client Name",
        "Revenue",
        currentPeriod === "Daily"
          ? "Time"
          : currentPeriod === "Weekly"
          ? "Day"
          : "Week Range",
      ];
      data = items.map((item) => [
        item.date || "N/A",
        item.clientName || "Unknown Client",
        `₱${item.revenue}`,
        currentPeriod === "Daily"
          ? item.time || "N/A"
          : currentPeriod === "Weekly"
          ? item.day || "N/A"
          : item.weekRange || "N/A",
      ]);
      filename = `total_revenue_${currentPeriod.toLowerCase()}_${
        new Date().toISOString().split("T")[0]
      }.pdf`;
    } else if (currentView === "Commission") {
      const { items } = commissionData;
      headers = [
        "Date",
        "Therapist",
        "Commission",
        currentPeriod === "Daily"
          ? "Time"
          : currentPeriod === "Weekly"
          ? "Day"
          : "Week Range",
      ];
      data = items.map((item) => [
        item.date || "N/A",
        item.therapistName || "Unknown Therapist",
        `₱${item.commission}`,
        currentPeriod === "Daily"
          ? item.time || "N/A"
          : currentPeriod === "Weekly"
          ? item.day || "N/A"
          : item.weekRange || "N/A",
      ]);
      filename = `commission_${currentPeriod.toLowerCase()}_${
        new Date().toISOString().split("T")[0]
      }.pdf`;
    } else if (currentView === "Customer List") {
      const { items } = customerListData;
      headers = ["Name", "Address", "Contact Number", "Number of Appointments"];
      data = items.map((item) => [
        item.clientName,
        item.address,
        item.contactNumber,
        item.appointmentCount,
      ]);
      filename = `customer_list_${currentPeriod.toLowerCase()}_${
        new Date().toISOString().split("T")[0]
      }.pdf`;
    } else if (currentView === "Services") {
      const { items } = servicesData;
      headers = ["Services", "Number of Appointments"];
      data = items.map((item) => [item.serviceName, item.appointmentCount]);
      filename = `services_${currentPeriod.toLowerCase()}_${
        new Date().toISOString().split("T")[0]
      }.pdf`;
    }

    if (data.length === 0) {
      alert("No data available to export");
      return;
    }

    const doc = new jsPDF();

    // Add title
    doc.setFontSize(16);
    doc.text(`${currentView} - ${currentPeriod}`, 20, 20);

    // Add generation date
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 30);

    // Add table using autoTable
    autoTable(doc, {
      head: [headers],
      body: data,
      startY: 40,
      styles: {
        fontSize: 8,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [74, 105, 189], // Primary color
        textColor: 255,
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
    });

    doc.save(filename);
  };

  // Prepare chart data
  const chartData = useMemo(() => {
    return prepareChartData(appointments, currentView, currentPeriod);
  }, [appointments, currentView, currentPeriod]);

  return (
    <PageLayout>
      <LayoutRow title="Sales & Reports Dashboard">
        <TabSwitcher
          tabs={views.map((view) => ({ label: view, value: view }))}
          activeTab={currentView}
          onTabChange={setCurrentView}
        />
      </LayoutRow>

      <div
        className="view-selector"
        style={{ marginBottom: "var(--spacing-md)" }}
      >
        <TabSwitcher
          tabs={periods.map((period) => ({ label: period, value: period }))}
          activeTab={currentPeriod}
          onTabChange={setCurrentPeriod}
        />
      </div>

      {/* Chart Component */}
      <SalesChart
        data={chartData}
        currentView={currentView}
        currentPeriod={currentPeriod}
        currentTotal={
          currentView === "Total Revenue"
            ? revenueData.currentTotal
            : currentView === "Commission"
            ? commissionData.currentTotal
            : chartData.length
        }
        previousTotal={
          currentView === "Total Revenue"
            ? revenueData.previousTotal
            : currentView === "Commission"
            ? commissionData.previousTotal
            : 0
        }
        comparison={
          currentView === "Total Revenue"
            ? revenueData.comparison
            : currentView === "Commission"
            ? commissionData.comparison
            : "no-data"
        }
      />

      <div>
        {currentView === "Commission" && (
          <div className={styles.dataTableWrapper}>
            <div
              style={{
                padding: "var(--spacing-md)",
                borderBottom: "1px solid var(--background-100)",
                background: "var(--background-50)",
              }}
            >
              <h3 style={{ margin: 0, marginBottom: "var(--spacing-xs)" }}>
                Commission Report - {currentPeriod}
              </h3>
              <p
                style={{
                  margin: 0,
                  color: "var(--text-500)",
                  fontSize: "var(--font-size-sm)",
                }}
              >
                Total Commission: ₱{commissionData.currentTotal.toFixed(2)}
              </p>
            </div>

            {commissionData.items.length > 0 ? (
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Therapist</th>
                    <th>Commission</th>
                    <th>
                      {currentPeriod === "Daily"
                        ? "Time"
                        : currentPeriod === "Weekly"
                        ? "Day"
                        : "Week Range"}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {commissionData.items.map((item, index) => (
                    <tr key={index}>
                      <td>{item.date || "N/A"}</td>
                      <td>{item.therapistName}</td>
                      <td>₱{item.commission}</td>
                      <td>
                        {currentPeriod === "Daily"
                          ? item.time
                          : currentPeriod === "Weekly"
                          ? item.day
                          : item.weekRange || "N/A"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className={styles.noData}>
                No commission data available for {currentPeriod.toLowerCase()}
              </div>
            )}
          </div>
        )}

        {currentView === "Total Revenue" && (
          <div className={styles.dataTableWrapper}>
            <div
              style={{
                padding: "var(--spacing-md)",
                borderBottom: "1px solid var(--background-100)",
                background: "var(--background-50)",
              }}
            >
              <h3 style={{ margin: 0, marginBottom: "var(--spacing-xs)" }}>
                ₱{revenueData.currentTotal.toFixed(2)}
              </h3>
              <p
                style={{
                  margin: 0,
                  color: "var(--text-500)",
                  fontSize: "var(--font-size-sm)",
                }}
              >
                Total Revenue Report - {currentPeriod}
              </p>
            </div>

            {revenueData.items.length > 0 ? (
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Client Name</th>
                    <th>Revenue</th>
                    <th>
                      {currentPeriod === "Daily"
                        ? "Time"
                        : currentPeriod === "Weekly"
                        ? "Day"
                        : "Week Range"}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {revenueData.items.map((item, index) => (
                    <tr key={index}>
                      <td>{item.date || "N/A"}</td>
                      <td>{item.clientName}</td>
                      <td>₱{item.revenue}</td>
                      <td>
                        {currentPeriod === "Daily"
                          ? item.time
                          : currentPeriod === "Weekly"
                          ? item.day
                          : item.weekRange || "N/A"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className={styles.noData}>
                No revenue data available for {currentPeriod.toLowerCase()}
              </div>
            )}
          </div>
        )}

        {currentView === "Customer List" && (
          <div className={styles.dataTableWrapper}>
            <div
              style={{
                padding: "var(--spacing-md)",
                borderBottom: "1px solid var(--background-100)",
                background: "var(--background-50)",
              }}
            >
              <h3 style={{ margin: 0, marginBottom: "var(--spacing-xs)" }}>
                Customer List - {currentPeriod}
              </h3>
              <p
                style={{
                  margin: 0,
                  color: "var(--text-500)",
                  fontSize: "var(--font-size-sm)",
                }}
              >
                Total Customers: {customerListData.items.length}
              </p>
            </div>

            {customerListData.items.length > 0 ? (
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
                  {customerListData.items.map((item, index) => (
                    <tr key={index}>
                      <td>{item.clientName}</td>
                      <td>{item.address}</td>
                      <td>{item.contactNumber}</td>
                      <td>{item.appointmentCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className={styles.noData}>
                No customer data available for {currentPeriod.toLowerCase()}
              </div>
            )}
          </div>
        )}

        {currentView === "Services" && (
          <div className={styles.dataTableWrapper}>
            <div
              style={{
                padding: "var(--spacing-md)",
                borderBottom: "1px solid var(--background-100)",
                background: "var(--background-50)",
              }}
            >
              <h3 style={{ margin: 0, marginBottom: "var(--spacing-xs)" }}>
                Services Report - {currentPeriod}
              </h3>
              <p
                style={{
                  margin: 0,
                  color: "var(--text-500)",
                  fontSize: "var(--font-size-sm)",
                }}
              >
                Total Services: {servicesData.items.length}
              </p>
            </div>

            {servicesData.items.length > 0 ? (
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    <th>Services</th>
                    <th>Number of Appointments</th>
                  </tr>
                </thead>
                <tbody>
                  {servicesData.items.map((item, index) => (
                    <tr key={index}>
                      <td>{item.serviceName}</td>
                      <td>{item.appointmentCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className={styles.noData}>
                No services data available for {currentPeriod.toLowerCase()}
              </div>
            )}
          </div>
        )}
      </div>

      <div className={styles.exportContainer}>
        <div className={styles.exportDropdown}>
          <button
            className={styles.exportButton}
            onClick={() => setShowExportDropdown(!showExportDropdown)}
          >
            Export ▼
          </button>
          {showExportDropdown && (
            <div className={styles.dropdownMenu}>
              <button
                className={styles.dropdownItem}
                onClick={() => {
                  exportToCSV();
                  setShowExportDropdown(false);
                }}
              >
                📄 Export to CSV
              </button>
              <button
                className={styles.dropdownItem}
                onClick={() => {
                  exportToExcel();
                  setShowExportDropdown(false);
                }}
              >
                📊 Export to Excel
              </button>
              <button
                className={styles.dropdownItem}
                onClick={() => {
                  exportToPDF();
                  setShowExportDropdown(false);
                }}
              >
                📋 Export to PDF
              </button>
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
};

export default SalesReportsPage;
