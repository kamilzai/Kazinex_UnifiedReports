/**
 * Date Cell Editor
 * 
 * Specialized editor for date columns with HTML5 date picker.
 * Displays dates in dd-mmm-yy format (e.g., "05-Nov-25")
 */

import * as React from 'react';
import { CellEditorProps } from '../../types/grid.types';
import { formatDateForInput, parseDateValue } from '../../utils/dateFormatters';

export const DateCellEditor: React.FC<CellEditorProps> = ({
  value,
  editMode = 'edit',
  firstCharacter = '',
  onSave,
  onCancel,
  columnDef,
  validate,
  rowId
}) => {
  // Convert value to YYYY-MM-DD format for input[type="date"]
  const getDateString = (val: unknown): string => {
    return formatDateForInput(val);
  };

  // Excel mode: Replace mode clears date, Edit mode keeps it
  const initialValue = editMode === 'replace' ? '' : getDateString(value);
  
  const [editValue, setEditValue] = React.useState(initialValue);
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  
  // Store original value in YYYY-MM-DD format for comparison
  const originalValue = React.useRef(getDateString(value));

  // Focus handling
  React.useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleSave = React.useCallback(() => {
    // Compare normalized values - if unchanged, cancel instead of saving
    const normalizeDate = (dateStr: string): string => {
      if (!dateStr) return '';
      try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return '';
        // Normalize to YYYY-MM-DD format for comparison
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      } catch {
        return '';
      }
    };

    const normalizedCurrent = normalizeDate(editValue);
    const normalizedOriginal = normalizeDate(originalValue.current);

    // If values are the same, don't save (avoid false dirty flag)
    if (normalizedCurrent === normalizedOriginal) {
      onCancel();
      return;
    }

    if (!editValue) {
      onSave(null);
      return;
    }

    try {
      const date = new Date(editValue);
      if (isNaN(date.getTime())) {
        setError('Invalid date');
        return;
      }

      // Validate if validator provided
      if (validate) {
        const validation = validate(date.toISOString());
        if (validation !== true) {
          setError(typeof validation === 'string' ? validation : 'Invalid date');
          return;
        }
      }

      onSave(date.toISOString());
    } catch (err) {
      setError('Invalid date format');
    }
  }, [editValue, validate, onSave, onCancel]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 't' || e.key === 'T') {
      // Shortcut: 'T' for Today
      e.preventDefault();
      const today = new Date().toISOString().split('T')[0];
      setEditValue(today);
    } else if (e.key === 'Delete') {
      // Clear date
      setEditValue('');
    }
  };

  // Generate cell key for parent to locate this editor
  const cellKey = rowId && columnDef.prop ? `${rowId}|${columnDef.prop}|${columnDef.prop}` : undefined;
  
  return (
    <div 
      className="date-cell-editor" 
      style={containerStyle}
      data-cell-key={cellKey}
    >
      <input
        ref={inputRef}
        type="date"
        value={editValue}
        onChange={(e) => {
          setEditValue(e.target.value);
          setError(null);
        }}
        onKeyDown={handleKeyDown}
        onBlur={handleSave}
        style={{
          ...inputStyle,
          ...(error ? errorStyle : {})
        }}
      />
      {error && (
        <div style={errorMessageStyle}>{error}</div>
      )}
      <div style={hintStyle}>
        T = Today | Del = Clear
      </div>
    </div>
  );
};

const containerStyle: React.CSSProperties = {
  position: 'relative',
  width: '100%',
  height: '100%',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  padding: '4px 8px',
  border: '2px solid #0078d4',
  outline: 'none',
  fontSize: '14px',
  fontFamily: 'Segoe UI, sans-serif',
  boxSizing: 'border-box',
};

const errorStyle: React.CSSProperties = {
  borderColor: '#d13438',
};

const errorMessageStyle: React.CSSProperties = {
  position: 'absolute',
  top: '100%',
  left: 0,
  background: '#d13438',
  color: '#fff',
  padding: '4px 8px',
  fontSize: '12px',
  whiteSpace: 'nowrap',
  zIndex: 1000,
  marginTop: '2px',
  borderRadius: '2px',
};

const hintStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: '-20px',
  right: 0,
  fontSize: '10px',
  color: '#605e5c',
  whiteSpace: 'nowrap',
};
