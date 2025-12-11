/**
 * Image Processor Web Worker
 * 
 * Offloads CPU-intensive image compression to a background thread.
 * Prevents main thread blocking during large image processing.
 * 
 * @module ImageProcessorWorker
 */

/// <reference lib="webworker" />

import { compressImage } from '../utils/imageCompression';
import type { ImageCompressionConfig, CompressionResult } from '../types/image.types';
import { createDebugLogger } from '../utils/debugLogger';

const workerDebugLog = createDebugLogger('ImageProcessorWorker');

interface WorkerMessage {
  id: string;
  type: 'compress';
  file: File;
  config: ImageCompressionConfig;
}

interface WorkerResponse {
  id: string;
  type: 'success' | 'error';
  result?: CompressionResult;
  error?: string;
}

// Handle messages from main thread
self.addEventListener('message', async (e: MessageEvent<WorkerMessage>) => {
  const { id, type, file, config } = e.data;

  if (type === 'compress') {
    try {
      workerDebugLog(`[Worker] Starting compression for ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
      
      const result = await compressImage(file, config);
      
      workerDebugLog(`[Worker] Compression complete for ${file.name}: ${result.originalSizeBytes} → ${result.compressedSizeBytes} bytes`);

      const response: WorkerResponse = {
        id,
        type: 'success',
        result,
      };

      self.postMessage(response);
    } catch (error) {
      console.error(`[Worker] Compression failed for ${file.name}:`, error);

      const response: WorkerResponse = {
        id,
        type: 'error',
        error: error instanceof Error ? error.message : 'Unknown compression error',
      };

      self.postMessage(response);
    }
  }
});

// Signal worker is ready
workerDebugLog('[Worker] Image processor worker initialized');

export {};
