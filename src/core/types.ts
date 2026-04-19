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

  // ===== PREMIUM FEATURES (Phase 2 & 3) =====

  // Rotation Patterns (Feature 1)
  rotationPatterns?: { [patternId: string]: RotationPattern }; // Available rotation patterns
  activePattern?: string; // Currently active pattern ID (global)
  windowPatterns?: { [windowId: number]: string }; // Per-window pattern overrides

  // Tab Grouping (Feature 3)
  tabGroups?: TabGroup[]; // Defined tab groups
  activeGroupId?: string; // Currently active group (for within-group rotation)
  groupRotationMode?: GroupRotationMode; // How groups interact with rotation
  windowActiveGroups?: { [windowId: number]: string }; // Per-window active group

  // Advanced Scheduling (Feature 5)
  schedules?: Schedule[]; // Defined schedules
  schedulesEnabled?: boolean; // Master toggle for all schedules
  lastScheduleCheck?: number; // Last time schedules were evaluated

  // ===== NEW FEATURES =====

  // Idle Auto-Start: Automatically start cycling when system goes idle
  idleAutoStart?: boolean; // Enable idle-based auto-start
  idleThresholdSeconds?: number; // Seconds of inactivity before considered idle (15-3600)
  idleStopOnActive?: boolean; // Stop cycling when user becomes active again

  // Tab Statistics Tracker: Track rotation metrics
  tabStatistics?: TabStatistics; // Rotation statistics

  // Switch Notification: Visual notification before tab switch
  switchNotification?: boolean; // Enable switch notifications
  switchNotificationSound?: boolean; // Play a sound on switch (future)

  // Context Menu: Quick action settings
  contextMenuEnabled?: boolean; // Enable right-click context menu

  // Per-Tab Custom Display Time (Phase 1.1)
  // Map of normalized URL key → delay entry. See url-normalizer.ts for key format.
  tabDelays?: { [urlKey: string]: TabDelayEntry };

  // Smart Audio Management (Phase 1.2)
  audioManagement?: AudioManagementMode;
  // Snapshot of original mute state so we can restore on disable.
  // Keyed by tab ID → boolean (true if the tab was user-muted before we touched it).
  audioOriginalMuteStates?: { [tabId: number]: boolean };

  // Fullscreen / Kiosk Mode (Phase 1.3)
  kioskMode?: boolean;                 // Master toggle
  kioskOverlayEnabled?: boolean;       // Show on-tab overlay with tab name + controls
  kioskOverlayAutoHideMs?: number;     // Auto-hide overlay after N ms of mouse idle
  kioskFullscreenWindowIds?: number[]; // Windows currently in fullscreen kiosk mode

  // Phase 2.1 — URL List Rotation
  urlListConfig?: UrlListConfig;
}

/**
 * Window mode type (legacy - for backward compatibility)
 */
export type WindowMode = 'global' | 'current-window';

/**
 * Switching mode type - controls tab switching behavior
 * - 'global': All windows controlled together (uses hybrid timer)
 * - 'window': Per-window independent control (uses window timer manager)
 * - 'urlList': Opens a predefined set of URLs and rotates through them (Premium)
 */
export type SwitchingMode = 'global' | 'window' | 'urlList';

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

/**
 * URL List Rotation Mode — a single entry in the rotation list.
 */
export interface UrlListEntry {
  id: string;
  url: string;
  label?: string;
  delayMs?: number;
  enabled: boolean;
  createdAt: number;
}

/**
 * URL List Rotation Mode — overall config stored in `urlListConfig`.
 */
export interface UrlListConfig {
  entries: UrlListEntry[];
  windowId?: number;
  lastActiveIndex?: number;
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

  // Phase 2 & 3 features
  rotationPatterns?: { [patternId: string]: RotationPattern };
  tabGroups?: TabGroup[];
  schedules?: Schedule[];

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
    rotationPatterns?: number;
    tabGroups?: number;
    schedules?: number;
  };
  skipped?: {
    sessions?: number;
    refreshRules?: number;
    skipRules?: number;
    rotationPatterns?: number;
    tabGroups?: number;
    schedules?: number;
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
  includeRotationPatterns?: boolean;
  includeTabGroups?: boolean;
  includeSchedules?: boolean;
  format?: 'json'; // Only JSON for Phase 1, YAML in Phase 2
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

// ============================================================================
// PREMIUM FEATURES - PHASE 2 & 3 TYPE DEFINITIONS
// ============================================================================

/**
 * Rotation Patterns (Feature 1)
 */

/**
 * Custom rotation pattern - defines how tabs should be rotated
 */
export interface RotationPattern {
  id: string;
  name: string;
  type: 'sequential' | 'reverse' | 'random' | 'pinned-first' | 'custom';
  description?: string;

  // Custom order for 'custom' pattern type
  customOrder?: Array<number | string>; // Array of indices or URL patterns

  // Pattern options
  options?: {
    shuffleDaily?: boolean; // For random: re-shuffle once per day
    respectPinned?: boolean; // Keep pinned tabs in their position
    loopMode?: 'circular' | 'bounce'; // Circular (wrap) or bounce (reverse at end)
  };

  createdAt?: number;
  updatedAt?: number;
}

/**
 * Tab Grouping & Categorization (Feature 3)
 */

/**
 * Tab group - collection of tabs with shared settings
 */
export interface TabGroup {
  id: string;
  name: string;
  description?: string;
  color?: string; // Hex color or named color
  icon?: string; // Emoji or icon identifier

  // Tab matchers - define which tabs belong to this group
  tabs: TabMatcher[];

  // Group-specific settings
  settings: {
    customDelayTime?: number; // Override global interval for this group
    rotationPatternId?: string; // Custom pattern for this group
    skipRules?: string[]; // Skip rule IDs that apply to this group
    enabled?: boolean; // Whether this group is active
  };

  // Rotation behavior within group
  rotationMode?: 'within' | 'independent'; // Rotate within group only, or independently

  createdAt?: number;
  updatedAt?: number;
}

/**
 * Tab matcher - defines criteria for matching tabs to groups
 */
export interface TabMatcher {
  type: 'url' | 'domain' | 'regex' | 'title' | 'manual';
  pattern?: string; // Pattern for url/domain/regex/title types
  tabIds?: number[]; // Explicit tab IDs for manual type
  matchOptions?: {
    caseSensitive?: boolean;
    exactMatch?: boolean;
  };
}

/**
 * Group rotation mode - how groups interact with tab rotation
 */
export type GroupRotationMode =
  | 'within-group'       // Rotate only within active group
  | 'between-groups'     // Rotate between groups (one tab from each group)
  | 'sequential-groups'  // Complete one group before moving to next
  | 'independent';       // Groups don't affect rotation (normal rotation)

/**
 * Advanced Scheduling (Feature 5)
 */

/**
 * Schedule - time-based automation rule
 */
export interface Schedule {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;

  // Time constraints
  timeRange?: { start: string; end: string }; // HH:MM format
  daysOfWeek?: number[]; // 0 = Sunday, 6 = Saturday
  dateRange?: { start: string; end: string }; // ISO date strings

  // Schedule type
  type: 'recurring' | 'one-time';

  // Actions to execute when schedule is active
  actions: ScheduledAction[];

  // Priority for conflict resolution (higher = more important)
  priority?: number;

  createdAt?: number;
  updatedAt?: number;
  lastTriggered?: number; // Last time this schedule was triggered
}

/**
 * Scheduled action - what to do when schedule is active
 */
export interface ScheduledAction {
  type:
    | 'enable'           // Enable tab switching
    | 'disable'          // Disable tab switching
    | 'set-interval'     // Change rotation interval
    | 'set-pattern'      // Change rotation pattern
    | 'set-group'        // Activate a tab group
    | 'deactivate-group' // Deactivate current tab group
    | 'set-mode'         // Change switching mode (global/window)
    | 'launch-session'   // Launch a saved session
    | 'enable-refresh'   // Enable auto-refresh
    | 'disable-refresh'; // Disable auto-refresh

  // Action parameters (depends on action type)
  params?: {
    enabled?: boolean;            // For enable/disable
    delayTime?: number;           // For set-interval
    patternId?: string;           // For set-pattern
    groupId?: string;             // For set-group
    switchingMode?: SwitchingMode; // For set-mode
    windowId?: number;            // Target specific window (optional)
    sessionId?: string;           // For launch-session
    launchMode?: 'new-window' | 'current' | 'replace'; // For launch-session
  };
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

// ============================================================================
// NEW FEATURES TYPE DEFINITIONS
// ============================================================================

/**
 * Tab Statistics - tracks rotation metrics
 */
export interface TabStatistics {
  totalSwitches: number; // Total tab switches since tracking began
  totalCycles: number; // Complete cycles through all tabs
  sessionStartTime: number; // When the current tracking session started
  lastResetTime: number; // When stats were last reset
  perTabVisits: { [tabId: number]: TabVisitInfo }; // Per-tab visit tracking
}

/**
 * Per-tab visit information
 */
export interface TabVisitInfo {
  visitCount: number; // Times this tab was switched to
  totalViewTime: number; // Total milliseconds spent viewing this tab
  lastVisitTime: number; // Timestamp of last visit
  tabTitle?: string; // Last known tab title (for display)
}

/**
 * Idle state type for chrome.idle API
 */
export type IdleState = 'active' | 'idle' | 'locked';

/**
 * Context menu action type
 */
export type ContextMenuAction = 'exclude-tab' | 'toggle-cycling' | 'toggle-window' | 'set-tab-delay';

// ============================================================================
// PHASE 1 FREE-TIER FEATURE TYPES
// ============================================================================

/**
 * Per-tab custom display time entry (Phase 1.1)
 * Stored keyed by normalized URL (origin + pathname; query/hash ignored).
 */
export interface TabDelayEntry {
  url: string;        // Normalized URL key (origin + pathname)
  delay: number;      // Dwell time in milliseconds
  label?: string;     // Optional user-provided display name
  createdAt: number;  // Timestamp when this entry was created
  updatedAt?: number; // Timestamp of last update
}

/**
 * Smart audio management mode (Phase 1.2)
 * - 'off': Do not touch tab audio state
 * - 'mute-inactive': Unmute the rotating tab, mute all others in the same window
 */
export type AudioManagementMode = 'off' | 'mute-inactive';
