/**
 * Number Cell Editor
 * 
 * Specialized editor for numeric columns with decimal support, negative numbers,
 * and numeric validation.
 */

import * as React from 'react';
import { CellEditorProps } from '../../types/grid.types';

// Utility: Strip currency symbols and thousands separators from numeric input
// Handles: $, €, £, ¥, ₹, ₽, ₩, ¢, ¤, commas
const stripCurrencySymbols = (input: string): string => {
  if (!input) return '';
  
  // Remove currency symbols: $ € £ ¥ ₹ ₽ ₩ ¢ ¤
  let cleaned = input.replace(/[$€£¥₹₽₩¢¤]/g, '');
  
  // Remove thousand separators (commas)
  cleaned = cleaned.replace(/,/g, '');
  
  // Remove extra whitespace
  cleaned = cleaned.trim();
  
  return cleaned;
};

export const NumberCellEditor: React.FC<CellEditorProps> = ({
  value,
  editMode = 'edit',
  firstCharacter = '',
  onSave,
  onCancel,
  columnDef,
  validate,
  rowId
}) => {
  // Store original value for comparison
  const originalValue = React.useRef(value);
  
  // Track previous value length to detect paste operations
  const previousValueRef = React.useRef<string>('');
  
  // Excel mode handling
  // Strip commas from display value so formatted numbers (1,234.50) can be edited
  const rawInitialValue = editMode === 'replace' && firstCharacter
    ? firstCharacter
    : String(value ?? '');
  
  const initialValue = stripCurrencySymbols(rawInitialValue);
  
  const [editValue, setEditValue] = React.useState(initialValue);
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  
  // Initialize previous value ref
  React.useEffect(() => {
    previousValueRef.current = initialValue;
  }, []);

  // Focus and cursor positioning
  React.useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      const pos = editMode === 'replace' ? firstCharacter.length : inputRef.current.value.length;
      inputRef.current.setSelectionRange(pos, pos);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const prevLength = previousValueRef.current.length;
    const newLength = val.length;
    
    // Detect paste operation: significant length increase (more than 1 character added)
    const isPaste = newLength > prevLength + 1;
    
    // If pasting, strip currency symbols and thousand separators
    let processedValue = val;
    if (isPaste) {
      processedValue = stripCurrencySymbols(val);
    }
    
    // Allow: numbers, decimal point, negative sign, empty string
    // Pattern allows: -123.456 or 123 or -123 or .5 or -.5
    if (processedValue === '' || /^-?\d*\.?\d*$/.test(processedValue)) {
      setEditValue(processedValue);
      previousValueRef.current = processedValue;
      setError(null);
    } else {
      // If invalid after processing, keep previous value
      previousValueRef.current = editValue;
    }
  };

  const handleSave = React.useCallback(() => {
    // Parse the edited value
    let parsedNewValue: number | null = null;
    
    if (editValue === '' || editValue === '-') {
      parsedNewValue = null;
    } else {
      const num = parseFloat(editValue);
      if (isNaN(num)) {
        setError('Invalid number');
        return;
      }
      parsedNewValue = num;
    }
    
    // Parse the original value for comparison
    const parsedOriginalValue = originalValue.current === null || originalValue.current === undefined || originalValue.current === ''
      ? null
      : parseFloat(String(originalValue.current));
    
    // Compare values - if unchanged, cancel instead of saving
    if (parsedNewValue === parsedOriginalValue) {
      // // console.log(...)
      onCancel();
      return;
    }
    
    // If we have a number, validate it
    if (parsedNewValue !== null) {
      // Validate if validator provided
      if (validate) {
        const validation = validate(parsedNewValue);
        if (validation !== true) {
          setError(typeof validation === 'string' ? validation : 'Invalid value');
          return;
        }
      }

      // Check min/max if defined
      if (columnDef.min !== undefined && parsedNewValue < columnDef.min) {
        setError(`Minimum value is ${columnDef.min}`);
        return;
      }
      if (columnDef.max !== undefined && parsedNewValue > columnDef.max) {
        setError(`Maximum value is ${columnDef.max}`);
        return;
      }
    }

    // // console.log(...)
    onSave(parsedNewValue);
  }, [editValue, validate, columnDef, onSave, onCancel]);

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
    }
  };

  // Generate cell key for parent to locate this editor
  const cellKey = rowId && columnDef.prop ? `${rowId}|${columnDef.prop}|${columnDef.prop}` : undefined;
  
  return (
    <div 
      className="number-cell-editor" 
      style={containerStyle}
      data-cell-key={cellKey}
    >
      <input
        ref={inputRef}
        type="text"
        value={editValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={handleSave}
        style={{
          ...inputStyle,
          ...(error ? errorStyle : {})
        }}
        placeholder="Enter number"
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
  textAlign: 'right',
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

