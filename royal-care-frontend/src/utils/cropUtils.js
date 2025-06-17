/**
 * Create a File object from canvas data
 * @param {HTMLCanvasElement} canvas - The canvas containing the cropped image
 * @param {string} fileName - The desired file name
 * @param {string} mimeType - The MIME type (default: 'image/jpeg')
 * @param {number} quality - Image quality for JPEG (0-1, default: 0.9)
 * @returns {Promise<File>} The cropped image as a File object
 */
export const canvasToFile = (
  canvas,
  fileName = "cropped-image.jpg",
  mimeType = "image/jpeg",
  quality = 0.9
) => {
  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        const file = new File([blob], fileName, { type: mimeType });
        resolve(file);
      },
      mimeType,
      quality
    );
  });
};

/**
 * Creates a cropped image from the original image and crop data
 * @param {string} imageSrc - The source image URL
 * @param {Object} pixelCrop - The crop area in pixels
 * @param {number} rotation - Rotation angle in degrees (optional)
 * @param {boolean} flip - Whether to flip the image (optional)
 * @returns {Promise<HTMLCanvasElement>} Canvas with the cropped image
 */
export const getCroppedImg = (
  imageSrc,
  pixelCrop,
  rotation = 0,
  flip = { horizontal: false, vertical: false }
) => {
  const createImage = (url) =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener("load", () => resolve(image));
      image.addEventListener("error", (error) => reject(error));
      image.setAttribute("crossOrigin", "anonymous");
      image.src = url;
    });

  return createImage(imageSrc).then((image) => {
    return new Promise((resolve, reject) => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          throw new Error("No 2d context");
        }

        const rotRad = (rotation * Math.PI) / 180;

        // Calculate bounding box of the rotated image
        const { width: bBoxWidth, height: bBoxHeight } = rotateSize(
          image.width,
          image.height,
          rotation
        );

        // Set the canvas size to the bounding box
        canvas.width = bBoxWidth;
        canvas.height = bBoxHeight;

        // Translate canvas context to a central location to allow rotating and flipping around the center
        ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
        ctx.rotate(rotRad);
        ctx.scale(flip.horizontal ? -1 : 1, flip.vertical ? -1 : 1);
        ctx.translate(-image.width / 2, -image.height / 2);

        // Draw rotated image
        ctx.drawImage(image, 0, 0);

        // Create a new canvas for the cropped area
        const croppedCanvas = document.createElement("canvas");
        const croppedCtx = croppedCanvas.getContext("2d");

        if (!croppedCtx) {
          throw new Error("No 2d context");
        }

        // Set the size to the final desired crop size
        croppedCanvas.width = pixelCrop.width;
        croppedCanvas.height = pixelCrop.height;

        // Draw the cropped image onto the new canvas
        croppedCtx.drawImage(
          canvas,
          pixelCrop.x,
          pixelCrop.y,
          pixelCrop.width,
          pixelCrop.height,
          0,
          0,
          pixelCrop.width,
          pixelCrop.height
        );

        resolve(croppedCanvas);
      } catch (error) {
        reject(error);
      }
    });
  });
};

/**
 * Calculate the size of a rotated rectangle
 */
function rotateSize(width, height, rotation) {
  const rotRad = (rotation * Math.PI) / 180;

  return {
    width:
      Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
    height:
      Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
  };
}

/**
 * Get pixel crop from percentage crop
 * @param {Object} percentCrop - Crop in percentage
 * @param {number} imageWidth - Original image width
 * @param {number} imageHeight - Original image height
 * @returns {Object} Pixel crop coordinates
 */
export const getPixelCrop = (percentCrop, imageWidth, imageHeight) => {
  return {
    x: Math.round(imageWidth * (percentCrop.x / 100)),
    y: Math.round(imageHeight * (percentCrop.y / 100)),
    width: Math.round(imageWidth * (percentCrop.width / 100)),
    height: Math.round(imageHeight * (percentCrop.height / 100)),
  };
};
