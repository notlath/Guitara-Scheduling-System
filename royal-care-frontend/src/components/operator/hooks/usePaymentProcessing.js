/**
 * Payment processing hooks for Operator Dashboard
 * Handles payment verification, receipt upload, and payment-related actions
 */
import { useCallback, useState } from "react";
import { useDispatch } from "react-redux";
import { optimizedDataManager } from "../../../services/optimizedDataManager";

export const usePaymentProcessing = () => {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState({});
  const [uploadProgress, setUploadProgress] = useState({});

  // Process payment verification
  const processPayment = useCallback(
    async (appointmentId, paymentData) => {
      const loadingKey = `payment_${appointmentId}`;
      setLoading((prev) => ({ ...prev, [loadingKey]: true }));

      try {
        const result = await optimizedDataManager.verifyPayment(
          appointmentId,
          paymentData
        );

        // Update appointment status optimistically
        dispatch({
          type: "scheduling/updateAppointmentStatus",
          payload: {
            appointmentId,
            status: "payment_completed",
            updatedAt: new Date().toISOString(),
          },
        });

        return { success: true, data: result };
      } catch (error) {
        console.error("Payment processing failed:", error);
        return { success: false, error: error.message };
      } finally {
        setLoading((prev) => ({ ...prev, [loadingKey]: false }));
      }
    },
    [dispatch]
  );

  // Upload receipt
  const uploadReceipt = useCallback(async (appointmentId, file) => {
    const uploadKey = `receipt_${appointmentId}`;
    setLoading((prev) => ({ ...prev, [uploadKey]: true }));
    setUploadProgress((prev) => ({ ...prev, [uploadKey]: 0 }));

    try {
      const result = await optimizedDataManager.uploadReceipt(
        appointmentId,
        file,
        {
          onProgress: (progress) => {
            setUploadProgress((prev) => ({ ...prev, [uploadKey]: progress }));
          },
        }
      );

      return { success: true, data: result };
    } catch (error) {
      console.error("Receipt upload failed:", error);
      return { success: false, error: error.message };
    } finally {
      setLoading((prev) => ({ ...prev, [uploadKey]: false }));
      setUploadProgress((prev) => ({ ...prev, [uploadKey]: 0 }));
    }
  }, []);

  // Bulk payment processing
  const processBulkPayments = useCallback(
    async (appointmentIds, paymentData) => {
      setLoading((prev) => ({ ...prev, bulk_payment: true }));

      try {
        const results = await Promise.allSettled(
          appointmentIds.map((id) => processPayment(id, paymentData))
        );

        const successful = results.filter(
          (r) => r.status === "fulfilled" && r.value.success
        );
        const failed = results.filter(
          (r) => r.status === "rejected" || !r.value.success
        );

        return {
          success: true,
          data: {
            processed: successful.length,
            failed: failed.length,
            total: appointmentIds.length,
          },
        };
      } catch (error) {
        console.error("Bulk payment processing failed:", error);
        return { success: false, error: error.message };
      } finally {
        setLoading((prev) => ({ ...prev, bulk_payment: false }));
      }
    },
    [processPayment]
  );

  // Request payment from client
  const requestPayment = useCallback(
    async (appointmentId, paymentMethod = "gcash") => {
      const loadingKey = `request_${appointmentId}`;
      setLoading((prev) => ({ ...prev, [loadingKey]: true }));

      try {
        const result = await optimizedDataManager.requestPayment(
          appointmentId,
          paymentMethod
        );

        // Update appointment status
        dispatch({
          type: "scheduling/updateAppointmentStatus",
          payload: {
            appointmentId,
            status: "payment_requested",
            updatedAt: new Date().toISOString(),
          },
        });

        return { success: true, data: result };
      } catch (error) {
        console.error("Payment request failed:", error);
        return { success: false, error: error.message };
      } finally {
        setLoading((prev) => ({ ...prev, [loadingKey]: false }));
      }
    },
    [dispatch]
  );

  return {
    // Actions
    processPayment,
    uploadReceipt,
    processBulkPayments,
    requestPayment,

    // States
    loading,
    uploadProgress,

    // Utilities
    isLoading: (key) => loading[key] || false,
    getUploadProgress: (key) => uploadProgress[key] || 0,
  };
};

export default usePaymentProcessing;
