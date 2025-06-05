import React, { useState } from 'react';
import '../styles/RejectionModal.css';

const RejectionModal = ({ isOpen, onClose, onSubmit, appointmentId, loading }) => {
  const [rejectionReason, setRejectionReason] = useState('');
  const [customReason, setCustomReason] = useState('');

  const predefinedReasons = [
    'Schedule conflict',
    'Emergency situation',
    'Personal reasons',
    'Health issues',
    'Travel conflict',
    'Equipment not available',
    'Client requirements cannot be met',
    'Other'
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const finalReason = rejectionReason === 'Other' ? customReason : rejectionReason;
    
    console.log('🔍 RejectionModal handleSubmit - DETAILED DEBUG:', {
      rejectionReason,
      customReason,
      finalReason,
      appointmentId,
      finalReasonTrimmed: String(finalReason || '').trim(),
      finalReasonLength: String(finalReason || '').trim().length,
      selectedReasonType: rejectionReason,
      isOtherSelected: rejectionReason === 'Other',
      customReasonLength: customReason?.length || 0
    });
    
    // Enhanced validation
    const cleanFinalReason = String(finalReason || '').trim();
    if (!cleanFinalReason) {
      console.error('❌ RejectionModal: Empty reason detected');
      alert('Please provide a reason for rejection.');
      return;
    }
    
    // Additional validation for "Other" option
    if (rejectionReason === 'Other' && !customReason.trim()) {
      console.error('❌ RejectionModal: Other selected but no custom reason provided');
      alert('Please specify the reason for rejection.');
      return;
    }

    console.log('✅ RejectionModal: Calling onSubmit with:', {
      appointmentId,
      cleanFinalReason,
      reasonLength: cleanFinalReason.length
    });

    onSubmit(appointmentId, cleanFinalReason);
  };

  const handleClose = () => {
    setRejectionReason('');
    setCustomReason('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="rejection-modal-overlay" onClick={handleClose}>
      <div className="rejection-modal" onClick={(e) => e.stopPropagation()}>
        <div className="rejection-modal-header">
          <h3>Reject Appointment</h3>
          <button className="close-button" onClick={handleClose}>×</button>
        </div>
        
        <form onSubmit={handleSubmit} className="rejection-form">
          <div className="form-group">
            <label>Reason for rejection (required):</label>
            <div className="reason-options">
              {predefinedReasons.map((reason) => (
                <label key={reason} className="radio-option">
                  <input
                    type="radio"
                    name="rejectionReason"
                    value={reason}
                    checked={rejectionReason === reason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                  />
                  {reason}
                </label>
              ))}
            </div>
          </div>

          {rejectionReason === 'Other' && (
            <div className="form-group">
              <label htmlFor="customReason">Please specify:</label>
              <textarea
                id="customReason"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Please provide a detailed reason for rejection..."
                required
                rows={3}
              />
            </div>
          )}

          <div className="rejection-modal-actions">
            <button 
              type="button" 
              className="cancel-button" 
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="submit-rejection-button"
              disabled={
                loading || 
                !rejectionReason || 
                (rejectionReason === 'Other' && !customReason.trim())
              }
            >
              {loading ? 'Submitting...' : 'Submit Rejection'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RejectionModal;
