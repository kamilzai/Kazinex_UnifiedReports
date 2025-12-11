/**
 * Bulk Image Upload Handler Component
 * 
 * Manages the workflow for uploading multiple images simultaneously.
 * Handles file validation, compression progress, and batch saving to Dataverse.
 * 
 * Features:
 * - File list display with validation status
 * - Real-time compression progress
 * - Batch processing with progress indicators
 * - Success/failure summary
 */

import * as React from 'react';
import { imageCompressionService } from '../../services/ImageCompressionService';
import { BulkUploadProgress, CompressionResult } from '../../types/image.types';
import { ImageCompressionProgress } from './ImageCompressionProgress';

export interface BulkImageUploadHandlerProps {
    files: File[];
    startRowIndex: number;
    columnName: string;
    onComplete: (results: Array<{ rowIndex: number; base64: string }>) => void;
    onCancel: () => void;
}

interface FileStatus {
    file: File;
    status: 'pending' | 'compressing' | 'success' | 'failed';
    result?: CompressionResult;
    error?: string;
}

export const BulkImageUploadHandler: React.FC<BulkImageUploadHandlerProps> = ({
    files,
    startRowIndex,
    columnName,
    onComplete,
    onCancel,
}) => {
    const [fileStatuses, setFileStatuses] = React.useState<FileStatus[]>(
        files.map((file: File) => ({ file, status: 'pending' as const }))
    );
    const [isProcessing, setIsProcessing] = React.useState(false);
    const [progress, setProgress] = React.useState<BulkUploadProgress | null>(null);
    const [processingComplete, setProcessingComplete] = React.useState(false);

    /**
     * Format bytes to human-readable string
     */
    const formatBytes = (bytes: number): string => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
    };

    /**
     * Format time remaining
     */
    const formatTimeRemaining = (seconds: number): string => {
        if (seconds < 60) return `${Math.round(seconds)}s`;
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.round(seconds % 60);
        return `${minutes}m ${remainingSeconds}s`;
    };

    /**
     * Handle progress updates during bulk compression
     */
    const handleProgress = React.useCallback((progressUpdate: BulkUploadProgress) => {
        setProgress(progressUpdate);
        
        // Update file statuses based on progress
        setFileStatuses((prev: FileStatus[]) => {
            const updated = [...prev];
            // Mark completed files
            for (let i = 0; i < progressUpdate.completedImages; i++) {
                if (updated[i].status === 'pending') {
                    updated[i].status = 'compressing';
                }
            }
            return updated;
        });
    }, []);

    /**
     * Start processing all images
     */
    const handleProcessImages = async () => {
        setIsProcessing(true);
        setProcessingComplete(false);

        try {
            // Compress all images with progress tracking
            const results = await imageCompressionService.compressBulk(
                files,
                handleProgress
            );

            // Update file statuses with results
            const updatedStatuses: FileStatus[] = files.map((file: File, index: number) => {
                const result = results[index];
                return {
                    file,
                    status: result.success ? ('success' as const) : ('failed' as const),
                    result,
                    error: result.error,
                };
            });

            setFileStatuses(updatedStatuses);
            setProcessingComplete(true);

            // Prepare successful results for saving
            const successfulResults: Array<{ rowIndex: number; base64: string }> = [];
            updatedStatuses.forEach((status: FileStatus, index: number) => {
                if (status.result?.success && status.result.base64DataUrl) {
                    successfulResults.push({
                        rowIndex: startRowIndex + index,
                        base64: status.result.base64DataUrl,
                    });
                }
            });

            // Auto-save if all succeeded
            if (successfulResults.length === files.length) {
                onComplete(successfulResults);
            }
        } catch (error) {
            console.error('[BulkImageUploadHandler] Processing error:', error);
            // Mark all as failed
            setFileStatuses((prev: FileStatus[]) =>
                prev.map((status: FileStatus) => ({
                    ...status,
                    status: 'failed' as const,
                    error: error instanceof Error ? error.message : 'Unknown error',
                }))
            );
            setProcessingComplete(true);
        } finally {
            setIsProcessing(false);
        }
    };

    /**
     * Get status icon
     */
    const getStatusIcon = (status: FileStatus['status']): string => {
        switch (status) {
            case 'pending': return '⏳';
            case 'compressing': return '🔄';
            case 'success': return '✅';
            case 'failed': return '❌';
        }
    };

    /**
     * Get summary counts
     */
    const successCount = fileStatuses.filter((s: FileStatus) => s.status === 'success').length;
    const failedCount = fileStatuses.filter((s: FileStatus) => s.status === 'failed').length;
    const pendingCount = fileStatuses.filter((s: FileStatus) => s.status === 'pending' || s.status === 'compressing').length;

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10000,
            }}
            onClick={(e) => {
                // Close on backdrop click (only if not processing)
                if (e.target === e.currentTarget && !isProcessing) {
                    onCancel();
                }
            }}
        >
            <div
                style={{
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    padding: '24px',
                    maxWidth: '600px',
                    width: '90%',
                    maxHeight: '80vh',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{ marginBottom: '16px' }}>
                    <h2 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: '600' }}>
                        Bulk Image Upload
                    </h2>
                    <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>
                        {processingComplete
                            ? `Processing complete: ${successCount} succeeded, ${failedCount} failed`
                            : `Processing ${files.length} image${files.length > 1 ? 's' : ''} for column "${columnName}"`
                        }
                    </p>
                </div>

                {/* Progress indicator during processing */}
                {isProcessing && progress && (
                    <div style={{ marginBottom: '16px' }}>
                        <ImageCompressionProgress
                            message={`Processing ${progress.currentFileName}...`}
                            percent={progress.percentComplete}
                        />
                        <div style={{ 
                            marginTop: '8px', 
                            fontSize: '12px', 
                            color: '#666',
                            display: 'flex',
                            justifyContent: 'space-between',
                        }}>
                            <span>
                                {progress.completedImages} of {progress.totalImages} complete
                            </span>
                            <span>
                                ~{formatTimeRemaining(progress.estimatedTimeRemaining || 0)} remaining
                            </span>
                        </div>
                    </div>
                )}

                {/* File list */}
                <div
                    style={{
                        flex: 1,
                        overflowY: 'auto',
                        border: '1px solid #e0e0e0',
                        borderRadius: '4px',
                        padding: '8px',
                        marginBottom: '16px',
                    }}
                >
                    {fileStatuses.map((status: FileStatus, index: number) => (
                        <div
                            key={index}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                padding: '8px',
                                marginBottom: '4px',
                                backgroundColor: status.status === 'failed' ? '#fff5f5' : 'transparent',
                                borderRadius: '4px',
                                fontSize: '13px',
                            }}
                        >
                            <span style={{ fontSize: '16px', marginRight: '8px' }}>
                                {getStatusIcon(status.status)}
                            </span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ 
                                    fontWeight: '500',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                }}>
                                    {status.file.name}
                                </div>
                                <div style={{ fontSize: '11px', color: '#666' }}>
                                    {formatBytes(status.file.size)}
                                </div>
                                {status.error && (
                                    <div style={{ fontSize: '11px', color: '#ef4444', marginTop: '2px' }}>
                                        {status.error}
                                    </div>
                                )}
                            </div>
                            <span style={{ 
                                fontSize: '11px', 
                                color: '#666',
                                marginLeft: '8px',
                            }}>
                                Row {startRowIndex + index}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Summary */}
                {processingComplete && (
                    <div style={{ 
                        padding: '12px',
                        backgroundColor: failedCount > 0 ? '#fff5f5' : '#f0fdf4',
                        borderRadius: '4px',
                        marginBottom: '16px',
                        fontSize: '13px',
                    }}>
                        <strong>Summary:</strong>
                        <div style={{ marginTop: '4px' }}>
                            ✅ {successCount} image{successCount !== 1 ? 's' : ''} processed successfully
                        </div>
                        {failedCount > 0 && (
                            <div style={{ color: '#ef4444' }}>
                                ❌ {failedCount} image{failedCount !== 1 ? 's' : ''} failed
                            </div>
                        )}
                    </div>
                )}

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    {!isProcessing && !processingComplete && (
                        <>
                            <button
                                onClick={onCancel}
                                style={{
                                    padding: '8px 16px',
                                    border: '1px solid #d0d0d0',
                                    borderRadius: '4px',
                                    backgroundColor: 'white',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleProcessImages}
                                style={{
                                    padding: '8px 16px',
                                    border: 'none',
                                    borderRadius: '4px',
                                    backgroundColor: '#0078d4',
                                    color: 'white',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    fontWeight: '500',
                                }}
                            >
                                Process {files.length} Image{files.length > 1 ? 's' : ''}
                            </button>
                        </>
                    )}

                    {processingComplete && (
                        <>
                            <button
                                onClick={onCancel}
                                style={{
                                    padding: '8px 16px',
                                    border: '1px solid #d0d0d0',
                                    borderRadius: '4px',
                                    backgroundColor: 'white',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                }}
                            >
                                Cancel
                            </button>
                            {successCount > 0 && (
                                <button
                                    onClick={() => {
                                        const successfulResults: Array<{ rowIndex: number; base64: string }> = [];
                                        fileStatuses.forEach((status: FileStatus, index: number) => {
                                            if (status.result?.success && status.result.base64DataUrl) {
                                                successfulResults.push({
                                                    rowIndex: startRowIndex + index,
                                                    base64: status.result.base64DataUrl,
                                                });
                                            }
                                        });
                                        onComplete(successfulResults);
                                    }}
                                    style={{
                                        padding: '8px 16px',
                                        border: 'none',
                                        borderRadius: '4px',
                                        backgroundColor: '#22c55e',
                                        color: 'white',
                                        cursor: 'pointer',
                                        fontSize: '14px',
                                        fontWeight: '500',
                                    }}
                                >
                                    Save {successCount} Image{successCount !== 1 ? 's' : ''}
                                </button>
                            )}
                        </>
                    )}

                    {isProcessing && (
                        <button
                            disabled
                            style={{
                                padding: '8px 16px',
                                border: 'none',
                                borderRadius: '4px',
                                backgroundColor: '#e0e0e0',
                                color: '#999',
                                cursor: 'not-allowed',
                                fontSize: '14px',
                            }}
                        >
                            Processing...
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
