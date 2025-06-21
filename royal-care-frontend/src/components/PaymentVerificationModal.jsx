import { useEffect, useState } from "react";

/**
 * Simple Payment Verification Modal
 * Clean implementation without over-engineering
 */
const PaymentVerificationModal = ({
  isOpen,
  appointment,
  onSubmit,
  onCancel,
  loading = false,
}) => {
  const [paymentData, setPaymentData] = useState({
    method: "cash",
    amount: "",
    notes: "",
  });

  // Calculate total amount when appointment changes
  useEffect(() => {
    if (appointment?.services_details) {
      const totalAmount = appointment.services_details.reduce(
        (total, service) => {
          return total + (Number(service.price) || 0);
        },
        0
      );

      setPaymentData((prev) => ({
        ...prev,
        amount: totalAmount.toFixed(2),
      }));
    }
  }, [appointment]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!paymentData.amount || parseFloat(paymentData.amount) <= 0) {
      alert("Please enter a valid payment amount");
      return;
    }

    await onSubmit(paymentData);
  };

  const handleCancel = () => {
    setPaymentData({
      method: "cash",
      amount: "",
      notes: "",
    });
    onCancel();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Payment Verification</h3>
          <button onClick={handleCancel} className="close-btn">
            &times;
          </button>
        </div>

        {appointment && (
          <div className="appointment-summary">
            <h4>Appointment #{appointment.id}</h4>
            <p>
              <strong>Client:</strong> {appointment.client_details?.first_name}{" "}
              {appointment.client_details?.last_name}
            </p>
            <p>
              <strong>Date:</strong>{" "}
              {new Date(appointment.date).toLocaleDateString()}
            </p>
            <p>
              <strong>Services:</strong>
            </p>
            <ul>
              {appointment.services_details?.map((service) => (
                <li key={service.id}>
                  {service.name} - ₱{Number(service.price).toFixed(2)}
                </li>
              ))}
            </ul>
          </div>
        )}

        <form onSubmit={handleSubmit} className="payment-form">
          <div className="form-group">
            <label htmlFor="payment-method">Payment Method:</label>
            <select
              id="payment-method"
              value={paymentData.method}
              onChange={(e) =>
                setPaymentData((prev) => ({ ...prev, method: e.target.value }))
              }
              required
            >
              <option value="cash">Cash</option>
              <option value="gcash">GCash</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="credit_card">Credit Card</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="payment-amount">Amount Received:</label>
            <input
              id="payment-amount"
              type="number"
              step="0.01"
              min="0"
              value={paymentData.amount}
              onChange={(e) =>
                setPaymentData((prev) => ({ ...prev, amount: e.target.value }))
              }
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="payment-notes">Notes (Optional):</label>
            <textarea
              id="payment-notes"
              value={paymentData.notes}
              onChange={(e) =>
                setPaymentData((prev) => ({ ...prev, notes: e.target.value }))
              }
              placeholder="Additional payment notes..."
              rows="3"
            />
          </div>

          <div className="modal-actions">
            <button type="button" onClick={handleCancel} className="cancel-btn">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="submit-btn">
              {loading ? "Processing..." : "Confirm Payment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PaymentVerificationModal;
