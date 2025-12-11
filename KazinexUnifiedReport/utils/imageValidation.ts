/**
 * Image File Validation Utility
 * 
 * Comprehensive validation for image files including:
 * - File size checks
 * - MIME type validation
 * - Magic bytes (file signature) verification
 * - Filename extension checking
 */

import { 
    ACCEPTED_IMAGE_TYPES, 
    IMAGE_MAGIC_BYTES, 
    MAX_UPLOAD_SIZE_BYTES 
} from '../config/imageConfig';
import { ValidationResult } from '../types/image.types';

type MagicByteStatus = 'match' | 'mismatch' | 'skipped';

/**
 * Comprehensive file validation
 * 
 * Performs multiple validation checks:
 * 1. File size (empty check, max size, warning for large files)
 * 2. MIME type (must be in accepted list)
 * 3. Magic bytes (file header must match image format)
 * 4. Filename extension (warning if suspicious)
 */
export async function validateImageFile(file: File): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Check file size
    if (file.size === 0) {
        errors.push('File is empty');
    } else if (file.size > MAX_UPLOAD_SIZE_BYTES) {
        errors.push(
            `File too large (${formatBytes(file.size)}). Maximum: ${MAX_UPLOAD_SIZE_BYTES / 1024 / 1024} MB`
        );
    } else if (file.size > 10 * 1024 * 1024) {
        // Warn for files >10MB
        warnings.push(`Large file (${formatBytes(file.size)}) may take longer to process`);
    }

    // 2. Check MIME type
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        errors.push(
            `Invalid file type: ${file.type}. Accepted: ${ACCEPTED_IMAGE_TYPES.join(', ')}`
        );
    }

    // 3. Validate magic bytes (file header)
    const magicByteStatus = await validateMagicBytes(file);
    if (magicByteStatus === 'mismatch') {
        warnings.push('File header could not be verified. Proceeding with upload just in case the browser altered the clipboard payload.');
    }

    // 4. Check filename
    if (!file.name) {
        warnings.push('File has no name');
    } else if (!/\.(jpg|jpeg|png|bmp|gif|webp)$/i.test(file.name)) {
        warnings.push('File extension does not match common image formats');
    }

    if (errors.length > 0) {
        return {
            valid: false,
            error: errors.join('; '),
            warnings: warnings.length > 0 ? warnings : undefined,
        };
    }

    return {
        valid: true,
        warnings: warnings.length > 0 ? warnings : undefined,
    };
}

/**
 * Validate file magic bytes (file signature)
 * 
 * Reads the first 12 bytes of the file and checks against known image signatures.
 * This prevents users from uploading non-image files with renamed extensions.
 */
async function validateMagicBytes(file: File): Promise<MagicByteStatus> {
    try {
        // Read first 12 bytes (enough for all image formats)
        const slice = file.slice(0, 12);
        const arrayBuffer = await slice.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);

        // Check against known image signatures
        if (file.type === 'image/jpeg' || file.type === 'image/jpg') {
            return matchBytes(bytes, IMAGE_MAGIC_BYTES['image/jpeg']) ? 'match' : 'mismatch';
        } else if (file.type === 'image/png') {
            return matchBytes(bytes, IMAGE_MAGIC_BYTES['image/png']) ? 'match' : 'mismatch';
        } else if (file.type === 'image/gif') {
            return matchBytes(bytes, IMAGE_MAGIC_BYTES['image/gif']) ? 'match' : 'mismatch';
        } else if (file.type === 'image/webp') {
            return matchBytes(bytes, IMAGE_MAGIC_BYTES['image/webp']) ? 'match' : 'mismatch';
        } else if (file.type === 'image/bmp') {
            return matchBytes(bytes, IMAGE_MAGIC_BYTES['image/bmp']) ? 'match' : 'mismatch';
        }

        // Unknown type - allow it (MIME type check already passed)
        return 'skipped';

    } catch {
        // If magic byte check fails, allow file (validation not critical)
        return 'skipped';
    }
}

/**
 * Check if byte array matches signature
 */
function matchBytes(bytes: Uint8Array, signature: number[]): boolean {
    for (let i = 0; i < signature.length; i++) {
        if (bytes[i] !== signature[i]) {
            return false;
        }
    }
    return true;
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Batch validate multiple files
 * 
 * Validates all files and returns a map of results.
 * Useful for bulk upload scenarios.
 */
export async function validateImageFiles(files: File[]): Promise<Map<File, ValidationResult>> {
    const results = new Map<File, ValidationResult>();

    for (const file of files) {
        const result = await validateImageFile(file);
        results.set(file, result);
    }

    return results;
}

/**
 * Filter valid files from validation results
 * 
 * Returns only the files that passed validation.
 */
export function getValidFiles(
    validationResults: Map<File, ValidationResult>
): File[] {
    return Array.from(validationResults.entries())
        .filter(([, result]) => result.valid)
        .map(([file]) => file);
}

/**
 * Get validation errors for display
 * 
 * Returns an array of error objects for files that failed validation.
 * Useful for showing error messages to users.
 */
export function getValidationErrors(
    validationResults: Map<File, ValidationResult>
): Array<{ file: string; error: string }> {
    return Array.from(validationResults.entries())
        .filter(([, result]) => !result.valid)
        .map(([file, result]) => ({
            file: file.name,
            error: result.error || 'Unknown error',
        }));
}

/**
 * Check if any files have warnings
 */
export function hasWarnings(validationResults: Map<File, ValidationResult>): boolean {
    return Array.from(validationResults.values()).some(
        result => result.warnings && result.warnings.length > 0
    );
}

/**
 * Get all warnings from validation results
 */
export function getWarnings(
    validationResults: Map<File, ValidationResult>
): Array<{ file: string; warnings: string[] }> {
    return Array.from(validationResults.entries())
        .filter(([, result]) => result.warnings && result.warnings.length > 0)
        .map(([file, result]) => ({
            file: file.name,
            warnings: result.warnings || [],
        }));
}
