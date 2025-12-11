/**
 * Notification Component
 * 
 * Simple notification banner for success/error messages
 */

import * as React from 'react';

export interface NotificationProps {
  message: string;
  type: 'success' | 'error';
  onDismiss?: () => void;
}

export const Notification: React.FC<NotificationProps> = ({ message, type, onDismiss }) => {
  const isError = type === 'error';
  
  return (
    <div style={{
      ...styles.container,
      ...(isError ? styles.error : styles.success)
    }}>
      <div style={styles.icon}>
        {isError ? '⚠️' : '✓'}
      </div>
      <div style={styles.message}>{message}</div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          style={styles.dismissButton}
          aria-label="Dismiss"
        >
          ✕
        </button>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 16px',
    borderRadius: 4,
    marginBottom: 16,
    gap: 12
  },
  success: {
    backgroundColor: '#dff6dd',
    border: '1px solid #0b6a0b',
    color: '#0b6a0b'
  },
  error: {
    backgroundColor: '#fde7e9',
    border: '1px solid #d13438',
    color: '#d13438'
  },
  icon: {
    fontSize: 20,
    fontWeight: 'bold',
    lineHeight: 1
  },
  message: {
    flex: 1,
    fontSize: 14,
    lineHeight: '20px'
  },
  dismissButton: {
    background: 'none',
    border: 'none',
    fontSize: 18,
    color: 'inherit',
    cursor: 'pointer',
    padding: 4,
    lineHeight: 1,
    width: 24,
    height: 24,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.7
  }
};
