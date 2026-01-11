/**
 * PREMIUM FEATURES TYPE DEFINITIONS REFERENCE
 *
 * This file contains all type definitions for AutoTabSwitcher v2.0.0 premium features.
 * Use this as a reference when implementing premium features.
 *
 * To implement: Copy relevant types to src/core/types.ts
 */

/**
 * ============================================================================
 * EXTENDED STORAGE DATA INTERFACE
 * ============================================================================
 */

export interface StorageData {
  // ===== EXISTING FIELDS (v1.x) =====
  delayTime?: number;
  enabled?: boolean;
  enableOnStartup?: boolean;
  windowMode?: 'global' | 'current-window'; // Legacy
  selectedWindowId?: number;
  pauseOnActivity?: boolean;
  pauseDuration?: number;
  lastSwitchTime?: number; // Deprecated, use per-window
  lastSwitchTimes?: { [windowId: number]: number };

  // New fields for enhanced mode system
  switchingMode?: SwitchingMode; // 'global' | 'window'
  windowStates?: { [windowId: number]: WindowState };
  operatingMode?: SwitchingMode; // DEPRECATED: Use switchingMode

  // Onboarding
  hasSeenOnboarding?: boolean;

  // Manual pause (keyboard shortcut)
  manuallyPaused?: boolean; // Global Mode
  manuallyPausedWindows?: { [windowId: number]: boolean }; // Window Mode

  // ===== NEW PREMIUM FIELDS (v2.0) =====

  // Feature 1: Rotation Patterns
  rotationPatterns?: { [patternId: string]: RotationPattern };
  activePattern?: string; // Pattern ID or 'sequential' (default)
  windowPatterns?: { [windowId: number]: string }; // Per-window pattern override

  // Feature 2: Skip Rules
  skipRules?: SkipRule[];
  skipPinnedTabs?: boolean;

  // Feature 3: Tab Groups
  tabGroups?: TabGroup[];
  activeGroupId?: string; // Currently active group
  groupRotationMode?: GroupRotationMode;
  windowActiveGroups?: { [windowId: number]: string }; // Per-window active group

  // Feature 4: Per-Window Intervals
  // Already supported in windowStates.customDelayTime, needs UI exposure

  // Feature 5: Schedules
  schedules?: Schedule[];
  schedulesEnabled?: boolean;
  lastScheduleCheck?: number;

  // Feature 6: Config Management
  configVersion?: string; // e.g., "2.0.0"
  lastBackupTime?: number;
  autoBackupEnabled?: boolean;

  // Premium license (for future use)
  premiumEnabled?: boolean;
  licenseKey?: string;
}

/**
 * ============================================================================
 * FEATURE 1: ROTATION PATTERNS
 * ============================================================================
 */

/**
 * Rotation pattern definition
 * Defines how tabs should be cycled through
 */
export interface RotationPattern {
  id: string; // Unique identifier
  name: string; // User-friendly name
  type: RotationPatternType;
  description?: string;

  // For custom patterns: array of tab indices or URL patterns
  customOrder?: Array<number | string>;

  // Pattern options
  options?: {
    shuffleDaily?: boolean; // Re-randomize daily for random patterns
    respectPinned?: boolean; // Keep pinned tabs first
    loopMode?: 'circular' | 'bounce'; // Circular or ping-pong
    seed?: number; // Random seed for reproducible random patterns
  };

  // Metadata
  createdAt?: number;
  updatedAt?: number;
}

/**
 * Types of rotation patterns
 */
export type RotationPatternType =
  | 'sequential'      // Left to right (default)
  | 'reverse'         // Right to left
  | 'random'          // Random tab each time
  | 'pinned-first'    // Always start with pinned tabs, then others
  | 'custom';         // User-defined sequence

/**
 * ============================================================================
 * FEATURE 2: SKIP RULES
 * ============================================================================
 */

/**
 * Skip rule definition
 * Defines which tabs should be excluded from rotation
 */
export interface SkipRule {
  id: string; // Unique identifier
  type: SkipRuleType;
  pattern: string; // URL, domain, regex, or title pattern
  enabled: boolean;
  description?: string; // User description of what this rule does

  // Advanced options
  matchOptions?: {
    caseSensitive?: boolean; // Default: false
    exactMatch?: boolean; // Exact match vs contains (default: false)
    urlPart?: 'full' | 'hostname' | 'pathname'; // Which part of URL to match (default: full)
  };

  createdAt?: number;
}

/**
 * Types of skip rules
 */
export type SkipRuleType =
  | 'url'       // Match exact URL or URL pattern
  | 'domain'    // Match domain (supports wildcards like *.google.com)
  | 'regex'     // Match using regular expression
  | 'title'     // Match tab title
  | 'pinned';   // Match all pinned tabs

/**
 * ============================================================================
 * FEATURE 3: TAB GROUPS
 * ============================================================================
 */

/**
 * Tab group definition
 * Groups related tabs together with shared settings
 */
export interface TabGroup {
  id: string; // Unique identifier
  name: string; // User-friendly name
  color?: string; // Hex color or preset name (e.g., 'blue', 'red')
  icon?: string; // Emoji or icon identifier

  // Group membership rules
  tabs: TabMatcher[]; // Rules to match tabs to this group

  // Group settings
  settings: {
    customDelayTime?: number; // Override rotation interval (ms)
    rotationPatternId?: string; // Override rotation pattern
    skipRules?: string[]; // Additional skip rule IDs for this group
    enabled?: boolean; // Group can be temporarily disabled
  };

  // Group behavior
  rotationMode?: 'within' | 'independent'; // Rotate within group or independent timer

  // Metadata
  createdAt?: number;
  updatedAt?: number;
}

/**
 * Tab matcher for group membership
 * Defines how tabs are assigned to groups
 */
export interface TabMatcher {
  type: TabMatcherType;
  pattern?: string; // For pattern-based matching
  tabIds?: number[]; // For manual tab assignment
  options?: {
    caseSensitive?: boolean;
    exactMatch?: boolean;
  };
}

/**
 * Types of tab matchers
 */
export type TabMatcherType =
  | 'url'       // Match by URL pattern
  | 'domain'    // Match by domain (supports wildcards)
  | 'regex'     // Match by regex
  | 'title'     // Match by tab title
  | 'manual';   // Manual tab ID assignment

/**
 * Group rotation mode
 * Defines how rotation works with multiple groups
 */
export type GroupRotationMode =
  | 'within-group'      // Rotate only within active group
  | 'between-groups'    // Rotate through all groups, one tab at a time
  | 'sequential-groups' // Complete each group before moving to next
  | 'independent';      // Each group rotates independently (multiple timers)

/**
 * ============================================================================
 * FEATURE 4: PER-WINDOW INTERVALS
 * ============================================================================
 */

/**
 * Extended window state with per-window interval
 * (Extends existing WindowState interface)
 */
export interface WindowState {
  enabled: boolean;
  enabledTimestamp?: number;
  lastSwitchTime?: number;

  // NEW: Per-window interval override
  customDelayTime?: number; // If set, overrides global delayTime for this window
}

/**
 * Window interval preset
 */
export interface WindowIntervalPreset {
  id: string;
  name: string;
  delayTime: number; // in milliseconds
  description?: string;
}

/**
 * Common presets
 */
export const WINDOW_INTERVAL_PRESETS: WindowIntervalPreset[] = [
  { id: 'very-fast', name: 'Very Fast', delayTime: 2000, description: '2 seconds' },
  { id: 'fast', name: 'Fast', delayTime: 5000, description: '5 seconds' },
  { id: 'normal', name: 'Normal', delayTime: 10000, description: '10 seconds' },
  { id: 'slow', name: 'Slow', delayTime: 30000, description: '30 seconds' },
  { id: 'very-slow', name: 'Very Slow', delayTime: 60000, description: '60 seconds' },
];

/**
 * ============================================================================
 * FEATURE 5: ADVANCED SCHEDULING
 * ============================================================================
 */

/**
 * Schedule definition
 * Defines time-based automation rules
 */
export interface Schedule {
  id: string;
  name: string;
  enabled: boolean;

  // Time criteria
  timeRange?: {
    start: string; // HH:MM format (24-hour)
    end: string;   // HH:MM format (24-hour)
  };

  // Day criteria
  daysOfWeek?: number[]; // 0-6 (0=Sunday, 6=Saturday)
  dateRange?: {
    start: string; // ISO date format (YYYY-MM-DD)
    end: string;   // ISO date format (YYYY-MM-DD)
  };

  // Schedule type
  type: ScheduleType;

  // Actions to perform when schedule is active
  actions: ScheduledAction[];

  // Priority (higher number = higher priority)
  // Used to resolve conflicts when multiple schedules are active
  priority?: number; // Default: 0

  // Timezone (optional, defaults to system timezone)
  timezone?: string; // IANA timezone name (e.g., 'America/New_York')

  // Metadata
  createdAt?: number;
  updatedAt?: number;
}

/**
 * Schedule type
 */
export type ScheduleType =
  | 'recurring'  // Repeats based on criteria
  | 'one-time';  // Runs once in date range

/**
 * Scheduled action
 * Action to perform when schedule is active
 */
export interface ScheduledAction {
  type: ScheduledActionType;

  // Action parameters
  params?: {
    enabled?: boolean;          // For enable/disable action
    delayTime?: number;         // For set-interval action
    patternId?: string;         // For set-pattern action
    groupId?: string;           // For set-group action
    switchingMode?: SwitchingMode; // For set-mode action
    windowId?: number;          // Apply to specific window only (optional)
  };
}

/**
 * Types of scheduled actions
 */
export type ScheduledActionType =
  | 'enable'        // Enable tab switching
  | 'disable'       // Disable tab switching
  | 'set-interval'  // Change rotation interval
  | 'set-pattern'   // Change rotation pattern
  | 'set-group'     // Activate specific tab group
  | 'set-mode';     // Change switching mode (global/window)

/**
 * Schedule evaluation result
 */
export interface ScheduleEvaluationResult {
  scheduleId: string;
  isActive: boolean;
  nextEvaluation?: Date; // When to check again
  appliedActions?: ScheduledAction[];
}

/**
 * Common schedule templates
 */
export interface ScheduleTemplate {
  id: string;
  name: string;
  description: string;
  schedule: Omit<Schedule, 'id' | 'createdAt' | 'updatedAt'>;
}

/**
 * ============================================================================
 * FEATURE 6: IMPORT/EXPORT
 * ============================================================================
 */

/**
 * Configuration export format
 * Complete or partial extension configuration
 */
export interface ConfigExport {
  version: string; // Config schema version (e.g., "2.0.0")
  exportDate: number; // Timestamp

  // Configuration sections
  settings?: {
    delayTime?: number;
    switchingMode?: SwitchingMode;
    pauseOnActivity?: boolean;
    pauseDuration?: number;
    enableOnStartup?: boolean;
    skipPinnedTabs?: boolean;
    schedulesEnabled?: boolean;
    groupRotationMode?: GroupRotationMode;
    activePattern?: string;
    activeGroupId?: string;
  };

  rotationPatterns?: RotationPattern[];
  skipRules?: SkipRule[];
  tabGroups?: TabGroup[];
  schedules?: Schedule[];

  // Per-window configurations (optional)
  windowConfigurations?: {
    [windowId: number]: {
      customDelayTime?: number;
      customPattern?: string;
      activeGroupId?: string;
    };
  };

  // Metadata
  metadata?: {
    extensionVersion?: string;
    browser?: string;
    os?: string;
    exportedBy?: string; // User identifier (optional)
    notes?: string; // User notes about this config
  };
}

/**
 * Import result
 * Result of configuration import operation
 */
export interface ImportResult {
  success: boolean;
  errors?: string[]; // Fatal errors that prevented import
  warnings?: string[]; // Non-fatal issues
  imported: {
    settings?: boolean;
    patterns?: number; // Count of imported patterns
    skipRules?: number;
    tabGroups?: number;
    schedules?: number;
    windowConfigurations?: number;
  };
  skipped?: {
    patterns?: number; // Count of skipped items
    skipRules?: number;
    tabGroups?: number;
    schedules?: number;
  };
}

/**
 * Export options
 * Control what gets exported
 */
export interface ExportOptions {
  includeSettings?: boolean;
  includePatterns?: boolean;
  includeSkipRules?: boolean;
  includeTabGroups?: boolean;
  includeSchedules?: boolean;
  includeWindowStates?: boolean;
  format?: ExportFormat;
  sanitize?: boolean; // Remove potentially sensitive data (URLs, titles)
}

/**
 * Export format
 */
export type ExportFormat =
  | 'json'  // JSON format
  | 'yaml'; // YAML format (more human-readable)

/**
 * Import options
 * Control how import is performed
 */
export interface ImportOptions {
  mode: ImportMode;
  overwriteExisting?: boolean; // For merge mode
  validateOnly?: boolean; // Only validate, don't import
  createBackup?: boolean; // Create backup before import (default: true)
}

/**
 * Import mode
 */
export type ImportMode =
  | 'replace' // Replace all settings (destructive)
  | 'merge';  // Merge with existing (preserve unspecified)

/**
 * Configuration backup
 */
export interface ConfigBackup {
  id: string;
  timestamp: number;
  config: ConfigExport;
  reason: BackupReason;
  autoBackup: boolean;
}

/**
 * Backup reason
 */
export type BackupReason =
  | 'manual'      // User-initiated backup
  | 'pre-import'  // Automatic before import
  | 'scheduled'   // Scheduled auto-backup
  | 'pre-update'; // Before extension update

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
  path: string; // JSON path to error (e.g., 'rotationPatterns[0].type')
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
 * ============================================================================
 * COMMON TYPES & UTILITIES
 * ============================================================================
 */

/**
 * Switching mode (from existing codebase)
 */
export type SwitchingMode = 'global' | 'window';

/**
 * Tab information (from Chrome API)
 */
export interface Tab {
  id?: number;
  index: number;
  windowId: number;
  active: boolean;
  pinned: boolean;
  url?: string;
  title?: string;
  favIconUrl?: string;
}

/**
 * Common result type
 */
export interface Result<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Pagination
 */
export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * ============================================================================
 * CONFIGURATION TEMPLATES
 * ============================================================================
 */

/**
 * Configuration template for quick setup
 */
export interface ConfigTemplate {
  id: string;
  name: string;
  description: string;
  icon?: string;
  category: TemplateCategory;
  config: Partial<ConfigExport>;
}

/**
 * Template category
 */
export type TemplateCategory =
  | 'developer'   // Development workflows
  | 'monitoring'  // Dashboard/monitoring setups
  | 'social'      // Social media management
  | 'research'    // Research and reading
  | 'productivity' // General productivity
  | 'custom';     // User-created templates

/**
 * ============================================================================
 * API INTERFACES FOR CORE MODULES
 * ============================================================================
 */

/**
 * Rotation Engine API
 */
export interface IRotationEngine {
  // Get next tab based on current pattern
  getNextTab(tabs: Tab[], currentTab: Tab, pattern: RotationPattern): Promise<Tab | null>;

  // Resolve pattern to tab sequence
  resolvePattern(tabs: Tab[], pattern: RotationPattern): Promise<number[]>;

  // Apply skip rules to tab list
  applySkipRules(tabs: Tab[], rules: SkipRule[]): Promise<Tab[]>;

  // Get current pattern for window
  getCurrentPattern(windowId?: number): Promise<RotationPattern>;
}

/**
 * Skip Rule Engine API
 */
export interface ISkipRuleEngine {
  // Check if tab should be skipped
  shouldSkip(tab: Tab, rules: SkipRule[]): Promise<boolean>;

  // Add skip rule
  addRule(rule: SkipRule): Promise<void>;

  // Remove skip rule
  removeRule(ruleId: string): Promise<void>;

  // Update skip rule
  updateRule(ruleId: string, updates: Partial<SkipRule>): Promise<void>;

  // Get all skip rules
  getRules(): Promise<SkipRule[]>;

  // Validate rule pattern
  validateRule(rule: SkipRule): Promise<ValidationResult>;
}

/**
 * Group Manager API
 */
export interface IGroupManager {
  // Get all groups
  getGroups(): Promise<TabGroup[]>;

  // Get group by ID
  getGroup(groupId: string): Promise<TabGroup | null>;

  // Create new group
  createGroup(group: Omit<TabGroup, 'id' | 'createdAt' | 'updatedAt'>): Promise<string>;

  // Update group
  updateGroup(groupId: string, updates: Partial<TabGroup>): Promise<void>;

  // Delete group
  deleteGroup(groupId: string): Promise<void>;

  // Add tab to group
  addTabToGroup(tabId: number, groupId: string): Promise<void>;

  // Remove tab from group
  removeTabFromGroup(tabId: number, groupId: string): Promise<void>;

  // Get tabs in group
  getGroupTabs(groupId: string): Promise<Tab[]>;

  // Get active group for window
  getActiveGroup(windowId?: number): Promise<TabGroup | null>;

  // Set active group for window
  setActiveGroup(groupId: string, windowId?: number): Promise<void>;

  // Evaluate tab against group matchers
  evaluateTabForGroup(tab: Tab, group: TabGroup): Promise<boolean>;
}

/**
 * Schedule Manager API
 */
export interface IScheduleManager {
  // Initialize schedule checker
  initialize(): Promise<void>;

  // Evaluate current schedules
  evaluateSchedules(): Promise<ScheduleEvaluationResult[]>;

  // Apply scheduled action
  applyAction(action: ScheduledAction): Promise<void>;

  // Add new schedule
  addSchedule(schedule: Omit<Schedule, 'id' | 'createdAt' | 'updatedAt'>): Promise<string>;

  // Update schedule
  updateSchedule(scheduleId: string, updates: Partial<Schedule>): Promise<void>;

  // Delete schedule
  deleteSchedule(scheduleId: string): Promise<void>;

  // Get all schedules
  getSchedules(): Promise<Schedule[]>;

  // Check if schedule is active now
  isScheduleActive(schedule: Schedule, now?: Date): boolean;

  // Get active schedules right now
  getActiveSchedules(): Promise<Schedule[]>;
}

/**
 * Config Manager API
 */
export interface IConfigManager {
  // Export configuration
  exportConfig(options?: ExportOptions): Promise<ConfigExport>;

  // Import configuration
  importConfig(config: ConfigExport, options?: ImportOptions): Promise<ImportResult>;

  // Validate configuration
  validateConfig(config: ConfigExport): Promise<ValidationResult>;

  // Create configuration backup
  createBackup(reason: BackupReason): Promise<ConfigBackup>;

  // Restore from backup
  restoreBackup(backupId: string): Promise<void>;

  // Get all backups
  getBackups(): Promise<ConfigBackup[]>;

  // Delete backup
  deleteBackup(backupId: string): Promise<void>;

  // Get configuration templates
  getTemplates(): Promise<ConfigTemplate[]>;

  // Apply template
  applyTemplate(templateId: string): Promise<void>;
}

/**
 * ============================================================================
 * EVENT TYPES
 * ============================================================================
 */

/**
 * Extension events for premium features
 */
export type ExtensionEvent =
  | { type: 'pattern-changed'; patternId: string; windowId?: number }
  | { type: 'skip-rule-added'; rule: SkipRule }
  | { type: 'skip-rule-removed'; ruleId: string }
  | { type: 'group-created'; group: TabGroup }
  | { type: 'group-updated'; groupId: string; updates: Partial<TabGroup> }
  | { type: 'group-deleted'; groupId: string }
  | { type: 'group-activated'; groupId: string; windowId?: number }
  | { type: 'schedule-triggered'; schedule: Schedule; actions: ScheduledAction[] }
  | { type: 'config-imported'; result: ImportResult }
  | { type: 'config-exported'; config: ConfigExport };

/**
 * ============================================================================
 * ERROR TYPES
 * ============================================================================
 */

/**
 * Extension errors
 */
export class RotationEngineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RotationEngineError';
  }
}

export class SkipRuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SkipRuleError';
  }
}

export class GroupManagerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GroupManagerError';
  }
}

export class ScheduleManagerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ScheduleManagerError';
  }
}

export class ConfigManagerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigManagerError';
  }
}

export class ValidationError extends Error {
  public errors: ValidationError[];

  constructor(message: string, errors: ValidationError[] = []) {
    super(message);
    this.name = 'ValidationError';
    this.errors = errors;
  }
}
