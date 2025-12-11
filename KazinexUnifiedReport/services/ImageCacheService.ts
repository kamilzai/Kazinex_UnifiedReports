/**
 * Image Cache Service
 * 
 * Provides thumbnail caching using IndexedDB for optimized image display in grid cells.
 * Implements automatic cleanup, expiration, and size management.
 * 
 * Features:
 * - IndexedDB storage for persistent caching
 * - Automatic thumbnail generation
 * - TTL-based expiration (24 hours)
 * - Size-based eviction (LRU)
 * - Cache statistics and monitoring
 * 
 * @module ImageCacheService
 */

import { THUMBNAIL_CONFIG, CACHE_CONFIG } from '../config/imageConfig';
import { createThumbnail } from '../utils/imageCompression';
import type { ThumbnailCacheEntry } from '../types/image.types';

const DB_NAME = 'KazinexImageCache';
const DB_VERSION = 1;
const STORE_NAME = 'thumbnails';

/**
 * Cache key structure for unique identification
 */
interface CacheKey {
  recordId: string;
  fieldName: string;
}

/**
 * Cache statistics for monitoring
 */
interface CacheStats {
  totalEntries: number;
  cacheSize: number;
  hitRate: number;
  oldestEntry: Date | null;
  newestEntry: Date | null;
}

/**
 * Service for managing image thumbnail cache using IndexedDB
 */
class ImageCacheService {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;
  private cacheHits = 0;
  private cacheMisses = 0;

  /**
   * Initialize IndexedDB connection
   */
  private async initialize(): Promise<void> {
    if (this.db) {
      return;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('IndexedDB initialized successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' });
          
          // Create indexes for efficient querying
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('accessCount', 'accessCount', { unique: false });
          store.createIndex('lastAccessed', 'lastAccessed', { unique: false });
          
          console.log('IndexedDB object store created');
        }
      };
    });

    return this.initPromise;
  }

  /**
   * Generate cache key from record and field information
   */
  private getCacheKey(cacheKey: CacheKey): string {
    return `${cacheKey.recordId}:${cacheKey.fieldName}`;
  }

  /**
   * Get thumbnail from cache
   * 
   * @param recordId - Record identifier
   * @param fieldName - Field name
   * @param base64Full - Full-size Base64 image (used to generate thumbnail if cache miss)
   * @returns Cached or newly generated thumbnail Base64
   */
  async getThumbnail(
    recordId: string,
    fieldName: string,
    base64Full: string
  ): Promise<string> {
    try {
      await this.initialize();

      const key = this.getCacheKey({ recordId, fieldName });
      const cached = await this.getCachedEntry(key);

      // Check if cached entry is valid
      if (cached && this.isEntryValid(cached)) {
        // Update access statistics
        await this.updateAccessStats(key, cached);
        this.cacheHits++;
        return cached.thumbnailBase64;
      }

      // Cache miss - generate new thumbnail
      this.cacheMisses++;
      const thumbnailBase64 = await createThumbnail(
        base64Full,
        THUMBNAIL_CONFIG.width,
        THUMBNAIL_CONFIG.height
      );

      // Cache the new thumbnail
      await this.cacheThumbnail(recordId, fieldName, thumbnailBase64);

      return thumbnailBase64;
    } catch (error) {
      console.error('Error getting thumbnail from cache:', error);
      // Fallback: return full image if caching fails
      return base64Full;
    }
  }

  /**
   * Get cached entry from IndexedDB
   */
  private getCachedEntry(key: string): Promise<ThumbnailCacheEntry | null> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve(null);
        return;
      }

      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        console.error('Error getting cached entry:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Check if cache entry is still valid (not expired)
   */
  private isEntryValid(entry: ThumbnailCacheEntry): boolean {
    const now = Date.now();
    const age = now - entry.timestamp;
    return age < CACHE_CONFIG.thumbnailTTL;
  }

  /**
   * Update access statistics for cache entry
   */
  private async updateAccessStats(key: string, entry: ThumbnailCacheEntry): Promise<void> {
    if (!this.db) return;

    try {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      const updatedEntry: ThumbnailCacheEntry = {
        ...entry,
        accessCount: entry.accessCount + 1,
        lastAccessed: Date.now(),
      };

      store.put(updatedEntry);
    } catch (error) {
      console.error('Error updating access stats:', error);
    }
  }

  /**
   * Cache a new thumbnail
   * 
   * @param recordId - Record identifier
   * @param fieldName - Field name
   * @param thumbnailBase64 - Thumbnail Base64 data
   */
  async cacheThumbnail(
    recordId: string,
    fieldName: string,
    thumbnailBase64: string
  ): Promise<void> {
    try {
      await this.initialize();

      if (!this.db) {
        throw new Error('IndexedDB not initialized');
      }

      const key = this.getCacheKey({ recordId, fieldName });
      const now = Date.now();

      const entry: ThumbnailCacheEntry = {
        key,
        recordId,
        fieldName,
        thumbnailBase64,
        timestamp: now,
        lastAccessed: now,
        accessCount: 1,
        size: thumbnailBase64.length,
      };

      // Check cache size and evict if necessary
      await this.ensureCacheSize();

      // Store the entry
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      store.put(entry);

      await new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
    } catch (error) {
      console.error('Error caching thumbnail:', error);
      // Non-critical error - don't throw
    }
  }

  /**
   * Ensure cache doesn't exceed maximum entries
   * Evicts least recently used entries if necessary
   */
  private async ensureCacheSize(): Promise<void> {
    if (!this.db) return;

    try {
      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const countRequest = store.count();

      const count = await new Promise<number>((resolve, reject) => {
        countRequest.onsuccess = () => resolve(countRequest.result);
        countRequest.onerror = () => reject(countRequest.error);
      });

      // If cache is full, evict oldest entries
      if (count >= CACHE_CONFIG.maxThumbnails) {
        await this.evictOldestEntries(count - CACHE_CONFIG.maxThumbnails + 1);
      }
    } catch (error) {
      console.error('Error checking cache size:', error);
    }
  }

  /**
   * Evict oldest entries based on last access time
   */
  private async evictOldestEntries(count: number): Promise<void> {
    if (!this.db || count <= 0) return;

    try {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('lastAccessed');

      const entries: ThumbnailCacheEntry[] = [];
      const request = index.openCursor();

      await new Promise<void>((resolve, reject) => {
        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
          if (cursor && entries.length < count) {
            entries.push(cursor.value);
            cursor.continue();
          } else {
            resolve();
          }
        };
        request.onerror = () => reject(request.error);
      });

      // Delete the oldest entries
      const deleteTransaction = this.db.transaction([STORE_NAME], 'readwrite');
      const deleteStore = deleteTransaction.objectStore(STORE_NAME);

      entries.forEach(entry => {
        deleteStore.delete(entry.key);
      });

      console.log(`Evicted ${entries.length} old cache entries`);
    } catch (error) {
      console.error('Error evicting old entries:', error);
    }
  }

  /**
   * Clear expired cache entries
   * Should be called periodically or on app startup
   */
  async clearExpired(): Promise<number> {
    try {
      await this.initialize();

      if (!this.db) {
        return 0;
      }

      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('timestamp');

      const expiredKeys: string[] = [];
      const cutoffTime = Date.now() - CACHE_CONFIG.thumbnailTTL;

      const request = index.openCursor(IDBKeyRange.upperBound(cutoffTime));

      await new Promise<void>((resolve, reject) => {
        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
          if (cursor) {
            expiredKeys.push(cursor.value.key);
            cursor.continue();
          } else {
            resolve();
          }
        };
        request.onerror = () => reject(request.error);
      });

      // Delete expired entries
      if (expiredKeys.length > 0) {
        const deleteTransaction = this.db.transaction([STORE_NAME], 'readwrite');
        const deleteStore = deleteTransaction.objectStore(STORE_NAME);

        expiredKeys.forEach(key => {
          deleteStore.delete(key);
        });

        console.log(`Cleared ${expiredKeys.length} expired cache entries`);
      }

      return expiredKeys.length;
    } catch (error) {
      console.error('Error clearing expired entries:', error);
      return 0;
    }
  }

  /**
   * Clear specific cache entry
   */
  async clearEntry(recordId: string, fieldName: string): Promise<void> {
    try {
      await this.initialize();

      if (!this.db) {
        return;
      }

      const key = this.getCacheKey({ recordId, fieldName });
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      store.delete(key);
    } catch (error) {
      console.error('Error clearing cache entry:', error);
    }
  }

  /**
   * Clear entire cache
   */
  async clearAll(): Promise<void> {
    try {
      await this.initialize();

      if (!this.db) {
        return;
      }

      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      store.clear();

      // Reset statistics
      this.cacheHits = 0;
      this.cacheMisses = 0;

      console.log('Cache cleared completely');
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<CacheStats> {
    try {
      await this.initialize();

      if (!this.db) {
        return {
          totalEntries: 0,
          cacheSize: 0,
          hitRate: 0,
          oldestEntry: null,
          newestEntry: null,
        };
      }

      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);

      const countRequest = store.count();
      const count = await new Promise<number>((resolve, reject) => {
        countRequest.onsuccess = () => resolve(countRequest.result);
        countRequest.onerror = () => reject(countRequest.error);
      });

      const entries: ThumbnailCacheEntry[] = [];
      const allRequest = store.openCursor();

      await new Promise<void>((resolve, reject) => {
        allRequest.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
          if (cursor) {
            entries.push(cursor.value);
            cursor.continue();
          } else {
            resolve();
          }
        };
        allRequest.onerror = () => reject(allRequest.error);
      });

      const totalSize = entries.reduce((sum, entry) => sum + entry.size, 0);
      const timestamps = entries.map(e => e.timestamp);
      const totalRequests = this.cacheHits + this.cacheMisses;

      return {
        totalEntries: count,
        cacheSize: totalSize,
        hitRate: totalRequests > 0 ? this.cacheHits / totalRequests : 0,
        oldestEntry: timestamps.length > 0 ? new Date(Math.min(...timestamps)) : null,
        newestEntry: timestamps.length > 0 ? new Date(Math.max(...timestamps)) : null,
      };
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return {
        totalEntries: 0,
        cacheSize: 0,
        hitRate: 0,
        oldestEntry: null,
        newestEntry: null,
      };
    }
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.initPromise = null;
    }
  }
}

// Export singleton instance
export const imageCacheService = new ImageCacheService();

// Export class for testing
export { ImageCacheService };
