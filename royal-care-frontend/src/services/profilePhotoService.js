// Supabase Storage Service for Profile Photos
import { supabase } from "./supabaseClient";

class ProfilePhotoService {
  constructor() {
    this.bucketName = "avatars";
  }

  /**
   * Upload profile photo directly to Supabase Storage
   * @param {File} file - The image file to upload
   * @param {string|number} userId - The user ID
   * @returns {Promise<string>} - Public URL of uploaded image
   */
  async uploadPhoto(file, userId) {
    try {
      // Validate file
      if (file.size > 5 * 1024 * 1024) {
        throw new Error("File too large. Maximum size is 5MB.");
      }

      const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
      if (!allowedTypes.includes(file.type)) {
        throw new Error("Invalid file type. Please use JPEG, PNG, or WebP.");
      }

      // Create unique filename
      const fileExtension = file.name.split(".").pop() || "jpg";
      const fileName = `users/${userId}/profile.${fileExtension}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from(this.bucketName)
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: true, // Replace existing file
        });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(this.bucketName)
        .getPublicUrl(fileName);

      return urlData.publicUrl;
    } catch (error) {
      console.error("Profile photo upload error:", error);
      throw error;
    }
  }

  /**
   * Delete profile photo from Supabase Storage
   * @param {string|number} userId - The user ID
   * @returns {Promise<boolean>} - Success status
   */
  async deletePhoto(userId) {
    try {
      // Try to delete common file extensions
      const fileExtensions = ["jpg", "jpeg", "png", "webp"];
      const filesToDelete = fileExtensions.map(
        (ext) => `users/${userId}/profile.${ext}`
      );

      const { error } = await supabase.storage
        .from(this.bucketName)
        .remove(filesToDelete);

      // Don't throw error if files don't exist
      if (error && !error.message.includes("not found")) {
        throw new Error(`Delete failed: ${error.message}`);
      }

      return true;
    } catch (error) {
      console.error("Profile photo delete error:", error);
      throw error;
    }
  }

  /**
   * Get public URL for existing profile photo
   * @param {string|number} userId - The user ID
   * @param {string} extension - File extension (default: 'jpg')
   * @returns {string} - Public URL
   */
  getPhotoUrl(userId, extension = "jpg") {
    const fileName = `users/${userId}/profile.${extension}`;
    const { data } = supabase.storage
      .from(this.bucketName)
      .getPublicUrl(fileName);

    return data.publicUrl;
  }
}

export const profilePhotoService = new ProfilePhotoService();
export default profilePhotoService;
