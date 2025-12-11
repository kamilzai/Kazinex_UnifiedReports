/**
 * PremiumToolbar Component
 * 
 * Phase 4: Premium UI/UX
 * 
 * Modern toolbar with Fluent UI-style command groups.
 * Features:
 * - Icon-based commands with tooltips
 * - Command groups (Clipboard, Rows, Actions)
 * - Status indicators
 * - Professional design
 */

import * as React from 'react';
import { LoadingSpinner } from './LoadingSpinner';

export interface PremiumToolbarProps {
  // State
  hasDirtyChanges: boolean;
  dirtyCount: number;
  sectionsWithChangesCount?: number; // Number of tabs with changes
  validationErrorCount: number;
  hasValidationErrors: boolean;
  isSaving: boolean;
  saveSuccess: boolean;
  saveError: string | null;
  isAddingRow?: boolean;
  isDeletingRow?: boolean;
  operationError?: string | null;
  selectedCellCount?: number;
  selectedRowCount?: number;
  canAddRow?: boolean;
  
  // Copy from Previous Slice
  canCopyFromPrevious?: boolean;
  onCopyFromPrevious?: () => void;
  
  // Actions
  onSave: () => void;
  onCancel: () => void;
  onAddRow?: () => void;
  onCopy?: () => void;
  onPaste?: () => void;
  onDeleteRows?: () => void;
}

/**
 * Split Button Component (with dropdown)
 */
const SplitButton: React.FC<{
  icon: string;
  label: string;
  onClick: () => void;
  dropdownLabel?: string;
  onDropdownClick?: () => void;
  showDropdown?: boolean;
  disabled?: boolean;
  primary?: boolean;
  destructive?: boolean;
  tooltip?: string;
  dropdownTooltip?: string;
}> = ({ icon, label, onClick, dropdownLabel, onDropdownClick, showDropdown, disabled, primary, destructive, tooltip, dropdownTooltip }) => {
  const [showTooltip, setShowTooltip] = React.useState(false);
  const [showDropdownTooltip, setShowDropdownTooltip] = React.useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isDropdownOpen]);

  // Fluent UI color tokens
  const backgroundColor = disabled
    ? 'transparent'
    : primary
    ? '#0078d4'
    : destructive
    ? 'transparent'
    : 'transparent';
    
  const color = disabled
    ? '#a19f9d'
    : primary
    ? '#ffffff'
    : destructive
    ? '#d13438'
    : '#201f1e';
    
  const borderColor = disabled
    ? '#edebe9'
    : primary
    ? 'transparent'
    : destructive
    ? '#d13438'
    : '#8a8886';
  
  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      <div style={{ display: 'flex', alignItems: 'stretch' }}>
        {/* Main button */}
        <button
          onClick={onClick}
          disabled={disabled}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '5px 12px',
            height: '32px',
            backgroundColor,
            color,
            border: `1px solid ${borderColor}`,
            borderRadius: showDropdown ? '2px 0 0 2px' : '2px',
            borderRight: showDropdown ? 'none' : `1px solid ${borderColor}`,
            cursor: disabled ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: '400',
            fontFamily: '"Segoe UI", "Segoe UI Web", -apple-system, BlinkMacSystemFont, "Roboto", "Helvetica Neue", sans-serif',
            transition: 'background-color 0.1s ease',
            minWidth: 'auto',
            outline: 'none',
          }}
          onMouseOver={(e) => {
            if (!disabled) {
              if (primary) {
                e.currentTarget.style.backgroundColor = '#106ebe';
              } else if (destructive) {
                e.currentTarget.style.backgroundColor = '#fef6f6';
              } else {
                e.currentTarget.style.backgroundColor = '#f3f2f1';
              }
            }
          }}
          onMouseOut={(e) => {
            if (!disabled) {
              e.currentTarget.style.backgroundColor = backgroundColor;
            }
          }}
        >
          {icon && <span style={{ fontSize: '16px', lineHeight: '16px' }}>{icon}</span>}
          <span style={{ lineHeight: '20px' }}>{label}</span>
        </button>
        
        {/* Dropdown trigger button (only if showDropdown) */}
        {showDropdown && onDropdownClick && (
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            disabled={disabled}
            onMouseEnter={() => setShowDropdownTooltip(true)}
            onMouseLeave={() => setShowDropdownTooltip(false)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '5px 8px',
              height: '32px',
              backgroundColor,
              color,
              border: `1px solid ${borderColor}`,
              borderRadius: '0 2px 2px 0',
              borderLeft: `1px solid ${primary ? '#106ebe' : '#d2d0ce'}`,
              cursor: disabled ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontFamily: '"Segoe UI", "Segoe UI Web", -apple-system, BlinkMacSystemFont, "Roboto", "Helvetica Neue", sans-serif',
              transition: 'background-color 0.1s ease',
              outline: 'none',
            }}
            onMouseOver={(e) => {
              if (!disabled) {
                if (primary) {
                  e.currentTarget.style.backgroundColor = '#106ebe';
                } else if (destructive) {
                  e.currentTarget.style.backgroundColor = '#fef6f6';
                } else {
                  e.currentTarget.style.backgroundColor = '#f3f2f1';
                }
              }
            }}
            onMouseOut={(e) => {
              if (!disabled) {
                e.currentTarget.style.backgroundColor = backgroundColor;
              }
            }}
          >
            <span style={{ lineHeight: '16px' }}>▼</span>
          </button>
        )}
      </div>
      
      {/* Main tooltip */}
      {showTooltip && tooltip && !isDropdownOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          marginTop: '4px',
          padding: '6px 10px',
          backgroundColor: '#323130',
          color: '#fff',
          fontSize: '12px',
          borderRadius: '4px',
          whiteSpace: 'nowrap',
          zIndex: 1000,
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        }}>
          {tooltip}
        </div>
      )}
      
      {/* Dropdown tooltip */}
      {showDropdownTooltip && dropdownTooltip && !isDropdownOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          right: 0,
          marginTop: '4px',
          padding: '6px 10px',
          backgroundColor: '#323130',
          color: '#fff',
          fontSize: '12px',
          borderRadius: '4px',
          whiteSpace: 'nowrap',
          zIndex: 1000,
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        }}>
          {dropdownTooltip}
        </div>
      )}
      
      {/* Dropdown menu */}
      {isDropdownOpen && showDropdown && onDropdownClick && dropdownLabel && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          marginTop: '2px',
          minWidth: '150px',
          backgroundColor: '#ffffff',
          border: '1px solid #d2d0ce',
          borderRadius: '2px',
          boxShadow: '0 3.2px 7.2px rgba(0,0,0,0.132), 0 0.6px 1.8px rgba(0,0,0,0.108)',
          zIndex: 1001,
        }}>
          <button
            onClick={() => {
              onDropdownClick();
              setIsDropdownOpen(false);
            }}
            disabled={disabled}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              width: '100%',
              padding: '8px 12px',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: disabled ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontFamily: '"Segoe UI", "Segoe UI Web", -apple-system, BlinkMacSystemFont, "Roboto", "Helvetica Neue", sans-serif',
              color: disabled ? '#a19f9d' : '#201f1e',
              textAlign: 'left',
              outline: 'none',
            }}
            onMouseOver={(e) => {
              if (!disabled) {
                e.currentTarget.style.backgroundColor = '#f3f2f1';
              }
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <span style={{ fontSize: '16px' }}>{icon}</span>
            <span>{dropdownLabel}</span>
          </button>
        </div>
      )}
    </div>
  );
};

/**
 * Command Button Component
 */
const CommandButton: React.FC<{
  icon: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
  destructive?: boolean;
  tooltip?: string;
}> = ({ icon, label, onClick, disabled, primary, destructive, tooltip }) => {
  const [showTooltip, setShowTooltip] = React.useState(false);
  
  // Fluent UI color tokens
  const backgroundColor = disabled
    ? 'transparent'
    : primary
    ? '#0078d4' // Fluent primary blue
    : destructive
    ? 'transparent' // Destructive buttons use border style
    : 'transparent';
    
  const color = disabled
    ? '#a19f9d' // Fluent disabled text
    : primary
    ? '#ffffff'
    : destructive
    ? '#d13438' // Fluent error red
    : '#201f1e'; // Fluent neutral foreground
    
  const borderColor = disabled
    ? '#edebe9'
    : primary
    ? 'transparent'
    : destructive
    ? '#d13438'
    : '#8a8886'; // Fluent neutral stroke
  
  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={onClick}
        disabled={disabled}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          padding: '5px 12px',
          height: '32px',
          backgroundColor,
          color,
          border: `1px solid ${borderColor}`,
          borderRadius: '2px', // Fluent uses 2px
          cursor: disabled ? 'not-allowed' : 'pointer',
          fontSize: '14px',
          fontWeight: '400',
          fontFamily: '"Segoe UI", "Segoe UI Web", -apple-system, BlinkMacSystemFont, "Roboto", "Helvetica Neue", sans-serif',
          transition: 'background-color 0.1s ease, border-color 0.1s ease',
          minWidth: 'auto',
          outline: 'none',
        }}
        onMouseOver={(e) => {
          if (!disabled) {
            if (primary) {
              e.currentTarget.style.backgroundColor = '#106ebe'; // Fluent primary hover
            } else if (destructive) {
              e.currentTarget.style.backgroundColor = '#fef6f6'; // Fluent error background
            } else {
              e.currentTarget.style.backgroundColor = '#f3f2f1'; // Fluent neutral hover
            }
          }
        }}
        onMouseOut={(e) => {
          if (!disabled) {
            e.currentTarget.style.backgroundColor = backgroundColor;
          }
        }}
        onMouseDown={(e) => {
          if (!disabled) {
            if (primary) {
              e.currentTarget.style.backgroundColor = '#005a9e'; // Fluent primary pressed
            } else if (destructive) {
              e.currentTarget.style.backgroundColor = '#fde7e9'; // Fluent error pressed
            } else {
              e.currentTarget.style.backgroundColor = '#edebe9'; // Fluent neutral pressed
            }
          }
        }}
      >
        {icon && <span style={{ fontSize: '16px', lineHeight: '16px' }}>{icon}</span>}
        <span style={{ lineHeight: '20px' }}>{label}</span>
      </button>
      {showTooltip && tooltip && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          marginTop: '4px',
          padding: '6px 10px',
          backgroundColor: '#323130',
          color: '#fff',
          fontSize: '12px',
          borderRadius: '4px',
          whiteSpace: 'nowrap',
          zIndex: 1000,
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        }}>
          {tooltip}
        </div>
      )}
    </div>
  );
};

/**
 * Command Group Component
 */
const CommandGroup: React.FC<{
  label?: string;
  children: React.ReactNode;
}> = ({ label, children }) => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  }}>
    {label && (
      <div style={{
        fontSize: '10px',
        color: '#605e5c',
        textTransform: 'uppercase',
        fontWeight: '600',
        letterSpacing: '0.5px',
      }}>
        {label}
      </div>
    )}
    <div style={{
      display: 'flex',
      gap: '6px',
    }}>
      {children}
    </div>
  </div>
);

/**
 * Status Chip Component
 */
const StatusChip: React.FC<{
  children: React.ReactNode;
  type?: 'default' | 'success' | 'warning' | 'error';
}> = ({ children, type = 'default' }) => {
  const backgroundColor = 
    type === 'success' ? '#dff6dd' :
    type === 'warning' ? '#fff4ce' :
    type === 'error' ? '#fde7e9' :
    '#f3f2f1';
    
  const color =
    type === 'success' ? '#107c10' :
    type === 'warning' ? '#8a6d3b' :
    type === 'error' ? '#a80000' :
    '#323130';
    
  const icon =
    type === 'success' ? '✅' :
    type === 'warning' ? '⚠️' :
    type === 'error' ? '❌' :
    '📝';
  
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      padding: '4px 10px',
      backgroundColor,
      color,
      borderRadius: '4px',
      fontSize: '12px',
      fontWeight: '500',
    }}>
      <span>{icon}</span>
      <span>{children}</span>
    </div>
  );
};

/**
 * Premium Toolbar Component
 */
export const PremiumToolbar: React.FC<PremiumToolbarProps> = ({
  hasDirtyChanges,
  dirtyCount,
  sectionsWithChangesCount = 0,
  validationErrorCount,
  hasValidationErrors,
  isSaving,
  saveSuccess,
  saveError,
  isAddingRow,
  isDeletingRow,
  operationError,
  selectedCellCount = 0,
  selectedRowCount = 0,
  canAddRow = true,
  canCopyFromPrevious = false,
  onCopyFromPrevious,
  onSave,
  onCancel,
  onAddRow,
  onCopy,
  onPaste,
  onDeleteRows,
}) => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#faf9f8',
      borderBottom: '1px solid #e1e1e1',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    }}>
      {/* Command Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        padding: '12px 20px',
        gap: '24px',
      }}>
        {/* Left side - Command groups */}
        <div style={{
          display: 'flex',
          gap: '24px',
          alignItems: 'flex-end',
        }}>
          {/* Clipboard Group */}
          {(onCopy || onPaste) && (
            <CommandGroup>
              {onCopy && (
                <CommandButton
                  icon="📋"
                  label="Copy"
                  onClick={onCopy}
                  disabled={selectedCellCount === 0}
                  tooltip={`Copy selected cells (Ctrl+C)${selectedCellCount > 0 ? ` - ${selectedCellCount} selected` : ''}`}
                />
              )}
              {onPaste && (
                <CommandButton
                  icon="📄"
                  label="Paste"
                  onClick={onPaste}
                  tooltip="Paste from clipboard (Ctrl+V)"
                />
              )}
            </CommandGroup>
          )}
          
          {/* Rows Group */}
          {(onAddRow || onDeleteRows) && (
            <CommandGroup>
              {onAddRow && (
                <CommandButton
                  icon="➕"
                  label="Add Row"
                  onClick={onAddRow}
                  disabled={!canAddRow || isAddingRow || isSaving}
                  tooltip={canAddRow ? "Add new row to grid" : "This section allows only one row"}
                />
              )}
              {onDeleteRows && (
                <CommandButton
                  icon="🗑️"
                  label="Delete"
                  onClick={onDeleteRows}
                  disabled={selectedRowCount === 0 || isDeletingRow || isSaving}
                  destructive
                  tooltip={
                    selectedRowCount === 0
                      ? 'Select rows to delete'
                      : `Delete ${selectedRowCount} selected row${selectedRowCount !== 1 ? 's' : ''}`
                  }
                />
              )}
            </CommandGroup>
          )}
          
          {/* Actions Group */}
          <CommandGroup>
            {onCopyFromPrevious && (
              <SplitButton
                icon="📋"
                label="Copy from Previous"
                onClick={onCopyFromPrevious}
                disabled={!canCopyFromPrevious}
                tooltip={
                  canCopyFromPrevious
                    ? 'Copy data from a previous slice'
                    : 'Cannot copy - current slice already has data'
                }
              />
            )}
            <SplitButton
              icon="💾"
              label="Save"
              onClick={onSave}
              disabled={!hasDirtyChanges || isSaving || hasValidationErrors}
              primary={hasDirtyChanges && !hasValidationErrors}
              tooltip={
                hasValidationErrors 
                  ? 'Fix validation errors before saving'
                  : hasDirtyChanges
                  ? `Save ${dirtyCount} change${dirtyCount !== 1 ? 's' : ''}`
                  : 'No changes to save'
              }
              showDropdown={sectionsWithChangesCount > 1}
              dropdownLabel={`Save All (${sectionsWithChangesCount} tabs)`}
              dropdownTooltip={`Save ${dirtyCount} change${dirtyCount !== 1 ? 's' : ''} across all ${sectionsWithChangesCount} tabs`}
              onDropdownClick={onSave}
            />
            <SplitButton
              icon="↩️"
              label="Cancel"
              onClick={onCancel}
              disabled={!hasDirtyChanges || isSaving}
              tooltip={
                hasDirtyChanges
                  ? `Discard ${dirtyCount} change${dirtyCount !== 1 ? 's' : ''}`
                  : 'No changes to cancel'
              }
              showDropdown={sectionsWithChangesCount > 1}
              dropdownLabel={`Cancel All (${sectionsWithChangesCount} tabs)`}
              dropdownTooltip={`Discard ${dirtyCount} change${dirtyCount !== 1 ? 's' : ''} across all ${sectionsWithChangesCount} tabs`}
              onDropdownClick={onCancel}
            />
          </CommandGroup>
        </div>
        
        {/* Right side - Status indicators */}
        <div style={{
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
          flexWrap: 'wrap',
        }}>
          {/* Selected Rows */}
          {selectedRowCount > 0 && (
            <StatusChip>
              {selectedRowCount} row{selectedRowCount !== 1 ? 's' : ''} selected
            </StatusChip>
          )}
          
          {/* Validation Errors */}
          {hasValidationErrors && (
            <StatusChip type="error">
              {validationErrorCount} validation error{validationErrorCount !== 1 ? 's' : ''}
            </StatusChip>
          )}
          
          {/* Dirty Changes */}
          {hasDirtyChanges && !isSaving && !hasValidationErrors && (
            <StatusChip type="warning">
              {dirtyCount} unsaved
            </StatusChip>
          )}
          
          {/* Saving State */}
          {isSaving && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 12px', backgroundColor: '#f3f2f1', borderRadius: '4px' }}>
              <div style={{
                width: '16px',
                height: '16px',
                border: '2px solid #f3f2f1',
                borderTop: '2px solid #0078d4',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }} />
              <span style={{ fontSize: '12px', color: '#605e5c' }}>Saving...</span>
              <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
            </div>
          )}
          
          {/* Deleting State */}
          {isDeletingRow && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 12px', backgroundColor: '#f3f2f1', borderRadius: '4px' }}>
              <div style={{
                width: '16px',
                height: '16px',
                border: '2px solid #f3f2f1',
                borderTop: '2px solid #d13438',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }} />
              <span style={{ fontSize: '12px', color: '#605e5c' }}>Deleting...</span>
            </div>
          )}
          
          {/* Save Success */}
          {saveSuccess && (
            <StatusChip type="success">
              Saved successfully!
            </StatusChip>
          )}
          
          {/* Errors */}
          {(saveError || operationError) && (
            <StatusChip type="error">
              {saveError || operationError}
            </StatusChip>
          )}
        </div>
      </div>
    </div>
  );
};
