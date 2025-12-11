/**
 * Image Compression Service
 * 
 * High-level orchestrator for image compression operations.
 * Supports single and bulk processing with progress tracking.
 * Handles validation, compression, and error management.
 * 
 * Phase 6 Enhancement: Integrated with Worker Pool for parallel processing
 */

import { compressImage } from '../utils/imageCompression';
import { validateImageFiles } from '../utils/imageValidation';
import { DEFAULT_COMPRESSION_CONFIG, WORKER_CONFIG } from '../config/imageConfig';
import { workerPoolManager } from './WorkerPoolManager';
import { performanceMonitor } from '../utils/performanceMonitor';
import { createDebugLogger } from '../utils/debugLogger';

const compressionDebugLog = createDebugLogger('ImageCompressionService');
import { 
    CompressionResult, 
    ImageCompressionConfig, 
    BulkUploadProgress,
    ImageFileInfo,
    ValidationResult 
} from '../types/image.types';

/**
 * Service class for managing image compression operations
 */
export class ImageCompressionService {
    private config: ImageCompressionConfig;
    private activeCompressions: Map<string, AbortController>;
    private progressCallbacks: Map<string, (progress: BulkUploadProgress) => void>;
    private useWorkers: boolean;

    constructor(config: ImageCompressionConfig = DEFAULT_COMPRESSION_CONFIG, useWorkers: boolean = true) {
        this.config = config;
        this.activeCompressions = new Map();
        this.progressCallbacks = new Map();
        // Check both the feature flag and the parameter
        this.useWorkers = useWorkers && WORKER_CONFIG.enableWorkers && WORKER_CONFIG.maxWorkers > 0;
        
        if (!WORKER_CONFIG.enableWorkers) {
            compressionDebugLog('[ImageCompressionService] Web Workers disabled - using sequential processing');
        }
    }

    /**
     * Compress a single image
     * 
     * @param file - Image file to compress
     * @param useWorker - Force use or avoid Web Worker (default: auto-detect)
     * @returns Compression result with Base64 data or error
     */
    async compressSingle(file: File, useWorker?: boolean): Promise<CompressionResult> {
        const endTimer = performanceMonitor.startTimer('image_compression_single');

        try {
            // Validate file first
            const validationResults = await validateImageFiles([file]);
            const validation = validationResults.get(file);

            if (!validation?.valid) {
                endTimer({ success: false, error: validation?.error });
                return {
                    success: false,
                    originalSizeBytes: file.size,
                    error: validation?.error || 'Validation failed',
                } as CompressionResult;
            }

            // Decide whether to use worker
            const shouldUseWorker = useWorker !== undefined 
                ? useWorker 
                : (this.useWorkers && file.size > 5 * 1024 * 1024); // Use worker for files > 5MB

            let result: CompressionResult;

            if (shouldUseWorker) {
                compressionDebugLog(`[ImageCompressionService] Compressing ${file.name} with Web Worker`);
                result = await workerPoolManager.compressImage(file, this.config, 10); // High priority
            } else {
                compressionDebugLog(`[ImageCompressionService] Compressing ${file.name} on main thread`);
                result = await compressImage(file, this.config);
            }

            endTimer({ 
                success: result.success, 
                originalSize: result.originalSizeBytes,
                compressedSize: result.compressedSizeBytes,
                usedWorker: shouldUseWorker,
            });

            return result;
        } catch (error) {
            endTimer({ success: false, error: String(error) });
            throw error;
        }
    }

    /**
     * Compress multiple images with progress tracking
     * Phase 6 Enhancement: Uses Worker Pool for parallel processing
     * 
     * @param files - Array of image files to compress
     * @param onProgress - Optional progress callback
     * @returns Array of compression results (includes failures)
     */
    async compressBulk(
        files: File[],
        onProgress?: (progress: BulkUploadProgress) => void
    ): Promise<CompressionResult[]> {
        const sessionId = this.generateSessionId();
        const abortController = new AbortController();
        this.activeCompressions.set(sessionId, abortController);

        if (onProgress) {
            this.progressCallbacks.set(sessionId, onProgress);
        }

        const endTimer = performanceMonitor.startTimer('image_compression_bulk');
        const orderedResults: Array<CompressionResult | null> = new Array(files.length).fill(null);
        const startTime = Date.now();

        try {
            // Step 1: Validate all files
            const validationResults = await validateImageFiles(files);
            const validFileEntries: Array<{ file: File; index: number }> = [];
            let failedFiles = 0;

            files.forEach((file, index) => {
                const validation = validationResults.get(file);
                if (validation?.valid) {
                    validFileEntries.push({ file, index });
                } else {
                    orderedResults[index] = {
                        success: false,
                        originalSizeBytes: file.size,
                        error: validation?.error || 'Validation failed',
                    } as CompressionResult;
                    failedFiles++;
                }
            });

            const totalValidFiles = validFileEntries.length;
            let completedFiles = 0;

            // Step 2: Process valid files in parallel using Worker Pool (if enabled)
            if (this.useWorkers && totalValidFiles > 1) {
                compressionDebugLog(`[ImageCompressionService] Processing ${totalValidFiles} valid files with Worker Pool (parallel)`);
                
                // Initialize worker pool
                await workerPoolManager.initialize();

                // Submit all tasks to worker pool with progress tracking
                const compressionPromises = validFileEntries.map(({ file, index }, entryIndex) => {
                    const priority = totalValidFiles - entryIndex; // Earlier files get higher priority
                    return workerPoolManager.compressImage(file, this.config, priority)
                        .then(result => {
                            completedFiles++;
                            orderedResults[index] = result;
                            
                            // Update progress
                            if (onProgress && !abortController.signal.aborted) {
                                const progress: BulkUploadProgress = {
                                    totalImages: files.length,
                                    completedImages: completedFiles,
                                    failedImages: failedFiles + (!result.success ? 1 : 0),
                                    currentFileName: file.name,
                                    percentComplete: totalValidFiles > 0
                                        ? Math.round((completedFiles / totalValidFiles) * 100)
                                        : 100,
                                    estimatedTimeRemaining: this.estimateTimeRemaining(
                                        startTime,
                                        completedFiles,
                                        totalValidFiles
                                    ),
                                };
                                onProgress(progress);
                            }

                            if (!result.success) {
                                failedFiles++;
                            }

                            return result;
                        })
                        .catch(error => {
                            completedFiles++;
                            failedFiles++;
                            const failureResult: CompressionResult = {
                                success: false,
                                originalSizeBytes: file.size,
                                error: error instanceof Error ? error.message : 'Compression error',
                            };
                            orderedResults[index] = failureResult;
                            
                            return failureResult;
                        });
                });

                // Wait for all compressions to complete
                await Promise.all(compressionPromises);

            } else {
                // Fallback: Process sequentially on main thread
                compressionDebugLog(`[ImageCompressionService] Processing ${totalValidFiles} files on main thread (sequential)`);
                
                for (const entry of validFileEntries) {
                    const { file, index } = entry;

                    // Check if compression was cancelled
                    if (abortController.signal.aborted) {
                        // Add remaining files as cancelled
                        for (let i = completedFiles; i < totalValidFiles; i++) {
                            const pendingEntry = validFileEntries[i];
                            const cancelResult: CompressionResult = {
                                success: false,
                                originalSizeBytes: pendingEntry.file.size,
                                error: 'Compression cancelled by user',
                            };
                            orderedResults[pendingEntry.index] = cancelResult;
                            failedFiles++;
                        }
                        break;
                    }

                    // Update progress
                    if (onProgress) {
                        const progress: BulkUploadProgress = {
                            totalImages: files.length,
                            completedImages: completedFiles,
                            failedImages: failedFiles,
                            currentFileName: file.name,
                            percentComplete: totalValidFiles > 0
                                ? Math.round((completedFiles / totalValidFiles) * 100)
                                : 100,
                            estimatedTimeRemaining: this.estimateTimeRemaining(
                                startTime,
                                completedFiles,
                                totalValidFiles
                            ),
                        };
                        onProgress(progress);
                    }

                    // Compress image
                    try {
                        const result = await compressImage(file, this.config);
                        orderedResults[index] = result;

                        if (!result.success) {
                            failedFiles++;
                        }
                    } catch (error) {
                        // Unexpected error
                        const failureResult: CompressionResult = {
                            success: false,
                            originalSizeBytes: file.size,
                            error: error instanceof Error ? error.message : String(error),
                        } as CompressionResult;
                        orderedResults[index] = failureResult;
                        failedFiles++;
                    }

                    completedFiles++;
                }
            }

            const finalResults = orderedResults.map((result, idx) => {
                if (result) {
                    return result;
                }
                return {
                    success: false,
                    originalSizeBytes: files[idx]?.size ?? 0,
                    error: 'Image processing did not complete',
                } as CompressionResult;
            });

            // Final progress update
            if (onProgress) {
                const finalProgress: BulkUploadProgress = {
                    totalImages: files.length,
                    completedImages: completedFiles,
                    failedImages: failedFiles,
                    percentComplete: 100,
                    estimatedTimeRemaining: 0,
                    errors: finalResults
                        .map((result, index) => ({ result, index }))
                        .filter(({ result }) => !result.success)
                        .map(({ result, index }) => ({
                            fileName: files[index]?.name || 'Unknown',
                            error: result.error || 'Unknown error',
                        })),
                };
                onProgress(finalProgress);
            }

            endTimer({
                success: true,
                totalFiles: files.length,
                validFiles: totalValidFiles,
                successfulFiles: finalResults.filter(r => r.success).length,
                failedFiles,
                totalDuration: Date.now() - startTime,
            });

            return finalResults;

        } catch (error) {
            endTimer({ success: false, error: String(error) });
            throw error;
        } finally {
            // Cleanup
            this.activeCompressions.delete(sessionId);
            this.progressCallbacks.delete(sessionId);
        }
    }

    /**
     * Cancel an active bulk compression session
     * 
     * @param sessionId - Session ID to cancel
     */
    cancelCompression(sessionId: string): void {
        const abortController = this.activeCompressions.get(sessionId);
        if (abortController) {
            abortController.abort();
        }
    }

    /**
     * Estimate time remaining for bulk compression
     * 
     * @param startTime - Start timestamp in milliseconds
     * @param completed - Number of files completed
     * @param total - Total number of files
     * @returns Estimated time remaining in seconds
     */
    private estimateTimeRemaining(
        startTime: number,
        completed: number,
        total: number
    ): number {
        if (completed === 0) return 0;

        const elapsed = Date.now() - startTime;
        const avgTimePerFile = elapsed / completed;
        const remaining = total - completed;

        return Math.round((avgTimePerFile * remaining) / 1000); // Convert to seconds
    }

    /**
     * Generate unique session ID
     */
    private generateSessionId(): string {
        return `compression_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get file information summary
     * 
     * @param file - File to get info from
     * @returns File information object
     */
    static getFileInfo(file: File): ImageFileInfo {
        return {
            file,
            name: file.name,
            size: file.size,
            type: file.type,
            lastModified: file.lastModified,
        };
    }

    /**
     * Batch get file information
     * 
     * @param files - Array of files
     * @returns Array of file information objects
     */
    static getFilesInfo(files: File[]): ImageFileInfo[] {
        return files.map(f => ImageCompressionService.getFileInfo(f));
    }

    /**
     * Update configuration
     * 
     * @param config - New configuration (partial update supported)
     */
    updateConfig(config: Partial<ImageCompressionConfig>): void {
        this.config = { ...this.config, ...config };
    }

    /**
     * Get current configuration
     */
    getConfig(): ImageCompressionConfig {
        return { ...this.config };
    }
}

/**
 * Singleton instance for convenience
 */
export const imageCompressionService = new ImageCompressionService();
