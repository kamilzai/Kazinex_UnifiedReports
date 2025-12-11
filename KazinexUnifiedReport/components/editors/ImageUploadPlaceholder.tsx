/**
 * Image Upload Placeholder Component
 * 
 * Provides a clickable/draggable target for image upload.
 * Supports: Click to browse, drag & drop, paste from clipboard.
 */

import * as React from 'react';

export interface ImageUploadPlaceholderProps {
    onFilesDrop: (files: FileList | File[]) => void;
    onBrowseClick: () => void;
    readonly?: boolean;
}

export const ImageUploadPlaceholder: React.FC<ImageUploadPlaceholderProps> = ({
    onFilesDrop,
    onBrowseClick,
    readonly,
}) => {
    const [isDragOver, setIsDragOver] = React.useState(false);

    const handleDragOver = (e: React.DragEvent) => {
        if (readonly) return;
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        if (readonly) return;
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);

        const files = e.dataTransfer?.files;
        if (files && files.length > 0) {
            onFilesDrop(files);
        }
    };

    const handleClick = () => {
        if (readonly) return;
        onBrowseClick();
    };

    return (
        <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleClick}
            style={{
                width: '100%',
                height: '200px',
                border: isDragOver ? '2px dashed #0078d4' : '2px dashed #ccc',
                borderRadius: '8px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: readonly ? 'not-allowed' : 'pointer',
                backgroundColor: isDragOver ? '#f0f8ff' : '#fafafa',
                transition: 'all 0.2s ease',
                padding: '20px 20px 28px 20px',
                boxSizing: 'border-box',
            }}
        >
            {/* Upload Icon */}
            <svg
                width="48"
                height="48"
                viewBox="0 0 48 48"
                fill="none"
                style={{ marginBottom: '16px', opacity: readonly ? 0.4 : 0.6 }}
            >
                <path
                    d="M24 8L24 32M24 8L16 16M24 8L32 16"
                    stroke={isDragOver ? '#0078d4' : '#666'}
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
                <path
                    d="M8 32V38C8 39.1046 8.89543 40 10 40H38C39.1046 40 40 39.1046 40 38V32"
                    stroke={isDragOver ? '#0078d4' : '#666'}
                    strokeWidth="3"
                    strokeLinecap="round"
                />
            </svg>

            {/* Text */}
            <div style={{ textAlign: 'center' }}>
                <p style={{
                    margin: 0,
                    fontSize: '14px',
                    fontWeight: 600,
                    color: readonly ? '#999' : (isDragOver ? '#0078d4' : '#333'),
                    marginBottom: '8px',
                }}>
                    {readonly ? 'Read Only' : (isDragOver ? 'Drop image here' : 'Click to upload image')}
                </p>
                {!readonly && (
                    <p style={{
                        margin: 0,
                        fontSize: '12px',
                        color: '#666',
                    }}>
                        or drag and drop, or paste (Ctrl+V)
                    </p>
                )}
            </div>

            {/* Supported formats */}
            {!readonly && (
                <p style={{
                    margin: 0,
                    marginTop: '12px',
                    fontSize: '11px',
                    color: '#999',
                }}>
                    Supports: JPEG, PNG, BMP, GIF, WebP (max 100 MB)
                </p>
            )}
        </div>
    );
};
