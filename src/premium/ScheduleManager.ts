/**
 * Schedule Manager - Advanced Scheduling (Premium Feature)
 *
 * Automatically enable/disable rotation or change settings based on time and day.
 *
 * Features:
 * - Time-based schedules (start/end times)
 * - Day-of-week schedules
 * - Date range schedules
 * - Scheduled actions (enable/disable, change interval, switch pattern, etc.)
 * - Priority-based conflict resolution
 * - Timezone support
 */

import type { Schedule, ScheduledAction } from '../core/types.js';
import { logger } from '../core/logger.js';

// Security constants
const MAX_SCHEDULES = 50;
const MAX_ACTIONS_PER_SCHEDULE = 10;
const MAX_SCHEDULE_NAME_LENGTH = 100;
const SCHEDULE_CHECK_INTERVAL = 60000; // Check every 60 seconds

/**
 * ScheduleManager singleton class
 */
class ScheduleManager {
  private static instance: ScheduleManager;
  private checkInterval: number | undefined;
  private lastCheck: number = 0;

  private constructor() {
    // Private constructor for singleton
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): ScheduleManager {
    if (!ScheduleManager.instance) {
      ScheduleManager.instance = new ScheduleManager();
    }
    return ScheduleManager.instance;
  }

  /**
   * Initialize the schedule manager and start checking schedules
   */
  async initialize(): Promise<void> {
    try {
      await logger.info('ScheduleManager', 'Initializing schedule manager');

      // Check if schedules are enabled
      const data = await chrome.storage.local.get(['schedulesEnabled']);
      if (data['schedulesEnabled']) {
        await this.startScheduleChecker();
      }

      await logger.info('ScheduleManager', 'Schedule manager initialized');
    } catch (error) {
      await logger.error('ScheduleManager', 'Error initializing', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Start the schedule checker interval
   */
  async startScheduleChecker(): Promise<void> {
    if (this.checkInterval !== undefined) {
      clearInterval(this.checkInterval);
    }

    // Check immediately
    await this.checkSchedules();

    // Then check every minute
    this.checkInterval = setInterval(async () => {
      await this.checkSchedules();
    }, SCHEDULE_CHECK_INTERVAL) as unknown as number;

    await logger.info('ScheduleManager', 'Schedule checker started');
  }

  /**
   * Stop the schedule checker interval
   */
  async stopScheduleChecker(): Promise<void> {
    if (this.checkInterval !== undefined) {
      clearInterval(this.checkInterval);
      this.checkInterval = undefined;
    }

    await logger.info('ScheduleManager', 'Schedule checker stopped');
  }

  /**
   * Check all schedules and execute active ones
   */
  async checkSchedules(): Promise<void> {
    try {
      const now = Date.now();

      // Prevent checking too frequently (at least 30 seconds apart)
      if (now - this.lastCheck < 30000) {
        return;
      }

      this.lastCheck = now;

      const data = await chrome.storage.local.get(['schedules', 'schedulesEnabled']);

      if (!data['schedulesEnabled']) {
        return;
      }

      const schedules: Schedule[] = data['schedules'] || [];
      const enabledSchedules = schedules.filter(s => s.enabled);

      if (enabledSchedules.length === 0) {
        return;
      }

      // Find active schedules
      const activeSchedules = await this.getActiveSchedules(enabledSchedules, now);

      if (activeSchedules.length === 0) {
        return;
      }

      // Sort by priority (higher priority first)
      activeSchedules.sort((a, b) => (b.priority || 0) - (a.priority || 0));

      await logger.info('ScheduleManager', 'Found active schedules', {
        count: activeSchedules.length,
        schedules: activeSchedules.map(s => ({ id: s.id, name: s.name, priority: s.priority }))
      });

      // Execute the highest priority schedule
      const topSchedule = activeSchedules[0];
      if (topSchedule) {
        await this.executeSchedule(topSchedule);
      }

      // Update last check time
      await chrome.storage.local.set({ lastScheduleCheck: now });

    } catch (error) {
      await logger.error('ScheduleManager', 'Error checking schedules', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Get active schedules based on current time
   */
  private async getActiveSchedules(schedules: Schedule[], now: number): Promise<Schedule[]> {
    const active: Schedule[] = [];
    const currentDate = new Date(now);

    for (const schedule of schedules) {
      if (await this.isScheduleActive(schedule, currentDate)) {
        active.push(schedule);
      }
    }

    return active;
  }

  /**
   * Check if a schedule is currently active
   */
  private async isScheduleActive(schedule: Schedule, currentDate: Date): Promise<boolean> {
    try {
      // Check date range (if specified)
      if (schedule.dateRange) {
        const startDate = new Date(schedule.dateRange.start);
        const endDate = new Date(schedule.dateRange.end);
        if (currentDate < startDate || currentDate > endDate) {
          return false;
        }
      }

      // Check day of week (if specified)
      if (schedule.daysOfWeek && schedule.daysOfWeek.length > 0) {
        const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 6 = Saturday
        if (!schedule.daysOfWeek.includes(dayOfWeek)) {
          return false;
        }
      }

      // Check time range (if specified)
      if (schedule.timeRange) {
        const currentTime = this.getTimeString(currentDate);
        if (currentTime < schedule.timeRange.start || currentTime >= schedule.timeRange.end) {
          return false;
        }
      }

      // One-time schedules should only execute once
      if (schedule.type === 'one-time') {
        const data = await chrome.storage.local.get('lastScheduleCheck');
        const lastCheck = data['lastScheduleCheck'] || 0;

        // If we've already checked this schedule today, don't execute again
        const lastCheckDate = new Date(lastCheck);
        if (lastCheckDate.toDateString() === currentDate.toDateString()) {
          return false;
        }
      }

      return true;
    } catch (error) {
      await logger.error('ScheduleManager', 'Error checking if schedule is active', {
        scheduleId: schedule.id,
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  /**
   * Get time string in HH:MM format
   */
  private getTimeString(date: Date): string {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  /**
   * Execute a schedule's actions
   */
  private async executeSchedule(schedule: Schedule): Promise<void> {
    try {
      await logger.info('ScheduleManager', 'Executing schedule', {
        scheduleId: schedule.id,
        scheduleName: schedule.name
      });

      for (const action of schedule.actions) {
        await this.executeAction(action, schedule);
      }

      await logger.info('ScheduleManager', 'Schedule executed successfully', {
        scheduleId: schedule.id,
        actionCount: schedule.actions.length
      });
    } catch (error) {
      await logger.error('ScheduleManager', 'Error executing schedule', {
        scheduleId: schedule.id,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Execute a single scheduled action
   */
  private async executeAction(action: ScheduledAction, schedule: Schedule): Promise<void> {
    try {
      switch (action.type) {
        case 'enable':
          await this.executeEnableAction(action);
          break;

        case 'disable':
          await this.executeDisableAction(action);
          break;

        case 'set-interval':
          await this.executeSetIntervalAction(action);
          break;

        case 'set-pattern':
          await this.executeSetPatternAction(action);
          break;

        case 'set-group':
          await this.executeSetGroupAction(action);
          break;

        case 'set-mode':
          await this.executeSetModeAction(action);
          break;

        case 'launch-session':
          await this.executeLaunchSessionAction(action);
          break;

        default:
          await logger.warn('ScheduleManager', 'Unknown action type', {
            actionType: action.type,
            scheduleId: schedule.id
          });
      }
    } catch (error) {
      await logger.error('ScheduleManager', 'Error executing action', {
        actionType: action.type,
        scheduleId: schedule.id,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Execute enable action
   */
  private async executeEnableAction(action: ScheduledAction): Promise<void> {
    const windowId = action.params?.windowId;

    if (windowId !== undefined) {
      // Enable specific window
      const data = await chrome.storage.local.get('windowStates');
      const windowStates = data['windowStates'] || {};

      windowStates[windowId] = {
        ...windowStates[windowId],
        enabled: true,
        enabledTimestamp: Date.now()
      };

      await chrome.storage.local.set({ windowStates });
      await logger.info('ScheduleManager', 'Enabled window', { windowId });
    } else {
      // Enable globally
      await chrome.storage.local.set({ enabled: true });
      await logger.info('ScheduleManager', 'Enabled globally');
    }
  }

  /**
   * Execute disable action
   */
  private async executeDisableAction(action: ScheduledAction): Promise<void> {
    const windowId = action.params?.windowId;

    if (windowId !== undefined) {
      // Disable specific window
      const data = await chrome.storage.local.get('windowStates');
      const windowStates = data['windowStates'] || {};

      windowStates[windowId] = {
        ...windowStates[windowId],
        enabled: false
      };

      await chrome.storage.local.set({ windowStates });
      await logger.info('ScheduleManager', 'Disabled window', { windowId });
    } else {
      // Disable globally
      await chrome.storage.local.set({ enabled: false });
      await logger.info('ScheduleManager', 'Disabled globally');
    }
  }

  /**
   * Execute set-interval action
   */
  private async executeSetIntervalAction(action: ScheduledAction): Promise<void> {
    const delayTime = action.params?.delayTime;
    const windowId = action.params?.windowId;

    if (delayTime === undefined) {
      throw new Error('delayTime parameter required for set-interval action');
    }

    if (windowId !== undefined) {
      // Set window-specific interval
      const data = await chrome.storage.local.get('windowStates');
      const windowStates = data['windowStates'] || {};

      windowStates[windowId] = {
        ...windowStates[windowId],
        customDelayTime: delayTime
      };

      await chrome.storage.local.set({ windowStates });
      await logger.info('ScheduleManager', 'Set window interval', { windowId, delayTime });
    } else {
      // Set global interval
      await chrome.storage.local.set({ delayTime });
      await logger.info('ScheduleManager', 'Set global interval', { delayTime });
    }
  }

  /**
   * Execute set-pattern action
   */
  private async executeSetPatternAction(action: ScheduledAction): Promise<void> {
    const patternId = action.params?.patternId;

    if (!patternId) {
      throw new Error('patternId parameter required for set-pattern action');
    }

    await chrome.storage.local.set({ activePattern: patternId });
    await logger.info('ScheduleManager', 'Set active pattern', { patternId });
  }

  /**
   * Execute set-group action
   */
  private async executeSetGroupAction(action: ScheduledAction): Promise<void> {
    const groupId = action.params?.groupId;

    if (!groupId) {
      throw new Error('groupId parameter required for set-group action');
    }

    await chrome.storage.local.set({ activeGroupId: groupId });
    await logger.info('ScheduleManager', 'Set active group', { groupId });
  }

  /**
   * Execute set-mode action
   */
  private async executeSetModeAction(action: ScheduledAction): Promise<void> {
    const switchingMode = action.params?.switchingMode;

    if (!switchingMode) {
      throw new Error('switchingMode parameter required for set-mode action');
    }

    await chrome.storage.local.set({ switchingMode });
    await logger.info('ScheduleManager', 'Set switching mode', { switchingMode });
  }

  /**
   * Execute launch-session action
   */
  private async executeLaunchSessionAction(action: ScheduledAction): Promise<void> {
    const sessionId = action.params?.sessionId;

    if (!sessionId) {
      throw new Error('sessionId parameter required for launch-session action');
    }

    // Dynamically import SessionManager to avoid circular dependencies
    try {
      const { sessionManager } = await import('./SessionManager.js');
      await sessionManager.restoreSession(sessionId, 'new-window');
      await logger.info('ScheduleManager', 'Launched session', { sessionId });
    } catch (error) {
      await logger.error('ScheduleManager', 'Error launching session', {
        sessionId,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Save a schedule
   */
  async saveSchedule(schedule: Schedule): Promise<void> {
    try {
      // Validate and sanitize
      const sanitized = this.sanitizeSchedule(schedule);

      // Validate schedule structure
      if (!this.isValidSchedule(sanitized)) {
        throw new Error('Invalid schedule structure');
      }

      // Get existing schedules
      const data = await chrome.storage.local.get('schedules');
      let schedules: Schedule[] = data['schedules'] || [];

      // Check schedule limit
      const existingIndex = schedules.findIndex(s => s.id === sanitized.id);
      if (existingIndex === -1 && schedules.length >= MAX_SCHEDULES) {
        throw new Error(`Maximum schedule limit (${MAX_SCHEDULES}) reached`);
      }

      // Update or add
      if (existingIndex !== -1) {
        schedules[existingIndex] = sanitized;
      } else {
        schedules.push(sanitized);
      }

      await chrome.storage.local.set({ schedules });

      await logger.info('ScheduleManager', 'Schedule saved', {
        scheduleId: sanitized.id,
        scheduleName: sanitized.name
      });
    } catch (error) {
      await logger.error('ScheduleManager', 'Error saving schedule', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Delete a schedule
   */
  async deleteSchedule(scheduleId: string): Promise<void> {
    try {
      const data = await chrome.storage.local.get('schedules');
      let schedules: Schedule[] = data['schedules'] || [];

      schedules = schedules.filter(s => s.id !== scheduleId);

      await chrome.storage.local.set({ schedules });

      await logger.info('ScheduleManager', 'Schedule deleted', { scheduleId });
    } catch (error) {
      await logger.error('ScheduleManager', 'Error deleting schedule', {
        scheduleId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Get all schedules
   */
  async getAllSchedules(): Promise<Schedule[]> {
    try {
      const data = await chrome.storage.local.get('schedules');
      return data['schedules'] || [];
    } catch (error) {
      await logger.error('ScheduleManager', 'Error getting schedules', {
        error: error instanceof Error ? error.message : String(error)
      });
      return [];
    }
  }

  /**
   * Get a specific schedule
   */
  async getSchedule(scheduleId: string): Promise<Schedule | null> {
    try {
      const schedules = await this.getAllSchedules();
      return schedules.find(s => s.id === scheduleId) || null;
    } catch (error) {
      await logger.error('ScheduleManager', 'Error getting schedule', {
        scheduleId,
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }

  /**
   * Enable/disable schedules globally
   */
  async setSchedulesEnabled(enabled: boolean): Promise<void> {
    try {
      await chrome.storage.local.set({ schedulesEnabled: enabled });

      if (enabled) {
        await this.startScheduleChecker();
      } else {
        await this.stopScheduleChecker();
      }

      await logger.info('ScheduleManager', 'Schedules enabled state changed', { enabled });
    } catch (error) {
      await logger.error('ScheduleManager', 'Error setting schedules enabled', {
        enabled,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Sanitize schedule data
   */
  private sanitizeSchedule(schedule: Schedule): Schedule {
    return {
      id: this.sanitizeString(schedule.id, 50),
      name: this.sanitizeString(schedule.name, MAX_SCHEDULE_NAME_LENGTH),
      enabled: Boolean(schedule.enabled),
      type: schedule.type === 'one-time' ? 'one-time' : 'recurring',
      actions: this.sanitizeActions(schedule.actions),
      timeRange: schedule.timeRange ? {
        start: this.sanitizeTimeString(schedule.timeRange.start),
        end: this.sanitizeTimeString(schedule.timeRange.end)
      } : undefined,
      daysOfWeek: schedule.daysOfWeek ? this.sanitizeDaysOfWeek(schedule.daysOfWeek) : undefined,
      dateRange: schedule.dateRange ? {
        start: this.sanitizeDateString(schedule.dateRange.start),
        end: this.sanitizeDateString(schedule.dateRange.end)
      } : undefined,
      priority: typeof schedule.priority === 'number' ? Math.max(0, Math.min(100, schedule.priority)) : undefined,
      createdAt: schedule.createdAt || Date.now(),
      updatedAt: Date.now()
    };
  }

  /**
   * Sanitize actions array
   */
  private sanitizeActions(actions: ScheduledAction[]): ScheduledAction[] {
    if (!Array.isArray(actions)) {
      return [];
    }

    // Limit actions count
    const limitedActions = actions.slice(0, MAX_ACTIONS_PER_SCHEDULE);

    return limitedActions.filter(action => this.isValidAction(action));
  }

  /**
   * Validate action structure
   */
  private isValidAction(action: ScheduledAction): boolean {
    if (!action || typeof action !== 'object') return false;

    const validTypes = ['enable', 'disable', 'set-interval', 'set-pattern', 'set-group', 'set-mode', 'launch-session'];
    if (!validTypes.includes(action.type)) return false;

    return true;
  }

  /**
   * Sanitize string
   */
  private sanitizeString(str: string, maxLength: number): string {
    let sanitized = String(str).substring(0, maxLength);
    sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');
    sanitized = sanitized.replace(/<[^>]*>/g, '');
    return sanitized.trim();
  }

  /**
   * Sanitize time string (HH:MM format)
   */
  private sanitizeTimeString(time: string): string {
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(time)) {
      return '00:00'; // Default to midnight if invalid
    }
    return time;
  }

  /**
   * Sanitize date string (YYYY-MM-DD format)
   */
  private sanitizeDateString(date: string): string {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return new Date().toISOString().split('T')[0] ?? '2024-01-01'; // Default to today if invalid
    }
    return date;
  }

  /**
   * Sanitize days of week array
   */
  private sanitizeDaysOfWeek(days: number[]): number[] {
    if (!Array.isArray(days)) {
      return [];
    }

    return days
      .filter(day => typeof day === 'number' && day >= 0 && day <= 6)
      .slice(0, 7); // Max 7 days
  }

  /**
   * Validate schedule structure
   */
  private isValidSchedule(schedule: Schedule): boolean {
    if (!schedule || typeof schedule !== 'object') return false;
    if (!schedule.id || typeof schedule.id !== 'string') return false;
    if (!schedule.name || typeof schedule.name !== 'string') return false;
    if (!Array.isArray(schedule.actions) || schedule.actions.length === 0) return false;
    if (!['recurring', 'one-time'].includes(schedule.type)) return false;
    return true;
  }
}

// Export singleton instance
export const scheduleManager = ScheduleManager.getInstance();
