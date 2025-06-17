import { useState } from "react";
import ProfilePhotoUpload from "./ProfilePhotoUpload";

/**
 * Test component for ProfilePhotoUpload with crop functionality
 * This demonstrates the complete workflow: select image -> crop -> upload
 */
const ProfilePhotoUploadTest = () => {
  const [currentPhoto, setCurrentPhoto] = useState(null);

  const handlePhotoUpdate = (newPhotoUrl) => {
    console.log("Photo updated:", newPhotoUrl);
    setCurrentPhoto(newPhotoUrl);
  };

  return (
    <div style={{ padding: "20px", maxWidth: "500px", margin: "0 auto" }}>
      <h2>Profile Photo Upload with Cropping</h2>
      <div style={{ marginBottom: "20px" }}>
        <ProfilePhotoUpload
          currentPhoto={currentPhoto}
          onPhotoUpdate={handlePhotoUpdate}
          size="large"
        />
      </div>

      <div
        style={{
          marginTop: "20px",
          padding: "15px",
          backgroundColor: "#f5f5f5",
          borderRadius: "8px",
        }}
      >
        <h3>How it works:</h3>
        <ol>
          <li>Click "Upload Photo" to select an image file</li>
          <li>The crop modal will appear with the selected image</li>
          <li>Use the zoom slider to adjust the size</li>
          <li>Drag the image to reposition it within the crop area</li>
          <li>Click "Crop & Upload" to confirm and upload</li>
          <li>The cropped image will be uploaded to your backend</li>
        </ol>

        <h4>Features:</h4>
        <ul>
          <li>✅ Round crop shape for profile photos</li>
          <li>✅ Zoom controls with slider</li>
          <li>✅ Drag to reposition</li>
          <li>✅ Grid overlay for better positioning</li>
          <li>✅ Real-time preview</li>
          <li>✅ File validation (size and type)</li>
          <li>✅ Error handling</li>
          <li>✅ Responsive design</li>
        </ul>
      </div>

      {currentPhoto && (
        <div style={{ marginTop: "20px", textAlign: "center" }}>
          <h4>Current Photo URL:</h4>
          <code
            style={{
              wordBreak: "break-all",
              padding: "8px",
              backgroundColor: "#e9ecef",
              borderRadius: "4px",
            }}
          >
            {currentPhoto}
          </code>
        </div>
      )}
    </div>
  );
};

export default ProfilePhotoUploadTest;
