import { useCallback, useState } from "react";
import Cropper from "react-easy-crop";
import { canvasToFile, getCroppedImg } from "../../utils/cropUtils";
import styles from "./PhotoCropModal.module.css";

const PhotoCropModal = ({
  imageSrc,
  onCropComplete,
  onCancel,
  aspectRatio = 1, // Square by default for profile photos
  cropShape = "round",
}) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const onCropChange = useCallback((crop) => {
    setCrop(crop);
  }, []);

  const onZoomChange = useCallback((zoom) => {
    setZoom(zoom);
  }, []);

  const onCropCompleteHandler = useCallback(
    (croppedArea, croppedAreaPixels) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    []
  );

  const handleCropConfirm = async () => {
    if (!croppedAreaPixels) return;

    setIsLoading(true);
    try {
      // Get the cropped canvas
      const croppedCanvas = await getCroppedImg(imageSrc, croppedAreaPixels);

      // Convert canvas to file
      const croppedFile = await canvasToFile(
        croppedCanvas,
        "profile-photo.jpg",
        "image/jpeg",
        0.8
      );

      // Get the data URL for preview
      const croppedImageUrl = croppedCanvas.toDataURL("image/jpeg", 0.8);

      onCropComplete(croppedFile, croppedImageUrl);
    } catch (error) {
      console.error("Error cropping image:", error);
      alert("Failed to crop image. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "Escape") {
      onCancel();
    }
  };

  return (
    <div
      className={styles.overlay}
      onClick={onCancel}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={styles.title}>Crop Profile Photo</h3>
          <button
            className={styles.closeButton}
            onClick={onCancel}
            aria-label="Close crop modal"
          >
            ×
          </button>
        </div>

        <div className={styles.cropContainer}>
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspectRatio}
            cropShape={cropShape}
            showGrid={true}
            zoomSpeed={0.5}
            maxZoom={3}
            minZoom={0.5}
            zoomWithScroll={true}
            onCropChange={onCropChange}
            onZoomChange={onZoomChange}
            onCropComplete={onCropCompleteHandler}
            restrictPosition={true}
          />
        </div>

        <div className={styles.controls}>
          <div className={styles.zoomControl}>
            <label htmlFor="zoom-slider" className={styles.zoomLabel}>
              Zoom
            </label>
            <input
              id="zoom-slider"
              type="range"
              min={0.5}
              max={3}
              step={0.1}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className={styles.zoomSlider}
            />
            <span className={styles.zoomValue}>{Math.round(zoom * 100)}%</span>
          </div>
        </div>

        <div className={styles.actions}>
          <button
            className={styles.cancelButton}
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            className={styles.confirmButton}
            onClick={handleCropConfirm}
            disabled={isLoading || !croppedAreaPixels}
          >
            {isLoading ? (
              <>
                <div className={styles.spinner}></div>
                Processing...
              </>
            ) : (
              "Crop & Upload"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PhotoCropModal;
