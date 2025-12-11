/**
 * Image Configuration Constants
 * 
 * Central configuration for all image upload, compression, and display operations.
 * These constants define size limits, compression parameters, caching behavior,
 * and performance optimization settings.
 */

import { ImageCompressionConfig } from '../types/image.types';

/**
 * Default Compression Configuration
 * 
 * Target: 375 KB binary image (500 KB Base64) to fit in Dataverse multiline text.
 * Strategy: Start with high quality, reduce iteratively, scale dimensions if needed.
 */
export const DEFAULT_COMPRESSION_CONFIG: ImageCompressionConfig = {
  maxSizeKB: 375,              // Binary target (becomes ~500 KB Base64 with 33% overhead)
  maxWidth: 1920,              // Full HD width (sufficient for reports/presentations)
  maxHeight: 1080,             // Full HD height
  initialQuality: 0.9,         // Start with high quality (90%)
  minQuality: 0.5,             // Don't go below 50% quality (image degrades too much)
  qualityStep: 0.05,           // Reduce by 5% each iteration (0.9 → 0.85 → 0.8 → ...)
  dimensionScaleFactor: 0.9,   // If quality reduction fails, scale to 90% dimensions
  maxAttempts: 20,             // Maximum compression attempts (prevents infinite loops)
  outputFormat: 'image/jpeg',  // JPEG provides best compression ratio for photos
};

/**
 * Accepted Image File Types (MIME types)
 * 
 * Supported formats for upload. All are converted to JPEG during compression.
 */
export const ACCEPTED_IMAGE_TYPES: string[] = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/bmp',
];

/**
 * Image Format Magic Bytes (File Signatures)
 * 
 * Used for true file type validation (not just extension checking).
 * These byte sequences appear at the start of valid image files.
 * 
 * Source: https://en.wikipedia.org/wiki/List_of_file_signatures
 */
export const IMAGE_MAGIC_BYTES: Record<string, number[]> = {
  'image/jpeg': [0xFF, 0xD8, 0xFF],           // JPEG files start with FF D8 FF
  'image/png': [0x89, 0x50, 0x4E, 0x47],      // PNG files start with 89 50 4E 47 (‰PNG)
  'image/gif': [0x47, 0x49, 0x46, 0x38],      // GIF files start with 47 49 46 38 (GIF8)
  'image/webp': [0x52, 0x49, 0x46, 0x46],     // WebP files start with 52 49 46 46 (RIFF)
  'image/bmp': [0x42, 0x4D],                  // BMP files start with 42 4D (BM)
};

/**
 * Maximum Upload File Size (Before Compression)
 * 
 * Reject files larger than 100 MB (browser memory constraints).
 * Users should resize/compress huge images before upload.
 */
export const MAX_UPLOAD_SIZE_MB = 100;
export const MAX_UPLOAD_SIZE_BYTES = MAX_UPLOAD_SIZE_MB * 1024 * 1024;

/**
 * Thumbnail Generation Configuration
 * 
 * Small thumbnails for grid display (reduces memory usage for large datasets).
 * Quality can be lower since thumbnails are tiny.
 */
export const THUMBNAIL_CONFIG = {
  width: 48,                   // Thumbnail width in pixels (fits in grid cell)
  height: 48,                  // Thumbnail height in pixels (square aspect)
  quality: 0.7,                // Lower quality acceptable for small thumbnails
  format: 'image/jpeg' as const,
};

/**
 * IndexedDB Cache Configuration
 * 
 * Cache thumbnails to avoid re-decoding Base64 on every grid scroll.
 * Significantly improves performance for large datasets.
 */
export const CACHE_CONFIG = {
  dbName: 'KazinexImageCache',         // IndexedDB database name
  storeName: 'thumbnails',             // Object store name
  maxEntries: 200,                     // Maximum cached thumbnails (LRU eviction)
  maxThumbnails: 200,                  // Alias for maxEntries
  ttlHours: 24,                        // Cache entry lifetime (24 hours)
  ttlMilliseconds: 24 * 60 * 60 * 1000,
  thumbnailTTL: 24 * 60 * 60 * 1000,   // Alias for ttlMilliseconds
};

/**
 * Worker Configuration (Phase 6)
 * 
 * Parallel compression using Web Workers prevents UI blocking.
 * Two workers provide optimal balance between parallelism and memory usage.
 * 
 * NOTE: Workers are disabled by default due to ES module loading issues in PCF runtime.
 * The service will gracefully fall back to sequential processing.
 */
export const WORKER_CONFIG = {
  maxWorkers: 2,                       // Number of parallel compression workers
  workerTimeoutMs: 30000,              // Kill worker if compression takes >30s
  enableWorkers: false,                // Disabled by default (ES module loading issues in PCF)
};

/**
 * Bulk Upload Configuration
 * 
 * Settings for multi-image upload operations.
 * Batching prevents overwhelming the browser and provides progress feedback.
 */
export const BULK_UPLOAD_CONFIG = {
  batchSize: 10,                       // Process 10 images at a time
  delayBetweenBatchesMs: 100,          // 100ms pause between batches (UI responsiveness)
  showProgressDialog: true,            // Display progress dialog for bulk uploads
  autoRetryFailedImages: false,        // Don't auto-retry (user should fix and re-upload)
};
