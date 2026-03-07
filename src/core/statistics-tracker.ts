/**
 * Tab Statistics Tracker
 *
 * Tracks rotation metrics for monitoring and analytics:
 * - Total tab switches performed
 * - Complete rotation cycles
 * - Per-tab visit counts and view time
 * - Session duration tracking
 *
 * Useful for understanding which dashboards/tabs get the most viewing time.
 */

import { TabStatistics, TabVisitInfo } from './types.js';
import { getTabStatistics, updateTabStatistics, resetTabStatistics } from './storage.js';
import { logger } from './logger.js';

/**
 * Record a tab switch event in the statistics tracker.
 * Called from tab-switcher.ts after a successful tab switch.
 *
 * @param newTabId - The tab that was switched to
 * @param newTabTitle - Title of the new tab
 * @param totalTabsInWindow - Total tabs in the window (for cycle calculation)
 * @param previousTabId - The tab that was switched from (optional)
 */
export async function recordTabSwitch(
  newTabId: number,
  newTabTitle: string,
  totalTabsInWindow: number,
  previousTabId?: number
): Promise<void> {
  try {
    await updateTabStatistics(newTabId, newTabTitle, totalTabsInWindow, previousTabId);
  } catch (error) {
    await logger.error('Statistics', 'Failed to record tab switch', {
      error: error instanceof Error ? error.message : String(error),
      newTabId,
    });
  }
}

/**
 * Get a formatted summary of the current statistics.
 * Used by the popup to display stats.
 */
export async function getStatsSummary(): Promise<{
  totalSwitches: number;
  totalCycles: number;
  sessionDuration: string;
  topTabs: Array<{ title: string; visits: number; viewTime: string }>;
}> {
  const stats = await getTabStatistics();
  const now = Date.now();

  // Calculate session duration
  const durationMs = now - stats.sessionStartTime;
  const sessionDuration = formatDuration(durationMs);

  // Get top tabs by visit count
  const entries = Object.entries(stats.perTabVisits) as [string, TabVisitInfo][];
  const sorted = entries.sort(([, a], [, b]) => b.visitCount - a.visitCount);
  const topTabs = sorted.slice(0, 5).map(([, info]) => ({
    title: info.tabTitle || 'Unknown Tab',
    visits: info.visitCount,
    viewTime: formatDuration(info.totalViewTime),
  }));

  return {
    totalSwitches: stats.totalSwitches,
    totalCycles: stats.totalCycles,
    sessionDuration,
    topTabs,
  };
}

/**
 * Reset all statistics data.
 */
export async function resetStats(): Promise<void> {
  await resetTabStatistics();
}

/**
 * Format milliseconds into a human-readable duration string.
 */
function formatDuration(ms: number): string {
  if (ms < 1000) return '0s';

  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  }
  if (minutes > 0) {
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  }
  return `${seconds}s`;
}
