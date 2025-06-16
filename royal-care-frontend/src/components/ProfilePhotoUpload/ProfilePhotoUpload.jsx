import { useRef, useState } from "react";
import styles from "./ProfilePhotoUpload.module.css";

const ProfilePhotoUpload = ({
  currentPhoto,
  onPhotoUpdate,
  size = "large",
}) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(currentPhoto);
  const fileInputRef = useRef(null);

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Show preview immediately
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(file);

    setUploading(true);

    try {
      // Get auth token (from knox authentication)
      const token = localStorage.getItem("knoxToken");

      if (!token) {
        throw new Error("User not authenticated - please log in again");
      }

      // Create FormData for file upload
      const formData = new FormData();
      formData.append("photo", file);

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
    </div>
  );
};

export default ProfilePhotoUpload;
