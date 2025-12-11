/**
 * Lookup Cell Editor
 * 
 * Specialized editor for lookup columns with dropdown, search, and keyboard navigation.
 * For now, uses simple select dropdown. Can be enhanced with async loading later.
 */

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { CellEditorProps } from '../../types/grid.types';

interface LookupOption {
  id: string;
  label: string;
}

export const LookupCellEditor: React.FC<CellEditorProps> = ({
  value,
  editMode = 'edit',
  firstCharacter = '',
  onSave,
  onCancel,
  columnDef,
  validate,
  rowId
}) => {
  const [searchText, setSearchText] = React.useState('');
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = React.useState({ top: 0, left: 0, width: 0 });
  const inputRef = React.useRef<HTMLInputElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Get lookup options from column definition (populated by grid)
  const options: LookupOption[] = columnDef.lookupOptions || [];

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current && 
        !containerRef.current.contains(event.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        // // console.log(...)
        onCancel();
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isDropdownOpen, onCancel]);

  // Filter options based on search text
  const filteredOptions = React.useMemo(() => {
    if (!searchText) return options;
    return options.filter(opt =>
      opt.label.toLowerCase().includes(searchText.toLowerCase())
    );
  }, [options, searchText]);

  // Phase 1: Focus is now handled by parent using requestAnimationFrame for synchronous focus
  // Initialize selected index based on current value
  React.useEffect(() => {
    // Find the current value in options to show which one is selected
    // Value could be just an ID string, or an object with id property
    if (value) {
      const valueId = typeof value === 'object' && value !== null && 'id' in value 
        ? (value as { id: string }).id 
        : String(value);
      
      const currentIndex = options.findIndex(opt => opt.id === valueId);
      if (currentIndex >= 0) {
        setSelectedIndex(currentIndex);
      }
    }
  }, [value, options]);

  const handleSave = React.useCallback((option?: LookupOption) => {
    const selectedOption = option || filteredOptions[selectedIndex];
    
    if (!selectedOption) {
      setError('Please select a value');
      return;
    }

    // Validate if validator provided
    if (validate) {
      const validation = validate(selectedOption.id);
      if (validation !== true) {
        setError(typeof validation === 'string' ? validation : 'Invalid selection');
        return;
      }
    }

    // // console.log(...)
    // Save only the ID - Dataverse will handle the display value via lookup relationship
    onSave(selectedOption.id);
  }, [filteredOptions, selectedIndex, validate, onSave]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => 
        Math.min(prev + 1, filteredOptions.length - 1)
      );
      setIsDropdownOpen(true);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
      setIsDropdownOpen(true);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredOptions.length > 0) {
        handleSave();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      // // console.log(...)
      onCancel();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      if (filteredOptions.length > 0) {
        // // console.log(...)
        handleSave();
      }
    }
  };

  // Calculate dropdown position based on input position (for portal rendering)
  React.useEffect(() => {
    const updatePosition = () => {
      if (containerRef.current && isDropdownOpen) {
        const rect = containerRef.current.getBoundingClientRect();
        setDropdownPosition({
          top: rect.bottom + window.scrollY,
          left: rect.left + window.scrollX,
          width: Math.max(rect.width, 200) // At least 200px or input width
        });
      }
    };

    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isDropdownOpen]);

  // Scroll selected item into view
  React.useEffect(() => {
    if (isDropdownOpen && dropdownRef.current) {
      const selectedElement = dropdownRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex, isDropdownOpen]);

  // Render dropdown using portal to escape cell boundaries
  const dropdownPortal = isDropdownOpen && (
    <>
      {filteredOptions.length > 0 && ReactDOM.createPortal(
        <div 
          ref={dropdownRef} 
          style={{
            ...dropdownStyle,
            position: 'fixed',
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            minWidth: `${dropdownPosition.width}px`,
          }}
        >
          {filteredOptions.map((option, idx) => (
            <div
              key={option.id}
              style={{
                ...optionStyle,
                ...(idx === selectedIndex ? selectedOptionStyle : {})
              }}
              onMouseDown={(e) => {
                e.preventDefault(); // Prevent blur
                handleSave(option);
              }}
              onMouseEnter={() => setSelectedIndex(idx)}
            >
              {option.label}
            </div>
          ))}
        </div>,
        document.body
      )}
      
      {filteredOptions.length === 0 && searchText && ReactDOM.createPortal(
        <div style={{
          ...dropdownStyle,
          position: 'fixed',
          top: `${dropdownPosition.top}px`,
          left: `${dropdownPosition.left}px`,
          minWidth: `${dropdownPosition.width}px`,
        }}>
          <div style={noResultsStyle}>No results found</div>
        </div>,
        document.body
      )}
    </>
  );

  // Generate cell key for parent to locate this editor
  const cellKey = rowId && columnDef.prop ? `${rowId}|${columnDef.prop}|${columnDef.prop}` : undefined;
  
  return (
    <div 
      ref={containerRef} 
      className="lookup-cell-editor" 
      style={containerStyle}
      data-cell-key={cellKey}
    >
      <input
        ref={inputRef}
        type="text"
        value={searchText}
        onChange={(e) => {
          setSearchText(e.target.value);
          setSelectedIndex(0);
          setIsDropdownOpen(true);
          setError(null);
        }}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsDropdownOpen(true)}
        style={{
          ...inputStyle,
          ...(error ? errorStyle : {})
        }}
        placeholder="Type to search..."
      />
      
      {dropdownPortal}
      
      {error && (
        <div style={errorMessageStyle}>{error}</div>
      )}
      
      <div style={hintStyle}>
        ↑↓ Navigate | Enter Select | Esc Cancel
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

const dropdownStyle: React.CSSProperties = {
  // Position is set dynamically in portal
  maxHeight: '200px',
  overflowY: 'auto',
  background: '#fff',
  border: '1px solid #d2d0ce',
  boxShadow: '0 4px 8px rgba(0, 0, 0, 0.15)',
  zIndex: 9999, // High z-index for portal rendering
  marginTop: '2px',
  whiteSpace: 'nowrap', // Prevent text wrapping - allows expansion
};

const optionStyle: React.CSSProperties = {
  padding: '8px 12px',
  cursor: 'pointer',
  fontSize: '14px',
  transition: 'background 0.1s ease',
};

const selectedOptionStyle: React.CSSProperties = {
  background: '#0078d4',
  color: '#fff',
};

const noResultsStyle: React.CSSProperties = {
  padding: '8px 12px',
  color: '#605e5c',
  fontStyle: 'italic',
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
  zIndex: 1001,
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

