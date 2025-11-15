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
    // SECURITY: Update lastIntervalCheck in storage instead of module variable
    await chrome.storage.local.set({ lastIntervalCheck: Date.now() });

    const data = await getSettings(['enabled']);
    const enabled = data.enabled ?? DEFAULT_ENABLED;

    // Short-circuit if disabled
    if (!enabled) {
      return;
    }

    const paused = await isPaused();

    if (paused) {
      console.log('Auto-switching paused due to recent user activity');
      await updateBadge(enabled, true);
    } else {
      await updateBadge(enabled, false);
      await switchTab();
    }
  }, delayMs) as unknown as number;

  // Start keep-alive alarm to wake service worker every minute
  // This ensures the interval timer keeps running
  await chrome.alarms.create(KEEPALIVE_ALARM_NAME, {
    delayInMinutes: 1,
    periodInMinutes: 1
  });

  console.log(`Interval timer started with ${delayMs}ms delay (with keep-alive)`);
  await logger.info('TimingHybrid', 'Interval timer started with keep-alive', {
    delayMs,
    keepAliveEnabled: true
  });
}

/**
 * Stop interval timer and keep-alive alarm
 */
async function stopIntervalTimer(): Promise<void> {
  if (intervalTimerId !== undefined) {
    clearInterval(intervalTimerId);
    intervalTimerId = undefined;
    console.log('Interval timer stopped');
  }

  // Clear keep-alive alarm
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
  // Clear existing alarm
  await chrome.alarms.clear(ALARM_NAME);

  const periodInMinutes = delayMs / 60000;

  await chrome.alarms.create(ALARM_NAME, {
    delayInMinutes: periodInMinutes,
    periodInMinutes: periodInMinutes,
  });

  console.log(`Alarm timer started with ${delayMs}ms delay`);
}

/**
 * Stop alarm timer
 */
async function stopAlarmTimer(): Promise<void> {
  await chrome.alarms.clear(ALARM_NAME);
  console.log('Alarm timer stopped');
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
    console.warn(`Service worker was suspended! Restoring interval timer. Gap: ${timeSinceLastCheck}ms`);
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
 *
 * @param enabled - Whether tab switching is enabled
 * @param delayMs - Delay in milliseconds
 * @param minDelayMs - Minimum allowed delay
 */
export async function toggleHybridTimer(enabled: boolean, delayMs: number, minDelayMs: number): Promise<void> {
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

    console.log(
      `Tab switcher started: ${clampedDelayMs}ms delay (requested: ${delayMs}ms), ` +
      `using ${clampedDelayMs >= MIN_ALARM_DELAY_MS ? 'alarms' : 'interval with keep-alive'}`
    );
  } else {
    console.log('Tab switcher stopped');
  }

  await updateBadge(enabled);
}

/**
 * Set up alarm listener for hybrid timing
 * Handles both main tab switching alarm and keep-alive alarm
 */
export function setupAlarmListener(): void {
  chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === ALARM_NAME) {
      // Main tab switching alarm
      const data = await getSettings(['enabled']);
      const enabled = data.enabled ?? DEFAULT_ENABLED;

      // Short-circuit if disabled
      if (!enabled) {
        return;
      }

      // Check if switching is paused due to user activity
      const paused = await isPaused();

      if (paused) {
        console.log('Auto-switching paused due to recent user activity');
        await updateBadge(enabled, true);
      } else {
        await updateBadge(enabled, false);
        await switchTab();
      }
    } else if (alarm.name === KEEPALIVE_ALARM_NAME) {
      // Keep-alive alarm - check and restore interval timer if needed
      await restoreIntervalTimerIfNeeded();
    }
  });
}
