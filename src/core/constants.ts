/**
 * Shared constants used across the extension
 */

// Alarm name for chrome.alarms API
export const ALARM_NAME = 'tabSwitcher';

// Timing constants
export const MIN_ALARM_DELAY_MS = 30000; // 30 seconds - Chrome alarms API minimum for packed extensions
export const MIN_DELAY_MS_DEVELOPMENT = 60000; // 60 seconds for unpacked (development)
export const MIN_DELAY_MS_PRODUCTION = 5000; // 5 seconds for packed (Chrome Web Store)

// Feature defaults
export const DEFAULT_ENABLED = false;
export const DEFAULT_WINDOW_MODE = 'global' as const;
export const DEFAULT_PAUSE_ON_ACTIVITY = false;
export const DEFAULT_PAUSE_DURATION = 30000; // 30 seconds

// Validation ranges (for popup)
export const MIN_DELAY_SECONDS = 60; // 1 minute
export const MAX_DELAY_SECONDS = 3600; // 1 hour
export const MIN_PAUSE_DURATION_SECONDS = 5;
export const MAX_PAUSE_DURATION_SECONDS = 300; // 5 minutes
export const DEFAULT_PAUSE_DURATION_SECONDS = 30;
