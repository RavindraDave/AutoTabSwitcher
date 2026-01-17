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

  // ===== PREMIUM FEATURES (Phase 1) =====

  // Session Management
  savedSessions?: SavedSession[]; // Saved tab sessions
  autoLaunchSessionIds?: string[]; // Sessions to auto-launch on startup
  lastLaunchedSessions?: { [sessionId: string]: number }; // Timestamp of last launch

  // Smart Auto-Refresh
  refreshSettings?: RefreshSettings; // Global refresh settings
  refreshRules?: RefreshRule[]; // Refresh filtering rules
  tabRefreshStates?: { [tabId: number]: TabRefreshState }; // Per-tab refresh tracking

  // Skip Rules
  skipRules?: SkipRule[]; // Rules for skipping tabs in rotation
  skipPinnedTabs?: boolean; // Skip all pinned tabs

  // Import/Export
  configVersion?: string; // Config schema version (e.g., "2.0.0")
  lastBackupTime?: number; // Timestamp of last backup
  autoBackupEnabled?: boolean; // Auto-backup before imports

  // Premium license
  premiumEnabled?: boolean; // Whether premium features are enabled
  licenseKey?: string; // Premium license key (for future use)
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
  customDelayTime?: number;  // PREMIUM: Per-window interval override (ms)
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

// ============================================================================
// PREMIUM FEATURES - PHASE 1 TYPE DEFINITIONS
// ============================================================================

/**
 * Session Management Types
 */

/**
 * Saved session - a collection of tabs that can be restored
 */
export interface SavedSession {
  id: string;
  name: string;
  description?: string;
  icon?: string; // Emoji or icon identifier

  // Session tabs
  tabs: SavedTab[];

  // Session metadata
  createdAt: number;
  updatedAt?: number;
  lastLaunched?: number;
  launchCount?: number;

  // Launch settings
  autoLaunchOnStartup?: boolean;
  launchMode?: 'new-window' | 'current' | 'replace'; // Default launch mode
}

/**
 * Saved tab in a session
 */
export interface SavedTab {
  url: string;
  title?: string;
  favIconUrl?: string;
  pinned?: boolean;
  index?: number; // Original index for ordering
}

/**
 * Session template for quick setup
 */
export interface SessionTemplate {
  id: string;
  name: string;
  description: string;
  icon?: string;
  category: 'developer' | 'monitoring' | 'social' | 'research' | 'productivity';
  tabs: Array<{
    url: string;
    title: string;
  }>;
}

/**
 * Options for saving a session
 */
export interface SaveSessionOptions {
  includeUrls?: boolean; // Default: true
  includeTitles?: boolean; // Default: true
  includeFavicons?: boolean; // Default: true
  includePinnedState?: boolean; // Default: true
}

/**
 * Smart Auto-Refresh Types
 */

/**
 * Refresh settings - controls auto-refresh behavior
 */
export interface RefreshSettings {
  enabled: boolean;
  strategy: 'preemptive' | 'post-switch' | 'manual' | 'hybrid';

  // Global refresh interval (ms)
  globalRefreshInterval?: number;

  // Preemptive refresh timing
  preloadTime?: number; // How many ms before switch to refresh (default: 2000)
  preemptiveRefreshOffset?: number; // Alias for preloadTime (deprecated, use preloadTime)

  // Refresh options
  bypassCache?: boolean; // Force full reload vs cache-aware (default: false)
  smartPrefetch?: boolean; // Enable predictive preloading (default: false)
  prefetchCount?: number; // How many next tabs to prefetch (default: 1)
  refreshNonMatchingTabs?: boolean; // Whether to refresh tabs that don't match any rule (default: true)

  // Resource awareness
  pauseOnLowBattery?: boolean; // Pause refresh when battery < 20%
  pauseOnHighCPU?: boolean; // Pause when CPU > 80%

  // Refresh interval independence
  refreshIndependentOfRotation?: boolean; // If true, refresh has its own timing
}

/**
 * Refresh rule - like skip rule but for refresh
 */
export interface RefreshRule {
  id: string;
  type: 'url' | 'domain' | 'regex' | 'title';
  pattern: string;
  action: 'refresh' | 'skip-refresh'; // Whitelist or blacklist
  enabled: boolean;
  description?: string;

  // Advanced options
  matchOptions?: {
    caseSensitive?: boolean;
    exactMatch?: boolean;
  };

  createdAt?: number;
}

/**
 * Per-tab refresh state tracking
 */
export interface TabRefreshState {
  lastRefreshTime: number; // Timestamp of last refresh
  refreshCount: number; // Total number of refreshes
  customInterval?: number; // Override global refresh interval
  lastRefreshDuration?: number; // How long the refresh took (ms)
  strategy?: 'preemptive' | 'post-switch' | 'manual'; // Override global strategy
}

/**
 * Skip Rules Types
 */

/**
 * Skip rule - defines which tabs should be excluded from rotation
 */
export interface SkipRule {
  id: string;
  type: 'url' | 'domain' | 'regex' | 'title' | 'pinned';
  pattern: string; // URL, domain, regex, or title pattern
  enabled: boolean;
  description?: string;

  // Advanced options
  matchOptions?: {
    caseSensitive?: boolean;
    exactMatch?: boolean;
  };

  createdAt?: number;
}

/**
 * Import/Export Types
 */

/**
 * Configuration export format
 */
export interface ConfigExport {
  version: string; // Config schema version
  exportDate: number; // Timestamp

  // Configuration sections
  settings?: {
    delayTime?: number;
    switchingMode?: SwitchingMode;
    pauseOnActivity?: boolean;
    pauseDuration?: number;
    enableOnStartup?: boolean;
    skipPinnedTabs?: boolean;
  };

  // Phase 1 features
  savedSessions?: SavedSession[];
  refreshSettings?: RefreshSettings;
  refreshRules?: RefreshRule[];
  skipRules?: SkipRule[];

  // Metadata
  metadata?: {
    extensionVersion?: string;
    browser?: string;
    os?: string;
    exportedBy?: string;
    notes?: string;
  };
}

/**
 * Import result
 */
export interface ImportResult {
  success: boolean;
  errors?: string[]; // Fatal errors that prevented import
  warnings?: string[]; // Non-fatal issues
  imported: {
    settings?: boolean;
    sessions?: number; // Count of imported sessions
    refreshSettings?: boolean;
    refreshRules?: number;
    skipRules?: number;
  };
  skipped?: {
    sessions?: number;
    refreshRules?: number;
    skipRules?: number;
  };
}

/**
 * Export options
 */
export interface ExportOptions {
  includeSettings?: boolean;
  includeSessions?: boolean;
  includeRefreshSettings?: boolean;
  includeRefreshRules?: boolean;
  includeSkipRules?: boolean;
  format?: 'json'; // Only JSON for Phase 1
  sanitize?: boolean; // Remove potentially sensitive data (URLs, titles)
}

/**
 * Import options
 */
export interface ImportOptions {
  mode: 'replace' | 'merge';
  overwriteExisting?: boolean; // For merge mode
  validateOnly?: boolean; // Only validate, don't import
  createBackup?: boolean; // Create backup before import (default: true)
}

/**
 * Configuration backup
 */
export interface ConfigBackup {
  id: string;
  timestamp: number;
  config: ConfigExport;
  reason: 'manual' | 'pre-import' | 'scheduled';
  autoBackup: boolean;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

/**
 * Validation error
 */
export interface ValidationError {
  path: string; // JSON path to error (e.g., 'sessions[0].name')
  message: string;
  expected?: any;
  actual?: any;
}

/**
 * Validation warning
 */
export interface ValidationWarning {
  path: string;
  message: string;
}

/**
 * Common utility types
 */

/**
 * Generic result type
 */
export interface Result<T> {
  success: boolean;
  data?: T;
  error?: string;
}
