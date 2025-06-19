import React, { useState } from "react";
import styles from "./PaymentModal.module.css";

/**
 * PaymentModal Component
 * Modal for processing payment verification
 */
const PaymentModal = ({ appointment, onClose, onProcess, loading = false }) => {
  const [paymentData, setPaymentData] = useState({
    method: "gcash",
    amount: "",
    referenceNumber: "",
    notes: "",
  });

  const [errors, setErrors] = useState({});

  // Calculate total amount from services
  const totalAmount =
    appointment.services_details?.reduce((total, service) => {
      return total + (Number(service.price) || 0);
    }, 0) || 0;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(amount);
  };

  const validateForm = () => {
    const newErrors = {};

    if (!paymentData.amount) {
      newErrors.amount = "Amount is required";
    } else if (Number(paymentData.amount) !== totalAmount) {
      newErrors.amount = `Amount must match service total: ${formatCurrency(
        totalAmount
      )}`;
    }

    if (!paymentData.referenceNumber.trim()) {
      newErrors.referenceNumber = "Reference number is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      const result = await onProcess(appointment.id, {
        ...paymentData,
        amount: Number(paymentData.amount),
        verifiedAt: new Date().toISOString(),
      });

      if (result.success) {
        onClose();
      }
    } catch (error) {
      console.error("Payment processing failed:", error);
    }
  };

  const handleInputChange = (field, value) => {
    setPaymentData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: "",
      }));
    }
  };

  // Set amount to service total by default
  React.useEffect(() => {
    if (totalAmount && !paymentData.amount) {
      setPaymentData((prev) => ({
        ...prev,
        amount: totalAmount.toString(),
      }));
    }
  }, [totalAmount, paymentData.amount]);

  return (
    <div className={styles.paymentModalOverlay} onClick={onClose}>
      <div className={styles.paymentModal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>Process Payment</h3>
          <button className={styles.closeBtn} onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.paymentForm}>
          {/* Appointment summary */}
          <div className={styles.appointmentSummary}>
            <h4>Appointment #{appointment.id}</h4>
            <div className={styles.clientInfo}>
              <p>
                <strong>Client:</strong>{" "}
                {appointment.client_details?.first_name}{" "}
                {appointment.client_details?.last_name}
              </p>
              <p>
                <strong>Phone:</strong> {appointment.client_details?.phone}
              </p>
            </div>
            <div className={styles.servicesInfo}>
              <p>
                <strong>Services:</strong>
              </p>
              <ul>
                {appointment.services_details?.map((service, index) => (
                  <li key={index}>
                    <span>{service.name}</span>
                    <span>{formatCurrency(service.price)}</span>
                  </li>
                ))}
              </ul>
              <p className={styles.totalAmount}>
                <strong>Total: {formatCurrency(totalAmount)}</strong>
              </p>
            </div>
          </div>

          {/* Payment details form */}
          <div className={styles.paymentDetails}>
            <div className={styles.formGroup}>
              <label htmlFor="payment-method">Payment Method *</label>
              <select
                id="payment-method"
                value={paymentData.method}
                onChange={(e) => handleInputChange("method", e.target.value)}
                required
              >
                <option value="gcash">GCash</option>
                <option value="paymaya">PayMaya</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cash">Cash</option>
                <option value="card">Credit/Debit Card</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="payment-amount">Amount *</label>
              <input
                type="number"
                id="payment-amount"
                value={paymentData.amount}
                onChange={(e) => handleInputChange("amount", e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
                required
                className={errors.amount ? styles.error : ""}
              />
              {errors.amount && (
                <span className={styles.errorMessage}>{errors.amount}</span>
              )}
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="reference-number">Reference Number *</label>
              <input
                type="text"
                id="reference-number"
                value={paymentData.referenceNumber}
                onChange={(e) =>
                  handleInputChange("referenceNumber", e.target.value)
                }
                placeholder="Transaction reference number"
                required
                className={errors.referenceNumber ? styles.error : ""}
              />
              {errors.referenceNumber && (
                <span className={styles.errorMessage}>
                  {errors.referenceNumber}
                </span>
              )}
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="payment-notes">Notes</label>
              <textarea
                id="payment-notes"
                value={paymentData.notes}
                onChange={(e) => handleInputChange("notes", e.target.value)}
                placeholder="Additional notes (optional)"
                rows="3"
              />
            </div>
          </div>

          {/* Form actions */}
          <div className={styles.modalActions}>
            <button
              type="button"
              className={`${styles.btn} ${styles.secondary}`}
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`${styles.btn} ${styles.primary}`}
              disabled={loading}
            >
              {loading ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  Processing...
                </>
              ) : (
                <>
                  <i className="fas fa-check"></i>
                  Verify Payment
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PaymentModal;
