import { useRef, useState } from "react";
import PhotoCropModal from "../PhotoCropModal/PhotoCropModal";
import styles from "./ProfilePhotoUpload.module.css";

const ProfilePhotoUpload = ({
  currentPhoto,
  onPhotoUpdate,
  size = "large",
}) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(currentPhoto);
  const [showCropModal, setShowCropModal] = useState(false);
  const [selectedImageSrc, setSelectedImageSrc] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file
    if (file.size > 5 * 1024 * 1024) {
      alert("File too large. Maximum size is 5MB.");
      return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      alert("Invalid file type. Please use JPEG, PNG, or WebP.");
      return;
    }

    // Show the image in crop modal
    const reader = new FileReader();
    reader.onload = (e) => {
      setSelectedImageSrc(e.target.result);
      setShowCropModal(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = async (croppedFile, croppedImageUrl) => {
    setShowCropModal(false);
    setSelectedImageSrc(null);

    // Show preview immediately
    setPreview(croppedImageUrl);
    setUploading(true);

    try {
      // Get auth token (from knox authentication)
      const token = localStorage.getItem("knoxToken");

      if (!token) {
        throw new Error("User not authenticated - please log in again");
      }

      // Create FormData for file upload
      const formData = new FormData();
      formData.append("photo", croppedFile);

      const response = await fetch("/api/registration/profile/photo/", {
        method: "POST",
        headers: {
          Authorization: `Token ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Upload failed");
      }

      const data = await response.json();

      // Update with the returned photo URL
      onPhotoUpdate?.(data.photo_url);
      setPreview(data.photo_url);
    } catch (error) {
      console.error("Upload failed:", error);
      alert(`Upload failed: ${error.message}`);
      setPreview(currentPhoto); // Revert preview
    } finally {
      setUploading(false);
    }
  };

  const handleCropCancel = () => {
    setShowCropModal(false);
    setSelectedImageSrc(null);
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemovePhoto = async () => {
    try {
      const token = localStorage.getItem("knoxToken");

      const response = await fetch("/api/registration/profile/photo/", {
        method: "DELETE",
        headers: {
          Authorization: `Token ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Delete failed");
      }

      // Clear the preview and notify parent
      setPreview(null);
      onPhotoUpdate?.(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Delete failed:", error);
      alert(`Delete failed: ${error.message}`);
    }
  };

  return (
    <div className={`${styles.photoUpload} ${styles[size]}`}>
      <div className={styles.photoContainer} onClick={handleUploadClick}>
        <div className={styles.photoPreview}>
          {preview ? (
            <img src={preview} alt="Profile" className={styles.profilePhoto} />
          ) : (
            <div className={styles.photoPlaceholder}>
              <div className={styles.placeholderIcon}>👤</div>
              <p className={styles.placeholderText}>No Photo</p>
            </div>
          )}
          {uploading && (
            <div className={styles.uploadingOverlay}>
              <div className={styles.uploadingSpinner}></div>
              <span>Uploading...</span>
            </div>
          )}
        </div>
      </div>

      <div className={styles.photoActions}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileSelect}
          disabled={uploading}
          style={{ display: "none" }}
        />

        <button
          onClick={handleUploadClick}
          disabled={uploading}
          className={styles.uploadButton}
        >
          {preview ? "Change Photo" : "Upload Photo"}
        </button>

        {preview && (
          <button
            onClick={handleRemovePhoto}
            disabled={uploading}
            className={styles.removeButton}
          >
            Remove
          </button>
        )}
      </div>

      {/* Crop Modal */}
      {showCropModal && selectedImageSrc && (
        <PhotoCropModal
          imageSrc={selectedImageSrc}
          onCropComplete={handleCropComplete}
          onCancel={handleCropCancel}
          aspectRatio={1}
          cropShape="round"
        />
      )}
    </div>
  );
};

export default ProfilePhotoUpload;
