// Receipt Storage Service with SHA-256 hashing
import { supabase } from "./supabaseClient";

class ReceiptService {
  constructor() {
    this.bucketName = "receipts";
  }

  /**
   * Generate SHA-256 hash from a file
   * @param {File} file - The file to hash
   * @returns {Promise<string>} - SHA-256 hash
   */
  async generateSHA256Hash(file) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      return hashHex;
    } catch (error) {
      console.error("Error generating SHA-256 hash:", error);
      throw new Error("Failed to generate file hash");
    }
  }

  /**
   * Upload receipt file to Supabase Storage with SHA-256 hash verification
   * @param {File} file - The receipt file to upload
   * @param {number} appointmentId - The appointment ID
   * @returns {Promise<{publicUrl: string, hash: string}>} - Public URL and SHA-256 hash
   */
  async uploadGCashReceipt(file, appointmentId) {
    try {
      // Check if user is authenticated with your Django backend
      const token = localStorage.getItem("knoxToken");
      if (!token) {
        throw new Error("Authentication required");
      }

      // For Supabase storage, we'll use anonymous access with simplified policies
      // The bucket policies should allow uploads without requiring Supabase auth

      // Validate file
      if (file.size > 10 * 1024 * 1024) {
        throw new Error("File too large. Maximum size is 10MB.");
      }

      const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "application/pdf",
      ];
      if (!allowedTypes.includes(file.type)) {
        throw new Error(
          "Invalid file type. Please use JPEG, PNG, WebP or PDF."
        );
      }

      // Generate SHA-256 hash
      const fileHash = await this.generateSHA256Hash(file);

      // Create unique filename with timestamp and hash
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const fileExtension = file.name.split(".").pop() || "jpg";
      const fileName = `appointments/${appointmentId}/gcash-receipt-${timestamp}.${fileExtension}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from(this.bucketName)
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false, // Don't replace existing files for verification integrity
          metadata: {
            sha256: fileHash,
            appointmentId: String(appointmentId),
            uploadedAt: timestamp,
          },
        });

      if (uploadError) {
        console.error("Supabase upload error details:", uploadError);
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(this.bucketName)
        .getPublicUrl(fileName);

      return {
        publicUrl: urlData.publicUrl,
        hash: fileHash,
        fileName: fileName,
      };
    } catch (error) {
      console.error("Receipt upload error:", error);
      throw error;
    }
  }

  /**
   * Verify a receipt hash against the stored hash
   * @param {string} fileName - The file path in storage
   * @param {string} providedHash - SHA-256 hash to verify
   * @returns {Promise<boolean>} - Verification result
   */
  async verifyReceiptHash(fileName, providedHash) {
    try {
      // Get file metadata
      const { data: metadata } = await supabase.storage
        .from(this.bucketName)
        .getMetadata(fileName);

      if (!metadata || !metadata.metadata || !metadata.metadata.sha256) {
        throw new Error("File hash metadata not found");
      }

      // Compare hashes
      return metadata.metadata.sha256 === providedHash;
    } catch (error) {
      console.error("Hash verification error:", error);
      return false;
    }
  }
}

export const receiptService = new ReceiptService();
