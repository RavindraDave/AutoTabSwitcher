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
 * - Production (Chrome Web Store): 2 second minimum
 *   Reason: Users expect faster switching options. The 2-second minimum allows for rapid
 *           transitions but comes with important caveats.
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
export const MIN_DELAY_MS_DEVELOPMENT = 60000; // 60 seconds for unpacked (development)
export const MIN_DELAY_MS_PRODUCTION = 2000; // 2 seconds for packed (Chrome Web Store) - USE WITH CAUTION!

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
