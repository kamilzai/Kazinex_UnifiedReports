/**
 * OperationProgressDialog Component
 * 
 * Full-screen overlay that shows save/delete operation progress
 * Features:
 * - Progress bar (0-100%) OR animated spinner
 * - Operation type (Saving, Deleting)
 * - Item progress (e.g., "Item 25 of 45")
 * - Overall percentage complete
 * - Optional context message
 * 
 * Similar to CopyProgressDialog but generic for any batch operation
 */

import * as React from 'react';

// Add CSS animation for spinner
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(styleSheet);
}

export interface OperationProgress {
  currentItem: number;
  totalItems: number;
  percentComplete: number;
  context?: string; // Optional context (e.g., section name)
}

export interface OperationProgressDialogProps {
  isOpen: boolean;
  progress: OperationProgress | null;
  operationType: 'save' | 'delete';
  title?: string; // Optional custom title
  useSpinner?: boolean; // Use spinner instead of progress bar
}

export const OperationProgressDialog: React.FC<OperationProgressDialogProps> = ({
  isOpen,
  progress,
  operationType,
  title,
  useSpinner = false
}) => {
  if (!isOpen || !progress) {
    return null;
  }

  const progressBarWidth = `${progress.percentComplete}%`;
  const defaultTitle = operationType === 'save' ? 'Saving Changes...' : 'Deleting Rows...';
  const displayTitle = title || defaultTitle;

  return (
    <div style={styles.overlay}>
      <div style={styles.dialog}>
        <div style={styles.header}>
          <h2 style={styles.title}>{displayTitle}</h2>
        </div>
        
        <div style={styles.content}>
          {/* Optional context message */}
          {progress.context && (
            <div style={styles.context}>
              {progress.context}
            </div>
          )}
          
          {/* Item progress */}
          <div style={styles.itemProgress}>
            {useSpinner ? 'Processing...' : `Item ${progress.currentItem} of ${progress.totalItems}`}
          </div>
          
          {useSpinner ? (
            /* Spinner */
            <div style={styles.spinnerContainer}>
              <div style={styles.spinner} />
            </div>
          ) : (
            <>
              {/* Progress bar */}
              <div style={styles.progressBarContainer}>
                <div 
                  style={{
                    ...styles.progressBarFill,
                    width: progressBarWidth
                  }}
                />
              </div>
              
              {/* Percentage */}
              <div style={styles.percentage}>
                {progress.percentComplete}%
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000
  },
  dialog: {
    backgroundColor: '#ffffff',
    borderRadius: 4,
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
    width: '400px',
    maxWidth: '90%'
  },
  header: {
    padding: '16px 20px',
    borderBottom: '1px solid #edebe9'
  },
  title: {
    margin: 0,
    fontSize: 18,
    fontWeight: 600,
    color: '#323130'
  },
  content: {
    padding: '24px 20px'
  },
  context: {
    fontSize: 14,
    fontWeight: 600,
    color: '#323130',
    marginBottom: 8
  },
  itemProgress: {
    fontSize: 13,
    color: '#605e5c',
    marginBottom: 16
  },
  progressBarContainer: {
    width: '100%',
    height: 8,
    backgroundColor: '#f3f2f1',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#0078d4',
    transition: 'width 0.3s ease-in-out'
  },
  percentage: {
    fontSize: 24,
    fontWeight: 600,
    color: '#0078d4',
    textAlign: 'center',
    marginBottom: 12
  },
  spinnerContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: 80,
    marginTop: 16,
    marginBottom: 16
  },
  spinner: {
    width: 48,
    height: 48,
    border: '4px solid #f3f2f1',
    borderTop: '4px solid #0078d4',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  }
};
