/**
 * Date Formatting Utilities
 * 
 * Provides consistent date formatting across the application.
 * Standard format: dd-mmm-yy (e.g., "05-Nov-25")
 */

/**
 * Format a date value to dd-mmm-yy format
 * @param value - Date value (string, Date object, or ISO string)
 * @returns Formatted date string (e.g., "05-Nov-25") or empty string if invalid
 */
export function formatDateDisplay(value: unknown): string {
  if (!value) return '';
  
  try {
    const date = new Date(value as string);
    if (isNaN(date.getTime())) return '';
    
    const day = String(date.getDate()).padStart(2, '0');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = monthNames[date.getMonth()];
    const year = String(date.getFullYear()).slice(-2); // Last 2 digits
    
    return `${day}-${month}-${year}`;
  } catch {
    return '';
  }
}

/**
 * Parse a date from various formats and return ISO string
 * Supports:
 * - ISO strings (2025-11-05T00:00:00.000Z)
 * - Date objects
 * - dd-mmm-yy format (05-Nov-25)
 * - YYYY-MM-DD format (2025-11-05)
 * 
 * @param value - Date value to parse
 * @returns ISO string or null if invalid
 */
export function parseDateValue(value: unknown): string | null {
  if (!value) return null;
  
  try {
    // If already a Date object
    if (value instanceof Date) {
      return value.toISOString();
    }
    
    const str = String(value).trim();
    if (!str) return null;
    
    // Try parsing as-is first (handles ISO and standard formats)
    const date = new Date(str);
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
    
    // Try parsing dd-mmm-yy format (e.g., "05-Nov-25")
    const ddMmmYyPattern = /^(\d{2})-([A-Za-z]{3})-(\d{2})$/;
    const match = str.match(ddMmmYyPattern);
    if (match) {
      const day = parseInt(match[1], 10);
      const monthStr = match[2];
      const year = parseInt(match[3], 10);
      
      const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 
                          'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
      const monthIndex = monthNames.indexOf(monthStr.toLowerCase());
      
      if (monthIndex !== -1) {
        // Assume 20xx for years 00-99
        const fullYear = 2000 + year;
        const parsedDate = new Date(fullYear, monthIndex, day);
        
        if (!isNaN(parsedDate.getTime())) {
          return parsedDate.toISOString();
        }
      }
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * Convert date to YYYY-MM-DD format for HTML date input
 * @param value - Date value
 * @returns YYYY-MM-DD string or empty string if invalid
 */
export function formatDateForInput(value: unknown): string {
  if (!value) return '';
  
  try {
    const date = new Date(value as string);
    if (isNaN(date.getTime())) return '';
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  } catch {
    return '';
  }
}
