/**
 * Shared type definitions
 */

/**
 * Storage data structure
 */
export interface StorageData {
  delayTime?: number; // in milliseconds
  enabled?: boolean;
  enableOnStartup?: boolean; // Auto-enable when browser starts
  windowMode?: 'global' | 'current-window';
  selectedWindowId?: number;
  pauseOnActivity?: boolean;
  pauseDuration?: number; // in milliseconds
  lastSwitchTime?: number; // timestamp of last tab switch (deprecated, use per-window)
  lastSwitchTimes?: { [windowId: number]: number }; // per-window last switch timestamps
}

/**
 * Window mode type
 */
export type WindowMode = 'global' | 'current-window';
