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

  console.log("🔍 POST SERVICE MODAL - Component rendered with props:", {
    isOpen,
    materials: materials?.length || 0,
    isSubmitting
  });

  const handleMaterialStatusChange = (materialId, isEmpty) => {
    setMaterialStatus(prev => ({
      ...prev,
      [materialId]: isEmpty
    }));
  };

  const handleSubmit = () => {
    console.log("🔍 POST SERVICE MODAL - Submitting with status:", materialStatus);
    onSubmit(materialStatus);
  };

  const handleClose = () => {
    console.log("🔍 POST SERVICE MODAL - Closing modal");
    setMaterialStatus({});
    onClose();
  };

  console.log("🔍 POST SERVICE MODAL - Current state:", { isOpen, materialStatus });

  if (!isOpen) {
    console.log("🔍 POST SERVICE MODAL - Not open, returning null");
    return null;
  }

  console.log("🔍 POST SERVICE MODAL - Rendering modal with materials:", materials);

  return (
    <div className="post-service-modal-overlay">
      <div className="post-service-modal">
        <div className="post-service-modal-header">
          <h3>Materials Check Required</h3>
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
            Payment has been verified. Please check the current status of materials used during this service. 
            Are any of these materials now empty and need to be restocked?
          </p>

          <div className="materials-check-list">
            {materials.map((material) => {
              console.log("🔍 MODAL - Rendering material:", material);
              console.log("🔍 MODAL - Material ID:", material.id);
              console.log("🔍 MODAL - Radio name will be:", `material-${material.id}`);
              
              return (
              <div key={material.id || `material-${Math.random()}`} className="material-check-item">
                <div className="material-info">
                  <div className="material-name">{material.name}</div>
                  <div className="material-details">
                    Used: {material.quantity_used} {material.unit}
                  </div>
                </div>
                <div className="material-status-controls">
                  <label className="status-label">Is this material empty now?</label>
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
                      <span>Yes, it's empty</span>
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
                      <span>No, still has stock</span>
                    </label>
                  </div>
                </div>
              </div>
              );
            })}
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
            {isSubmitting ? 'Processing...' : 'Complete Materials Check'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PostServiceMaterialModal;
