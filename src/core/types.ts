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
  windowMode?: 'global' | 'current-window'; // Legacy field for backward compatibility
  selectedWindowId?: number;
  pauseOnActivity?: boolean;
  pauseDuration?: number; // in milliseconds
  lastSwitchTime?: number; // timestamp of last tab switch (deprecated, use per-window)
  lastSwitchTimes?: { [windowId: number]: number }; // per-window last switch timestamps

  // New fields for enhanced mode system
  operatingMode?: OperatingMode; // 'global' | 'window' - new mode system
  windowStates?: { [windowId: number]: WindowState }; // Per-window states for Window Mode
}

/**
 * Window mode type (legacy - for backward compatibility)
 */
export type WindowMode = 'global' | 'current-window';

/**
 * Operating mode type - new enhanced mode system
 */
export type OperatingMode = 'global' | 'window';

/**
 * Per-window state for Window Mode
 */
export interface WindowState {
  enabled: boolean;
  enabledTimestamp?: number; // When this window was enabled
  lastSwitchTime?: number;   // Last tab switch time for this window
}

/**
 * Diagnostic log entry with enhanced window information
 */
export interface DiagnosticLogEntry {
  timestamp: number;
  event: 'SWITCH' | 'ENABLE' | 'DISABLE' | 'MODE_CHANGE' | 'PAUSE' | 'RESUME';
  mode?: OperatingMode; // Current operating mode
  windowId?: number;
  previousTabTitle?: string;
  newTabTitle?: string;
  details?: string;
}
