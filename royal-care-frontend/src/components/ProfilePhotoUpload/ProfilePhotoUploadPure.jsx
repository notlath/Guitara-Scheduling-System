import { useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { updateUserProfile } from "../../features/auth/authSlice";
import styles from "./ProfilePhotoUpload.module.css";

const ProfilePhotoUploadPure = ({
  currentPhoto,
  onPhotoUpdate,
  size = "large",
}) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(currentPhoto);
  const fileInputRef = useRef(null);
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);

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

    // Show preview immediately
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(file);

    setUploading(true);

    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append("photo", file);

      // Get auth token
      const token = localStorage.getItem("knoxToken");
      if (!token) {
        throw new Error("No authentication token found - please log in again");
      }

      // Upload via Django backend API
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

      // Update Redux store and localStorage
      const updatedUserData = {
        ...user,
        profile_photo_url: data.photo_url,
      };

      dispatch(updateUserProfile({ profile_photo_url: data.photo_url }));
      localStorage.setItem("user", JSON.stringify(updatedUserData));

      // Update preview and notify parent
      setPreview(data.photo_url);
      onPhotoUpdate?.(data.photo_url);

      console.log("✅ Photo uploaded successfully:", data.photo_url);
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
      if (!token) {
        throw new Error("No authentication token found - please log in again");
      }

      // Delete via Django backend API
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

      // Update Redux store and localStorage
      const updatedUserData = {
        ...user,
        profile_photo_url: null,
      };

      dispatch(updateUserProfile({ profile_photo_url: null }));
      localStorage.setItem("user", JSON.stringify(updatedUserData));

      // Clear preview and notify parent
      setPreview(null);
      onPhotoUpdate?.(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      console.log("✅ Photo removed successfully");
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

export default ProfilePhotoUploadPure;
