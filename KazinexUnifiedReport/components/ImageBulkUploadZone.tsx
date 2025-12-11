/**
 * Image Bulk Upload Zone Component
 * 
 * Displays a drop zone for bulk image uploads when image columns are present.
 * Similar to paste rows functionality but specifically for multiple image uploads.
 * 
 * Features:
 * - Drag & drop multiple images
 * - Click to browse for multiple images
 * - Paste multiple images from clipboard
 * - Shows when image columns exist in report structure
 */

import * as React from 'react';

export interface ImageBulkUploadZoneProps {
    /** Column name of the image column */
    imageColumnName: string;
    
    /** Display name of the image column */
    imageColumnDisplayName: string;
    
    /** Starting row index for bulk upload */
    startRowIndex: number;
    
    /** Callback when files are selected/dropped */
    onFilesSelected: (files: File[], startRowIndex: number, columnName: string) => void;
    
    /** Whether the zone is in a loading/processing state */
    isProcessing?: boolean;
}

export const ImageBulkUploadZone: React.FC<ImageBulkUploadZoneProps> = ({
    imageColumnName,
    imageColumnDisplayName,
    startRowIndex,
    onFilesSelected,
    isProcessing = false,
}) => {
    const [isDragOver, setIsDragOver] = React.useState(false);
    const [showHint, setShowHint] = React.useState(true);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    // Handle drag over
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(true);
    };

    // Handle drag leave
    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
    };

    // Handle drop
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);

        const files = Array.from(e.dataTransfer.files).filter(file =>
            file.type.startsWith('image/')
        );

        if (files.length > 0) {
            onFilesSelected(files, startRowIndex, imageColumnName);
        }
    };

    // Handle browse click
    const handleBrowseClick = () => {
        fileInputRef.current?.click();
    };

    // Handle file selection from browse
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            const imageFiles = Array.from(files).filter(file =>
                file.type.startsWith('image/')
            );
            if (imageFiles.length > 0) {
                onFilesSelected(imageFiles, startRowIndex, imageColumnName);
            }
        }
        // Reset input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    // Handle paste
    React.useEffect(() => {
        const handlePaste = (e: ClipboardEvent) => {
            if (!e.clipboardData) return;

            const items = e.clipboardData.items;
            const imageFiles: File[] = [];

            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                if (item.kind === 'file' && item.type.startsWith('image/')) {
                    const file = item.getAsFile();
                    if (file) {
                        imageFiles.push(file);
                    }
                }
            }

            if (imageFiles.length > 0) {
                e.preventDefault();
                onFilesSelected(imageFiles, startRowIndex, imageColumnName);
            }
        };

        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, [startRowIndex, imageColumnName, onFilesSelected]);

    // Auto-hide hint after 10 seconds
    React.useEffect(() => {
        const timer = setTimeout(() => setShowHint(false), 10000);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div
            style={{
                position: 'relative',
                padding: '8px 16px',
                margin: '8px 12px',
                border: isDragOver ? '2px dashed #0078d4' : '2px dashed #d0d0d0',
                borderRadius: '4px',
                backgroundColor: isDragOver ? '#f3f9fd' : '#fff',
                transition: 'all 0.2s ease',
                textAlign: 'center',
                cursor: isProcessing ? 'not-allowed' : 'pointer',
                opacity: isProcessing ? 0.6 : 1,
                boxShadow: isDragOver ? '0 2px 8px rgba(0, 120, 212, 0.15)' : '0 1px 3px rgba(0, 0, 0, 0.06)',
                minHeight: '48px',
                maxHeight: '48px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={isProcessing ? undefined : handleBrowseClick}
        >
            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                style={{ display: 'none' }}
                onChange={handleFileSelect}
                disabled={isProcessing}
            />

            {/* Single row compact message */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                {/* Icon */}
                <div
                    style={{
                        fontSize: '24px',
                        opacity: isDragOver ? 1 : 0.7,
                    }}
                >
                    🖼️
                </div>

                {/* Main message */}
                <div
                    style={{
                        fontSize: '13px',
                        fontWeight: '500',
                        color: '#323130',
                    }}
                >
                    {isProcessing ? 'Processing images...' : `Upload Multiple Images to "${imageColumnDisplayName}"`}
                </div>
                
                {/* Compact instructions */}
                {!isProcessing && (
                    <div
                        style={{
                            fontSize: '11px',
                            color: '#605e5c',
                        }}
                    >
                        <strong>Drag & drop</strong> • <strong>Click to browse</strong>
                    </div>
                )}
            </div>
        </div>
    );
};
