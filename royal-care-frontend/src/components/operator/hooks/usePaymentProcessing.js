/**
 * Payment processing hooks for Operator Dashboard
 * Handles payment verification, receipt upload, and payment-related actions
 */
import { useCallback, useState } from "react";
import { useDispatch } from "react-redux";
import optimizedDataManager from "../../../services/optimizedDataManager";

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
            status: "paid",
            paymentVerified: true,
            paymentData,
          },
        });

        return {
          success: true,
          data: result,
        };
      } catch (error) {
        console.error("Payment processing failed:", error);
        return {
          success: false,
          error: error.message,
        };
      } finally {
        setLoading((prev) => ({ ...prev, [loadingKey]: false }));
      }
    },
    [dispatch]
  );

  // Upload receipt
  const uploadReceipt = useCallback(
    async (appointmentId, file) => {
      const uploadKey = `receipt_${appointmentId}`;
      setLoading((prev) => ({ ...prev, [uploadKey]: true }));
      setUploadProgress((prev) => ({ ...prev, [uploadKey]: 0 }));

      try {
        const result = await optimizedDataManager.uploadReceipt(
          appointmentId,
          file,
          (progress) => {
            setUploadProgress((prev) => ({
              ...prev,
              [uploadKey]: progress,
            }));
          }
        );

        // Update appointment with receipt info
        dispatch({
          type: "scheduling/updateAppointment",
          payload: {
            appointmentId,
            updates: {
              receipt_url: result.url,
              receipt_uploaded: true,
              receipt_uploaded_at: new Date().toISOString(),
            },
          },
        });

        return {
          success: true,
          data: result,
        };
      } catch (error) {
        console.error("Receipt upload failed:", error);
        return {
          success: false,
          error: error.message,
        };
      } finally {
        setLoading((prev) => ({ ...prev, [uploadKey]: false }));
        setUploadProgress((prev) => ({ ...prev, [uploadKey]: 0 }));
      }
    },
    [dispatch]
  );

  // Mark payment as received
  const markPaymentReceived = useCallback(
    async (appointmentId, paymentDetails) => {
      const loadingKey = `mark_paid_${appointmentId}`;
      setLoading((prev) => ({ ...prev, [loadingKey]: true }));

      try {
        const result = await optimizedDataManager.markPaymentReceived(
          appointmentId,
          paymentDetails
        );

        // Update appointment status
        dispatch({
          type: "scheduling/updateAppointmentStatus",
          payload: {
            appointmentId,
            status: "paid",
            paymentReceived: true,
            paymentReceivedAt: new Date().toISOString(),
            paymentDetails,
          },
        });

        return {
          success: true,
          data: result,
        };
      } catch (error) {
        console.error("Mark payment received failed:", error);
        return {
          success: false,
          error: error.message,
        };
      } finally {
        setLoading((prev) => ({ ...prev, [loadingKey]: false }));
      }
    },
    [dispatch]
  );

  // Request payment reminder
  const sendPaymentReminder = useCallback(
    async (appointmentId, reminderType = "sms") => {
      const loadingKey = `reminder_${appointmentId}`;
      setLoading((prev) => ({ ...prev, [loadingKey]: true }));

      try {
        const result = await optimizedDataManager.sendPaymentReminder(
          appointmentId,
          reminderType
        );

        // Update appointment with reminder sent info
        dispatch({
          type: "scheduling/updateAppointment",
          payload: {
            appointmentId,
            updates: {
              last_payment_reminder: new Date().toISOString(),
              payment_reminder_count: (result.reminderCount || 0) + 1,
            },
          },
        });

        return {
          success: true,
          data: result,
        };
      } catch (error) {
        console.error("Payment reminder failed:", error);
        return {
          success: false,
          error: error.message,
        };
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
    markPaymentReceived,
    sendPaymentReminder,

    // State
    loading,
    uploadProgress,
  };
};

export default usePaymentProcessing;
