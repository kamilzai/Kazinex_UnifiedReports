/**
 * Loading Spinner Component
 * Displays a loading indicator during async operations (save, delete, copy, tab switching)
 */

import * as React from 'react';

export interface LoadingSpinnerProps {
  message?: string;
  size?: 'small' | 'medium' | 'large';
  overlay?: boolean; // If true, covers the entire component area
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  message = 'Loading...', 
  size = 'medium',
  overlay = false 
}) => {
  const spinnerSize = size === 'small' ? 16 : size === 'medium' ? 24 : 32;
  const fontSize = size === 'small' ? 12 : size === 'medium' ? 14 : 16;

  const containerStyle: React.CSSProperties = overlay ? {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    zIndex: 1000,
    backdropFilter: 'blur(2px)',
  } : {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
  };

  const spinnerContainerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
  };

  const spinnerStyle: React.CSSProperties = {
    width: `${spinnerSize}px`,
    height: `${spinnerSize}px`,
    border: `${Math.max(2, spinnerSize / 8)}px solid #f3f2f1`,
    borderTop: `${Math.max(2, spinnerSize / 8)}px solid #0078d4`,
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  };

  const messageStyle: React.CSSProperties = {
    fontSize: `${fontSize}px`,
    color: '#605e5c',
    fontWeight: 400,
    textAlign: 'center',
  };

  return (
    <>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
      <div style={containerStyle}>
        <div style={spinnerContainerStyle}>
          <div style={spinnerStyle} />
          {message && <div style={messageStyle}>{message}</div>}
        </div>
      </div>
    </>
  );
};
