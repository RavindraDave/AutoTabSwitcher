/**
 * Comprehensive tests for activity-tracker.ts
 * Tests pause detection, activity recording, and listener setup
 */

import { jest, describe, test, expect, beforeEach } from '@jest/globals';

// Mock the logger module
jest.mock('../core/logger.js', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

const mockChrome = (global as any).chrome;

describe('Activity Tracker', () => {
  let isPaused: any;
  let recordUserActivity: any;
  let setupActivityListeners: any;
  let logger: any;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Reset chrome mocks
    mockChrome.storage.local.get.mockReset();
    mockChrome.storage.local.set.mockReset();
    mockChrome.tabs.onUpdated.addListener.mockReset();
    mockChrome.tabs.onCreated.addListener.mockReset();
    mockChrome.tabs.onActivated.addListener.mockReset();
    mockChrome.windows.onFocusChanged.addListener.mockReset();

    // Default mock for storage.get
    mockChrome.storage.local.get.mockResolvedValue({});
    mockChrome.storage.local.set.mockResolvedValue(undefined);

    // Reset module by clearing cache and reimporting
    jest.resetModules();

    // Import logger mock after reset
    const loggerModule = await import('../core/logger.js');
    logger = loggerModule.logger;

    const activityModule = await import('../core/activity-tracker.js');
    isPaused = activityModule.isPaused;
    recordUserActivity = activityModule.recordUserActivity;
    setupActivityListeners = activityModule.setupActivityListeners;
  });

  describe('isPaused()', () => {
    test('should return false when pauseOnActivity is disabled', async () => {
      mockChrome.storage.local.get.mockResolvedValue({
        pauseOnActivity: false,
        lastUserActivityTime: Date.now(),
      });

      const paused = await isPaused();

      expect(paused).toBe(false);
    });

    test('should return false when pauseOnActivity is undefined (default)', async () => {
      mockChrome.storage.local.get.mockResolvedValue({});

      const paused = await isPaused();

      expect(paused).toBe(false); // DEFAULT_PAUSE_ON_ACTIVITY is false
    });

    test('should return true when recent activity within pause duration', async () => {
      const recentActivity = Date.now() - 1000; // 1 second ago

      mockChrome.storage.local.get.mockImplementation((keys) => {
        if (keys.includes('lastUserActivityTime')) {
          return Promise.resolve({ lastUserActivityTime: recentActivity });
        }
        return Promise.resolve({
          pauseOnActivity: true,
          pauseDuration: 5000, // 5 seconds
        });
      });

      const paused = await isPaused();

      expect(paused).toBe(true);
    });

    test('should return false when activity is older than pause duration', async () => {
      const oldActivity = Date.now() - 10000; // 10 seconds ago

      mockChrome.storage.local.get.mockImplementation((keys) => {
        if (keys.includes('lastUserActivityTime')) {
          return Promise.resolve({ lastUserActivityTime: oldActivity });
        }
        return Promise.resolve({
          pauseOnActivity: true,
          pauseDuration: 5000, // 5 seconds
        });
      });

      const paused = await isPaused();

      expect(paused).toBe(false);
    });

    test('should use default pause duration when not set', async () => {
      const recentActivity = Date.now() - 1000;

      mockChrome.storage.local.get.mockImplementation((keys) => {
        if (keys.includes('lastUserActivityTime')) {
          return Promise.resolve({ lastUserActivityTime: recentActivity });
        }
        return Promise.resolve({
          pauseOnActivity: true,
          // pauseDuration not set, should use DEFAULT_PAUSE_DURATION
        });
      });

      const paused = await isPaused();

      // With recent activity and pauseOnActivity=true, should be paused
      expect(paused).toBe(true);
    });

    test('should initialize from storage on first call', async () => {
      const storedActivity = Date.now() - 2000;

      mockChrome.storage.local.get.mockImplementation((keys) => {
        if (Array.isArray(keys) && keys.includes('lastUserActivityTime')) {
          return Promise.resolve({ lastUserActivityTime: storedActivity });
        }
        return Promise.resolve({
          pauseOnActivity: true,
          pauseDuration: 5000,
        });
      });

      await isPaused();

      // Should have called storage.get for both initialization and pause settings
      expect(mockChrome.storage.local.get).toHaveBeenCalled();
      const calls = mockChrome.storage.local.get.mock.calls;
      const hasInitCall = calls.some((call: any[]) =>
        Array.isArray(call[0]) && call[0].includes('lastUserActivityTime')
      );
      expect(hasInitCall).toBe(true);
    });

    test('should handle missing lastUserActivityTime in storage', async () => {
      mockChrome.storage.local.get.mockImplementation((keys) => {
        if (keys.includes('lastUserActivityTime')) {
          return Promise.resolve({}); // No stored activity
        }
        return Promise.resolve({
          pauseOnActivity: true,
          pauseDuration: 5000,
        });
      });

      const paused = await isPaused();

      // With no recorded activity (timestamp 0), should not be paused
      expect(paused).toBe(false);
    });
  });

  describe('recordUserActivity()', () => {
    test('should update lastUserActivityTime', () => {
      mockChrome.storage.local.set.mockResolvedValue(undefined);

      const beforeTime = Date.now();
      recordUserActivity();
      const afterTime = Date.now();

      // Should have called storage.set with timestamp
      const setCall = mockChrome.storage.local.set.mock.calls[0][0];
      expect(setCall.lastUserActivityTime).toBeGreaterThanOrEqual(beforeTime);
      expect(setCall.lastUserActivityTime).toBeLessThanOrEqual(afterTime);
    });

    test('should persist to storage for service worker resilience', () => {
      mockChrome.storage.local.set.mockResolvedValue(undefined);

      recordUserActivity();

      expect(mockChrome.storage.local.set).toHaveBeenCalledWith(
        expect.objectContaining({
          lastUserActivityTime: expect.any(Number),
        })
      );
    });

    test('should handle storage errors gracefully', async () => {
      mockChrome.storage.local.set.mockRejectedValue(new Error('Storage error'));

      // Call recordUserActivity and wait for the promise to settle
      recordUserActivity();

      // Wait a bit for the async error handler to execute
      await new Promise(resolve => setTimeout(resolve, 50));

      // Should have logged the error
      expect(logger.error).toHaveBeenCalledWith(
        'ActivityTracker',
        'Failed to persist activity time',
        expect.objectContaining({
          error: expect.any(String)
        })
      );
    });

    test('should update timestamp on multiple calls', () => {
      mockChrome.storage.local.set.mockResolvedValue(undefined);

      recordUserActivity();
      const firstCall = mockChrome.storage.local.set.mock.calls[0][0].lastUserActivityTime;

      // Small delay
      jest.advanceTimersByTime(10);

      recordUserActivity();
      const secondCall = mockChrome.storage.local.set.mock.calls[1][0].lastUserActivityTime;

      expect(secondCall).toBeGreaterThanOrEqual(firstCall);
    });
  });

  describe('setupActivityListeners()', () => {
    test('should register tab update listener', () => {
      setupActivityListeners();

      expect(mockChrome.tabs.onUpdated.addListener).toHaveBeenCalledTimes(1);
      expect(mockChrome.tabs.onUpdated.addListener).toHaveBeenCalledWith(
        expect.any(Function)
      );
    });

    test('should register tab created listener', () => {
      setupActivityListeners();

      expect(mockChrome.tabs.onCreated.addListener).toHaveBeenCalledTimes(1);
      expect(mockChrome.tabs.onCreated.addListener).toHaveBeenCalledWith(
        expect.any(Function)
      );
    });

    test('should register tab activated listener', () => {
      setupActivityListeners();

      expect(mockChrome.tabs.onActivated.addListener).toHaveBeenCalledTimes(1);
      expect(mockChrome.tabs.onActivated.addListener).toHaveBeenCalledWith(
        expect.any(Function)
      );
    });

    test('should register window focus changed listener', () => {
      setupActivityListeners();

      expect(mockChrome.windows.onFocusChanged.addListener).toHaveBeenCalledTimes(1);
      expect(mockChrome.windows.onFocusChanged.addListener).toHaveBeenCalledWith(
        expect.any(Function)
      );
    });

    test('should record activity on URL change', async () => {
      mockChrome.storage.local.get.mockResolvedValue({ pauseOnActivity: true });
      mockChrome.storage.local.set.mockResolvedValue(undefined);
      setupActivityListeners();

      // Get the callback function
      const callback = mockChrome.tabs.onUpdated.addListener.mock.calls[0][0];

      // Simulate URL change
      await callback(123, { url: 'https://example.com' }, {});

      expect(mockChrome.storage.local.set).toHaveBeenCalledWith(
        expect.objectContaining({
          lastUserActivityTime: expect.any(Number),
        })
      );
    });

    test('should record activity on tab loading', async () => {
      mockChrome.storage.local.get.mockResolvedValue({ pauseOnActivity: true });
      mockChrome.storage.local.set.mockResolvedValue(undefined);
      setupActivityListeners();

      const callback = mockChrome.tabs.onUpdated.addListener.mock.calls[0][0];

      // Simulate tab loading
      await callback(123, { status: 'loading' }, {});

      expect(mockChrome.storage.local.set).toHaveBeenCalled();
    });

    test('should not record activity on non-meaningful updates', () => {
      mockChrome.storage.local.set.mockResolvedValue(undefined);
      setupActivityListeners();

      const callback = mockChrome.tabs.onUpdated.addListener.mock.calls[0][0];

      // Simulate non-meaningful update (e.g., favicon change)
      callback(123, { favIconUrl: 'https://example.com/favicon.ico' }, {});

      expect(mockChrome.storage.local.set).not.toHaveBeenCalled();
    });

    test('should record activity on tab creation', async () => {
      mockChrome.storage.local.get.mockResolvedValue({ pauseOnActivity: true });
      mockChrome.storage.local.set.mockResolvedValue(undefined);
      setupActivityListeners();

      const callback = mockChrome.tabs.onCreated.addListener.mock.calls[0][0];

      // Simulate tab creation
      await callback({ id: 123 });

      expect(mockChrome.storage.local.set).toHaveBeenCalled();
    });

    test('should record activity on tab activation', async () => {
      mockChrome.storage.local.get.mockResolvedValue({ pauseOnActivity: true });
      mockChrome.storage.local.set.mockResolvedValue(undefined);
      setupActivityListeners();

      const callback = mockChrome.tabs.onActivated.addListener.mock.calls[0][0];

      // Simulate tab activation
      await callback({ tabId: 123, windowId: 1 });

      expect(mockChrome.storage.local.set).toHaveBeenCalled();
    });

    test('should record activity on window focus change', async () => {
      mockChrome.storage.local.get.mockResolvedValue({ pauseOnActivity: true });
      mockChrome.storage.local.set.mockResolvedValue(undefined);
      setupActivityListeners();

      const callback = mockChrome.windows.onFocusChanged.addListener.mock.calls[0][0];

      // Simulate window focus change
      await callback(100);

      expect(mockChrome.storage.local.set).toHaveBeenCalled();
    });

    test('should not record activity when all windows lose focus', () => {
      mockChrome.storage.local.set.mockResolvedValue(undefined);
      setupActivityListeners();

      const callback = mockChrome.windows.onFocusChanged.addListener.mock.calls[0][0];

      // Simulate all windows losing focus (WINDOW_ID_NONE = -1)
      callback(chrome.windows.WINDOW_ID_NONE);

      expect(mockChrome.storage.local.set).not.toHaveBeenCalled();
    });
  });

  describe('Service Worker Resilience', () => {
    test('should persist activity to storage on each record', () => {
      mockChrome.storage.local.set.mockResolvedValue(undefined);

      recordUserActivity();

      // Verify storage persistence
      expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
        lastUserActivityTime: expect.any(Number),
      });
    });

    test('should load activity time from storage on first isPaused call', async () => {
      const storedTime = Date.now() - 1000;

      mockChrome.storage.local.get.mockImplementation((keys) => {
        if (keys.includes('lastUserActivityTime')) {
          return Promise.resolve({ lastUserActivityTime: storedTime });
        }
        return Promise.resolve({ pauseOnActivity: true, pauseDuration: 5000 });
      });

      await isPaused();

      // Should have initialized from storage
      expect(mockChrome.storage.local.get).toHaveBeenCalledWith(
        expect.arrayContaining(['lastUserActivityTime'])
      );
    });

    test('should only initialize once per module lifetime', async () => {
      mockChrome.storage.local.get.mockResolvedValue({
        pauseOnActivity: false,
        lastUserActivityTime: Date.now(),
      });

      // Call multiple times
      await isPaused();
      await isPaused();
      await isPaused();

      // Should only load lastUserActivityTime once
      const initCalls = mockChrome.storage.local.get.mock.calls.filter((call: any) =>
        call[0].includes('lastUserActivityTime')
      );
      expect(initCalls.length).toBe(1);
    });
  });

  describe('Integration Scenarios', () => {
    test('should correctly pause after recording activity', async () => {
      mockChrome.storage.local.set.mockResolvedValue(undefined);
      mockChrome.storage.local.get.mockImplementation((keys) => {
        if (keys.includes('lastUserActivityTime')) {
          return Promise.resolve({ lastUserActivityTime: Date.now() });
        }
        return Promise.resolve({ pauseOnActivity: true, pauseDuration: 5000 });
      });

      // Record activity
      recordUserActivity();

      // Wait a tiny bit for storage to update
      await new Promise(resolve => setTimeout(resolve, 10));

      // Check if paused
      const paused = await isPaused();

      expect(paused).toBe(true);
    });

    test('should resume after pause duration expires', async () => {
      const oldActivity = Date.now() - 10000; // 10 seconds ago

      mockChrome.storage.local.get.mockImplementation((keys) => {
        if (keys.includes('lastUserActivityTime')) {
          return Promise.resolve({ lastUserActivityTime: oldActivity });
        }
        return Promise.resolve({ pauseOnActivity: true, pauseDuration: 5000 });
      });

      const paused = await isPaused();

      expect(paused).toBe(false); // Should have resumed
    });
  });
});
