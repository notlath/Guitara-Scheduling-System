import { useState } from "react";

/**
 * Modal state management hook
 * Consolidates shared modal logic across dashboard components
 *
 * @param {Object} initialState - Initial state for the modal
 * @returns {Object} Modal state and handlers
 */
export const useModalState = (initialState = {}) => {
  const [modalState, setModalState] = useState({
    isOpen: false,
    ...initialState,
  });

  const openModal = (data = {}) => {
    setModalState({
      isOpen: true,
      ...initialState, // Reset to initial state first
      ...data, // Then apply new data
    });
  };

  const closeModal = () => {
    setModalState({
      isOpen: false,
      ...initialState, // Reset to initial state when closing
    });
  };

  const updateModal = (updates) => {
    setModalState((prev) => ({
      ...prev,
      ...updates,
    }));
  };

  return {
    modalState,
    openModal,
    closeModal,
    updateModal,
    isOpen: modalState.isOpen,
  };
};

/**
 * Rejection modal specific hook
 * Pre-configured for rejection modal usage
 */
export const useRejectionModal = () => {
  return useModalState({
    appointmentId: null,
  });
};

/**
 * Material modal specific hook
 * Pre-configured for post-service material modal usage
 */
export const useMaterialModal = () => {
  return useModalState({
    appointmentId: null,
    materials: [],
    isSubmitting: false,
  });
};

export default useModalState;
