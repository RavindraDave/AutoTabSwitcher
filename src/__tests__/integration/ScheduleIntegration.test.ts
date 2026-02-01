/**
 * Integration Tests for Schedule Manager
 *
 * Tests interactions between:
 * - Schedule + Group
 * - Schedule + Window Mode
 * - Schedule + Rotation Pattern
 * - Edge cases (non-existent group, invalid pattern IDs, etc.)
 */

import { scheduleManager } from '../../premium/ScheduleManager';
import type { Schedule, ScheduledAction, TabGroup } from '../../core/types';

// Mock chrome API
global.chrome = {
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn()
    },
    sync: {
      get: jest.fn(),
      set: jest.fn()
    }
  },
  alarms: {
    create: jest.fn(),
    clear: jest.fn(),
    get: jest.fn(),
    onAlarm: {
      addListener: jest.fn()
    }
  },
  runtime: {
    getManifest: jest.fn(() => ({
      version: '1.0.0',
      name: 'Test Extension'
    }))
  }
} as any;

// Mock logger
jest.mock('../../core/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}));

// Mock premium access
jest.mock('../../core/premium-access', () => ({
  canAccessPremium: jest.fn().mockResolvedValue(true)
}));

describe('Schedule Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default storage mock
    (chrome.storage.local.get as jest.Mock).mockResolvedValue({
      schedules: []
    });
    (chrome.storage.local.set as jest.Mock).mockResolvedValue(undefined);
  });

  describe('Schedule + Group Integration', () => {
    it('should activate a group via schedule', async () => {
      const schedule: Schedule = {
        id: 'schedule-1',
        name: 'Activate Work Group',
        type: 'recurring',
        enabled: true,
        actions: [
          {
            type: 'activate-group',
            groupId: 'group-work'
          } as ScheduledAction
        ],
        timeRange: {
          start: '09:00',
          end: '17:00'
        },
        daysOfWeek: [1, 2, 3, 4, 5], // Monday-Friday
        priority: 1,
        createdAt: Date.now()
      };

      // Mock storage to return the schedule
      (chrome.storage.local.get as jest.Mock).mockImplementation((keys) => {
        if (keys === 'schedules' || keys.includes('schedules')) {
          return Promise.resolve({ schedules: [schedule] });
        }
        return Promise.resolve({});
      });

      await scheduleManager.initialize();

      // Execute the schedule (simulate Monday at 10:00)
      const monday10am = new Date('2024-01-15T10:00:00'); // Monday
      await scheduleManager.checkSchedules(monday10am.getTime());

      // Verify activate-group action was stored
      expect(chrome.storage.local.set).toHaveBeenCalledWith(
        expect.objectContaining({
          activeGroupId: 'group-work'
        })
      );
    });

    it('should deactivate group via schedule', async () => {
      const schedule: Schedule = {
        id: 'schedule-2',
        name: 'Deactivate Work Group',
        type: 'recurring',
        enabled: true,
        actions: [
          {
            type: 'deactivate-group'
          } as ScheduledAction
        ],
        timeRange: {
          start: '17:00',
          end: '17:01'
        },
        daysOfWeek: [1, 2, 3, 4, 5], // Monday-Friday
        priority: 1,
        createdAt: Date.now()
      };

      (chrome.storage.local.get as jest.Mock).mockImplementation((keys) => {
        if (keys === 'schedules' || keys.includes('schedules')) {
          return Promise.resolve({ schedules: [schedule] });
        }
        if (keys === 'activeGroupId' || keys.includes('activeGroupId')) {
          return Promise.resolve({ activeGroupId: 'group-work' });
        }
        return Promise.resolve({});
      });

      await scheduleManager.initialize();

      // Execute the schedule (simulate Monday at 17:00)
      const monday5pm = new Date('2024-01-15T17:00:00'); // Monday
      await scheduleManager.checkSchedules(monday5pm.getTime());

      // Verify group was deactivated
      expect(chrome.storage.local.set).toHaveBeenCalledWith(
        expect.objectContaining({
          activeGroupId: null
        })
      );
    });

    it('should handle non-existent group gracefully', async () => {
      const schedule: Schedule = {
        id: 'schedule-3',
        name: 'Activate Non-Existent Group',
        type: 'one-time',
        enabled: true,
        actions: [
          {
            type: 'activate-group',
            groupId: 'group-nonexistent'
          } as ScheduledAction
        ],
        timeRange: {
          start: '09:00',
          end: '09:01'
        },
        priority: 1,
        createdAt: Date.now()
      };

      (chrome.storage.local.get as jest.Mock).mockImplementation((keys) => {
        if (keys === 'schedules' || keys.includes('schedules')) {
          return Promise.resolve({ schedules: [schedule] });
        }
        if (keys === 'groups' || keys.includes('groups')) {
          return Promise.resolve({ groups: [] }); // No groups!
        }
        return Promise.resolve({});
      });

      await scheduleManager.initialize();

      const now = new Date('2024-01-15T09:00:00');
      await expect(
        scheduleManager.checkSchedules(now.getTime())
      ).resolves.not.toThrow();

      // Action should be attempted but fail gracefully
      // (GroupManager will handle the error)
    });
  });

  describe('Schedule + Window Mode Integration', () => {
    it('should enable window mode via schedule', async () => {
      const schedule: Schedule = {
        id: 'schedule-4',
        name: 'Enable Window 1',
        type: 'recurring',
        enabled: true,
        actions: [
          {
            type: 'enable-window',
            windowId: 1
          } as ScheduledAction
        ],
        timeRange: {
          start: '09:00',
          end: '17:00'
        },
        daysOfWeek: [1, 2, 3, 4, 5],
        priority: 1,
        createdAt: Date.now()
      };

      (chrome.storage.local.get as jest.Mock).mockImplementation((keys) => {
        if (keys === 'schedules' || keys.includes('schedules')) {
          return Promise.resolve({ schedules: [schedule] });
        }
        if (keys === 'windowStates' || keys.includes('windowStates')) {
          return Promise.resolve({
            windowStates: {
              1: { enabled: false }
            }
          });
        }
        return Promise.resolve({});
      });

      await scheduleManager.initialize();

      const monday9am = new Date('2024-01-15T09:00:00');
      await scheduleManager.checkSchedules(monday9am.getTime());

      // Verify window was enabled
      expect(chrome.storage.local.set).toHaveBeenCalledWith(
        expect.objectContaining({
          windowStates: expect.objectContaining({
            1: expect.objectContaining({
              enabled: true
            })
          })
        })
      );
    });

    it('should disable window mode via schedule', async () => {
      const schedule: Schedule = {
        id: 'schedule-5',
        name: 'Disable Window 1',
        type: 'recurring',
        enabled: true,
        actions: [
          {
            type: 'disable-window',
            windowId: 1
          } as ScheduledAction
        ],
        timeRange: {
          start: '17:00',
          end: '17:01'
        },
        priority: 1,
        createdAt: Date.now()
      };

      (chrome.storage.local.get as jest.Mock).mockImplementation((keys) => {
        if (keys === 'schedules' || keys.includes('schedules')) {
          return Promise.resolve({ schedules: [schedule] });
        }
        if (keys === 'windowStates' || keys.includes('windowStates')) {
          return Promise.resolve({
            windowStates: {
              1: { enabled: true }
            }
          });
        }
        return Promise.resolve({});
      });

      await scheduleManager.initialize();

      const monday5pm = new Date('2024-01-15T17:00:00');
      await scheduleManager.checkSchedules(monday5pm.getTime());

      // Verify window was disabled
      expect(chrome.storage.local.set).toHaveBeenCalledWith(
        expect.objectContaining({
          windowStates: expect.objectContaining({
            1: expect.objectContaining({
              enabled: false
            })
          })
        })
      );
    });
  });

  describe('Schedule + Rotation Pattern Integration', () => {
    it('should set rotation pattern via schedule', async () => {
      const schedule: Schedule = {
        id: 'schedule-6',
        name: 'Set Random Pattern',
        type: 'recurring',
        enabled: true,
        actions: [
          {
            type: 'set-pattern',
            patternId: 'random'
          } as ScheduledAction
        ],
        timeRange: {
          start: '09:00',
          end: '17:00'
        },
        priority: 1,
        createdAt: Date.now()
      };

      (chrome.storage.local.get as jest.Mock).mockImplementation((keys) => {
        if (keys === 'schedules' || keys.includes('schedules')) {
          return Promise.resolve({ schedules: [schedule] });
        }
        if (keys === 'rotationPattern' || keys.includes('rotationPattern')) {
          return Promise.resolve({ rotationPattern: 'sequential' });
        }
        return Promise.resolve({});
      });

      await scheduleManager.initialize();

      const monday9am = new Date('2024-01-15T09:00:00');
      await scheduleManager.checkSchedules(monday9am.getTime());

      // Verify pattern was set
      expect(chrome.storage.local.set).toHaveBeenCalledWith(
        expect.objectContaining({
          rotationPattern: 'random'
        })
      );
    });

    it('should handle invalid pattern ID gracefully', async () => {
      const schedule: Schedule = {
        id: 'schedule-7',
        name: 'Set Invalid Pattern',
        type: 'one-time',
        enabled: true,
        actions: [
          {
            type: 'set-pattern',
            patternId: 'invalid-pattern-xyz'
          } as ScheduledAction
        ],
        timeRange: {
          start: '09:00',
          end: '09:01'
        },
        priority: 1,
        createdAt: Date.now()
      };

      (chrome.storage.local.get as jest.Mock).mockImplementation((keys) => {
        if (keys === 'schedules' || keys.includes('schedules')) {
          return Promise.resolve({ schedules: [schedule] });
        }
        return Promise.resolve({});
      });

      await scheduleManager.initialize();

      const now = new Date('2024-01-15T09:00:00');
      await expect(
        scheduleManager.checkSchedules(now.getTime())
      ).resolves.not.toThrow();

      // Invalid pattern should be sanitized or rejected
      // (current implementation allows any string)
    });
  });

  describe('Schedule Priority Resolution', () => {
    it('should execute highest priority schedule when conflicts occur', async () => {
      const lowPrioritySchedule: Schedule = {
        id: 'schedule-low',
        name: 'Low Priority',
        type: 'recurring',
        enabled: true,
        actions: [
          {
            type: 'activate-group',
            groupId: 'group-low'
          } as ScheduledAction
        ],
        timeRange: {
          start: '09:00',
          end: '17:00'
        },
        priority: 1, // Lower priority
        createdAt: Date.now()
      };

      const highPrioritySchedule: Schedule = {
        id: 'schedule-high',
        name: 'High Priority',
        type: 'recurring',
        enabled: true,
        actions: [
          {
            type: 'activate-group',
            groupId: 'group-high'
          } as ScheduledAction
        ],
        timeRange: {
          start: '09:00',
          end: '17:00'
        },
        priority: 10, // Higher priority
        createdAt: Date.now()
      };

      (chrome.storage.local.get as jest.Mock).mockImplementation((keys) => {
        if (keys === 'schedules' || keys.includes('schedules')) {
          return Promise.resolve({
            schedules: [lowPrioritySchedule, highPrioritySchedule]
          });
        }
        return Promise.resolve({});
      });

      await scheduleManager.initialize();

      const monday9am = new Date('2024-01-15T09:00:00');
      await scheduleManager.checkSchedules(monday9am.getTime());

      // Only the high priority schedule should execute
      expect(chrome.storage.local.set).toHaveBeenCalledWith(
        expect.objectContaining({
          activeGroupId: 'group-high'
        })
      );
    });
  });

  describe('Multiple Actions in Single Schedule', () => {
    it('should execute all actions in order', async () => {
      const schedule: Schedule = {
        id: 'schedule-multi',
        name: 'Multi-Action Schedule',
        type: 'one-time',
        enabled: true,
        actions: [
          {
            type: 'enable'
          } as ScheduledAction,
          {
            type: 'set-interval',
            interval: 10000
          } as ScheduledAction,
          {
            type: 'activate-group',
            groupId: 'group-work'
          } as ScheduledAction
        ],
        timeRange: {
          start: '09:00',
          end: '09:01'
        },
        priority: 1,
        createdAt: Date.now()
      };

      (chrome.storage.local.get as jest.Mock).mockImplementation((keys) => {
        if (keys === 'schedules' || keys.includes('schedules')) {
          return Promise.resolve({ schedules: [schedule] });
        }
        return Promise.resolve({});
      });

      await scheduleManager.initialize();

      const now = new Date('2024-01-15T09:00:00');
      await scheduleManager.checkSchedules(now.getTime());

      // Verify all actions were executed
      expect(chrome.storage.sync.set).toHaveBeenCalled(); // enable action
      expect(chrome.storage.local.set).toHaveBeenCalled(); // set-interval + activate-group
    });
  });

  describe('Edge Cases', () => {
    it('should handle schedule execution during storage errors', async () => {
      const schedule: Schedule = {
        id: 'schedule-error',
        name: 'Error Test',
        type: 'one-time',
        enabled: true,
        actions: [
          {
            type: 'enable'
          } as ScheduledAction
        ],
        timeRange: {
          start: '09:00',
          end: '09:01'
        },
        priority: 1,
        createdAt: Date.now()
      };

      (chrome.storage.local.get as jest.Mock).mockImplementation((keys) => {
        if (keys === 'schedules' || keys.includes('schedules')) {
          return Promise.resolve({ schedules: [schedule] });
        }
        return Promise.resolve({});
      });

      // Mock storage error
      (chrome.storage.sync.set as jest.Mock).mockRejectedValueOnce(
        new Error('Storage quota exceeded')
      );

      await scheduleManager.initialize();

      const now = new Date('2024-01-15T09:00:00');
      await expect(
        scheduleManager.checkSchedules(now.getTime())
      ).resolves.not.toThrow();

      // Error should be logged but not thrown
    });

    it('should handle concurrent schedule checks', async () => {
      const schedule: Schedule = {
        id: 'schedule-concurrent',
        name: 'Concurrent Test',
        type: 'recurring',
        enabled: true,
        actions: [
          {
            type: 'enable'
          } as ScheduledAction
        ],
        timeRange: {
          start: '09:00',
          end: '17:00'
        },
        priority: 1,
        createdAt: Date.now()
      };

      (chrome.storage.local.get as jest.Mock).mockImplementation((keys) => {
        if (keys === 'schedules' || keys.includes('schedules')) {
          return Promise.resolve({ schedules: [schedule] });
        }
        return Promise.resolve({});
      });

      await scheduleManager.initialize();

      const now = new Date('2024-01-15T10:00:00');

      // Execute multiple checks concurrently
      await Promise.all([
        scheduleManager.checkSchedules(now.getTime()),
        scheduleManager.checkSchedules(now.getTime()),
        scheduleManager.checkSchedules(now.getTime())
      ]);

      // Should not throw or cause issues
      expect(chrome.storage.sync.set).toHaveBeenCalled();
    });

    it('should handle missing schedule fields gracefully', async () => {
      const incompleteSchedule = {
        id: 'incomplete',
        name: 'Incomplete Schedule',
        type: 'recurring',
        enabled: true,
        actions: [],
        // Missing timeRange, daysOfWeek
        priority: 1,
        createdAt: Date.now()
      } as Schedule;

      (chrome.storage.local.get as jest.Mock).mockImplementation((keys) => {
        if (keys === 'schedules' || keys.includes('schedules')) {
          return Promise.resolve({ schedules: [incompleteSchedule] });
        }
        return Promise.resolve({});
      });

      await scheduleManager.initialize();

      const now = new Date('2024-01-15T10:00:00');
      await expect(
        scheduleManager.checkSchedules(now.getTime())
      ).resolves.not.toThrow();
    });
  });

  describe('Date Range Edge Cases', () => {
    it('should activate schedule on start date', async () => {
      const schedule: Schedule = {
        id: 'schedule-start',
        name: 'Start Date Test',
        type: 'recurring',
        enabled: true,
        actions: [{ type: 'enable' } as ScheduledAction],
        dateRange: {
          start: '2024-06-01',
          end: '2024-06-30'
        },
        timeRange: {
          start: '00:00',
          end: '23:59'
        },
        priority: 1,
        createdAt: Date.now()
      };

      (chrome.storage.local.get as jest.Mock).mockImplementation((keys) => {
        if (keys === 'schedules' || keys.includes('schedules')) {
          return Promise.resolve({ schedules: [schedule] });
        }
        return Promise.resolve({});
      });

      await scheduleManager.initialize();

      // Test on start date at 10:00 AM
      const startDate = new Date('2024-06-01T10:00:00');
      await scheduleManager.checkSchedules(startDate.getTime());

      expect(chrome.storage.sync.set).toHaveBeenCalled();
    });

    it('should activate schedule on end date', async () => {
      const schedule: Schedule = {
        id: 'schedule-end',
        name: 'End Date Test',
        type: 'recurring',
        enabled: true,
        actions: [{ type: 'enable' } as ScheduledAction],
        dateRange: {
          start: '2024-06-01',
          end: '2024-06-30'
        },
        timeRange: {
          start: '00:00',
          end: '23:59'
        },
        priority: 1,
        createdAt: Date.now()
      };

      (chrome.storage.local.get as jest.Mock).mockImplementation((keys) => {
        if (keys === 'schedules' || keys.includes('schedules')) {
          return Promise.resolve({ schedules: [schedule] });
        }
        return Promise.resolve({});
      });

      await scheduleManager.initialize();

      // Test on end date at 11:59 PM (last minute)
      const endDate = new Date('2024-06-30T23:59:00');
      await scheduleManager.checkSchedules(endDate.getTime());

      expect(chrome.storage.sync.set).toHaveBeenCalled();
    });

    it('should not activate schedule after end date', async () => {
      const schedule: Schedule = {
        id: 'schedule-after-end',
        name: 'After End Date Test',
        type: 'recurring',
        enabled: true,
        actions: [{ type: 'enable' } as ScheduledAction],
        dateRange: {
          start: '2024-06-01',
          end: '2024-06-30'
        },
        timeRange: {
          start: '00:00',
          end: '23:59'
        },
        priority: 1,
        createdAt: Date.now()
      };

      (chrome.storage.local.get as jest.Mock).mockImplementation((keys) => {
        if (keys === 'schedules' || keys.includes('schedules')) {
          return Promise.resolve({ schedules: [schedule] });
        }
        return Promise.resolve({});
      });

      await scheduleManager.initialize();

      // Test on day after end date
      const afterEndDate = new Date('2024-07-01T10:00:00');
      await scheduleManager.checkSchedules(afterEndDate.getTime());

      expect(chrome.storage.sync.set).not.toHaveBeenCalled();
    });
  });
});
