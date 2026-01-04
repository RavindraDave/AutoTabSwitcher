/**
 * Hybrid timing implementation
 * Uses chrome.alarms for >= 30s delays, setInterval for < 30s delays
 *
 * Service Worker Resilience:
 * - Stores timer state in chrome.storage to survive service worker suspension
 * - Uses keep-alive alarm to wake service worker and restore interval timers
 * - Detects and logs service worker wake events for debugging
 */

import { ALARM_NAME, KEEPALIVE_ALARM_NAME, MIN_ALARM_DELAY_MS, DEFAULT_ENABLED } from './constants.js';
import { getSettings } from './storage.js';
import { updateBadge } from './badge-manager.js';
import { switchTab } from './tab-switcher.js';
import { isPaused } from './activity-tracker.js';
import { logger } from './logger.js';

// Timer state (for setInterval approach)
let intervalTimerId: number | undefined;
// SECURITY: lastIntervalCheck removed - now stored in chrome.storage for service worker resilience

// BUGFIX: In-memory flag to prevent race conditions during disable
// This provides immediate short-circuit before any async storage operations
let isStopping: boolean = false;
let isEnabled: boolean = false;

/**
 * Start timer using setInterval (for sub-30-second delays)
 * Includes keep-alive mechanism to survive service worker suspension
 *
 * @param delayMs - Delay in milliseconds
 */
async function startIntervalTimer(delayMs: number): Promise<void> {
  // Clear any existing interval
  if (intervalTimerId !== undefined) {
    clearInterval(intervalTimerId);
    intervalTimerId = undefined;
  }

  // BUGFIX: Set in-memory enabled flag
  isEnabled = true;
  isStopping = false;

  // Store timer state in chrome.storage for restoration after service worker wake
  // SECURITY: Store lastIntervalCheck in storage for service worker resilience
  await chrome.storage.local.set({
    usingIntervalTimer: true,
    intervalDelayMs: delayMs,
    lastIntervalStart: Date.now(),
    lastIntervalCheck: Date.now()
  });

  // Start new interval with pause checking
  intervalTimerId = setInterval(async () => {
    try {
      // BUGFIX: Immediate guard check before any async operations
      if (isStopping || !isEnabled) {
        return;
      }

      // SECURITY: Update lastIntervalCheck in storage instead of module variable
      await chrome.storage.local.set({ lastIntervalCheck: Date.now() });

      // BUGFIX: Re-check after async storage operation
      if (isStopping || !isEnabled) {
        return;
      }

      const data = await getSettings(['enabled']);
      const enabled = data.enabled ?? DEFAULT_ENABLED;

      // Short-circuit if disabled
      if (!enabled || isStopping || !isEnabled) {
        return;
      }

      const paused = await isPaused();

      // BUGFIX: Final check before tab switch
      if (isStopping || !isEnabled) {
        return;
      }

      if (paused) {
        await logger.info('TimingHybrid', 'Auto-switching paused due to user activity');
        await updateBadge(enabled, true);
      } else {
        await updateBadge(enabled, false);
        await switchTab();
      }
    } catch (error) {
      // CRITICAL: Catch all errors to prevent interval from running in broken state
      await logger.error('TimingHybrid', 'Interval callback failed', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    }
  }, delayMs) as unknown as number;

  // Start keep-alive alarm to wake service worker every minute
  // This ensures the interval timer keeps running
  await chrome.alarms.create(KEEPALIVE_ALARM_NAME, {
    delayInMinutes: 1,
    periodInMinutes: 1
  });

  await logger.info('TimingHybrid', 'Interval timer started with keep-alive', {
    delayMs,
    keepAliveEnabled: true
  });
}

/**
 * Stop interval timer and keep-alive alarm
 * BUGFIX: Immediately sets stopping flag to prevent any in-flight callbacks
 */
async function stopIntervalTimer(): Promise<void> {
  // BUGFIX: Set flags IMMEDIATELY before any async operations
  isStopping = true;
  isEnabled = false;

  // Clear interval timer synchronously
  if (intervalTimerId !== undefined) {
    clearInterval(intervalTimerId);
    intervalTimerId = undefined;
    await logger.info('TimingHybrid', 'Interval timer stopped');
  }

  // Clear keep-alive alarm (async but non-critical)
  await chrome.alarms.clear(KEEPALIVE_ALARM_NAME);

  // Clear timer state from storage
  await chrome.storage.local.set({
    usingIntervalTimer: false,
    intervalDelayMs: undefined,
    lastIntervalStart: undefined,
    lastIntervalCheck: undefined
  });

  await logger.info('TimingHybrid', 'Interval timer and keep-alive stopped');
}

/**
 * Start timer using chrome.alarms (for >= 30-second delays)
 *
 * @param delayMs - Delay in milliseconds
 */
async function startAlarmTimer(delayMs: number): Promise<void> {
  // BUGFIX: Set in-memory enabled flag
  isEnabled = true;
  isStopping = false;

  // Clear existing alarm
  await chrome.alarms.clear(ALARM_NAME);

  const periodInMinutes = delayMs / 60000;

  await chrome.alarms.create(ALARM_NAME, {
    delayInMinutes: periodInMinutes,
    periodInMinutes: periodInMinutes,
  });

  await logger.info('TimingHybrid', 'Alarm timer started', {
    delayMs
  });
}

/**
 * Stop alarm timer
 * BUGFIX: Immediately sets stopping flag to prevent any in-flight alarm callbacks
 */
async function stopAlarmTimer(): Promise<void> {
  // BUGFIX: Set flags IMMEDIATELY before any async operations
  isStopping = true;
  isEnabled = false;

  await chrome.alarms.clear(ALARM_NAME);
  await logger.info('TimingHybrid', 'Alarm timer stopped');
}

/**
 * Restore interval timer after service worker wake
 * Called by keep-alive alarm to check if interval timer needs restoration
 */
async function restoreIntervalTimerIfNeeded(): Promise<void> {
  const data = await chrome.storage.local.get([
    'usingIntervalTimer',
    'intervalDelayMs',
    'lastIntervalStart',
    'lastIntervalCheck',
    'enabled'
  ]);

  // Only restore if we should be using an interval timer and it's enabled
  if (!data['usingIntervalTimer'] || !data['enabled'] || !data['intervalDelayMs']) {
    return;
  }

  // SECURITY: Get lastIntervalCheck from storage instead of module variable
  const lastIntervalCheck = data['lastIntervalCheck'] as number || Date.now();

  // Check if interval timer is actually running
  const timeSinceLastCheck = Date.now() - lastIntervalCheck;
  const intervalDelayMs = data['intervalDelayMs'] as number;

  // If more than 2 intervals have passed without a check, the timer was likely killed
  if (timeSinceLastCheck > (intervalDelayMs * 2)) {
    await logger.warn('TimingHybrid', 'Service worker suspension detected, restoring interval timer', {
      timeSinceLastCheck,
      expectedInterval: intervalDelayMs,
      gapIntervals: Math.floor(timeSinceLastCheck / intervalDelayMs)
    });

    // Restore the interval timer
    await startIntervalTimer(intervalDelayMs);
  }
}

/**
 * Start or stop the tab switcher using appropriate timing mechanism
 * BUGFIX: Immediately sets stopping flag when disabling to prevent race conditions
 *
 * @param enabled - Whether tab switching is enabled
 * @param delayMs - Delay in milliseconds
 * @param minDelayMs - Minimum allowed delay
 */
export async function toggleHybridTimer(enabled: boolean, delayMs: number, minDelayMs: number): Promise<void> {
  // BUGFIX: If disabling, set stopping flag IMMEDIATELY before any async operations
  if (!enabled) {
    isStopping = true;
    isEnabled = false;
  }

  // Stop all timers first
  await stopIntervalTimer();
  await stopAlarmTimer();

  if (enabled) {
    // Clamp delay to minimum
    const clampedDelayMs = Math.max(delayMs, minDelayMs);

    // Choose timing mechanism based on delay duration
    if (clampedDelayMs >= MIN_ALARM_DELAY_MS) {
      // Use chrome.alarms for longer delays (more efficient)
      await startAlarmTimer(clampedDelayMs);
    } else {
      // Use setInterval for sub-30-second delays with keep-alive mechanism
      await startIntervalTimer(clampedDelayMs);
    }

    await logger.info('TimingHybrid', 'Tab switcher started', {
      clampedDelayMs,
      requestedDelayMs: delayMs,
      usingAlarms: clampedDelayMs >= MIN_ALARM_DELAY_MS
    });
  } else {
    await logger.info('TimingHybrid', 'Tab switcher stopped');
  }

  await updateBadge(enabled);
}

/**
 * Set up alarm listener for hybrid timing
 * Handles both main tab switching alarm and keep-alive alarm
 * BUGFIX: Added guard checks to prevent tab switching during stop operations
 */
export function setupAlarmListener(): void {
  chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === ALARM_NAME) {
      // BUGFIX: Immediate guard check before any async operations
      if (isStopping || !isEnabled) {
        return;
      }

      // Main tab switching alarm
      const data = await getSettings(['enabled']);
      const enabled = data.enabled ?? DEFAULT_ENABLED;

      // Short-circuit if disabled
      if (!enabled || isStopping || !isEnabled) {
        return;
      }

      // Check if switching is paused due to user activity
      const paused = await isPaused();

      // BUGFIX: Final check before tab switch
      if (isStopping || !isEnabled) {
        return;
      }

      if (paused) {
        await logger.info('TimingHybrid', 'Auto-switching paused due to user activity');
        await updateBadge(enabled, true);
      } else {
        await updateBadge(enabled, false);
        await switchTab();
      }
    } else if (alarm.name === KEEPALIVE_ALARM_NAME) {
      // Keep-alive alarm - check and restore interval timer if needed
      // BUGFIX: Don't restore if we're stopping
      if (!isStopping) {
        await restoreIntervalTimerIfNeeded();
      }
    }
  });
}
