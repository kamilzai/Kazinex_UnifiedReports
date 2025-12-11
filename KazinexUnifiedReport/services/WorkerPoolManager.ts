/**
 * Worker Pool Manager
 * 
 * Manages a pool of Web Workers for parallel image compression.
 * Provides task queuing, load balancing, and error recovery.
 * 
 * Features:
 * - Dynamic worker pool (2-4 workers based on CPU cores)
 * - Task queue with priority support
 * - Automatic retry on worker failure
 * - Timeout handling
 * - Graceful shutdown
 * 
 * @module WorkerPoolManager
 */

import { WORKER_CONFIG } from '../config/imageConfig';
import type { ImageCompressionConfig, CompressionResult } from '../types/image.types';
import { createDebugLogger } from '../utils/debugLogger';

const workerPoolDebugLog = createDebugLogger('WorkerPool');

interface WorkerTask {
  id: string;
  file: File;
  config: ImageCompressionConfig;
  resolve: (result: CompressionResult) => void;
  reject: (error: Error) => void;
  retryCount: number;
  priority: number;
  timestamp: number;
}

interface WorkerInstance {
  worker: Worker;
  busy: boolean;
  taskId: string | null;
  taskStartTime: number | null;
}

class WorkerPoolManager {
  private workers: WorkerInstance[] = [];
  private taskQueue: WorkerTask[] = [];
  private maxWorkers: number;
  private timeout: number;
  private maxRetries = 2;
  private initialized = false;

  constructor() {
    this.maxWorkers = Math.min(
      WORKER_CONFIG.maxWorkers,
      navigator.hardwareConcurrency || 2
    );
    this.timeout = WORKER_CONFIG.workerTimeoutMs;
  }

  /**
   * Initialize worker pool
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    workerPoolDebugLog(`[WorkerPool] Initializing with ${this.maxWorkers} workers`);

    try {
      // Create worker instances
      for (let i = 0; i < this.maxWorkers; i++) {
        const worker = new Worker(
          new URL('../workers/ImageProcessorWorker.ts', import.meta.url),
          { type: 'module' }
        );

        const instance: WorkerInstance = {
          worker,
          busy: false,
          taskId: null,
          taskStartTime: null,
        };

        this.setupWorkerListeners(instance);
        this.workers.push(instance);
      }

      this.initialized = true;
      workerPoolDebugLog('[WorkerPool] Initialization complete');
    } catch (error) {
      console.error('[WorkerPool] Failed to initialize:', error);
      throw new Error('Worker pool initialization failed');
    }
  }

  /**
   * Setup message and error listeners for a worker
   */
  private setupWorkerListeners(instance: WorkerInstance): void {
    instance.worker.addEventListener('message', (e: MessageEvent) => {
      this.handleWorkerMessage(instance, e.data);
    });

    instance.worker.addEventListener('error', (error: ErrorEvent) => {
      this.handleWorkerError(instance, error);
    });
  }

  /**
   * Handle worker message
   */
  private handleWorkerMessage(
    instance: WorkerInstance,
    data: { id: string; type: string; result?: CompressionResult; error?: string }
  ): void {
    const { id, type, result, error } = data;

    // Find the task
    const task = this.findTaskById(id);
    if (!task) {
      workerPoolDebugLog(`[WorkerPool] Received message for unknown task: ${id}`);
      return;
    }

    // Mark worker as free
    instance.busy = false;
    instance.taskId = null;
    instance.taskStartTime = null;

    if (type === 'success' && result) {
      workerPoolDebugLog(`[WorkerPool] Task ${id} completed successfully`);
      task.resolve(result);
    } else if (type === 'error') {
      console.error(`[WorkerPool] Task ${id} failed:`, error);
      
      // Retry if possible
      if (task.retryCount < this.maxRetries) {
        workerPoolDebugLog(`[WorkerPool] Retrying task ${id} (attempt ${task.retryCount + 1}/${this.maxRetries})`);
        task.retryCount++;
        this.taskQueue.unshift(task); // Add to front of queue
      } else {
        task.reject(new Error(error || 'Worker task failed'));
      }
    }

    // Process next task in queue
    this.processQueue();
  }

  /**
   * Handle worker error
   */
  private handleWorkerError(instance: WorkerInstance, error: ErrorEvent): void {
    console.error('[WorkerPool] Worker error:', error);

    if (instance.taskId) {
      const task = this.findTaskById(instance.taskId);
      if (task) {
        // Retry the task
        if (task.retryCount < this.maxRetries) {
          workerPoolDebugLog(`[WorkerPool] Retrying task ${task.id} after worker error`);
          task.retryCount++;
          this.taskQueue.unshift(task);
        } else {
          task.reject(new Error('Worker crashed during task execution'));
        }
      }
    }

    // Mark worker as free
    instance.busy = false;
    instance.taskId = null;
    instance.taskStartTime = null;

    // Process next task
    this.processQueue();
  }

  /**
   * Find task by ID (includes both queued and executing tasks)
   */
  private findTaskById(id: string): WorkerTask | undefined {
    return this.taskQueue.find(t => t.id === id);
  }

  /**
   * Process task queue
   */
  private processQueue(): void {
    // Find available worker
    const availableWorker = this.workers.find(w => !w.busy);
    if (!availableWorker) {
      return; // All workers busy
    }

    // Get next task (highest priority first)
    const task = this.getNextTask();
    if (!task) {
      return; // Queue empty
    }

    // Assign task to worker
    this.executeTask(availableWorker, task);
  }

  /**
   * Get next task from queue (priority-based)
   */
  private getNextTask(): WorkerTask | undefined {
    if (this.taskQueue.length === 0) {
      return undefined;
    }

    // Sort by priority (higher first), then by timestamp (older first)
    this.taskQueue.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      return a.timestamp - b.timestamp;
    });

    return this.taskQueue.shift();
  }

  /**
   * Execute task on worker
   */
  private executeTask(instance: WorkerInstance, task: WorkerTask): void {
    instance.busy = true;
    instance.taskId = task.id;
    instance.taskStartTime = Date.now();

    workerPoolDebugLog(`[WorkerPool] Executing task ${task.id} on worker`);

    // Send task to worker
    instance.worker.postMessage({
      id: task.id,
      type: 'compress',
      file: task.file,
      config: task.config,
    });

    // Setup timeout
    setTimeout(() => {
      this.checkTaskTimeout(instance, task);
    }, this.timeout);
  }

  /**
   * Check if task has timed out
   */
  private checkTaskTimeout(instance: WorkerInstance, task: WorkerTask): void {
    // Task already completed
    if (!instance.busy || instance.taskId !== task.id) {
      return;
    }

    const elapsed = Date.now() - (instance.taskStartTime || 0);
    if (elapsed >= this.timeout) {
      console.error(`[WorkerPool] Task ${task.id} timed out after ${elapsed}ms`);

      // Terminate and recreate worker
      instance.worker.terminate();
      const newWorker = new Worker(
        new URL('../workers/ImageProcessorWorker.ts', import.meta.url),
        { type: 'module' }
      );
      instance.worker = newWorker;
      this.setupWorkerListeners(instance);

      // Mark as free
      instance.busy = false;
      instance.taskId = null;
      instance.taskStartTime = null;

      // Retry task if possible
      if (task.retryCount < this.maxRetries) {
        workerPoolDebugLog(`[WorkerPool] Retrying timed out task ${task.id}`);
        task.retryCount++;
        this.taskQueue.unshift(task);
      } else {
        task.reject(new Error('Task timed out'));
      }

      // Process next task
      this.processQueue();
    }
  }

  /**
   * Submit compression task to worker pool
   * 
   * @param file - Image file to compress
   * @param config - Compression configuration
   * @param priority - Task priority (higher = more urgent)
   * @returns Promise resolving to compression result
   */
  async compressImage(
    file: File,
    config: ImageCompressionConfig,
    priority: number = 0
  ): Promise<CompressionResult> {
    // Ensure pool is initialized
    if (!this.initialized) {
      await this.initialize();
    }

    return new Promise<CompressionResult>((resolve, reject) => {
      const task: WorkerTask = {
        id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        file,
        config,
        resolve,
        reject,
        retryCount: 0,
        priority,
        timestamp: Date.now(),
      };

      this.taskQueue.push(task);
      this.processQueue();
    });
  }

  /**
   * Get pool statistics
   */
  getStats(): {
    totalWorkers: number;
    busyWorkers: number;
    queuedTasks: number;
    initialized: boolean;
  } {
    return {
      totalWorkers: this.workers.length,
      busyWorkers: this.workers.filter(w => w.busy).length,
      queuedTasks: this.taskQueue.length,
      initialized: this.initialized,
    };
  }

  /**
   * Shutdown worker pool
   */
  async shutdown(): Promise<void> {
    workerPoolDebugLog('[WorkerPool] Shutting down...');

    // Terminate all workers
    for (const instance of this.workers) {
      instance.worker.terminate();
    }

    // Clear queue and reject pending tasks
    for (const task of this.taskQueue) {
      task.reject(new Error('Worker pool shut down'));
    }

    this.workers = [];
    this.taskQueue = [];
    this.initialized = false;

    workerPoolDebugLog('[WorkerPool] Shutdown complete');
  }
}

// Export singleton instance
export const workerPoolManager = new WorkerPoolManager();

// Export class for testing
export { WorkerPoolManager };
