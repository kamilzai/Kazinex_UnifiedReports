/**
 * ActionBar Component
 * 
 * Displays Save and Cancel buttons for grid editing operations.
 * 
 * Day 5: Batch save UI
 */

import * as React from 'react';

export interface ActionBarProps {
  // State
  hasDirtyChanges: boolean;
  dirtyCount: number;
  validationErrorCount: number;
  hasValidationErrors: boolean;
  isSaving: boolean;
  saveSuccess: boolean;
  saveError: string | null;
  isAddingRow?: boolean;
  isDeletingRow?: boolean;
  operationError?: string | null;
  
  // Actions
  onSave: () => void;
  onCancel: () => void;
  onAddRow?: () => void;
}

/**
 * Action Bar Component
 * 
 * Features:
 * - Save button (disabled when no changes or saving)
 * - Cancel button (reverts all changes)
 * - Visual feedback for save state
 * - Success/error messages
 */
export const ActionBar: React.FC<ActionBarProps> = ({
  hasDirtyChanges,
  dirtyCount,
  validationErrorCount,
  hasValidationErrors,
  isSaving,
  saveSuccess,
  saveError,
  isAddingRow,
  isDeletingRow,
  operationError,
  onSave,
  onCancel,
  onAddRow,
}) => {
  const [showCancelConfirm, setShowCancelConfirm] = React.useState<boolean>(false);

  const handleCancelClick = () => {
    if (dirtyCount > 5) {
      // Show confirmation for large number of changes
      setShowCancelConfirm(true);
    } else {
      // Direct cancel for small changes
      onCancel();
    }
  };

  const confirmCancel = () => {
    setShowCancelConfirm(false);
    onCancel();
  };

  return (
    <div
      style={{
        padding: '12px 20px',
        backgroundColor: '#fff',
        borderTop: '2px solid #ddd',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '16px',
      }}
    >
      {/* Left side - Status messages */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        {/* Validation Errors (highest priority) */}
        {hasValidationErrors && (
          <span 
            style={{ 
              fontSize: '14px', 
              color: '#d13438',
              fontWeight: 'bold',
              padding: '4px 12px',
              backgroundColor: '#ffebee',
              border: '1px solid #d13438',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            ⚠️ {validationErrorCount} validation error{validationErrorCount !== 1 ? 's' : ''}
          </span>
        )}
        
        {/* Dirty Changes */}
        {hasDirtyChanges && !isSaving && !hasValidationErrors && (
          <span style={{ fontSize: '14px', color: '#666' }}>
            📝 {dirtyCount} unsaved change{dirtyCount !== 1 ? 's' : ''}
          </span>
        )}
        
        {/* Saving State */}
        {isSaving && (
          <span style={{ fontSize: '14px', color: '#0078d4' }}>
            ⏳ Saving changes...
          </span>
        )}
        
        {/* Save Success */}
        {saveSuccess && (
          <span style={{ fontSize: '14px', color: '#107c10', fontWeight: 'bold' }}>
            ✅ Changes saved successfully!
          </span>
        )}
        
        {/* Save Error */}
        {saveError && (
          <span style={{ fontSize: '14px', color: '#d13438', fontWeight: 'bold' }}>
            ❌ Error: {saveError}
          </span>
        )}
        
        {/* Operation Error (Add/Delete) */}
        {operationError && (
          <span style={{ fontSize: '14px', color: '#d13438', fontWeight: 'bold' }}>
            ❌ Operation Error: {operationError}
          </span>
        )}
        
        {/* Adding Row State */}
        {isAddingRow && (
          <span style={{ fontSize: '14px', color: '#0078d4' }}>
            ⏳ Creating new row...
          </span>
        )}
        
        {/* Deleting Row State */}
        {isDeletingRow && (
          <span style={{ fontSize: '14px', color: '#0078d4' }}>
            ⏳ Deleting row...
          </span>
        )}
      </div>

      {/* Right side - Action buttons */}
      <div style={{ display: 'flex', gap: '12px' }}>
        {/* Add Row button */}
        {onAddRow && (
          <button
            onClick={onAddRow}
            disabled={isAddingRow || isSaving}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              backgroundColor: isAddingRow || isSaving ? '#f3f2f1' : '#107c10',
              color: isAddingRow || isSaving ? '#a19f9d' : '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: isAddingRow || isSaving ? 'not-allowed' : 'pointer',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            {isAddingRow ? '⏳ Adding...' : '➕ Add Row'}
          </button>
        )}

        <button
          onClick={handleCancelClick}
          disabled={!hasDirtyChanges || isSaving}
          style={{
            padding: '8px 16px',
            fontSize: '14px',
            backgroundColor: !hasDirtyChanges || isSaving ? '#f3f2f1' : '#fff',
            color: !hasDirtyChanges || isSaving ? '#a19f9d' : '#323130',
            border: '1px solid #ddd',
            borderRadius: '4px',
            cursor: !hasDirtyChanges || isSaving ? 'not-allowed' : 'pointer',
            fontWeight: '500',
          }}
        >
          Cancel
        </button>

        <button
          onClick={onSave}
          disabled={!hasDirtyChanges || isSaving || hasValidationErrors}
          style={{
            padding: '8px 24px',
            fontSize: '14px',
            backgroundColor: !hasDirtyChanges || isSaving || hasValidationErrors ? '#e1e1e1' : '#0078d4',
            color: !hasDirtyChanges || isSaving || hasValidationErrors ? '#a19f9d' : '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: !hasDirtyChanges || isSaving || hasValidationErrors ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
          }}
          title={hasValidationErrors ? 'Fix validation errors before saving' : ''}
        >
          {isSaving ? 'Saving...' : 'Save'}
        </button>
      </div>

      {/* Cancel Confirmation Dialog */}
      {showCancelConfirm && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowCancelConfirm(false)}
        >
          <div
            style={{
              backgroundColor: '#fff',
              padding: '24px',
              borderRadius: '8px',
              maxWidth: '400px',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#323130' }}>
              Confirm Cancel
            </h3>
            <p style={{ margin: '0 0 24px 0', fontSize: '14px', color: '#666' }}>
              You have {dirtyCount} unsaved changes. Are you sure you want to discard them?
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                onClick={() => setShowCancelConfirm(false)}
                style={{
                  padding: '8px 16px',
                  fontSize: '14px',
                  backgroundColor: '#fff',
                  color: '#323130',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                Keep Editing
              </button>
              <button
                onClick={confirmCancel}
                style={{
                  padding: '8px 16px',
                  fontSize: '14px',
                  backgroundColor: '#d13438',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                }}
              >
                Discard Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
