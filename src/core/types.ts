/**
 * Shared type definitions
 */

/**
 * Storage data structure
 */
export interface StorageData {
  delayTime?: number; // in milliseconds
  enabled?: boolean;
  windowMode?: 'global' | 'current-window';
  selectedWindowId?: number;
  pauseOnActivity?: boolean;
  pauseDuration?: number; // in milliseconds
}

/**
 * Window mode type
 */
export type WindowMode = 'global' | 'current-window';
