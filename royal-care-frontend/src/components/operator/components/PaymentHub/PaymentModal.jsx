import React, { useState } from "react";
import "./PaymentModal.module.css";

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
    <div className="payment-modal-overlay" onClick={onClose}>
      <div className="payment-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Process Payment</h3>
          <button className="close-btn" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="payment-form">
          {/* Appointment summary */}
          <div className="appointment-summary">
            <h4>Appointment #{appointment.id}</h4>
            <div className="client-info">
              <p>
                <strong>Client:</strong>{" "}
                {appointment.client_details?.first_name}{" "}
                {appointment.client_details?.last_name}
              </p>
              <p>
                <strong>Phone:</strong> {appointment.client_details?.phone}
              </p>
            </div>
            <div className="services-info">
              <p>
                <strong>Services:</strong>
              </p>
              <ul>
                {appointment.services_details?.map((service, index) => (
                  <li key={index}>
                    {service.name} - {formatCurrency(service.price)}
                  </li>
                ))}
              </ul>
              <p className="total-amount">
                <strong>Total: {formatCurrency(totalAmount)}</strong>
              </p>
            </div>
          </div>

          {/* Payment details form */}
          <div className="payment-details">
            <div className="form-group">
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

            <div className="form-group">
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
                className={errors.amount ? "error" : ""}
              />
              {errors.amount && (
                <span className="error-message">{errors.amount}</span>
              )}
            </div>

            <div className="form-group">
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
                className={errors.referenceNumber ? "error" : ""}
              />
              {errors.referenceNumber && (
                <span className="error-message">{errors.referenceNumber}</span>
              )}
            </div>

            <div className="form-group">
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
          <div className="modal-actions">
            <button
              type="button"
              className="btn secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button type="submit" className="btn primary" disabled={loading}>
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
