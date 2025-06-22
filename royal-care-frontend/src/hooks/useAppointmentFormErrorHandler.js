/**
 * Error handling hooks for AppointmentForm with TanStack Query
 */

import { useQueryClient } from "@tanstack/react-query";
import React from "react";
import { queryKeys } from "../lib/queryClient";

// Hook version for functional components
export const useAppointmentFormErrorHandler = () => {
  const queryClient = useQueryClient();

  const clearFormCache = React.useCallback(() => {
    // Clear all appointment-related queries
    queryClient.removeQueries({ queryKey: queryKeys.appointments.all });
    queryClient.removeQueries({ queryKey: queryKeys.clients.all });
    queryClient.removeQueries({ queryKey: queryKeys.services.all });
    queryClient.removeQueries({ queryKey: queryKeys.availability.all });

    console.log("🧹 Cleared appointment form cache");
  }, [queryClient]);

  const handleQueryError = React.useCallback((error) => {
    console.error("TanStack Query Error in AppointmentForm:", error);

    // Optionally show user-friendly error notification
    if (error.message?.includes("Network Error")) {
      // Handle network errors gracefully
      return "Network connection issue. Please check your internet connection.";
    }

    if (error.message?.includes("401")) {
      // Handle authentication errors
      return "Your session has expired. Please log in again.";
    }

    if (error.message?.includes("403")) {
      // Handle permission errors
      return "You do not have permission to perform this action.";
    }

    return "An unexpected error occurred. Please try again.";
  }, []);

  return {
    clearFormCache,
    handleQueryError,
  };
};
