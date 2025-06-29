import React, { useState } from 'react';
import './PostServiceMaterialModal.css';

const PostServiceMaterialModal = ({ 
  isOpen, 
  onClose, 
  materials, 
  onSubmit,
  isSubmitting = false 
}) => {
  const [materialStatus, setMaterialStatus] = useState({});

  const handleMaterialStatusChange = (materialId, isEmpty) => {
    setMaterialStatus(prev => ({
      ...prev,
      [materialId]: isEmpty
    }));
  };

  const handleSubmit = () => {
    onSubmit(materialStatus);
  };

  const handleClose = () => {
    setMaterialStatus({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="post-service-modal-overlay">
      <div className="post-service-modal">
        <div className="post-service-modal-header">
          <h3>Service Completed - Material Check</h3>
          <button 
            className="close-button" 
            onClick={handleClose}
            disabled={isSubmitting}
          >
            ×
          </button>
        </div>
        
        <div className="post-service-modal-content">
          <p className="modal-description">
            Please check the materials used during this service. 
            Are any of these materials now empty?
          </p>

          <div className="materials-check-list">
            {materials.map((material) => (
              <div key={material.id} className="material-check-item">
                <div className="material-info">
                  <div className="material-name">{material.name}</div>
                  <div className="material-details">
                    Used: {material.quantity_used} {material.unit}
                  </div>
                </div>
                <div className="material-status-controls">
                  <label className="status-label">Is this empty?</label>
                  <div className="radio-group">
                    <label className="radio-option">
                      <input
                        type="radio"
                        name={`material-${material.id}`}
                        value="yes"
                        checked={materialStatus[material.id] === true}
                        onChange={() => handleMaterialStatusChange(material.id, true)}
                        disabled={isSubmitting}
                      />
                      <span>Yes</span>
                    </label>
                    <label className="radio-option">
                      <input
                        type="radio"
                        name={`material-${material.id}`}
                        value="no"
                        checked={materialStatus[material.id] === false}
                        onChange={() => handleMaterialStatusChange(material.id, false)}
                        disabled={isSubmitting}
                      />
                      <span>No</span>
                    </label>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="post-service-modal-footer">
          <button 
            className="cancel-button"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button 
            className="submit-button"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Processing...' : 'Complete Service'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PostServiceMaterialModal;
