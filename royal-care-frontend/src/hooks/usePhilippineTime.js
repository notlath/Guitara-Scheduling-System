import { useEffect, useState } from "react";

/**
 * Helper function to get greeting based on Philippine time
 * @returns {string} The appropriate greeting
 */
export const getGreeting = () => {
  const now = new Date().toLocaleString("en-PH", {
    timeZone: "Asia/Manila",
    hour: "2-digit",
    hour12: false,
  });
  const hour = parseInt(now.split(":")[0], 10);
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
};

/**
 * Helper function to format Philippine time
 * @returns {string} Formatted time string
 */
export const getPhilippineTime = () => {
  return new Date().toLocaleString("en-PH", {
    timeZone: "Asia/Manila",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
};

/**
 * Custom hook for Philippine time and greeting
 * Provides real-time updating time and appropriate greeting
 * @returns {Object} { systemTime, greeting }
 */
export const usePhilippineTime = () => {
  const [systemTime, setSystemTime] = useState(() => getPhilippineTime());

  useEffect(() => {
    const interval = setInterval(() => {
      setSystemTime(getPhilippineTime());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return {
    systemTime,
    greeting: getGreeting(),
  };
};
