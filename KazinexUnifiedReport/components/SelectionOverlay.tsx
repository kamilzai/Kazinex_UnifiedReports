/**
 * Selection Overlay Component
 * 
 * Renders visual selection highlights over the grid.
 * Shows blue bordered rectangles for selected ranges.
 */

import * as React from 'react';
import type { CellRange } from '../hooks/useGridSelection';

export interface SelectionOverlayProps {
  /** Selected cell ranges */
  ranges: CellRange[];
  
  /** Width of each cell in pixels */
  cellWidth: number;
  
  /** Height of each cell in pixels */
  cellHeight: number;
  
  /** Offset from top (to account for header) */
  offsetTop?: number;
  
  /** Offset from left (to account for row numbers) */
  offsetLeft?: number;
}

export const SelectionOverlay: React.FC<SelectionOverlayProps> = ({
  ranges,
  cellWidth,
  cellHeight,
  offsetTop = 0,
  offsetLeft = 0,
}) => {
  if (ranges.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 5,
      }}
    >
      {ranges.map((range, index) => {
        const left = offsetLeft + (range.startCol * cellWidth);
        const top = offsetTop + (range.startRow * cellHeight);
        const width = ((range.endCol - range.startCol + 1) * cellWidth);
        const height = ((range.endRow - range.startRow + 1) * cellHeight);

        return (
          <div
            key={index}
            className="selection-overlay-range"
            style={{
              position: 'absolute',
              left: `${left}px`,
              top: `${top}px`,
              width: `${width}px`,
              height: `${height}px`,
              border: '2px solid #0078d4',
              backgroundColor: 'rgba(0, 120, 212, 0.08)',
              boxShadow: '0 0 0 1px rgba(255, 255, 255, 0.8)',
              boxSizing: 'border-box',
              pointerEvents: 'none',
            }}
          >
            {/* Selection handle for resize (future enhancement) */}
            <div
              style={{
                position: 'absolute',
                bottom: -4,
                right: -4,
                width: 8,
                height: 8,
                backgroundColor: '#0078d4',
                border: '2px solid white',
                borderRadius: '50%',
              }}
            />
          </div>
        );
      })}
    </div>
  );
};
