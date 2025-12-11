/**
 * Image Compression Progress Component
 * 
 * Displays progress indicator during image compression.
 * Shows spinner, message, and optional progress percentage.
 */

import * as React from 'react';

export interface ImageCompressionProgressProps {
    message: string;
    percent?: number;
}

export const ImageCompressionProgress: React.FC<ImageCompressionProgressProps> = ({
    message,
    percent,
}) => {
    return (
        <div style={{
            width: '100%',
            padding: '40px 20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#fafafa',
            borderRadius: '8px',
            border: '1px solid #e0e0e0',
        }}>
            {/* Spinner */}
            <div style={{
                width: '40px',
                height: '40px',
                border: '4px solid #f3f3f3',
                borderTop: '4px solid #0078d4',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                marginBottom: '20px',
            }} />

            {/* Message */}
            <p style={{
                margin: 0,
                fontSize: '14px',
                fontWeight: 500,
                color: '#333',
                marginBottom: percent !== undefined ? '12px' : 0,
            }}>
                {message}
            </p>

            {/* Progress percentage */}
            {percent !== undefined && (
                <div style={{ width: '100%', maxWidth: '300px' }}>
                    {/* Progress bar background */}
                    <div style={{
                        width: '100%',
                        height: '8px',
                        backgroundColor: '#e0e0e0',
                        borderRadius: '4px',
                        overflow: 'hidden',
                        marginBottom: '8px',
                    }}>
                        {/* Progress bar fill */}
                        <div style={{
                            width: `${Math.min(100, Math.max(0, percent))}%`,
                            height: '100%',
                            backgroundColor: '#0078d4',
                            transition: 'width 0.3s ease',
                        }} />
                    </div>

                    {/* Percentage text */}
                    <p style={{
                        margin: 0,
                        fontSize: '12px',
                        color: '#666',
                        textAlign: 'center',
                    }}>
                        {Math.round(percent)}%
                    </p>
                </div>
            )}

            {/* Keyframes for spinner animation */}
            <style>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};
