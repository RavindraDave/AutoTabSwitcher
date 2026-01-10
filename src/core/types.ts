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
  switchingMode?: SwitchingMode; // 'global' | 'window' - controls tab switching behavior
  windowStates?: { [windowId: number]: WindowState }; // Per-window states for Window Mode

  // Legacy field migration (for backward compatibility during transition)
  operatingMode?: SwitchingMode; // DEPRECATED: Use switchingMode instead

  // Onboarding
  hasSeenOnboarding?: boolean; // Whether user has completed the onboarding tour

  // Manual pause (keyboard shortcut)
  manuallyPaused?: boolean; // Global manual pause state (Global Mode)
  manuallyPausedWindows?: { [windowId: number]: boolean }; // Per-window manual pause states (Window Mode)
}

/**
 * Window mode type (legacy - for backward compatibility)
 */
export type WindowMode = 'global' | 'current-window';

/**
 * Switching mode type - controls tab switching behavior
 * - 'global': All windows controlled together (uses hybrid timer)
 * - 'window': Per-window independent control (uses window timer manager)
 */
export type SwitchingMode = 'global' | 'window';

/**
 * @deprecated Use SwitchingMode instead
 * Operating mode type - old name, kept for backward compatibility
 */
export type OperatingMode = SwitchingMode;

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
  mode?: SwitchingMode; // Current switching mode
  windowId?: number;
  previousTabTitle?: string;
  newTabTitle?: string;
  details?: string;
}
