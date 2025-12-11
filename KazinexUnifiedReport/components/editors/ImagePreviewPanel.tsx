/**
 * Image Preview Panel Component
 * 
 * Displays compressed image preview with compression statistics.
 * Shows original size, compressed size, savings, quality, dimensions, and processing time.
 */

import * as React from 'react';
import { CompressionResult } from '../../types/image.types';

export interface ImagePreviewPanelProps {
    base64: string;
    compressionResult: CompressionResult | null;
    onRemove: () => void;
    readonly?: boolean;
}

export const ImagePreviewPanel: React.FC<ImagePreviewPanelProps> = ({
    base64,
    compressionResult,
    onRemove,
    readonly,
}) => {
    const formatBytes = (bytes: number): string => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
    };

    const formatTime = (ms: number): string => {
        if (ms < 1000) return `${Math.round(ms)}ms`;
        return `${(ms / 1000).toFixed(2)}s`;
    };

    return (
        <div style={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
        }}>
            {/* Image Preview */}
            <div style={{
                width: '100%',
                maxWidth: '400px',
                margin: '0 auto',
                position: 'relative',
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                overflow: 'hidden',
                backgroundColor: '#fff',
            }}>
                <img
                    src={base64}
                    alt="Preview"
                    style={{
                        width: '100%',
                        height: 'auto',
                        display: 'block',
                    }}
                />

                {/* Download button */}
                <button
                    onClick={() => {
                        const link = document.createElement('a');
                        link.href = base64;
                        link.download = `image_${Date.now()}.png`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                    }}
                    style={{
                        position: 'absolute',
                        top: '8px',
                        left: '8px',
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        border: 'none',
                        backgroundColor: 'rgba(0, 0, 0, 0.6)',
                        color: '#fff',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '16px',
                        transition: 'background-color 0.2s',
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
                    }}
                    title="Download image"
                >
                    ⬇
                </button>

                {/* Remove button */}
                {!readonly && (
                    <button
                        onClick={onRemove}
                        style={{
                            position: 'absolute',
                            top: '8px',
                            right: '8px',
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            border: 'none',
                            backgroundColor: 'rgba(0, 0, 0, 0.6)',
                            color: '#fff',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '18px',
                            fontWeight: 'bold',
                            transition: 'background-color 0.2s',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
                        }}
                        title="Remove image"
                    >
                        ×
                    </button>
                )}
            </div>

            {/* Compression Statistics */}
            {compressionResult && compressionResult.success && (
                <div style={{
                    backgroundColor: '#f5f5f5',
                    borderRadius: '8px',
                    padding: '16px',
                    border: '1px solid #e0e0e0',
                }}>
                    <h4 style={{
                        margin: '0 0 12px 0',
                        fontSize: '14px',
                        fontWeight: 600,
                        color: '#333',
                    }}>
                        Compression Details
                    </h4>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '12px',
                        fontSize: '12px',
                    }}>
                        {/* Original Size */}
                        <div>
                            <span style={{ color: '#666', display: 'block', marginBottom: '4px' }}>
                                Original Size:
                            </span>
                            <span style={{ color: '#333', fontWeight: 500 }}>
                                {formatBytes(compressionResult.originalSizeBytes)}
                            </span>
                        </div>

                        {/* Compressed Size */}
                        <div>
                            <span style={{ color: '#666', display: 'block', marginBottom: '4px' }}>
                                Compressed Size:
                            </span>
                            <span style={{ color: '#333', fontWeight: 500 }}>
                                {formatBytes(compressionResult.compressedSizeBytes || 0)}
                            </span>
                        </div>

                        {/* Savings */}
                        <div>
                            <span style={{ color: '#666', display: 'block', marginBottom: '4px' }}>
                                Savings:
                            </span>
                            <span style={{ color: '#0078d4', fontWeight: 600 }}>
                                {compressionResult.compressionRatio
                                    ? `${Math.round((1 - compressionResult.compressionRatio) * 100)}%`
                                    : 'N/A'}
                            </span>
                        </div>

                        {/* Quality */}
                        <div>
                            <span style={{ color: '#666', display: 'block', marginBottom: '4px' }}>
                                Quality:
                            </span>
                            <span style={{ color: '#333', fontWeight: 500 }}>
                                {compressionResult.finalQuality
                                    ? `${Math.round(compressionResult.finalQuality * 100)}%`
                                    : 'N/A'}
                            </span>
                        </div>

                        {/* Dimensions */}
                        <div>
                            <span style={{ color: '#666', display: 'block', marginBottom: '4px' }}>
                                Dimensions:
                            </span>
                            <span style={{ color: '#333', fontWeight: 500 }}>
                                {compressionResult.finalDimensions
                                    ? `${compressionResult.finalDimensions.width} × ${compressionResult.finalDimensions.height}`
                                    : 'N/A'}
                            </span>
                        </div>

                        {/* Processing Time */}
                        <div>
                            <span style={{ color: '#666', display: 'block', marginBottom: '4px' }}>
                                Processing Time:
                            </span>
                            <span style={{ color: '#333', fontWeight: 500 }}>
                                {compressionResult.compressionTimeMs !== undefined
                                    ? formatTime(compressionResult.compressionTimeMs)
                                    : 'N/A'}
                            </span>
                        </div>

                        {/* Attempts */}
                        {compressionResult.attempts !== undefined && (
                            <div style={{ gridColumn: '1 / -1' }}>
                                <span style={{ color: '#666', display: 'block', marginBottom: '4px' }}>
                                    Compression Attempts:
                                </span>
                                <span style={{ color: '#333', fontWeight: 500 }}>
                                    {compressionResult.attempts}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Error Display */}
            {compressionResult && !compressionResult.success && (
                <div style={{
                    backgroundColor: '#fff0f0',
                    borderRadius: '8px',
                    padding: '16px',
                    border: '1px solid #ffcccc',
                }}>
                    <h4 style={{
                        margin: '0 0 8px 0',
                        fontSize: '14px',
                        fontWeight: 600,
                        color: '#d32f2f',
                    }}>
                        Compression Failed
                    </h4>
                    <p style={{
                        margin: 0,
                        fontSize: '12px',
                        color: '#d32f2f',
                    }}>
                        {compressionResult.error || 'Unknown error occurred'}
                    </p>
                </div>
            )}
        </div>
    );
};
