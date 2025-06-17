/**
 * Route-based data prefetching component
 * Automatically prefetches data when user navigates to different routes
 */

import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useRoutePrefetch } from "../hooks/useImmediateData";

/**
 * Component that handles route-based data prefetching
 * Place this component in your main App component to enable automatic prefetching
 */
const RoutePrefetcher = () => {
  const location = useLocation();
  const { prefetchData } = useRoutePrefetch();

  useEffect(() => {
    // Define data types needed for each route
    const routeDataMap = {
      "/dashboard/therapist": [
        "appointments",
        "todayAppointments",
        "upcomingAppointments",
      ],
      "/dashboard/driver": [
        "appointments",
        "todayAppointments",
        "upcomingAppointments",
      ],
      "/dashboard/operator": [
        "appointments",
        "todayAppointments",
        "upcomingAppointments",
        "notifications",
      ],
      "/scheduling": [
        "appointments",
        "todayAppointments",
        "upcomingAppointments",
      ],
      "/scheduling/calendar": ["appointments"],
      "/scheduling/week": ["appointments"],
      "/scheduling/today": ["todayAppointments"],
      "/scheduling/list": ["upcomingAppointments"],
      "/bookings": ["appointments", "todayAppointments"],
      "/attendance": ["attendanceRecords"],
      "/inventory": ["inventoryItems"],
      "/sales-reports": ["appointments"], // For calculations
      "/settings": ["appointments"], // Sometimes needed for settings context
    };

    // Get data types for current route
    const dataTypes = routeDataMap[location.pathname];

    if (dataTypes) {
      console.log(
        `🚀 RoutePrefetcher: Prefetching data for ${location.pathname}`
      );
      prefetchData(location.pathname, dataTypes);
    }

    // Also prefetch for partial route matches
    const partialMatches = Object.keys(routeDataMap).filter(
      (route) =>
        location.pathname.startsWith(route) && route !== location.pathname
    );

    partialMatches.forEach((route) => {
      const partialDataTypes = routeDataMap[route];
      if (partialDataTypes) {
        console.log(
          `🚀 RoutePrefetcher: Prefetching partial match data for ${route}`
        );
        prefetchData(route, partialDataTypes);
      }
    });
  }, [location.pathname, prefetchData]);

  // This component doesn't render anything
  return null;
};

export default RoutePrefetcher;
