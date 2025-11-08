/**
 * Hybrid timing implementation
 * Uses chrome.alarms for >= 30s delays, setInterval for < 30s delays
 */

import { ALARM_NAME, MIN_ALARM_DELAY_MS, DEFAULT_ENABLED } from './constants.js';
import { getSettings } from './storage.js';
import { updateBadge } from './badge-manager.js';
import { switchTab } from './tab-switcher.js';
import { isPaused } from './activity-tracker.js';

// Timer state (for setInterval approach)
let intervalTimerId: number | undefined;

/**
 * Start timer using setInterval (for sub-30-second delays)
 * Note: Service worker may be terminated, interrupting the timer
 *
 * @param delayMs - Delay in milliseconds
 */
function startIntervalTimer(delayMs: number): void {
  // Clear any existing interval
  if (intervalTimerId !== undefined) {
    clearInterval(intervalTimerId);
    intervalTimerId = undefined;
  }

  // Start new interval with pause checking
  intervalTimerId = setInterval(async () => {
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

  console.log(`Interval timer started with ${delayMs}ms delay`);
}

/**
 * Stop interval timer
 */
function stopIntervalTimer(): void {
  if (intervalTimerId !== undefined) {
    clearInterval(intervalTimerId);
    intervalTimerId = undefined;
    console.log('Interval timer stopped');
  }
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
 * Start or stop the tab switcher using appropriate timing mechanism
 *
 * @param enabled - Whether tab switching is enabled
 * @param delayMs - Delay in milliseconds
 * @param minDelayMs - Minimum allowed delay
 */
export async function toggleHybridTimer(enabled: boolean, delayMs: number, minDelayMs: number): Promise<void> {
  // Stop all timers first
  stopIntervalTimer();
  await stopAlarmTimer();

  if (enabled) {
    // Clamp delay to minimum
    const clampedDelayMs = Math.max(delayMs, minDelayMs);

    // Choose timing mechanism based on delay duration
    if (clampedDelayMs >= MIN_ALARM_DELAY_MS) {
      // Use chrome.alarms for longer delays (more efficient)
      await startAlarmTimer(clampedDelayMs);
    } else {
      // Use setInterval for sub-30-second delays
      // Warning: May be interrupted if service worker terminates
      startIntervalTimer(clampedDelayMs);
    }

    console.log(
      `Tab switcher started: ${clampedDelayMs}ms delay (requested: ${delayMs}ms), ` +
      `using ${clampedDelayMs >= MIN_ALARM_DELAY_MS ? 'alarms' : 'interval'}`
    );
  } else {
    console.log('Tab switcher stopped');
  }

  await updateBadge(enabled);
}

/**
 * Set up alarm listener for hybrid timing
 */
export function setupAlarmListener(): void {
  chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === ALARM_NAME) {
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
    }
  });
}
