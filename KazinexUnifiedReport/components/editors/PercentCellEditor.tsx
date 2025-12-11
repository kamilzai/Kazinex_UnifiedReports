/**
 * Percent Cell Editor
 * 
 * Specialized editor for percentage columns. Displays as % but stores as decimal.
 * E.g., user enters "50" → stores 0.5
 */

import * as React from 'react';
import { CellEditorProps } from '../../types/grid.types';

export const PercentCellEditor: React.FC<CellEditorProps> = ({
  value,
  editMode = 'edit',
  firstCharacter = '',
  onSave,
  onCancel,
  columnDef,
  validate,
  rowId
}) => {
  // Convert decimal to percentage for display (0.5 → "50")
  // Also handles incorrectly stored values with % symbol ("60%" → "60")
  const toPercentDisplay = (val: unknown): string => {
    if (val === null || val === undefined) return '';
    
    // If value is a string with %, extract the number (e.g., "60%" → "60")
    if (typeof val === 'string' && val.includes('%')) {
      const cleaned = val.replace(/%/g, '').trim();
      const num = Number(cleaned);
      return isNaN(num) ? '' : String(num);
    }
    
    // If value is a decimal (0.6), convert to percentage (60)
    const num = Number(val);
    if (isNaN(num)) return '';
    
    // If value is between 0 and 1, treat as decimal (0.6 → 60)
    // If value is > 1, it's likely already a percentage or incorrectly stored (60 → 60)
    if (num >= 0 && num <= 1) {
      const percent = num * 100;
      // Limit to 2 decimal places and remove trailing zeros
      // 0.6 → "60", 0.6098 → "60.98", 0.60001 → "60"
      const formatted = percent.toFixed(2);
      return formatted.replace(/\.?0+$/, '');
    } else {
      // Value > 1 is likely already in percentage form or incorrectly stored
      // Also limit to 2 decimals and remove trailing zeros
      const formatted = num.toFixed(2);
      return formatted.replace(/\.?0+$/, '');
    }
  };

  // Parse input that may contain % sign (Excel format)
  const parsePercentInput = (input: string): string => {
    if (!input) return '';
    // Remove % sign if present and any whitespace
    let cleaned = input.replace(/%/g, '').trim();
    // Remove thousand separators
    cleaned = cleaned.replace(/,/g, '');
    return cleaned;
  };

  // Excel mode handling
  const initialValue = editMode === 'replace' && firstCharacter
    ? firstCharacter
    : toPercentDisplay(value);
  
  const [displayValue, setDisplayValue] = React.useState(initialValue);
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  
  // Store original value for comparison
  const originalValue = React.useRef(toPercentDisplay(value));

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
    
    // Parse to remove % sign if user types it
    const parsed = parsePercentInput(val);
    
    // Allow: numbers, decimal point, empty string, and % sign (which we strip)
    if (val === '' || val === '%' || /^\d*\.?\d*%?$/.test(val)) {
      setDisplayValue(parsed);
      setError(null);
    }
  };

  const handleSave = React.useCallback(() => {
    // Normalize both values for comparison
    const normalizedCurrent = displayValue.trim();
    const normalizedOriginal = originalValue.current.trim();
    
    // If value unchanged, cancel instead of save
    if (normalizedCurrent === normalizedOriginal) {
      onCancel();
      return;
    }
    
    if (displayValue === '') {
      // // console.log(...)
      onSave(null);
      return;
    }

    const percent = parseFloat(displayValue);
    
    if (isNaN(percent)) {
      setError('Invalid percentage');
      return;
    }

    // Validate range (0-100%)
    if (percent < 0 || percent > 100) {
      setError('Percentage must be between 0 and 100');
      return;
    }

    // Convert to decimal for storage (50% → 0.5)
    // Round to 4 decimal places to avoid floating point precision issues
    // This allows for 2 decimal places in percentage (60.98% → 0.6098)
    const decimal = Math.round((percent / 100) * 10000) / 10000;

    // Validate if validator provided
    if (validate) {
      const validation = validate(decimal);
      if (validation !== true) {
        setError(typeof validation === 'string' ? validation : 'Invalid value');
        return;
      }
    }

    // // console.log(...)
    onSave(decimal);
  }, [displayValue, validate, onSave, onCancel]);

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
      className="percent-cell-editor" 
      style={containerStyle}
      data-cell-key={cellKey}
    >
      <div style={inputContainerStyle}>
        <input
          ref={inputRef}
          type="text"
          value={displayValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          style={{
            ...inputStyle,
            ...(error ? errorStyle : {})
          }}
          placeholder="0"
        />
        <span style={percentSymbolStyle}>%</span>
      </div>
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

const inputContainerStyle: React.CSSProperties = {
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  width: '100%',
  height: '100%',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  padding: '4px 24px 4px 8px', // Reduced right padding
  border: '2px solid #0078d4',
  outline: 'none',
  fontSize: '14px',
  fontFamily: 'Segoe UI, sans-serif',
  textAlign: 'right',
  boxSizing: 'border-box',
};

const percentSymbolStyle: React.CSSProperties = {
  position: 'absolute',
  right: '6px',
  top: '50%',
  transform: 'translateY(-50%)',
  color: '#605e5c',
  fontSize: '14px',
  fontWeight: 600,
  pointerEvents: 'none',
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

