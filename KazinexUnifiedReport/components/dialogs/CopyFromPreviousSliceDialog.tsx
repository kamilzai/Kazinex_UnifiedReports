/**
 * CopyFromPreviousSliceDialog Component
 * 
 * Main orchestrator for the copy from previous slice feature
 * Features:
 * - Two-step wizard (Slice → Section)
 * - Auto-filters by current project and report design
 * - Step indicator showing progress
 * - Back/Next/Cancel/Copy buttons
 * - Integration with useCopyFromPreviousSlice hook
 * - Shows progress overlay during copy
 */

import * as React from 'react';
import { ProjectSelector } from './ProjectSelector';
import { SliceSelector } from './SliceSelector';
import { SectionSelector } from './SectionSelector';
import { CopyProgressDialog } from './CopyProgressDialog';
import { Notification } from './Notification';
import type { ProjectWithSlices, SectionInfo, SliceFilters, CopyProgress } from '../../types/slice-copy.types';

export interface CopyFromPreviousSliceDialogProps {
  // Dialog state
  isOpen: boolean;
  onClose: () => void;
  
  // Wizard state
  step: 'slice' | 'section';
  
  // Step 1: Slice selection
  slices: Array<{
    sliceId: string;
    name?: string;
    description?: string;
    dataDate?: Date;
    refNo?: string;
    sliceType?: string;
    rowCount: number;
    createdon?: Date;
  }>;
  currentSliceId: string | null;  // The slice we're currently viewing (to exclude from list)
  selectedSlice: string | null;    // The slice selected in the dialog (for copying FROM)
  onSliceSelect: (sliceId: string) => void;
  isLoadingSlices: boolean;
  sliceFilters: SliceFilters;
  onFiltersChange: (filters: SliceFilters) => void;
  
  // Step 2: Section selection
  sections: SectionInfo[];
  selectedSections: Set<string>;
  copyAllSections: boolean;
  onCopyAllChange: (copyAll: boolean) => void;
  onSectionToggle: (sectionId: string) => void;
  isLoadingSections: boolean;
  totalRowsSelected: number;
  
  // Navigation
  onNext: () => void;
  onBack: () => void;
  canProceed: boolean;
  
  // Copy execution
  onCopy: () => void;
  isCopying: boolean;
  copyProgress: CopyProgress | null;
  
  // Error and success
  errorMessage: string | null;
  successMessage: string | null;
  onDismissError: () => void;
}

export const CopyFromPreviousSliceDialog: React.FC<CopyFromPreviousSliceDialogProps> = (props) => {
  if (!props.isOpen) {
    return null;
  }

  const getStepNumber = (): number => {
    switch (props.step) {
      case 'slice': return 1;
      case 'section': return 2;
      default: return 1;
    }
  };

  const getStepTitle = (): string => {
    switch (props.step) {
      case 'slice': return 'Select Slice to Copy From';
      case 'section': return 'Select Sections';
      default: return '';
    }
  };

  const isFirstStep = props.step === 'slice';
  const isLastStep = props.step === 'section';

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !props.isCopying) {
      props.onClose();
    }
  };

  return (
    <>
      {/* Main Dialog */}
      <div style={styles.overlay} onClick={handleOverlayClick}>
        <div style={styles.dialog}>
          {/* Header */}
          <div style={styles.header}>
            <div style={styles.headerTop}>
              <h2 style={styles.dialogTitle}>Copy from Previous Slice</h2>
              {!props.isCopying && (
                <button
                  onClick={props.onClose}
                  style={styles.closeButton}
                  aria-label="Close"
                >
                  ✕
                </button>
              )}
            </div>
            
            {/* Step Indicator */}
            <div style={styles.stepIndicator}>
              <div style={styles.stepItem}>
                <div style={{
                  ...styles.stepCircle,
                  ...(getStepNumber() >= 1 ? styles.stepCircleActive : {})
                }}>
                  {getStepNumber() > 1 ? '✓' : '1'}
                </div>
                <div style={styles.stepLabel}>Slice</div>
              </div>
              
              <div style={styles.stepLine} />
              
              <div style={styles.stepItem}>
                <div style={{
                  ...styles.stepCircle,
                  ...(getStepNumber() >= 2 ? styles.stepCircleActive : {})
                }}>
                  {getStepNumber() > 2 ? '✓' : '2'}
                </div>
                <div style={styles.stepLabel}>Sections</div>
              </div>
              
              <div style={styles.stepLine} />
              
            </div>
          </div>
          
          {/* Content */}
          <div style={styles.content}>
            {/* Error/Success Notifications */}
            {props.errorMessage && (
              <Notification
                message={props.errorMessage}
                type="error"
                onDismiss={props.onDismissError}
              />
            )}
            {props.successMessage && (
              <Notification
                message={props.successMessage}
                type="success"
              />
            )}
            
            {props.step === 'slice' && (
              <SliceSelector
                slices={props.slices}
                currentSliceId={props.currentSliceId}
                selectedSlice={props.selectedSlice}
                onSliceSelect={props.onSliceSelect}
                isLoading={props.isLoadingSlices}
                filters={props.sliceFilters}
                onFiltersChange={props.onFiltersChange}
              />
            )}
            
            {props.step === 'section' && (
              <SectionSelector
                sections={props.sections}
                selectedSections={props.selectedSections}
                copyAllSections={props.copyAllSections}
                onCopyAllChange={props.onCopyAllChange}
                onSectionToggle={props.onSectionToggle}
                isLoading={props.isLoadingSections}
                totalRowsSelected={props.totalRowsSelected}
              />
            )}
          </div>
          
          {/* Footer */}
          <div style={styles.footer}>
            <div style={styles.footerLeft}>
              {!isFirstStep && (
                <button
                  onClick={props.onBack}
                  disabled={props.isCopying}
                  style={{
                    ...styles.button,
                    ...styles.buttonSecondary,
                    ...(props.isCopying ? styles.buttonDisabled : {})
                  }}
                >
                  ← Back
                </button>
              )}
            </div>
            
            <div style={styles.footerRight}>
              <button
                onClick={props.onClose}
                disabled={props.isCopying}
                style={{
                  ...styles.button,
                  ...styles.buttonSecondary,
                  ...(props.isCopying ? styles.buttonDisabled : {})
                }}
              >
                Cancel
              </button>
              
              {!isLastStep ? (
                <button
                  onClick={props.onNext}
                  disabled={!props.canProceed || props.isCopying}
                  style={{
                    ...styles.button,
                    ...styles.buttonPrimary,
                    ...(!props.canProceed || props.isCopying ? styles.buttonDisabled : {})
                  }}
                >
                  Next →
                </button>
              ) : (
                <button
                  onClick={props.onCopy}
                  disabled={!props.canProceed || props.isCopying}
                  style={{
                    ...styles.button,
                    ...styles.buttonPrimary,
                    ...(!props.canProceed || props.isCopying ? styles.buttonDisabled : {})
                  }}
                >
                  {props.isCopying ? 'Copying...' : 'Copy Data'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Copy Progress Overlay */}
      <CopyProgressDialog
        isOpen={props.isCopying}
        progress={props.copyProgress}
      />
    </>
  );
};

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9000
  },
  dialog: {
    backgroundColor: '#ffffff',
    borderRadius: 4,
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
    width: '90%',
    maxWidth: 800,
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column'
  },
  header: {
    padding: '20px 24px',
    borderBottom: '1px solid #edebe9'
  },
  headerTop: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20
  },
  dialogTitle: {
    margin: 0,
    fontSize: 20,
    fontWeight: 600,
    color: '#323130'
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: 20,
    color: '#605e5c',
    cursor: 'pointer',
    padding: 4,
    lineHeight: 1,
    width: 32,
    height: 32,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  stepIndicator: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  stepItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8
  },
  stepCircle: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    backgroundColor: '#edebe9',
    color: '#605e5c',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 14,
    fontWeight: 600,
    transition: 'all 0.2s'
  },
  stepCircleActive: {
    backgroundColor: '#0078d4',
    color: '#ffffff'
  },
  stepLabel: {
    fontSize: 12,
    color: '#605e5c',
    fontWeight: 600
  },
  stepLine: {
    width: 80,
    height: 2,
    backgroundColor: '#edebe9',
    margin: '0 8px',
    marginBottom: 24
  },
  content: {
    flex: 1,
    padding: 24,
    overflowY: 'auto'
  },
  footer: {
    padding: '16px 24px',
    borderTop: '1px solid #edebe9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  footerLeft: {
    display: 'flex',
    gap: 8
  },
  footerRight: {
    display: 'flex',
    gap: 8
  },
  button: {
    padding: '8px 16px',
    fontSize: 14,
    fontWeight: 600,
    border: 'none',
    borderRadius: 2,
    cursor: 'pointer',
    transition: 'all 0.1s'
  },
  buttonPrimary: {
    backgroundColor: '#0078d4',
    color: '#ffffff'
  },
  buttonSecondary: {
    backgroundColor: '#ffffff',
    color: '#323130',
    border: '1px solid #8a8886'
  },
  buttonDisabled: {
    opacity: 0.4,
    cursor: 'not-allowed'
  }
};
