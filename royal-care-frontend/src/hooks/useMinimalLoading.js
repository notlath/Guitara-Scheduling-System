import { useCallback, useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";

/**
 * Custom hook to access loading state from scheduling slice
 * Provides easy access to loading states for minimal loading indicators
 */
export const useMinimalLoading = () => {
  const { loading } = useSelector((state) => state.scheduling);

  return {
    isLoading: loading,
    // You can add more specific loading states here if needed
    // isLoadingAppointments: state.scheduling.loadingAppointments,
    // isLoadingAvailability: state.scheduling.loadingAvailability,
  };
};

/**
 * Custom hook to manage temporary loading states for specific operations
 * Useful for operations that don't use Redux loading state
 */
export const useTemporaryLoading = (duration = 2000) => {
  const [isLoading, setIsLoading] = useState(false);
  const timeoutRef = useRef(null);

  const startLoading = useCallback(() => {
    setIsLoading(true);

    // Auto-clear loading after specified duration
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setIsLoading(false);
    }, duration);
  }, [duration]);

  const stopLoading = useCallback(() => {
    setIsLoading(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    isLoading,
    startLoading,
    stopLoading,
  };
};
