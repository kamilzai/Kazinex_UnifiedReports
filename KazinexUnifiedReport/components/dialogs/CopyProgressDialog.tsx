/**
 * CopyProgressDialog Component
 * 
 * Full-screen overlay that shows copy operation progress
 * Features:
 * - Progress bar (0-100%)
 * - Current section name
 * - Row progress (e.g., "Row 25 of 45")
 * - Overall percentage complete
 * - Section progress (e.g., "Section 2 of 4")
 */

import * as React from 'react';
import type { CopyProgress } from '../../types/slice-copy.types';

export interface CopyProgressDialogProps {
  isOpen: boolean;
  progress: CopyProgress | null;
}

export const CopyProgressDialog: React.FC<CopyProgressDialogProps> = ({
  isOpen,
  progress
}) => {
  if (!isOpen || !progress) {
    return null;
  }

  const progressBarWidth = `${progress.percentComplete}%`;

  return (
    <div style={styles.overlay}>
      <div style={styles.dialog}>
        <div style={styles.header}>
          <h2 style={styles.title}>Copying Data...</h2>
        </div>
        
        <div style={styles.content}>
          {/* Section name */}
          <div style={styles.sectionName}>
            Processing: {progress.currentSectionName}
          </div>
          
          {/* Row progress */}
          <div style={styles.rowProgress}>
            Row {progress.currentRow} of {progress.totalRows}
          </div>
          
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
          
          {/* Section progress */}
          <div style={styles.sectionProgress}>
            Section {progress.currentSectionIndex} of {progress.totalSections}
          </div>
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
  sectionName: {
    fontSize: 14,
    fontWeight: 600,
    color: '#323130',
    marginBottom: 8
  },
  rowProgress: {
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
  sectionProgress: {
    fontSize: 13,
    color: '#605e5c',
    textAlign: 'center'
  }
};
