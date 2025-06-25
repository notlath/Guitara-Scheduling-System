import { useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { updateUserProfile } from "../../features/auth/authSlice";
import PhotoCropModal from "../PhotoCropModal/PhotoCropModal";
import styles from "./ProfilePhotoUpload.module.css";

const ProfilePhotoUploadPure = ({
  currentPhoto,
  onPhotoUpdate,
  size = "large",
}) => {
  const [uploading, setUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [preview, setPreview] = useState(currentPhoto);
  const [showCropModal, setShowCropModal] = useState(false);
  const [selectedImageSrc, setSelectedImageSrc] = useState(null);
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
    setIsDeleting(false);

    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append("photo", croppedFile);

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
        let errorMessage = "Upload failed";

        // Check if response has content before trying to parse JSON
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
          } catch (jsonError) {
            console.warn("Failed to parse error response as JSON:", jsonError);
            errorMessage = `HTTP ${response.status}: ${response.statusText}`;
          }
        } else {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }

        throw new Error(errorMessage);
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
    setUploading(true);
    setIsDeleting(true);
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
        let errorMessage = "Delete failed";

        // Check if response has content before trying to parse JSON
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
          } catch (jsonError) {
            console.warn("Failed to parse error response as JSON:", jsonError);
            errorMessage = `HTTP ${response.status}: ${response.statusText}`;
          }
        } else {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }

        throw new Error(errorMessage);
      }

      // Try to parse response if it has content, but don't fail if it's empty
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        try {
          await response.json(); // Parse but don't store since we don't need the response data
        } catch (jsonError) {
          console.warn(
            "Response was successful but couldn't parse JSON:",
            jsonError
          );
          // Continue with success since the response was ok
        }
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
    } finally {
      setUploading(false);
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className={`${styles.photoUpload} ${styles[size]}`}>
        <div className={styles.photoContainer} onClick={handleUploadClick}>
          <div className={styles.photoPreview}>
            {preview ? (
              <img
                src={preview}
                alt="Profile"
                className={styles.profilePhoto}
              />
            ) : (
              <div className={styles.photoPlaceholder}>
                <div className={styles.placeholderIcon}>👤</div>
                <p className={styles.placeholderText}>No Photo</p>
              </div>
            )}
            {uploading && (
              <div className={styles.uploadingOverlay}>
                <div className={styles.uploadingSpinner}></div>
                <span>{isDeleting ? "Deleting..." : "Uploading..."}</span>
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
    </>
  );
};

export default ProfilePhotoUploadPure;
