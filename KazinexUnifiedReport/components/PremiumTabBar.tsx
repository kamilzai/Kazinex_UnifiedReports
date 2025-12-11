/**
 * PremiumTabBar Component
 * 
 * Phase 4: Premium UI/UX
 * 
 * Modern tab navigation with:
 * - Active state with bottom border
 * - Hover effects
 * - Dirty count badges
 * - Smooth transitions
 * - Professional design
 */

import * as React from 'react';
import type { ReportSection } from '../types/dataverse.types';

export interface PremiumTabBarProps {
  sections: ReportSection[];
  activeSection: string;
  onSectionChange: (sectionId: string) => void;
  dirtyCountBySection: Map<string, number>;
}

/**
 * Premium Tab Bar Component
 */
export const PremiumTabBar: React.FC<PremiumTabBarProps> = ({
  sections,
  activeSection,
  onSectionChange,
  dirtyCountBySection,
}) => {
  const [hoveredTab, setHoveredTab] = React.useState<string | null>(null);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  
  // Scroll active tab into view when it changes
  React.useEffect(() => {
    if (scrollContainerRef.current) {
      const activeButton = scrollContainerRef.current.querySelector(`[data-section-id="${activeSection}"]`);
      if (activeButton) {
        activeButton.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [activeSection]);
  
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      height: '48px', // Fixed height to prevent vertical scroll
      minHeight: '48px',
      maxHeight: '48px',
      backgroundColor: '#fff',
      borderBottom: '2px solid #e1e1e1',
      overflow: 'hidden', // Hide overflow on container
      position: 'relative',
    }}>
      {/* Scrollable tabs container */}
      <div
        ref={scrollContainerRef}
        style={{
          display: 'flex',
          flexDirection: 'row',
          gap: '4px',
          padding: '0 20px',
          height: '100%',
          overflowX: 'auto', // Horizontal scroll for many tabs
          overflowY: 'hidden', // No vertical scroll
          scrollbarWidth: 'thin', // Firefox
          WebkitOverflowScrolling: 'touch', // Smooth scrolling on iOS
        }}
      >
      {sections.map((section) => {
        const sectionId = section.kazinex_reportsectionid;
        const isActive = sectionId === activeSection;
        const isHovered = sectionId === hoveredTab;
        const dirtyCount = dirtyCountBySection.get(sectionId) || 0;
        const hasDirtyChanges = dirtyCount > 0;
        
        return (
          <button
            key={sectionId}
            data-section-id={sectionId}
            onClick={() => onSectionChange(sectionId)}
            onMouseEnter={() => setHoveredTab(sectionId)}
            onMouseLeave={() => setHoveredTab(null)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              height: '100%',
              border: 'none',
              backgroundColor: isActive ? '#fff' : 'transparent',
              borderBottom: isActive ? '3px solid #0078d4' : '3px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              fontWeight: isActive ? '600' : '400',
              fontSize: '14px',
              color: isActive ? '#0078d4' : '#323130',
              position: 'relative',
              marginBottom: '-2px',
              opacity: isActive ? 1 : isHovered ? 1 : 0.8,
              whiteSpace: 'nowrap', // Prevent text wrapping
              flexShrink: 0, // Don't shrink tabs
            }}
          >
            {/* Tab icon (optional) */}
            {section.kazinex_name && (
              <span style={{ fontSize: '16px' }}>
                📄
              </span>
            )}
            
            {/* Tab label */}
            <span>{section.kazinex_name || 'Untitled Section'}</span>
            
            {/* Dirty badge */}
            {hasDirtyChanges && (
              <span style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '20px',
                height: '20px',
                padding: '0 6px',
                borderRadius: '10px',
                backgroundColor: '#ffc107',
                color: '#000',
                fontSize: '11px',
                fontWeight: '700',
              }}>
                {dirtyCount}
              </span>
            )}
            
            {/* Hover background */}
            {!isActive && isHovered && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: '#f3f2f1',
                zIndex: -1,
                pointerEvents: 'none',
              }} />
            )}
          </button>
        );
      })}
      </div>
    </div>
  );
};
