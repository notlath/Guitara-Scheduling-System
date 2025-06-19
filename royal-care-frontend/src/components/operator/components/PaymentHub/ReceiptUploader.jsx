import { useRef, useState } from "react";
import styles from "./ReceiptUploader.module.css";

/**
 * ReceiptUploader Component
 * Modal for uploading payment receipts
 */
const ReceiptUploader = ({
  appointment,
  onClose,
  onUpload,
  loading = false,
  progress = 0,
}) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const fileInputRef = useRef(null);

  const acceptedTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "application/pdf",
  ];
  const maxFileSize = 5 * 1024 * 1024; // 5MB

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(amount);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const validateFile = (file) => {
    if (!acceptedTypes.includes(file.type)) {
      return "Please select a valid file type (JPEG, PNG, WebP, or PDF)";
    }
    if (file.size > maxFileSize) {
      return `File size must be less than ${formatFileSize(maxFileSize)}`;
    }
    return null;
  };

  const handleFileSelect = (file) => {
    const error = validateFile(file);
    if (error) {
      alert(error);
      return;
    }

    setSelectedFile(file);

    // Create preview for images
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => setPreviewUrl(e.target.result);
      reader.readAsDataURL(file);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      const result = await onUpload(appointment.id, selectedFile);
      if (result.success) {
        onClose();
      }
    } catch (error) {
      console.error("Receipt upload failed:", error);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Calculate total amount
  const totalAmount =
    appointment.services_details?.reduce((total, service) => {
      return total + (Number(service.price) || 0);
    }, 0) || 0;

  return (
    <div className={styles.receiptUploaderOverlay} onClick={onClose}>
      <div
        className={styles.receiptUploaderModal}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <h3>Upload Payment Receipt</h3>
          <button className={styles.closeBtn} onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className={styles.modalContent}>
          {/* Appointment summary */}
          <div className={styles.appointmentSummary}>
            <h4>Appointment #{appointment.id}</h4>
            <p>
              <strong>Client:</strong> {appointment.client_details?.first_name}{" "}
              {appointment.client_details?.last_name}
            </p>
            <p>
              <strong>Amount:</strong> {formatCurrency(totalAmount)}
            </p>
          </div>

          {/* File upload area */}
          <div
            className={`${styles.uploadArea} ${
              dragActive ? styles.dragActive : ""
            } ${selectedFile ? styles.fileSelected : ""}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => !selectedFile && fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={acceptedTypes.join(",")}
              onChange={handleFileInput}
              style={{ display: "none" }}
            />

            {!selectedFile ? (
              <div className={styles.uploadPrompt}>
                <i className="fas fa-cloud-upload-alt"></i>
                <h4>Drop receipt here or click to browse</h4>
                <p>Supports JPEG, PNG, WebP, and PDF files</p>
                <p>Maximum file size: {formatFileSize(maxFileSize)}</p>
              </div>
            ) : (
              <div className={styles.filePreview}>
                {previewUrl ? (
                  <div className={styles.imagePreview}>
                    <img src={previewUrl} alt="Receipt preview" />
                  </div>
                ) : (
                  <div className={styles.fileIcon}>
                    <i className="fas fa-file-alt"></i>
                  </div>
                )}

                <div className={styles.fileInfo}>
                  <h5>{selectedFile.name}</h5>
                  <p>{formatFileSize(selectedFile.size)}</p>
                  <button
                    className={styles.removeFileBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile();
                    }}
                    disabled={loading}
                  >
                    <i className="fas fa-times"></i>
                    Remove
                  </button>
                </div>
              </div>
            )}

            {loading && (
              <div className={styles.uploadProgress}>
                <div className={styles.progressBar}>
                  <div
                    className={styles.progressFill}
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <p>Uploading... {progress}%</p>
              </div>
            )}
          </div>

          {/* Upload guidelines */}
          <div className={styles.uploadGuidelines}>
            <h5>Receipt Upload Guidelines:</h5>
            <ul>
              <li>Ensure the receipt is clear and readable</li>
              <li>Include the transaction reference number</li>
              <li>Make sure the amount matches the service total</li>
              <li>Accepted formats: JPEG, PNG, WebP, PDF</li>
            </ul>
          </div>
        </div>

        {/* Modal actions */}
        <div className={styles.modalActions}>
          <button
            className={`${styles.btn} ${styles.secondary}`}
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            className={`${styles.btn} ${styles.primary}`}
            onClick={handleUpload}
            disabled={!selectedFile || loading}
          >
            {loading ? (
              <>
                <i className="fas fa-spinner fa-spin"></i>
                Uploading... {progress}%
              </>
            ) : (
              <>
                <i className="fas fa-upload"></i>
                Upload Receipt
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReceiptUploader;
