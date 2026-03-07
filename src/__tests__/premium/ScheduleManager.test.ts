/**
 * ScheduleManager Tests
 */

import { scheduleManager } from '../../premium/ScheduleManager.js';
import type { Schedule, ScheduledAction } from '../../core/types.js';

// Mock chrome.storage.local
const mockStorage: { [key: string]: any } = {};

global.chrome = {
  storage: {
    local: {
      get: jest.fn((keys) => {
        const result: { [key: string]: any } = {};
        if (typeof keys === 'string') {
          result[keys] = mockStorage[keys];
        } else if (Array.isArray(keys)) {
          keys.forEach(key => {
            result[key] = mockStorage[key];
          });
        }
        return Promise.resolve(result);
      }),
      set: jest.fn((items) => {
        Object.assign(mockStorage, items);
        return Promise.resolve();
      }),
    },
    sync: {
      get: jest.fn((keys) => {
        const result: { [key: string]: any } = {};
        if (typeof keys === 'string') {
          result[keys] = mockStorage[keys];
        } else if (Array.isArray(keys)) {
          keys.forEach(key => {
            result[key] = mockStorage[key];
          });
        }
        return Promise.resolve(result);
      }),
      set: jest.fn((items) => {
        Object.assign(mockStorage, items);
        return Promise.resolve();
      }),
    },
  },
  runtime: {
    getManifest: jest.fn(() => ({
      version: '1.0.0',
      name: 'Test Extension'
    }))
  },
} as any;

describe('ScheduleManager', () => {
  beforeEach(() => {
    // Clear mock storage
    Object.keys(mockStorage).forEach(key => delete mockStorage[key]);
    jest.clearAllMocks();
    jest.restoreAllMocks();
    // Use fake timers for consistent Date.now() behavior
    jest.useFakeTimers();
    // Reset lastCheck so the 30-second cooldown doesn't block tests
    (scheduleManager as any).lastCheck = 0;
  });

  afterEach(() => {
    // Restore real timers after each test
    jest.useRealTimers();
  });

  describe('Schedule CRUD Operations', () => {
    test('should create and save a schedule', async () => {
      const schedule: Schedule = {
        id: 'test-schedule-1',
        name: 'Business Hours',
        enabled: true,
        type: 'recurring',
        timeRange: { start: '09:00', end: '17:00' },
        daysOfWeek: [1, 2, 3, 4, 5], // Monday-Friday
        actions: [
          { type: 'enable' }
        ],
        priority: 1
      };

      await scheduleManager.saveSchedule(schedule);

      const saved = await scheduleManager.getSchedule('test-schedule-1');
      expect(saved).toBeTruthy();
      expect(saved?.name).toBe('Business Hours');
      expect(saved?.timeRange?.start).toBe('09:00');
      expect(saved?.daysOfWeek).toEqual([1, 2, 3, 4, 5]);
    });

    test('should get all schedules', async () => {
      const schedule1: Schedule = {
        id: 'schedule-1',
        name: 'Schedule 1',
        enabled: true,
        type: 'recurring',
        actions: [{ type: 'enable' }]
      };

      const schedule2: Schedule = {
        id: 'schedule-2',
        name: 'Schedule 2',
        enabled: true,
        type: 'recurring',
        actions: [{ type: 'disable' }]
      };

      await scheduleManager.saveSchedule(schedule1);
      await scheduleManager.saveSchedule(schedule2);

      const all = await scheduleManager.getAllSchedules();
      expect(all.length).toBe(2);
      expect(all.map(s => s.id)).toContain('schedule-1');
      expect(all.map(s => s.id)).toContain('schedule-2');
    });

    test('should update existing schedule', async () => {
      const schedule: Schedule = {
        id: 'schedule-update',
        name: 'Original Name',
        enabled: true,
        type: 'recurring',
        actions: [{ type: 'enable' }]
      };

      await scheduleManager.saveSchedule(schedule);

      const updated: Schedule = {
        ...schedule,
        name: 'Updated Name',
        priority: 10
      };

      await scheduleManager.saveSchedule(updated);

      const saved = await scheduleManager.getSchedule('schedule-update');
      expect(saved?.name).toBe('Updated Name');
      expect(saved?.priority).toBe(10);

      const all = await scheduleManager.getAllSchedules();
      expect(all.length).toBe(1); // Should not create duplicate
    });

    test('should delete a schedule', async () => {
      const schedule: Schedule = {
        id: 'schedule-delete',
        name: 'To Delete',
        enabled: true,
        type: 'recurring',
        actions: [{ type: 'enable' }]
      };

      await scheduleManager.saveSchedule(schedule);
      expect(await scheduleManager.getSchedule('schedule-delete')).toBeTruthy();

      await scheduleManager.deleteSchedule('schedule-delete');
      expect(await scheduleManager.getSchedule('schedule-delete')).toBeNull();
    });

    test('should return null for non-existent schedule', async () => {
      const schedule = await scheduleManager.getSchedule('non-existent');
      expect(schedule).toBeNull();
    });
  });

  describe('Schedule Activation Logic', () => {
    test('should activate schedule within time range', async () => {
      // Mock current time to 10:00 AM
      jest.setSystemTime(new Date('2024-01-15T10:00:00'));

      const schedule: Schedule = {
        id: 'time-range-test',
        name: 'Morning Schedule',
        enabled: true,
        type: 'recurring',
        timeRange: { start: '09:00', end: '12:00' },
        actions: [{ type: 'enable' }]
      };

      await scheduleManager.saveSchedule(schedule);
      mockStorage.schedulesEnabled = true;

      // This should activate because current time (10:00) is within range (09:00-12:00)
      await scheduleManager.checkSchedules();

      // Verify enable action was executed
      expect(mockStorage.enabled).toBe(true);
    });

    test('should not activate schedule outside time range', async () => {
      // Mock current time to 2:00 PM
      jest.setSystemTime(new Date('2024-01-15T14:00:00'));

      const schedule: Schedule = {
        id: 'time-range-test-2',
        name: 'Morning Schedule',
        enabled: true,
        type: 'recurring',
        timeRange: { start: '09:00', end: '12:00' },
        actions: [{ type: 'enable' }]
      };

      await scheduleManager.saveSchedule(schedule);
      mockStorage.schedulesEnabled = true;
      mockStorage.enabled = false;

      await scheduleManager.checkSchedules();

      // Should not have changed enabled state
      expect(mockStorage.enabled).toBe(false);
    });

    test('should activate schedule on correct day of week', async () => {
      // Mock to Monday (day 1)
      jest.setSystemTime(new Date('2024-01-15T10:00:00')); // This is a Monday

      const schedule: Schedule = {
        id: 'day-of-week-test',
        name: 'Weekday Schedule',
        enabled: true,
        type: 'recurring',
        daysOfWeek: [1, 2, 3, 4, 5], // Monday-Friday
        actions: [{ type: 'enable' }]
      };

      await scheduleManager.saveSchedule(schedule);
      mockStorage.schedulesEnabled = true;

      await scheduleManager.checkSchedules();

      expect(mockStorage.enabled).toBe(true);
    });

    test('should not activate schedule on wrong day of week', async () => {
      // Mock to Saturday (day 6)
      jest.setSystemTime(new Date('2024-01-20T10:00:00')); // This is a Saturday

      const schedule: Schedule = {
        id: 'day-of-week-test-2',
        name: 'Weekday Schedule',
        enabled: true,
        type: 'recurring',
        daysOfWeek: [1, 2, 3, 4, 5], // Monday-Friday
        actions: [{ type: 'enable' }]
      };

      await scheduleManager.saveSchedule(schedule);
      mockStorage.schedulesEnabled = true;
      mockStorage.enabled = false;

      await scheduleManager.checkSchedules();

      expect(mockStorage.enabled).toBe(false);
    });

    test('should activate schedule within date range', async () => {
      jest.setSystemTime(new Date('2024-06-15T10:00:00'));

      const schedule: Schedule = {
        id: 'date-range-test',
        name: 'Summer Schedule',
        enabled: true,
        type: 'recurring',
        dateRange: { start: '2024-06-01', end: '2024-08-31' },
        actions: [{ type: 'enable' }]
      };

      await scheduleManager.saveSchedule(schedule);
      mockStorage.schedulesEnabled = true;

      await scheduleManager.checkSchedules();

      expect(mockStorage.enabled).toBe(true);
    });

    test('should not activate schedule outside date range', async () => {
      jest.setSystemTime(new Date('2024-01-15T10:00:00'));

      const schedule: Schedule = {
        id: 'date-range-test-2',
        name: 'Summer Schedule',
        enabled: true,
        type: 'recurring',
        dateRange: { start: '2024-06-01', end: '2024-08-31' },
        actions: [{ type: 'enable' }]
      };

      await scheduleManager.saveSchedule(schedule);
      mockStorage.schedulesEnabled = true;
      mockStorage.enabled = false;

      await scheduleManager.checkSchedules();

      expect(mockStorage.enabled).toBe(false);
    });
  });

  describe('Scheduled Actions', () => {
    beforeEach(() => {
      jest.setSystemTime(new Date('2024-01-15T10:00:00'));
      mockStorage.schedulesEnabled = true;
    });

    test('should execute enable action', async () => {
      const schedule: Schedule = {
        id: 'enable-test',
        name: 'Enable Schedule',
        enabled: true,
        type: 'recurring',
        actions: [{ type: 'enable' }]
      };

      await scheduleManager.saveSchedule(schedule);
      await scheduleManager.checkSchedules();

      expect(mockStorage.enabled).toBe(true);
    });

    test('should execute disable action', async () => {
      const schedule: Schedule = {
        id: 'disable-test',
        name: 'Disable Schedule',
        enabled: true,
        type: 'recurring',
        actions: [{ type: 'disable' }]
      };

      mockStorage.enabled = true;
      await scheduleManager.saveSchedule(schedule);
      await scheduleManager.checkSchedules();

      expect(mockStorage.enabled).toBe(false);
    });

    test('should execute set-interval action', async () => {
      const schedule: Schedule = {
        id: 'set-interval-test',
        name: 'Set Interval Schedule',
        enabled: true,
        type: 'recurring',
        actions: [
          {
            type: 'set-interval',
            params: { delayTime: 15000 }
          }
        ]
      };

      await scheduleManager.saveSchedule(schedule);
      await scheduleManager.checkSchedules();

      expect(mockStorage.delayTime).toBe(15000);
    });

    test('should execute set-pattern action', async () => {
      const schedule: Schedule = {
        id: 'set-pattern-test',
        name: 'Set Pattern Schedule',
        enabled: true,
        type: 'recurring',
        actions: [
          {
            type: 'set-pattern',
            params: { patternId: 'random' }
          }
        ]
      };

      await scheduleManager.saveSchedule(schedule);
      await scheduleManager.checkSchedules();

      expect(mockStorage.activePattern).toBe('random');
    });

    test('should execute set-group action', async () => {
      const schedule: Schedule = {
        id: 'set-group-test',
        name: 'Set Group Schedule',
        enabled: true,
        type: 'recurring',
        actions: [
          {
            type: 'set-group',
            params: { groupId: 'work-tabs' }
          }
        ]
      };

      await scheduleManager.saveSchedule(schedule);
      await scheduleManager.checkSchedules();

      expect(mockStorage.activeGroupId).toBe('work-tabs');
    });

    test('should execute set-mode action', async () => {
      const schedule: Schedule = {
        id: 'set-mode-test',
        name: 'Set Mode Schedule',
        enabled: true,
        type: 'recurring',
        actions: [
          {
            type: 'set-mode',
            params: { switchingMode: 'window' }
          }
        ]
      };

      await scheduleManager.saveSchedule(schedule);
      await scheduleManager.checkSchedules();

      expect(mockStorage.switchingMode).toBe('window');
    });

    test('should execute multiple actions in sequence', async () => {
      const schedule: Schedule = {
        id: 'multiple-actions-test',
        name: 'Multiple Actions',
        enabled: true,
        type: 'recurring',
        actions: [
          { type: 'enable' },
          { type: 'set-interval', params: { delayTime: 10000 } },
          { type: 'set-pattern', params: { patternId: 'sequential' } }
        ]
      };

      await scheduleManager.saveSchedule(schedule);
      await scheduleManager.checkSchedules();

      expect(mockStorage.enabled).toBe(true);
      expect(mockStorage.delayTime).toBe(10000);
      expect(mockStorage.activePattern).toBe('sequential');
    });

    test('should execute window-specific enable action', async () => {
      const schedule: Schedule = {
        id: 'window-enable-test',
        name: 'Window Enable',
        enabled: true,
        type: 'recurring',
        actions: [
          {
            type: 'enable',
            params: { windowId: 123 }
          }
        ]
      };

      mockStorage.windowStates = {};
      await scheduleManager.saveSchedule(schedule);
      await scheduleManager.checkSchedules();

      expect(mockStorage.windowStates[123]?.enabled).toBe(true);
    });

    test('should execute window-specific set-interval action', async () => {
      const schedule: Schedule = {
        id: 'window-interval-test',
        name: 'Window Interval',
        enabled: true,
        type: 'recurring',
        actions: [
          {
            type: 'set-interval',
            params: { windowId: 123, delayTime: 20000 }
          }
        ]
      };

      mockStorage.windowStates = {};
      await scheduleManager.saveSchedule(schedule);
      await scheduleManager.checkSchedules();

      expect(mockStorage.windowStates[123]?.customDelayTime).toBe(20000);
    });
  });

  describe('Priority Handling', () => {
    beforeEach(() => {
      jest.setSystemTime(new Date('2024-01-15T10:00:00'));
      mockStorage.schedulesEnabled = true;
    });

    test('should execute highest priority schedule when multiple are active', async () => {
      const lowPriority: Schedule = {
        id: 'low-priority',
        name: 'Low Priority',
        enabled: true,
        type: 'recurring',
        priority: 1,
        actions: [{ type: 'set-interval', params: { delayTime: 5000 } }]
      };

      const highPriority: Schedule = {
        id: 'high-priority',
        name: 'High Priority',
        enabled: true,
        type: 'recurring',
        priority: 10,
        actions: [{ type: 'set-interval', params: { delayTime: 15000 } }]
      };

      await scheduleManager.saveSchedule(lowPriority);
      await scheduleManager.saveSchedule(highPriority);
      await scheduleManager.checkSchedules();

      // High priority (15000) should win
      expect(mockStorage.delayTime).toBe(15000);
    });

    test('should default to priority 0 if not specified', async () => {
      const schedule: Schedule = {
        id: 'no-priority',
        name: 'No Priority',
        enabled: true,
        type: 'recurring',
        actions: [{ type: 'enable' }]
      };

      await scheduleManager.saveSchedule(schedule);
      const saved = await scheduleManager.getSchedule('no-priority');

      expect(saved?.priority).toBeUndefined();
    });
  });

  describe('Security Tests', () => {
    test('should sanitize schedule names', async () => {
      const schedule: Schedule = {
        id: 'sanitize-test',
        name: 'Test<script>alert("xss")</script>',
        enabled: true,
        type: 'recurring',
        actions: [{ type: 'enable' }]
      };

      await scheduleManager.saveSchedule(schedule);
      const saved = await scheduleManager.getSchedule('sanitize-test');

      expect(saved?.name).not.toContain('<script>');
      expect(saved?.name).toBe('Testalert("xss")');
    });

    test('should enforce maximum schedule count', async () => {
      // Create 50 schedules (max limit)
      for (let i = 0; i < 50; i++) {
        const schedule: Schedule = {
          id: `schedule-${i}`,
          name: `Schedule ${i}`,
          enabled: true,
          type: 'recurring',
          actions: [{ type: 'enable' }]
        };
        await scheduleManager.saveSchedule(schedule);
      }

      // Try to create 51st schedule
      const extraSchedule: Schedule = {
        id: 'schedule-51',
        name: 'Extra Schedule',
        enabled: true,
        type: 'recurring',
        actions: [{ type: 'enable' }]
      };

      await expect(scheduleManager.saveSchedule(extraSchedule)).rejects.toThrow('Maximum schedule limit');
    });

    test('should limit actions per schedule', async () => {
      const schedule: Schedule = {
        id: 'many-actions',
        name: 'Many Actions',
        enabled: true,
        type: 'recurring',
        actions: Array(20).fill({ type: 'enable' }) // Try to add 20 actions
      };

      await scheduleManager.saveSchedule(schedule);
      const saved = await scheduleManager.getSchedule('many-actions');

      expect(saved?.actions.length).toBeLessThanOrEqual(10); // Max is 10
    });

    test('should validate time string format', async () => {
      const schedule: Schedule = {
        id: 'invalid-time',
        name: 'Invalid Time',
        enabled: true,
        type: 'recurring',
        timeRange: { start: '25:00', end: '30:00' }, // Invalid times
        actions: [{ type: 'enable' }]
      };

      await scheduleManager.saveSchedule(schedule);
      const saved = await scheduleManager.getSchedule('invalid-time');

      // Should default to 00:00 for invalid times
      expect(saved?.timeRange?.start).toBe('00:00');
      expect(saved?.timeRange?.end).toBe('00:00');
    });

    test('should validate days of week array', async () => {
      const schedule: Schedule = {
        id: 'invalid-days',
        name: 'Invalid Days',
        enabled: true,
        type: 'recurring',
        daysOfWeek: [1, 2, 7, 8, -1], // 7, 8, -1 are invalid
        actions: [{ type: 'enable' }]
      };

      await scheduleManager.saveSchedule(schedule);
      const saved = await scheduleManager.getSchedule('invalid-days');

      // Should only keep valid days (0-6)
      expect(saved?.daysOfWeek).toEqual([1, 2]);
    });

    test('should validate schedule structure', async () => {
      const invalidSchedule: any = {
        id: 'invalid-structure',
        // Missing required fields
      };

      await expect(scheduleManager.saveSchedule(invalidSchedule)).rejects.toThrow('Invalid schedule structure');
    });
  });

  describe('Global Enable/Disable', () => {
    test('should enable schedules globally', async () => {
      await scheduleManager.setSchedulesEnabled(true);
      expect(mockStorage.schedulesEnabled).toBe(true);
    });

    test('should disable schedules globally', async () => {
      await scheduleManager.setSchedulesEnabled(false);
      expect(mockStorage.schedulesEnabled).toBe(false);
    });

    test('should not check schedules when globally disabled', async () => {
      const schedule: Schedule = {
        id: 'disabled-global',
        name: 'Disabled Global',
        enabled: true,
        type: 'recurring',
        actions: [{ type: 'enable' }]
      };

      mockStorage.schedulesEnabled = false;
      await scheduleManager.saveSchedule(schedule);
      await scheduleManager.checkSchedules();

      expect(mockStorage.enabled).toBeUndefined();
    });

    test('should not check disabled schedules', async () => {
      const schedule: Schedule = {
        id: 'disabled-schedule',
        name: 'Disabled Schedule',
        enabled: false, // Disabled
        type: 'recurring',
        actions: [{ type: 'enable' }]
      };

      mockStorage.schedulesEnabled = true;
      await scheduleManager.saveSchedule(schedule);
      await scheduleManager.checkSchedules();

      expect(mockStorage.enabled).toBeUndefined();
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty schedules array', async () => {
      mockStorage.schedulesEnabled = true;
      mockStorage.schedules = [];

      await scheduleManager.checkSchedules();

      // Should not throw error
      expect(true).toBe(true);
    });

    test('should handle missing schedules in storage', async () => {
      mockStorage.schedulesEnabled = true;
      // schedules key not set

      await scheduleManager.checkSchedules();

      // Should not throw error
      expect(true).toBe(true);
    });

    test('should handle storage errors gracefully', async () => {
      jest.spyOn(chrome.storage.local, 'get').mockRejectedValueOnce(new Error('Storage error'));

      const all = await scheduleManager.getAllSchedules();
      expect(all).toEqual([]); // Should return empty array on error
    });
  });
});
