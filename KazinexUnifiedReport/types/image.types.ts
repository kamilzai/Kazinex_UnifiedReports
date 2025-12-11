/**
 * Image Type Definitions
 * 
 * TypeScript interfaces for image upload, compression, and display operations.
 * All images are stored as Base64 data URLs in the kazinex_datainput column.
 */

/**
 * Image Compression Configuration
 * 
 * Defines the compression parameters for the Canvas API compression engine.
 * These settings control the balance between image quality and file size.
 */
export interface ImageCompressionConfig {
  /** Maximum allowed file size in kilobytes (target: 375 KB binary = ~500 KB Base64) */
  maxSizeKB: number;
  
  /** Maximum image width in pixels (images will be scaled down if larger) */
  maxWidth: number;
  
  /** Maximum image height in pixels (images will be scaled down if larger) */
  maxHeight: number;
  
  /** Initial JPEG quality (0.0 - 1.0) - starts here and reduces if needed */
  initialQuality: number;
  
  /** Minimum JPEG quality (0.0 - 1.0) - won't compress below this */
  minQuality: number;
  
  /** Quality reduction step size for iterative compression */
  qualityStep: number;
  
  /** Dimension scaling factor when quality reduction isn't enough (e.g., 0.9 = 90% of current size) */
  dimensionScaleFactor: number;
  
  /** Maximum compression attempts before giving up */
  maxAttempts: number;
  
  /** Output format (always 'image/jpeg' for best compression) */
  outputFormat: 'image/jpeg';
}

/**
 * Compression Operation Result
 * 
 * Contains the compressed image data and metadata about the compression process.
 * Used to display feedback to users and debug compression issues.
 */
export interface CompressionResult {
  /** Whether compression was successful */
  success: boolean;
  
  /** Compressed image as Base64 data URL (ready to store in kazinex_datainput) */
  base64DataUrl?: string;
  
  /** Original file size in bytes */
  originalSizeBytes: number;
  
  /** Compressed file size in bytes (Base64 length * 0.75 for binary equivalent) */
  compressedSizeBytes?: number;
  
  /** Compression ratio (e.g., 0.25 = compressed to 25% of original) */
  compressionRatio?: number;
  
  /** Final JPEG quality used (0.0 - 1.0) */
  finalQuality?: number;
  
  /** Final image dimensions after compression */
  finalDimensions?: {
    width: number;
    height: number;
  };
  
  /** Number of compression attempts required */
  attempts?: number;
  
  /** Time taken for compression in milliseconds */
  compressionTimeMs?: number;
  
  /** Error message if compression failed */
  error?: string;
}

/**
 * Image File Information
 * 
 * Metadata extracted from a File object before compression.
 * Used for validation and display purposes.
 */
export interface ImageFileInfo {
  /** The original File object */
  file: File;
  
  /** Original filename */
  name: string;
  
  /** File size in bytes */
  size: number;
  
  /** MIME type (e.g., 'image/jpeg', 'image/png') */
  type: string;
  
  /** Last modified timestamp */
  lastModified: number;
  
  /** Preview URL (created via URL.createObjectURL) - must be revoked after use */
  previewUrl?: string;
}

/**
 * Bulk Upload Progress Tracking
 * 
 * Tracks progress for multi-image upload operations.
 * Used to display progress bars and estimated time remaining.
 */
export interface BulkUploadProgress {
  /** Total number of images in the upload batch */
  totalImages: number;
  
  /** Number of images successfully processed */
  completedImages: number;
  
  /** Number of images that failed processing */
  failedImages: number;
  
  /** Currently processing image (filename) */
  currentFileName?: string;
  
  /** Percentage complete (0-100) */
  percentComplete: number;
  
  /** Estimated time remaining in seconds (based on average processing time) */
  estimatedTimeRemaining?: number;
  
  /** List of failed image filenames with error messages */
  errors?: Array<{
    fileName: string;
    error: string;
  }>;
  
  /** Processing start timestamp */
  startTime?: number;
}

/**
 * Image File Validation Result
 * 
 * Result of validating an image file before processing.
 * Checks file type, size, magic bytes, and other constraints.
 */
export interface ValidationResult {
  /** Whether the file passed all validation checks */
  valid: boolean;
  
  /** Error message if validation failed */
  error?: string;
  
  /** Non-critical warnings (file is valid but has issues) */
  warnings?: string[];
}

/**
 * Thumbnail Cache Entry
 * 
 * Cached thumbnail data stored in IndexedDB for performance.
 * Reduces need to re-decode Base64 and re-render thumbnails.
 */
export interface ThumbnailCacheEntry {
  /** Unique cache key (recordId:fieldName) */
  key: string;
  
  /** Record ID (kazinex_reportdataid) */
  recordId: string;
  
  /** Column name (kazinex_columnname from structure) */
  fieldName: string;
  
  /** Thumbnail as Base64 data URL (48x48 JPEG, quality 0.7) */
  thumbnailBase64: string;
  
  /** Cache entry creation timestamp */
  timestamp: number;
  
  /** Last accessed timestamp */
  lastAccessed: number;
  
  /** Access count for LRU tracking */
  accessCount: number;
  
  /** Entry size in bytes */
  size: number;
}
