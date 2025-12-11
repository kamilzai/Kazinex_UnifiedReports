/**
 * Core Image Compression Utility
 * 
 * Implements aggressive compression strategy using HTML5 Canvas API.
 * Strategy: Resize → Iterative quality reduction → Dimension scaling
 * Target: ≤375 KB binary (≤500 KB Base64)
 */

import { DEFAULT_COMPRESSION_CONFIG } from '../config/imageConfig';
import { ImageCompressionConfig, CompressionResult } from '../types/image.types';

/**
 * Main compression function - handles any size image
 * 
 * Algorithm:
 * 1. Load image into HTMLImageElement
 * 2. Resize to maxWidth × maxHeight (preserve aspect ratio)
 * 3. Draw to canvas and compress with initial quality (0.9)
 * 4. If still too large: reduce quality iteratively (0.9 → 0.85 → 0.8 → ...)
 * 5. If quality reaches minimum: scale dimensions by 90% and reset quality
 * 6. Repeat until target size reached or max attempts exceeded
 */
export async function compressImage(
    file: File,
    config: ImageCompressionConfig = DEFAULT_COMPRESSION_CONFIG
): Promise<CompressionResult> {
    const startTime = performance.now();
    const originalSize = file.size;

    try {
        // Step 1: Load image from file
        const img = await loadImageFromFile(file);

        // Step 2: Calculate initial resize dimensions
        let { width, height } = calculateInitialDimensions(
            img.width,
            img.height,
            config.maxWidth,
            config.maxHeight
        );

        let currentQuality = config.initialQuality;
        let attempts = 0;
        let base64DataUrl = '';
        let compressedSizeBytes = 0;

        // Step 3: Compression loop
        while (attempts < config.maxAttempts) {
            attempts++;

            // Create canvas with current dimensions
            const canvas = createCanvas(width, height);
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                throw new Error('Failed to get canvas 2D context');
            }

            // Draw image to canvas
            ctx.drawImage(img, 0, 0, width, height);

            // Convert to JPEG blob with current quality
            const blob = await canvasToBlob(canvas, config.outputFormat, currentQuality);

            // Convert blob to Base64
            base64DataUrl = await blobToBase64(blob);

            // Calculate binary size from Base64 string
            compressedSizeBytes = estimateBinarySize(base64DataUrl);

            // Check if we've reached target size
            if (compressedSizeBytes <= config.maxSizeKB * 1024) {
                // SUCCESS! Return result
                const processingTime = performance.now() - startTime;
                return {
                    success: true,
                    base64DataUrl,
                    originalSizeBytes: originalSize,
                    compressedSizeBytes,
                    compressionRatio: compressedSizeBytes / originalSize,
                    finalQuality: currentQuality,
                    finalDimensions: { width, height },
                    attempts,
                    compressionTimeMs: processingTime,
                };
            }

            // Still too large - try reducing quality
            if (currentQuality > config.minQuality) {
                currentQuality = Math.max(
                    config.minQuality,
                    currentQuality - config.qualityStep
                );
            } else {
                // Quality is at minimum - scale down dimensions
                width = Math.round(width * config.dimensionScaleFactor);
                height = Math.round(height * config.dimensionScaleFactor);
                currentQuality = config.initialQuality; // Reset quality

                // Safety check - don't go too small
                if (width < 100 || height < 100) {
                    throw new Error(
                        `Cannot compress image to target size. ` +
                        `Final dimensions: ${width}×${height}, Size: ${Math.round(compressedSizeBytes / 1024)} KB`
                    );
                }
            }
        }

        // Max attempts reached
        throw new Error(
            `Compression failed after ${config.maxAttempts} attempts. ` +
            `Final size: ${Math.round(compressedSizeBytes / 1024)} KB (target: ${config.maxSizeKB} KB)`
        );

    } catch (error) {
        const processingTime = performance.now() - startTime;
        return {
            success: false,
            originalSizeBytes: originalSize,
            compressionTimeMs: processingTime,
            error: error instanceof Error ? error.message : String(error),
        } as CompressionResult;
    }
}

/**
 * Load image from File object
 */
function loadImageFromFile(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);

        img.onload = () => {
            URL.revokeObjectURL(url); // Clean up
            resolve(img);
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Failed to load image'));
        };

        img.src = url;
    });
}

/**
 * Calculate initial resize dimensions (preserve aspect ratio)
 */
function calculateInitialDimensions(
    imgWidth: number,
    imgHeight: number,
    maxWidth: number,
    maxHeight: number
): { width: number; height: number } {
    // Already within limits
    if (imgWidth <= maxWidth && imgHeight <= maxHeight) {
        return { width: imgWidth, height: imgHeight };
    }

    const aspectRatio = imgWidth / imgHeight;

    // Width is limiting factor
    if (imgWidth / maxWidth > imgHeight / maxHeight) {
        return {
            width: maxWidth,
            height: Math.round(maxWidth / aspectRatio),
        };
    }

    // Height is limiting factor
    return {
        width: Math.round(maxHeight * aspectRatio),
        height: maxHeight,
    };
}

/**
 * Create canvas element
 */
function createCanvas(width: number, height: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
}

/**
 * Convert canvas to Blob with specified quality
 */
function canvasToBlob(
    canvas: HTMLCanvasElement,
    mimeType: string,
    quality: number
): Promise<Blob> {
    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error('Failed to create blob from canvas'));
                }
            },
            mimeType,
            quality
        );
    });
}

/**
 * Convert Blob to Base64 data URL
 */
function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

/**
 * Estimate binary size from Base64 string
 * Formula: (base64Length * 0.75) - padding
 */
function estimateBinarySize(base64: string): number {
    // Remove data URL prefix (e.g., "data:image/jpeg;base64,")
    const base64Data = base64.split(',')[1] || base64;
    
    // Count padding characters ('=')
    const padding = (base64Data.match(/=/g) || []).length;
    
    // Calculate binary size: each Base64 char = 6 bits, so 4 chars = 3 bytes
    return Math.floor((base64Data.length * 3) / 4) - padding;
}

/**
 * Convert Base64 string to Blob (for validation/testing)
 */
export function base64ToBlob(base64: string, mimeType: string): Blob {
    // Remove data URL prefix if present
    const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
    
    // Decode base64
    const byteString = atob(base64Data);
    const byteArray = new Uint8Array(byteString.length);
    
    for (let i = 0; i < byteString.length; i++) {
        byteArray[i] = byteString.charCodeAt(i);
    }
    
    return new Blob([byteArray], { type: mimeType });
}

/**
 * Create thumbnail from Base64 image
 * Used for generating small thumbnails for grid display
 */
export async function createThumbnail(
    base64: string,
    width: number,
    height: number,
    quality: number = 0.7
): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image();

        img.onload = async () => {
            try {
                // Create thumbnail canvas
                const canvas = createCanvas(width, height);
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    throw new Error('Failed to get canvas 2D context');
                }

                // Draw scaled image
                ctx.drawImage(img, 0, 0, width, height);

                // Convert to JPEG blob
                const blob = await canvasToBlob(canvas, 'image/jpeg', quality);

                // Convert to Base64
                const thumbnailBase64 = await blobToBase64(blob);
                resolve(thumbnailBase64);
            } catch (error) {
                reject(error);
            }
        };

        img.onerror = () => reject(new Error('Failed to load image for thumbnail'));
        img.src = base64;
    });
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}
