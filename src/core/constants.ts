/**
 * Shared constants used across the extension
 */

// Alarm names for chrome.alarms API
export const ALARM_NAME = 'tabSwitcher';
export const KEEPALIVE_ALARM_NAME = 'keepAlive';

/**
 * Timing constants
 *
 * IMPORTANT: Minimum delay time
 * --------------------------------------------------------
 * - Both Development and Production: 2 second minimum
 *   Reason: Provides consistency between UI validation and storage layer.
 *           The UI allows 2-second minimum, so storage should match.
 *
 *   ⚠️ WARNING: Very low values (2-5 seconds) can cause issues:
 *      - May be difficult to stop once started (tabs switch before you can click stop)
 *      - Can cause browser performance issues with rapid switching
 *      - May interfere with normal browsing activities
 *      - Not recommended for general use - primarily for specific use cases like slideshows
 *
 * - Chrome alarms API: 30 second minimum for periodic alarms
 *   Note: For delays < 30s, the extension uses setInterval with a keep-alive mechanism.
 *         For delays >= 30s, it uses the more efficient chrome.alarms API.
 */
export const MIN_ALARM_DELAY_MS = 30000; // 30 seconds - Chrome alarms API minimum for packed extensions
export const MIN_DELAY_MS_DEVELOPMENT = 60000; // DEPRECATED: No longer used - kept for backward compatibility with old tests
export const MIN_DELAY_MS_PRODUCTION = 2000; // 2 seconds for both development and production - USE WITH CAUTION!

// Feature defaults
export const DEFAULT_ENABLED = false;
export const DEFAULT_ENABLE_ON_STARTUP = false;
export const DEFAULT_WINDOW_MODE = 'global' as const; // Legacy field
export const DEFAULT_SWITCHING_MODE = 'global' as const; // Tab switching mode (global or per-window)
export const DEFAULT_OPERATING_MODE = DEFAULT_SWITCHING_MODE; // @deprecated: Use DEFAULT_SWITCHING_MODE
export const DEFAULT_PAUSE_ON_ACTIVITY = false;
export const DEFAULT_PAUSE_DURATION = 30000; // 30 seconds

// Validation ranges (for popup)
export const MIN_DELAY_SECONDS = 2; // 2 seconds - WARNING: Very low values can be difficult to stop
export const MAX_DELAY_SECONDS = 3600; // 1 hour
export const MIN_PAUSE_DURATION_SECONDS = 5;
export const MAX_PAUSE_DURATION_SECONDS = 300; // 5 minutes
export const DEFAULT_PAUSE_DURATION_SECONDS = 30;

// ===== PREMIUM FEATURES =====

/**
 * Build-time constant controlling premium feature availability
 * - Set via BUILD_PREMIUM environment variable during build
 * - Free builds: false (premium code removed via dead code elimination)
 * - Premium builds: true (premium code included)
 * - This prevents reverse engineering of premium features in free builds
 *
 * Re-exported from build-config.ts which is auto-generated during build
 */
export { PREMIUM_FEATURES_AVAILABLE } from './build-config.js';

// Premium feature limits
export const MAX_SESSIONS = 50; // Maximum saved sessions
export const MAX_TABS_PER_SESSION = 200; // Maximum tabs in a session
export const MAX_REFRESH_RULES = 100; // Maximum refresh rules
export const MAX_SKIP_RULES = 100; // Maximum skip rules
export const MAX_SESSION_NAME_LENGTH = 100; // Maximum session name length
export const MAX_SESSION_DESCRIPTION_LENGTH = 500; // Maximum session description length
export const MAX_RULE_PATTERN_LENGTH = 500; // Maximum URL pattern length

// Session template IDs
export const SESSION_TEMPLATE_IDS = {
  DEVELOPMENT: 'dev-workspace',
  RESEARCH: 'research-session',
  SOCIAL_MEDIA: 'social-media',
  SHOPPING: 'shopping',
  CUSTOM: 'custom'
} as const;

// Refresh intervals (milliseconds)
export const MIN_REFRESH_INTERVAL = 5000; // 5 seconds minimum
export const MAX_REFRESH_INTERVAL = 86400000; // 24 hours maximum
export const DEFAULT_REFRESH_INTERVAL = 60000; // 1 minute default

// Backup settings
export const MAX_AUTO_BACKUPS = 10; // Keep last 10 auto backups
export const AUTO_BACKUP_INTERVAL = 86400000; // 24 hours

// ===== NEW FEATURES CONSTANTS =====

// Idle Auto-Start
export const DEFAULT_IDLE_AUTO_START = false;
export const DEFAULT_IDLE_THRESHOLD_SECONDS = 60; // 1 minute idle threshold
export const MIN_IDLE_THRESHOLD_SECONDS = 15; // Chrome minimum for idle detection
export const MAX_IDLE_THRESHOLD_SECONDS = 3600; // 1 hour maximum
export const DEFAULT_IDLE_STOP_ON_ACTIVE = true;

// Tab Statistics
export const MAX_TAB_VISIT_ENTRIES = 200; // Maximum per-tab entries to store

// Switch Notification
export const DEFAULT_SWITCH_NOTIFICATION = false;
export const NOTIFICATION_DISPLAY_MS = 2000; // How long to show notification

// Context Menu
export const DEFAULT_CONTEXT_MENU_ENABLED = true;
export const CONTEXT_MENU_ID_EXCLUDE = 'ats-exclude-tab';
export const CONTEXT_MENU_ID_TOGGLE = 'ats-toggle-cycling';
export const CONTEXT_MENU_ID_PARENT = 'ats-parent';
