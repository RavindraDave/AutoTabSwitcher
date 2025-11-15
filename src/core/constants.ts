/**
 * Shared constants used across the extension
 */

// Alarm names for chrome.alarms API
export const ALARM_NAME = 'tabSwitcher';
export const KEEPALIVE_ALARM_NAME = 'keepAlive';

/**
 * Timing constants
 *
 * IMPORTANT: Development vs Production timing differences
 * --------------------------------------------------------
 * - Development (unpacked): 60 second minimum
 *   Reason: Provides a safer testing experience and reduces accidental rapid tab switching
 *           during development. Developers can manually test with shorter intervals if needed.
 *
 * - Production (Chrome Web Store): 5 second minimum
 *   Reason: Users expect faster switching options. The 5-second minimum is reasonable for
 *           real-world use cases (e.g., slideshow presentations, monitoring dashboards).
 *
 * - Chrome alarms API: 30 second minimum for periodic alarms
 *   Note: For delays < 30s, the extension uses setInterval with a keep-alive mechanism.
 *         For delays >= 30s, it uses the more efficient chrome.alarms API.
 */
export const MIN_ALARM_DELAY_MS = 30000; // 30 seconds - Chrome alarms API minimum for packed extensions
export const MIN_DELAY_MS_DEVELOPMENT = 60000; // 60 seconds for unpacked (development)
export const MIN_DELAY_MS_PRODUCTION = 5000; // 5 seconds for packed (Chrome Web Store)

// Feature defaults
export const DEFAULT_ENABLED = false;
export const DEFAULT_ENABLE_ON_STARTUP = false;
export const DEFAULT_WINDOW_MODE = 'global' as const; // Legacy field
export const DEFAULT_OPERATING_MODE = 'global' as const; // New mode system default
export const DEFAULT_PAUSE_ON_ACTIVITY = false;
export const DEFAULT_PAUSE_DURATION = 30000; // 30 seconds

// Validation ranges (for popup)
export const MIN_DELAY_SECONDS = 60; // 1 minute
export const MAX_DELAY_SECONDS = 3600; // 1 hour
export const MIN_PAUSE_DURATION_SECONDS = 5;
export const MAX_PAUSE_DURATION_SECONDS = 300; // 5 minutes
export const DEFAULT_PAUSE_DURATION_SECONDS = 30;
