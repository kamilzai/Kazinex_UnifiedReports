/**
 * Text Cell Editor
 * 
 * Specialized editor for text columns with trim on save and Enter/Esc/Tab support.
 */

import * as React from 'react';
import { CellEditorProps } from '../../types/grid.types';

export const TextCellEditor: React.FC<CellEditorProps> = ({
  value,
  editMode = 'edit',
  firstCharacter = '',
  onSave,
  onCancel,
  columnDef,
  validate,
  rowId
}) => {
  // Excel mode handling:
  // - 'edit' mode: Keep existing value, cursor at end
  // - 'replace' mode: Start with first character, old value discarded
  const initialValue = editMode === 'replace' && firstCharacter
    ? firstCharacter
    : String(value ?? '');
  
  const [editValue, setEditValue] = React.useState(initialValue);
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Focus and cursor positioning
  React.useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      
      if (editMode === 'replace') {
        // Replace mode: cursor after first character
        const pos = firstCharacter.length;
        inputRef.current.setSelectionRange(pos, pos);
      } else {
        // Edit mode: cursor at end, no selection
        const pos = inputRef.current.value.length;
        inputRef.current.setSelectionRange(pos, pos);
      }
    }
  }, []); // Run once on mount

  const handleSave = React.useCallback(() => {
    const trimmed = editValue.trim();
    
    // Validate if validator provided
    if (validate) {
      const validation = validate(trimmed);
      if (validation !== true) {
        setError(typeof validation === 'string' ? validation : 'Invalid value');
        return;
      }
    }
    
    // // console.log(...)
    onSave(trimmed);
  }, [editValue, validate, onSave]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      // // console.log(...)
      onCancel();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      // // console.log(...)
      handleSave();
      // Navigation will be handled by parent
    }
  };

  // Generate cell key for parent to locate this editor
  const cellKey = rowId && columnDef.prop ? `${rowId}|${columnDef.prop}|${columnDef.prop}` : undefined;
  
  return (
    <div 
      className="text-cell-editor" 
      style={containerStyle}
      data-cell-key={cellKey}
    >
      <input
        ref={inputRef}
        type="text"
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
        maxLength={columnDef.maxLength}
      />
      {error && (
        <div style={errorMessageStyle}>{error}</div>
      )}
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

