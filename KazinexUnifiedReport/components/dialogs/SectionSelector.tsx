/**
 * SectionSelector Component
 * 
 * Step 3 of copy dialog - Section selection with checkboxes
 * Features:
 * - "Copy All Sections" master checkbox
 * - Individual section checkboxes
 * - Row counts per section
 * - Total selected rows display
 */

import * as React from 'react';
import type { SectionInfo } from '../../types/slice-copy.types';

export interface SectionSelectorProps {
  sections: SectionInfo[];
  selectedSections: Set<string>;
  copyAllSections: boolean;
  onCopyAllChange: (copyAll: boolean) => void;
  onSectionToggle: (sectionId: string) => void;
  isLoading: boolean;
  totalRowsSelected: number;
}

export const SectionSelector: React.FC<SectionSelectorProps> = ({
  sections,
  selectedSections,
  copyAllSections,
  onCopyAllChange,
  onSectionToggle,
  isLoading,
  totalRowsSelected
}) => {
  
  if (isLoading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading sections...</div>
      </div>
    );
  }

  if (sections.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>📋</div>
          <div style={styles.emptyTitle}>No Sections Found</div>
          <div style={styles.emptyMessage}>
            The selected slice has no sections with data to copy.
          </div>
        </div>
      </div>
    );
  }

  const totalAvailableRows = sections.reduce((sum, s) => sum + s.rowCount, 0);
  const selectedCount = selectedSections.size;
  const totalCount = sections.length;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>Select Sections to Copy</h3>
        <p style={styles.subtitle}>
          Choose which sections you want to copy from the selected slice
        </p>
      </div>
      
      {/* Copy All Checkbox */}
      <div style={styles.copyAllContainer}>
        <label style={styles.copyAllLabel}>
          <input
            type="checkbox"
            checked={copyAllSections}
            onChange={(e) => onCopyAllChange(e.target.checked)}
            style={styles.checkbox}
          />
          <span style={styles.copyAllText}>
            Copy All Sections ({totalCount} {totalCount === 1 ? 'section' : 'sections'}, {totalAvailableRows} {totalAvailableRows === 1 ? 'row' : 'rows'})
          </span>
        </label>
      </div>
      
      {/* Section List */}
      <div style={styles.list}>
        {sections.map((section) => {
          const isSelected = selectedSections.has(section.sectionId);
          const displayName = section.name || 'Unnamed Section';
          
          return (
            <div
              key={section.sectionId}
              style={{
                ...styles.sectionItem,
                ...(isSelected ? styles.sectionItemSelected : {}),
                ...(copyAllSections ? styles.sectionItemDisabled : {})
              }}
              onClick={() => !copyAllSections && onSectionToggle(section.sectionId)}
            >
              <div style={styles.checkboxContainer}>
                <input
                  type="checkbox"
                  checked={isSelected || copyAllSections}
                  disabled={copyAllSections}
                  onChange={() => {}} // Handled by onClick
                  style={styles.checkbox}
                />
              </div>
              
              <div style={styles.sectionInfo}>
                <div style={styles.sectionName}>{displayName}</div>
                <div style={styles.sectionDetails}>
                  <span style={styles.rowCount}>
                    📊 {section.rowCount} {section.rowCount === 1 ? 'row' : 'rows'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Summary Footer */}
      <div style={styles.summary}>
        <div style={styles.summaryItem}>
          <span style={styles.summaryLabel}>Selected:</span>
          <span style={styles.summaryValue}>
            {copyAllSections ? totalCount : selectedCount} of {totalCount} {totalCount === 1 ? 'section' : 'sections'}
          </span>
        </div>
        <div style={styles.summaryDivider} />
        <div style={styles.summaryItem}>
          <span style={styles.summaryLabel}>Total Rows:</span>
          <span style={styles.summaryValue}>
            {copyAllSections ? totalAvailableRows : totalRowsSelected} {copyAllSections ? totalAvailableRows === 1 ? 'row' : 'rows' : totalRowsSelected === 1 ? 'row' : 'rows'}
          </span>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    maxHeight: 500,
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
  copyAllContainer: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f3f2f1',
    borderRadius: 4
  },
  copyAllLabel: {
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
    userSelect: 'none'
  },
  copyAllText: {
    fontSize: 14,
    fontWeight: 600,
    color: '#323130',
    marginLeft: 8
  },
  checkbox: {
    width: 16,
    height: 16,
    cursor: 'pointer'
  },
  list: {
    flex: 1,
    overflowY: 'auto',
    border: '1px solid #edebe9',
    borderRadius: 4,
    marginBottom: 16
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
  sectionItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 16px',
    cursor: 'pointer',
    borderBottom: '1px solid #edebe9',
    transition: 'background-color 0.1s'
  },
  sectionItemSelected: {
    backgroundColor: '#f3f2f1'
  },
  sectionItemDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed'
  },
  checkboxContainer: {
    marginRight: 12
  },
  sectionInfo: {
    flex: 1
  },
  sectionName: {
    fontSize: 14,
    fontWeight: 600,
    color: '#323130',
    marginBottom: 4
  },
  sectionDetails: {
    display: 'flex',
    alignItems: 'center'
  },
  rowCount: {
    fontSize: 12,
    color: '#605e5c'
  },
  summary: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-around',
    padding: '12px 16px',
    backgroundColor: '#f3f2f1',
    borderRadius: 4
  },
  summaryItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4
  },
  summaryLabel: {
    fontSize: 12,
    color: '#605e5c',
    textTransform: 'uppercase',
    fontWeight: 600
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 600,
    color: '#0078d4'
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#d2d0ce'
  }
};
