import { useCallback, useEffect, useState } from "react";
import Cropper from "react-easy-crop";
import { canvasToFile, getCroppedImg } from "../../utils/cropUtils";
import CloseIcon from "@mui/icons-material/Close";
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
  const [zoomLimits, setZoomLimits] = useState({ min: 0.2, max: 3 });

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

  // Calculate zoom limits based on image dimensions to prevent empty space
  useEffect(() => {
    if (!imageSrc) return;

    const img = new Image();
    img.onload = () => {
      const { naturalWidth, naturalHeight } = img;

      // Wait for container to be rendered, then get actual dimensions
      setTimeout(() => {
        const cropContainer = document.querySelector(
          `.${styles.cropContainer}`
        );
        if (!cropContainer) return;

        const containerWidth = cropContainer.clientWidth;
        const containerHeight = cropContainer.clientHeight;

        // For 1:1 aspect ratio round crop, calculate the minimum zoom needed
        // to ensure the image completely fills the crop circle without any empty space

        // The crop area is square (1:1 aspect ratio) and takes up most of the container
        const cropAreaSize = Math.min(containerWidth, containerHeight) * 0.8;

        // Calculate minimum zoom required so image completely covers the crop area
        // For a square crop area (1:1), we need the image to be at least as large as the crop area
        const minZoomToFillCrop =
          cropAreaSize / Math.min(naturalWidth, naturalHeight);

        // This ensures that even the smaller dimension of the image covers the entire crop area
        // preventing any empty/white space from showing
        const calculatedMinZoom = Math.max(minZoomToFillCrop, 1.0);

        // Maximum zoom allows for reasonable enlargement
        const calculatedMaxZoom = Math.max(calculatedMinZoom * 3, 3);

        setZoomLimits({
          min: calculatedMinZoom,
          max: calculatedMaxZoom,
        });

        // Set initial zoom to the minimum to ensure full coverage
        setZoom(calculatedMinZoom);
      }, 100); // Small delay to ensure DOM is rendered
    };

    img.src = imageSrc;
  }, [imageSrc]);

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
      alert("Unable to crop photo. Please try again.");
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
          <h3 className={styles.title}>Crop Photo</h3>
          <button
            className={styles.closeButton}
            onClick={onCancel}
            aria-label="Close editor"
          >
            <CloseIcon />
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
            maxZoom={zoomLimits.max}
            minZoom={zoomLimits.min}
            zoomWithScroll={true}
            onCropChange={onCropChange}
            onZoomChange={onZoomChange}
            onCropComplete={onCropCompleteHandler}
            restrictPosition={true}
          />
        </div>

        <div className={styles.zoomControl}>
          <label htmlFor="zoom-slider" className={styles.zoomLabel}>
            Zoom
          </label>
          <input
            id="zoom-slider"
            type="range"
            min={zoomLimits.min}
            max={zoomLimits.max}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className={styles.zoomSlider}
            aria-label="Adjust zoom"
          />
          <span className={styles.zoomValue}>{Math.round(zoom * 100)}%</span>
        </div>

        <div className={styles.actions}>
          <button
            className={styles.confirmButton}
            onClick={handleCropConfirm}
            disabled={isLoading || !croppedAreaPixels}
          >
            {isLoading ? (
              <>
                <div className={styles.spinner}></div>
                Cropping...
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
