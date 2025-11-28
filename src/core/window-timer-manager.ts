/**
 * Window Timer Manager
 * Manages per-window timers for Window Mode
 * NEW CLASS - Does not modify existing timer implementation
 */

/**
 * Manages timers for individual windows in Window Mode
 * Uses Chrome alarms API for reliability across service worker suspensions
 * BUGFIX: Added stopping flags to prevent race conditions
 */
export class WindowTimerManager {
  private windowTimers: Map<number, number> = new Map();
  // BUGFIX: Track which windows are actively stopping to prevent race conditions
  private stoppingWindows: Set<number> = new Set();
  // BUGFIX: Global flag to prevent all window timer operations when stopping all
  private isStoppingAll: boolean = false;

  /**
   * Start a timer for a specific window
   * BUGFIX: Clears stopping flag when starting
   * @param windowId - The window ID
   * @param delayMs - Delay in milliseconds
   */
  async startTimer(windowId: number, delayMs: number): Promise<void> {
    // BUGFIX: Clear stopping flag for this window
    this.stoppingWindows.delete(windowId);

    const alarmName = this.getAlarmName(windowId);

    // Use Chrome alarms for reliability
    await chrome.alarms.create(alarmName, {
      delayInMinutes: delayMs / (1000 * 60),
      periodInMinutes: delayMs / (1000 * 60),
    });

    // Track when the timer was started
    this.windowTimers.set(windowId, Date.now());

    console.log(`[WindowTimerManager] Started timer for window ${windowId}, delay: ${delayMs}ms`);
  }

  /**
   * Stop a timer for a specific window
   * SECURITY: Verifies alarm was successfully cleared
   * BUGFIX: Sets stopping flag immediately to prevent race conditions
   * @param windowId - The window ID
   * @returns true if timer was stopped, false if it wasn't running
   */
  async stopTimer(windowId: number): Promise<boolean> {
    // BUGFIX: Set stopping flag IMMEDIATELY before any async operations
    this.stoppingWindows.add(windowId);

    const alarmName = this.getAlarmName(windowId);
    const wasCleared = await chrome.alarms.clear(alarmName);

    if (wasCleared || this.windowTimers.has(windowId)) {
      this.windowTimers.delete(windowId);
      console.log(`[WindowTimerManager] Stopped timer for window ${windowId}`);
      return true;
    }

    return false;
  }

  /**
   * Stop all window timers
   * BUGFIX: Stops timers in parallel and sets global stopping flag immediately
   */
  async stopAllTimers(): Promise<void> {
    // BUGFIX: Set global stopping flag IMMEDIATELY
    this.isStoppingAll = true;

    const windowIds = Array.from(this.windowTimers.keys());

    // BUGFIX: Stop all timers in parallel instead of sequentially
    await Promise.all(windowIds.map(windowId => this.stopTimer(windowId)));

    // Reset the global flag after all timers are stopped
    this.isStoppingAll = false;

    console.log('[WindowTimerManager] Stopped all window timers');
  }

  /**
   * Get time remaining until next switch for a window
   * @param windowId - The window ID
   * @param delayMs - Delay in milliseconds
   * @returns Time remaining in milliseconds
   */
  getTimeUntilNextSwitch(windowId: number, delayMs: number): number {
    const enabledTime = this.windowTimers.get(windowId);
    if (!enabledTime) return 0;

    const elapsed = Date.now() - enabledTime;
    const remaining = delayMs - (elapsed % delayMs);
    return Math.max(0, remaining);
  }

  /**
   * Check if a window has an active timer
   * @param windowId - The window ID
   * @returns True if window has active timer
   */
  hasActiveTimer(windowId: number): boolean {
    return this.windowTimers.has(windowId);
  }

  /**
   * Check if a window is currently being stopped
   * BUGFIX: Allows alarm callbacks to check if they should abort
   * @param windowId - The window ID
   * @returns True if window is being stopped or all timers are being stopped
   */
  isStopping(windowId: number): boolean {
    return this.isStoppingAll || this.stoppingWindows.has(windowId);
  }

  /**
   * Get all active window IDs
   * @returns Array of window IDs with active timers
   */
  getActiveWindows(): number[] {
    return Array.from(this.windowTimers.keys());
  }

  /**
   * Get the alarm name for a window
   * @param windowId - The window ID
   * @returns Alarm name
   */
  private getAlarmName(windowId: number): string {
    return `window-timer-${windowId}`;
  }

  /**
   * Check if an alarm name belongs to a window timer
   * @param alarmName - The alarm name
   * @returns Window ID if it's a window timer, null otherwise
   */
  static getWindowIdFromAlarm(alarmName: string): number | null {
    if (alarmName.startsWith('window-timer-')) {
      const windowId = parseInt(alarmName.replace('window-timer-', ''));
      return isNaN(windowId) ? null : windowId;
    }
    return null;
  }

  /**
   * Restore timers for enabled windows (e.g., after service worker wake)
   * @param windowStates - The window states from storage
   * @param delayMs - Delay in milliseconds
   */
  async restoreTimers(
    windowStates: { [windowId: number]: { enabled: boolean; enabledTimestamp?: number } },
    delayMs: number
  ): Promise<void> {
    for (const [windowIdStr, state] of Object.entries(windowStates)) {
      const windowId = parseInt(windowIdStr);
      if (state.enabled && !isNaN(windowId)) {
        await this.startTimer(windowId, delayMs);
      }
    }

    console.log('[WindowTimerManager] Restored timers for enabled windows');
  }

  /**
   * Cleanup stale window timers for windows that no longer exist
   * SECURITY: Prevents memory leaks from closed windows
   * @returns Number of stale timers removed
   */
  async cleanupStaleTimers(): Promise<number> {
    try {
      const allWindows = await chrome.windows.getAll();
      const validWindowIds = new Set(allWindows.map(w => w.id).filter((id): id is number => id !== undefined));

      let cleanedCount = 0;
      for (const windowId of this.windowTimers.keys()) {
        if (!validWindowIds.has(windowId)) {
          const stopped = await this.stopTimer(windowId);
          if (stopped) {
            cleanedCount++;
            console.log(`[WindowTimerManager] Cleaned up stale timer for closed window ${windowId}`);
          }
        }
      }

      if (cleanedCount > 0) {
        console.log(`[WindowTimerManager] Cleaned up ${cleanedCount} stale window timer(s)`);
      }

      return cleanedCount;
    } catch (error) {
      console.error('[WindowTimerManager] Error during cleanup:', error);
      return 0;
    }
  }
}
