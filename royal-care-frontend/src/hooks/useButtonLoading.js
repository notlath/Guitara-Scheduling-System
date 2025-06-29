import { useCallback, useState } from "react";

/**
 * Shared button loading state management for dashboard actions
 * Eliminates duplication of loading state logic across dashboards
 */
export const useButtonLoading = () => {
  const [buttonLoading, setButtonLoading] = useState({});

  const setActionLoading = useCallback((actionKey, isLoading) => {
    setButtonLoading((prev) => ({
      ...prev,
      [actionKey]: isLoading,
    }));
  }, []);

  const clearActionLoading = useCallback((actionKey) => {
    setButtonLoading((prev) => {
      const newState = { ...prev };
      delete newState[actionKey];
      return newState;
    });
  }, []);

  const isActionLoading = useCallback((actionKey) => {
    return Boolean(buttonLoading[actionKey]);
  }, [buttonLoading]);

  const clearAllLoading = useCallback(() => {
    setButtonLoading({});
  }, []);

  return {
    buttonLoading,
    setActionLoading,
    clearActionLoading,
    isActionLoading,
    clearAllLoading,
  };
};
