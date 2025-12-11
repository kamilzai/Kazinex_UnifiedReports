/**
 * Image Thumbnail Cell Component
 *
 * Lightweight cell renderer for displaying image thumbnails in the grid.
 * Phase 6 Enhancement: Features lazy loading with Intersection Observer,
 * IndexedDB caching, and performance monitoring.
 */

import * as React from 'react';
import { imageCacheService } from '../services/ImageCacheService';
import { useLazyImageLoading } from '../hooks/useLazyImageLoading';
import { performanceMonitor } from '../utils/performanceMonitor';

export interface ImageThumbnailCellProps {
    value: string | null;        // Base64 string
    recordId: string;
    fieldName: string;
    onClick?: () => void;
    readonly?: boolean;
}

export const ImageThumbnailCell: React.FC<ImageThumbnailCellProps> = ({
    value,
    recordId,
    fieldName,
    onClick,
    readonly,
}) => {
    const [thumbnail, setThumbnail] = React.useState<string | null>(null);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState(false);

    const previousValueRef = React.useRef<string | null>(null);
    const isMountedRef = React.useRef(true);

    // Phase 6: Lazy loading with Intersection Observer
    const { isVisible, elementRef } = useLazyImageLoading({
        threshold: 0.1,      // Load when 10% visible
        rootMargin: '50px',  // Start loading 50px before entering viewport
        triggerOnce: true,   // Only load once
    });

    React.useEffect(() => {
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    const loadThumbnail = React.useCallback(async () => {
        if (!value) {
            return;
        }

        setLoading(true);
        setError(false);

        const endTimer = performanceMonitor.startTimer('thumbnail_load');

        try {
            // Load thumbnail with caching (generates 48x48 thumbnail and caches in IndexedDB)
            const thumbnailBase64 = await imageCacheService.getThumbnail(
                recordId,
                fieldName,
                value
            );

            if (isMountedRef.current) {
                setThumbnail(thumbnailBase64);
            }

            endTimer({ success: true, recordId, fieldName });
        } catch (err) {
            if (isMountedRef.current) {
                console.error('Error loading image thumbnail:', err);
                setError(true);
            }
            endTimer({ success: false, error: String(err) });
        } finally {
            if (isMountedRef.current) {
                setLoading(false);
            }
        }
    }, [value, recordId, fieldName]);

    React.useEffect(() => {
        const synchronizeThumbnail = async () => {
            if (!value) {
                previousValueRef.current = null;

                if (isMountedRef.current) {
                    setThumbnail(null);
                    setLoading(false);
                    setError(false);
                }

                try {
                    await imageCacheService.clearEntry(recordId, fieldName);
                } catch (err) {
                    console.error('[ImageThumbnailCell] Failed to clear image cache entry:', err);
                }
                return;
            }

            const previousValue = previousValueRef.current;
            if (previousValue && previousValue !== value) {
                if (isMountedRef.current) {
                    setThumbnail(null); // Remove stale preview until new cache entry arrives
                }

                try {
                    await imageCacheService.clearEntry(recordId, fieldName);
                } catch (err) {
                    console.error('[ImageThumbnailCell] Failed to invalidate cache for updated image:', err);
                }
            }

            previousValueRef.current = value;

            if (isVisible) {
                await loadThumbnail();
            }
        };

        synchronizeThumbnail().catch(err => {
            console.error('[ImageThumbnailCell] Unexpected error while synchronizing thumbnail state:', err);
        });
    }, [value, recordId, fieldName, isVisible, loadThumbnail]);

    const handleClick = () => {
        if (!readonly && onClick) {
            onClick();
        }
    };

    // Empty state
    if (!value && !loading) {
        return (
            <div
                ref={elementRef}
                onClick={handleClick}
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: readonly ? 'default' : 'pointer',
                    backgroundColor: '#fafafa',
                    border: '1px solid #e0e0e0',
                    borderRadius: '4px',
                    minHeight: '48px',
                }}
            >
                <span style={{
                    fontSize: '11px',
                    color: '#999',
                }}>
                    {readonly ? 'No image' : 'Click to add'}
                </span>
            </div>
        );
    }

    // Loading state
    if (loading) {
        return (
            <div
                ref={elementRef}
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#fafafa',
                    border: '1px solid #e0e0e0',
                    borderRadius: '4px',
                    minHeight: '48px',
                }}
            >
                <div style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid #f3f3f3',
                    borderTop: '2px solid #0078d4',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                }} />
                <style>{`
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div
                ref={elementRef}
                onClick={handleClick}
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: readonly ? 'default' : 'pointer',
                    backgroundColor: '#fff5f5',
                    border: '1px solid #ffcccc',
                    borderRadius: '4px',
                    minHeight: '48px',
                }}
            >
                <span style={{
                    fontSize: '11px',
                    color: '#d32f2f',
                }}>
                    Error loading
                </span>
            </div>
        );
    }

    // Image display
    return (
        <div
            ref={elementRef}
            onClick={handleClick}
            style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: readonly ? 'default' : 'pointer',
                border: '1px solid #e0e0e0',
                borderRadius: '4px',
                overflow: 'hidden',
                backgroundColor: '#fff',
                minHeight: '48px',
                position: 'relative',
            }}
        >
            <img
                src={thumbnail || ''}
                alt="Thumbnail"
                style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain',
                    display: 'block',
                }}
                onError={() => setError(true)}
            />

            {/* Hover overlay for non-readonly cells */}
            {!readonly && (
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'background-color 0.2s',
                    pointerEvents: 'none',
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.1)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0)';
                }}>
                    <span style={{
                        color: '#fff',
                        fontSize: '11px',
                        fontWeight: 600,
                        textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                        opacity: 0,
                        transition: 'opacity 0.2s',
                    }}>
                        Click to edit
                    </span>
                </div>
            )}
        </div>
    );
};
