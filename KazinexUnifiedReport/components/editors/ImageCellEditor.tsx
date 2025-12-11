/**
 * Image Cell Editor Component
 * 
 * Main editor component for Image data type columns.
 * Supports: Browse, drag & drop, paste, preview, and save.
 * Integrates with ImageCompressionService for automatic compression.
 */

import * as React from 'react';
import { ImageUploadPlaceholder } from './ImageUploadPlaceholder';
import { ImagePreviewPanel } from './ImagePreviewPanel';
import { ImageCompressionProgress } from './ImageCompressionProgress';
import { imageCompressionService } from '../../services/ImageCompressionService';
import { CompressionResult } from '../../types/image.types';

export interface ImageCellEditorProps {
    value: string | null;           // Base64 string or null
    readonly?: boolean;
    rowIndex: number;
    columnName: string;
    onSave: (base64Value: string) => void;
    onCancel: () => void;
}

export const ImageCellEditor: React.FC<ImageCellEditorProps> = ({
    value,
    readonly,
    rowIndex,
    columnName,
    onSave,
    onCancel,
}) => {
    const [currentImage, setCurrentImage] = React.useState<string | null>(value);
    const [isCompressing, setIsCompressing] = React.useState(false);
    const [compressionResult, setCompressionResult] = React.useState<CompressionResult | null>(null);
    const [error, setError] = React.useState<string | null>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    // Update current image when value prop changes
    React.useEffect(() => {
        setCurrentImage(value);
    }, [value]);

    // Handle file selection from browse dialog or drag & drop
    const handleFileSelect = async (files: FileList | File[]) => {
        if (readonly || files.length === 0) return;

        setError(null);
        setIsCompressing(true);
        setCompressionResult(null);

        try {
            // Take first file only (single image editor)
            const file = files[0];

            // Compress image
            const result = await imageCompressionService.compressSingle(file);

            setCompressionResult(result);

            if (result.success && result.base64DataUrl) {
                setCurrentImage(result.base64DataUrl);
            } else {
                setError(result.error || 'Image processing failed');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unexpected error occurred');
        } finally {
            setIsCompressing(false);
        }
    };

    // Handle remove image
    const handleRemove = () => {
        setCurrentImage(null);
        setCompressionResult(null);
        setError(null);
    };

    // Handle save
    const handleSave = () => {
        if (currentImage) {
            onSave(currentImage);
        }
    };

    // Handle browse button click
    const handleBrowseClick = () => {
        fileInputRef.current?.click();
    };

    // Handle file input change
    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            handleFileSelect(files);
        }
        // Reset input value to allow selecting the same file again
        e.target.value = '';
    };

    // Handle paste from clipboard
    const handlePaste = async (e: React.ClipboardEvent) => {
        if (readonly) return;

        const items = e.clipboardData?.items;
        if (!items) return;

        // Look for image items
        const imageFiles: File[] = [];
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const file = items[i].getAsFile();
                if (file) {
                    imageFiles.push(file);
                }
            }
        }

        if (imageFiles.length > 0) {
            e.preventDefault();
            await handleFileSelect(imageFiles);
        }
    };

    // Handle keyboard shortcuts
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            onCancel();
        } else if (e.key === 'Enter' && e.ctrlKey && currentImage) {
            handleSave();
        }
    };

    // Generate cell key for parent to locate this editor (using columnName as prop)
    const cellKey = rowIndex !== undefined && columnName ? `row-${rowIndex}|${columnName}|${columnName}` : undefined;
    
    return (
        <div
            onPaste={handlePaste}
            onKeyDown={handleKeyDown}
            tabIndex={0}
            data-cell-key={cellKey}
            style={{
                width: '100%',
                minHeight: '300px',
                padding: '20px',
                backgroundColor: '#fff',
                borderRadius: '8px',
                border: '1px solid #e0e0e0',
                boxSizing: 'border-box',
                outline: 'none',
            }}
        >
            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/bmp,image/gif,image/webp"
                onChange={handleFileInputChange}
                style={{ display: 'none' }}
                disabled={readonly}
            />

            {/* Header */}
            <div style={{
                marginBottom: '20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
            }}>
                <h3 style={{
                    margin: 0,
                    fontSize: '16px',
                    fontWeight: 600,
                    color: '#333',
                }}>
                    {currentImage ? 'Image Preview' : 'Upload Image'}
                </h3>

                {readonly && (
                    <span style={{
                        fontSize: '12px',
                        color: '#999',
                        fontStyle: 'italic',
                    }}>
                        Read Only
                    </span>
                )}
            </div>

            {/* Content */}
            {isCompressing ? (
                // Show processing progress
                <ImageCompressionProgress
                    message="Processing image..."
                    percent={undefined}
                />
            ) : currentImage ? (
                // Show image preview
                <ImagePreviewPanel
                    base64={currentImage}
                    compressionResult={compressionResult}
                    onRemove={handleRemove}
                    readonly={readonly}
                />
            ) : (
                // Show upload placeholder
                <ImageUploadPlaceholder
                    onFilesDrop={handleFileSelect}
                    onBrowseClick={handleBrowseClick}
                    readonly={readonly}
                />
            )}

            {/* Error Message */}
            {error && (
                <div style={{
                    marginTop: '16px',
                    padding: '12px',
                    backgroundColor: '#fff0f0',
                    borderRadius: '4px',
                    border: '1px solid #ffcccc',
                }}>
                    <p style={{
                        margin: 0,
                        fontSize: '13px',
                        color: '#d32f2f',
                    }}>
                        <strong>Error:</strong> {error}
                    </p>
                </div>
            )}

            {/* Action Buttons */}
            <div style={{
                marginTop: '20px',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px',
            }}>
                <button
                    onClick={onCancel}
                    style={{
                        padding: '8px 20px',
                        fontSize: '14px',
                        fontWeight: 500,
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        backgroundColor: '#fff',
                        color: '#333',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#f5f5f5';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#fff';
                    }}
                >
                    Cancel
                </button>

                <button
                    onClick={handleSave}
                    disabled={!currentImage || readonly || isCompressing}
                    style={{
                        padding: '8px 20px',
                        fontSize: '14px',
                        fontWeight: 500,
                        border: 'none',
                        borderRadius: '4px',
                        backgroundColor: (!currentImage || readonly || isCompressing) ? '#ccc' : '#0078d4',
                        color: '#fff',
                        cursor: (!currentImage || readonly || isCompressing) ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                        if (currentImage && !readonly && !isCompressing) {
                            e.currentTarget.style.backgroundColor = '#005a9e';
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (currentImage && !readonly && !isCompressing) {
                            e.currentTarget.style.backgroundColor = '#0078d4';
                        }
                    }}
                    title={
                        !currentImage
                            ? 'No image to save'
                            : readonly
                            ? 'Cannot save in read-only mode'
                            : isCompressing
                            ? 'Please wait for processing to complete'
                            : 'Save image (Ctrl+Enter)'
                    }
                >
                    Save
                </button>
            </div>

            {/* Keyboard shortcuts hint */}
            <div style={{
                marginTop: '12px',
                fontSize: '11px',
                color: '#999',
                textAlign: 'right',
            }}>
                Press <strong>Esc</strong> to cancel, <strong>Ctrl+V</strong> to paste, <strong>Ctrl+Enter</strong> to save
            </div>
        </div>
    );
};
