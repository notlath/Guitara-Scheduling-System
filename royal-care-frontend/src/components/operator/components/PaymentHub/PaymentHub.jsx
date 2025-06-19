import { useCallback, useMemo, useState } from "react";
import { useOperatorData } from "../../hooks/useOperatorData";
import { usePaymentProcessing } from "../../hooks/usePaymentProcessing";
import "./PaymentHub.module.css";
import PaymentModal from "./PaymentModal";
import ReceiptUploader from "./ReceiptUploader";

/**
 * PaymentHub Component
 * Manages payment verification and processing
 */
const PaymentHub = ({ className = "" }) => {
  const { filteredAppointments } = useOperatorData();
  const {
    processPayment,
    uploadReceipt,
    processBulkPayments,
    requestPayment,
    loading,
    uploadProgress,
  } = usePaymentProcessing();

  // Local state
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [receiptUploaderOpen, setReceiptUploaderOpen] = useState(false);
  const [selectedPayments, setSelectedPayments] = useState(new Set());

  // Get payment-related appointments with memoization
  const awaitingPaymentAppointments = useMemo(
    () => filteredAppointments?.awaitingPayment || [],
    [filteredAppointments?.awaitingPayment]
  );

  const paymentRequestedAppointments = useMemo(
    () => filteredAppointments?.paymentRequested || [],
    [filteredAppointments?.paymentRequested]
  );

  // Handle payment verification
  const handleVerifyPayment = useCallback((appointment) => {
    setSelectedAppointment(appointment);
    setPaymentModalOpen(true);
  }, []);

  // Handle receipt upload
  const handleUploadReceipt = useCallback((appointment) => {
    setSelectedAppointment(appointment);
    setReceiptUploaderOpen(true);
  }, []);

  // Handle bulk payment processing
  const handleBulkProcess = useCallback(async () => {
    if (selectedPayments.size === 0) return;

    const appointmentIds = Array.from(selectedPayments);
    try {
      await processBulkPayments(appointmentIds, {
        method: "gcash",
        status: "completed",
      });
      setSelectedPayments(new Set());
    } catch (error) {
      console.error("Bulk payment processing failed:", error);
    }
  }, [selectedPayments, processBulkPayments]);

  // Handle payment selection
  const handlePaymentSelect = useCallback((appointmentId, selected) => {
    setSelectedPayments((prev) => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(appointmentId);
      } else {
        newSet.delete(appointmentId);
      }
      return newSet;
    });
  }, []);

  // Select all payments
  const handleSelectAll = useCallback(
    (selectAll) => {
      if (selectAll) {
        const allIds = awaitingPaymentAppointments.map((apt) => apt.id);
        setSelectedPayments(new Set(allIds));
      } else {
        setSelectedPayments(new Set());
      }
    },
    [awaitingPaymentAppointments]
  );

  // Calculate total amount for selected payments
  const selectedTotal = Array.from(selectedPayments).reduce(
    (total, appointmentId) => {
      const appointment = awaitingPaymentAppointments.find(
        (apt) => apt.id === appointmentId
      );
      if (appointment?.services_details) {
        return (
          total +
          appointment.services_details.reduce((sum, service) => {
            return sum + (Number(service.price) || 0);
          }, 0)
        );
      }
      return total;
    },
    0
  );

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString();
  };

  const formatTime = (timeString) => {
    if (!timeString) return "N/A";
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className={`payment-hub ${className}`}>
      {/* Header with stats and bulk actions */}
      <div className="payment-hub-header">
        <div className="payment-stats">
          <div className="stat-card">
            <span className="stat-value">
              {awaitingPaymentAppointments.length}
            </span>
            <span className="stat-label">Awaiting Payment</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">
              {paymentRequestedAppointments.length}
            </span>
            <span className="stat-label">Payment Requested</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{selectedPayments.size}</span>
            <span className="stat-label">Selected</span>
          </div>
          {selectedPayments.size > 0 && (
            <div className="stat-card total">
              <span className="stat-value">
                {formatCurrency(selectedTotal)}
              </span>
              <span className="stat-label">Total Selected</span>
            </div>
          )}
        </div>

        {selectedPayments.size > 0 && (
          <div className="bulk-actions">
            <button
              className="bulk-action-btn primary"
              onClick={handleBulkProcess}
              disabled={loading.bulk_payment}
            >
              {loading.bulk_payment ? (
                <i className="fas fa-spinner fa-spin"></i>
              ) : (
                <i className="fas fa-check-double"></i>
              )}
              Process Selected ({selectedPayments.size})
            </button>
            <button
              className="bulk-action-btn secondary"
              onClick={() => setSelectedPayments(new Set())}
            >
              <i className="fas fa-times"></i>
              Clear Selection
            </button>
          </div>
        )}
      </div>

      {/* Payment queue */}
      <div className="payment-queue">
        {awaitingPaymentAppointments.length === 0 ? (
          <div className="empty-state">
            <i className="fas fa-credit-card"></i>
            <h3>All Caught Up!</h3>
            <p>No payments awaiting verification</p>
          </div>
        ) : (
          <>
            {/* Selection header */}
            <div className="selection-header">
              <label className="select-all-control">
                <input
                  type="checkbox"
                  checked={
                    selectedPayments.size ===
                      awaitingPaymentAppointments.length &&
                    awaitingPaymentAppointments.length > 0
                  }
                  onChange={(e) => handleSelectAll(e.target.checked)}
                />
                <span className="checkmark"></span>
                <span>Select All ({awaitingPaymentAppointments.length})</span>
              </label>
            </div>

            {/* Payment list */}
            <div className="payment-appointments-list">
              {awaitingPaymentAppointments.map((appointment) => {
                const totalAmount =
                  appointment.services_details?.reduce((total, service) => {
                    return total + (Number(service.price) || 0);
                  }, 0) || 0;

                const isSelected = selectedPayments.has(appointment.id);

                return (
                  <div
                    key={appointment.id}
                    className={`payment-appointment-card ${
                      isSelected ? "selected" : ""
                    }`}
                  >
                    <div className="appointment-selection">
                      <label className="checkbox-control">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) =>
                            handlePaymentSelect(
                              appointment.id,
                              e.target.checked
                            )
                          }
                        />
                        <span className="checkmark"></span>
                      </label>
                    </div>

                    <div className="appointment-info">
                      <div className="appointment-header">
                        <h4>Appointment #{appointment.id}</h4>
                        <div className="amount-badge">
                          {formatCurrency(totalAmount)}
                        </div>
                      </div>

                      <div className="client-info">
                        <h5>
                          {appointment.client_details?.first_name}{" "}
                          {appointment.client_details?.last_name}
                        </h5>
                        <p>{appointment.client_details?.phone}</p>
                      </div>

                      <div className="appointment-details">
                        <div className="detail-row">
                          <span className="label">Date:</span>
                          <span className="value">
                            {formatDate(appointment.date)}
                          </span>
                        </div>
                        <div className="detail-row">
                          <span className="label">Time:</span>
                          <span className="value">
                            {formatTime(appointment.start_time)}
                          </span>
                        </div>
                        <div className="detail-row">
                          <span className="label">Services:</span>
                          <span className="value">
                            {appointment.services_details
                              ?.map((s) => s.name)
                              .join(", ") || "N/A"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="payment-actions">
                      <button
                        className="action-btn primary"
                        onClick={() => handleVerifyPayment(appointment)}
                        disabled={loading[`payment_${appointment.id}`]}
                      >
                        {loading[`payment_${appointment.id}`] ? (
                          <i className="fas fa-spinner fa-spin"></i>
                        ) : (
                          <i className="fas fa-check"></i>
                        )}
                        Verify Payment
                      </button>

                      <button
                        className="action-btn secondary"
                        onClick={() => handleUploadReceipt(appointment)}
                        disabled={loading[`receipt_${appointment.id}`]}
                      >
                        {loading[`receipt_${appointment.id}`] ? (
                          <div className="upload-progress">
                            <i className="fas fa-spinner fa-spin"></i>
                            <span>
                              {uploadProgress[`receipt_${appointment.id}`] || 0}
                              %
                            </span>
                          </div>
                        ) : (
                          <>
                            <i className="fas fa-upload"></i>
                            Upload Receipt
                          </>
                        )}
                      </button>

                      <button
                        className="action-btn warning"
                        onClick={() => requestPayment(appointment.id)}
                        disabled={loading[`request_${appointment.id}`]}
                      >
                        {loading[`request_${appointment.id}`] ? (
                          <i className="fas fa-spinner fa-spin"></i>
                        ) : (
                          <i className="fas fa-paper-plane"></i>
                        )}
                        Request Payment
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Payment Modal */}
      {paymentModalOpen && selectedAppointment && (
        <PaymentModal
          appointment={selectedAppointment}
          onClose={() => {
            setPaymentModalOpen(false);
            setSelectedAppointment(null);
          }}
          onProcess={processPayment}
          loading={loading[`payment_${selectedAppointment.id}`]}
        />
      )}

      {/* Receipt Uploader */}
      {receiptUploaderOpen && selectedAppointment && (
        <ReceiptUploader
          appointment={selectedAppointment}
          onClose={() => {
            setReceiptUploaderOpen(false);
            setSelectedAppointment(null);
          }}
          onUpload={uploadReceipt}
          loading={loading[`receipt_${selectedAppointment.id}`]}
          progress={uploadProgress[`receipt_${selectedAppointment.id}`]}
        />
      )}
    </div>
  );
};

export default PaymentHub;
