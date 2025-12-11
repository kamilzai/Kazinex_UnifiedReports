/**
 * SliceSelector Component
 * 
 * Step 2 of copy dialog - Slice selection with filters
 * Features:
 * - Date range filter (from/to)
 * - Reference number input
 * - Search input (name & description)
 * - Radio button list of slices
 * - Shows: Name, Date, Ref No, Row Count
 */

import * as React from 'react';
import type { SliceFilters } from '../../types/slice-copy.types';

export interface SliceSelectorProps {
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
  currentSliceId: string | null;   // The current slice to exclude from list
  selectedSlice: string | null;    // The slice selected in dialog
  onSliceSelect: (sliceId: string) => void;
  isLoading: boolean;
  filters: SliceFilters;
  onFiltersChange: (filters: SliceFilters) => void;
}

export const SliceSelector: React.FC<SliceSelectorProps> = (props) => {
  const { slices, currentSliceId, selectedSlice, onSliceSelect, isLoading, filters, onFiltersChange } = props;
  
  // Local state for instant client-side filtering
  const [localSearch, setLocalSearch] = React.useState<string>('');
  
  const formatDate = (date: Date | undefined): string => {
    if (!date) return '-';
    const d = new Date(date);
    const day = d.getDate().toString().padStart(2, '0');
    const month = d.toLocaleString('en-US', { month: 'short' });
    const year = d.getFullYear().toString().slice(-2);
    return `${day}-${month}-${year}`;
  };

  // Client-side smart search filtering
  const filteredSlices = React.useMemo(() => {
    // Filter out current slice (don't show it in the list)
    const availableSlices = slices.filter(s => s.sliceId !== currentSliceId);
    
    if (!localSearch) return availableSlices;
    
    const searchLower = localSearch.toLowerCase();
    return availableSlices.filter(slice => {
      // Smart search: name (ID), refNo, or date
      const nameMatch = slice.name?.toLowerCase().includes(searchLower);
      const refNoMatch = slice.refNo?.toLowerCase().includes(searchLower);
      const dateMatch = slice.dataDate && formatDate(slice.dataDate).toLowerCase().includes(searchLower);
      
      return nameMatch || refNoMatch || dateMatch;
    });
  }, [slices, localSearch, currentSliceId]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalSearch(e.target.value);
  };

  if (isLoading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading slices...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>Select a Slice to Copy From</h3>
        <p style={styles.subtitle}>
          Choose the slice containing the data you want to copy
        </p>
      </div>
      
      {/* Smart Search */}
      <div style={styles.searchContainer}>
        <input
          type="text"
          value={localSearch}
          onChange={handleSearchChange}
          placeholder="🔍 Smart search: ref no, type, date... (instant)"
          style={styles.searchInput}
        />
      </div>
      
      {/* Slice List */}
      {filteredSlices.length === 0 && slices.length > 0 ? (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>🔍</div>
          <div style={styles.emptyTitle}>No Matches Found</div>
          <div style={styles.emptyMessage}>
            No slices match your search criteria. Try different filters.
          </div>
        </div>
      ) : slices.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>📄</div>
          <div style={styles.emptyTitle}>No Slices Found</div>
          <div style={styles.emptyMessage}>
            No slices match your criteria. Try adjusting the filters.
          </div>
        </div>
      ) : (
        <div style={styles.list}>
          <div style={styles.resultsCount}>
            Showing {filteredSlices.length} of {slices.filter(s => s.sliceId !== currentSliceId).length} slices
          </div>
          {filteredSlices.map((slice) => {
            const isSelected = selectedSlice === slice.sliceId;
            const displayName = slice.name || 'Unnamed Slice';
            
            return (
              <div
                key={slice.sliceId}
                style={{
                  ...styles.sliceItem,
                  ...(isSelected ? styles.sliceItemSelected : {})
                }}
                onClick={() => onSliceSelect(slice.sliceId)}
              >
                <div style={styles.radioContainer}>
                  <div style={{
                    ...styles.radio,
                    ...(isSelected ? styles.radioSelected : {})
                  }}>
                    {isSelected && <div style={styles.radioDot} />}
                  </div>
                </div>
                
                <div style={styles.sliceInfo}>
                  <div style={styles.sliceName}>
                    {slice.refNo && (
                      <span style={{fontWeight: 600, color: '#0078d4'}}>{slice.refNo}</span>
                    )}
                    {slice.refNo && <span style={{margin: '0 8px', color: '#605e5c'}}>•</span>}
                    <span style={{color: '#605e5c', fontSize: '13px'}}>{displayName}</span>
                  </div>
                  
                  <div style={styles.sliceDetails}>
                    <span style={styles.detailItem}>
                      📅 {formatDate(slice.dataDate)}
                    </span>
                    <span style={styles.detailItem}>
                      📊 {slice.rowCount} {slice.rowCount === 1 ? 'row' : 'rows'}
                    </span>
                  </div>
                  
                  {slice.description && (
                    <div style={styles.sliceDescription}>{slice.description}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    minHeight: 400
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: '#605e5c',
    fontSize: 14
  },
  header: {
    marginBottom: 16
  },
  title: {
    margin: 0,
    fontSize: 16,
    fontWeight: 600,
    color: '#323130',
    marginBottom: 4
  },
  subtitle: {
    margin: 0,
    fontSize: 13,
    color: '#605e5c'
  },
  searchContainer: {
    marginBottom: 16
  },
  searchInput: {
    width: '100%',
    padding: '10px 12px',
    fontSize: 14,
    border: '2px solid #edebe9',
    borderRadius: 4,
    outline: 'none',
    transition: 'border-color 0.2s'
  },
  list: {
    flex: 1,
    overflowY: 'auto',
    border: '1px solid #edebe9',
    borderRadius: 4
  },
  resultsCount: {
    padding: '8px 16px',
    fontSize: 12,
    color: '#605e5c',
    backgroundColor: '#faf9f8',
    borderBottom: '1px solid #edebe9',
    fontWeight: 600
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    padding: 40
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: '#323130',
    marginBottom: 8
  },
  emptyMessage: {
    fontSize: 13,
    color: '#605e5c',
    textAlign: 'center'
  },
  sliceItem: {
    display: 'flex',
    alignItems: 'flex-start',
    padding: '12px 16px',
    cursor: 'pointer',
    borderBottom: '1px solid #edebe9',
    transition: 'background-color 0.1s'
  },
  sliceItemSelected: {
    backgroundColor: '#f3f2f1'
  },
  radioContainer: {
    marginRight: 12,
    marginTop: 2
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: '50%',
    border: '2px solid #605e5c',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'border-color 0.1s'
  },
  radioSelected: {
    borderColor: '#0078d4'
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: '50%',
    backgroundColor: '#0078d4'
  },
  sliceInfo: {
    flex: 1
  },
  sliceName: {
    fontSize: 14,
    fontWeight: 600,
    color: '#323130',
    marginBottom: 4
  },
  sliceDetails: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 4
  },
  detailItem: {
    fontSize: 12,
    color: '#605e5c'
  },
  sliceDescription: {
    fontSize: 12,
    color: '#605e5c',
    fontStyle: 'italic',
    marginTop: 4
  }
};
