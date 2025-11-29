/**
 * Comprehensive tests for timing-hybrid.ts
 * Tests alarm vs interval timer selection, service worker resilience, and timer lifecycle
 */

import { jest, describe, test, expect, beforeEach, afterEach } from '@jest/globals';

// Mock dependencies before importing timing-hybrid
jest.mock('../core/storage.js', () => ({
  getSettings: jest.fn(),
}));

jest.mock('../core/badge-manager.js', () => ({
  updateBadge: jest.fn(),
}));

jest.mock('../core/tab-switcher.js', () => ({
  switchTab: jest.fn(),
}));

jest.mock('../core/activity-tracker.js', () => ({
  isPaused: jest.fn(),
}));

jest.mock('../core/logger.js', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

const mockChrome = (global as any).chrome;

describe('Timing Hybrid', () => {
  let toggleHybridTimer: any;
  let setupAlarmListener: any;
  let getSettings: any;
  let updateBadge: any;
  let switchTab: any;
  let isPaused: any;
  let logger: any;
  let setIntervalSpy: jest.SpyInstance;
  let clearIntervalSpy: jest.SpyInstance;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Reset chrome mocks
    mockChrome.storage.local.get.mockReset();
    mockChrome.storage.local.set.mockReset();
    mockChrome.alarms.create.mockReset();
    mockChrome.alarms.clear.mockReset();
    mockChrome.alarms.onAlarm.addListener.mockReset();

    // Mock setInterval/clearInterval
    setIntervalSpy = jest.spyOn(global, 'setInterval');
    clearIntervalSpy = jest.spyOn(global, 'clearInterval');

    // Set default mock implementations
    mockChrome.storage.local.set.mockResolvedValue(undefined);
    mockChrome.alarms.create.mockResolvedValue(undefined);
    mockChrome.alarms.clear.mockResolvedValue(true);

    // Import modules
    const timingModule = await import('../core/timing-hybrid.js');
    const storageModule = await import('../core/storage.js');
    const badgeModule = await import('../core/badge-manager.js');
    const tabSwitcherModule = await import('../core/tab-switcher.js');
    const activityModule = await import('../core/activity-tracker.js');
    const loggerModule = await import('../core/logger.js');

    toggleHybridTimer = timingModule.toggleHybridTimer;
    setupAlarmListener = timingModule.setupAlarmListener;
    getSettings = storageModule.getSettings;
    updateBadge = badgeModule.updateBadge;
    switchTab = tabSwitcherModule.switchTab;
    isPaused = activityModule.isPaused;
    logger = loggerModule.logger;

    // Default mock implementations
    (getSettings as jest.Mock).mockResolvedValue({ enabled: true });
    (updateBadge as jest.Mock).mockResolvedValue(undefined);
    (switchTab as jest.Mock).mockResolvedValue(undefined);
    (isPaused as jest.Mock).mockResolvedValue(false);
  });

  afterEach(() => {
    setIntervalSpy.mockRestore();
    clearIntervalSpy.mockRestore();
  });

  describe('toggleHybridTimer() - Timer Selection', () => {
    test('should use interval timer for delays < 30 seconds', async () => {
      await toggleHybridTimer(true, 10000, 5000); // 10 seconds

      // Should create interval timer
      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 10000);

      // Should create keep-alive alarm
      expect(mockChrome.alarms.create).toHaveBeenCalledWith('keepAlive', {
        delayInMinutes: 1,
        periodInMinutes: 1,
      });

      // Should store timer state
      expect(mockChrome.storage.local.set).toHaveBeenCalledWith(
        expect.objectContaining({
          usingIntervalTimer: true,
          intervalDelayMs: 10000,
        })
      );

      // Should NOT create main alarm
      expect(mockChrome.alarms.create).not.toHaveBeenCalledWith(
        'tabSwitcher',
        expect.anything()
      );
    });

    test('should use alarm timer for delays >= 30 seconds', async () => {
      await toggleHybridTimer(true, 60000, 5000); // 60 seconds

      // Should create alarm
      expect(mockChrome.alarms.create).toHaveBeenCalledWith('tabSwitcher', {
        delayInMinutes: 1,
        periodInMinutes: 1,
      });

      // Should NOT create interval timer
      expect(setIntervalSpy).not.toHaveBeenCalled();

      // Should NOT create keep-alive alarm
      expect(mockChrome.alarms.create).not.toHaveBeenCalledWith(
        'keepAlive',
        expect.anything()
      );
    });

    test('should use alarm timer for exactly 30 seconds (boundary)', async () => {
      await toggleHybridTimer(true, 30000, 5000);

      expect(mockChrome.alarms.create).toHaveBeenCalledWith('tabSwitcher', {
        delayInMinutes: 0.5,
        periodInMinutes: 0.5,
      });
      expect(setIntervalSpy).not.toHaveBeenCalled();
    });

    test('should clamp delay to minimum', async () => {
      await toggleHybridTimer(true, 1000, 5000); // Request 1s, min is 5s

      // Should use 5000ms (clamped value)
      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 5000);
    });

    test('should convert milliseconds to minutes correctly for alarms', async () => {
      await toggleHybridTimer(true, 120000, 5000); // 120 seconds = 2 minutes

      expect(mockChrome.alarms.create).toHaveBeenCalledWith('tabSwitcher', {
        delayInMinutes: 2,
        periodInMinutes: 2,
      });
    });
  });

  describe('toggleHybridTimer() - Enabled/Disabled', () => {
    test('should start timer when enabled=true', async () => {
      await toggleHybridTimer(true, 10000, 5000);

      expect(setIntervalSpy).toHaveBeenCalled();
      expect(updateBadge).toHaveBeenCalledWith(true);
    });

    test('should stop all timers when enabled=false', async () => {
      // First start a timer
      await toggleHybridTimer(true, 10000, 5000);
      jest.clearAllMocks();

      // Then disable
      await toggleHybridTimer(false, 10000, 5000);

      expect(clearIntervalSpy).toHaveBeenCalled();
      expect(mockChrome.alarms.clear).toHaveBeenCalledWith('tabSwitcher');
      expect(mockChrome.alarms.clear).toHaveBeenCalledWith('keepAlive');
      expect(setIntervalSpy).not.toHaveBeenCalled();
      expect(updateBadge).toHaveBeenCalledWith(false);
    });

    test('should clear existing timers before starting new one', async () => {
      // Start first timer
      await toggleHybridTimer(true, 10000, 5000);

      const firstIntervalId = setIntervalSpy.mock.results[0].value;

      jest.clearAllMocks();

      // Start second timer
      await toggleHybridTimer(true, 15000, 5000);

      // Should have cleared the first timer
      expect(clearIntervalSpy).toHaveBeenCalled();

      // Should have created a new interval
      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 15000);
    });
  });

  describe('Interval Timer Behavior', () => {
    test('should execute tab switch on interval tick when not paused', async () => {
      await toggleHybridTimer(true, 10000, 5000);

      // Get the interval callback
      const intervalCallback = setIntervalSpy.mock.calls[0][0];

      // Execute the callback
      await intervalCallback();

      expect(switchTab).toHaveBeenCalled();
      expect(updateBadge).toHaveBeenCalledWith(true, false);
    });

    test('should update badge but not switch when paused', async () => {
      (isPaused as jest.Mock).mockResolvedValue(true);

      await toggleHybridTimer(true, 10000, 5000);

      const intervalCallback = setIntervalSpy.mock.calls[0][0];
      await intervalCallback();

      expect(switchTab).not.toHaveBeenCalled();
      expect(updateBadge).toHaveBeenCalledWith(true, true);
    });

    test('should not switch when disabled during interval', async () => {
      (getSettings as jest.Mock).mockResolvedValue({ enabled: false });

      await toggleHybridTimer(true, 10000, 5000);

      // Clear the updateBadge call from toggleHybridTimer
      (updateBadge as jest.Mock).mockClear();

      const intervalCallback = setIntervalSpy.mock.calls[0][0];
      await intervalCallback();

      expect(switchTab).not.toHaveBeenCalled();
      expect(updateBadge).not.toHaveBeenCalled();
    });

    test('should update lastIntervalCheck on each tick', async () => {
      await toggleHybridTimer(true, 10000, 5000);

      const intervalCallback = setIntervalSpy.mock.calls[0][0];

      const beforeTime = Date.now() - 10; // Add 10ms tolerance for timing precision
      await intervalCallback();
      const afterTime = Date.now() + 10; // Add 10ms tolerance for timing precision

      // Should have updated lastIntervalCheck
      const setCall = mockChrome.storage.local.set.mock.calls.find((call: any) =>
        call[0].lastIntervalCheck !== undefined
      );
      expect(setCall).toBeDefined();
      expect(setCall[0].lastIntervalCheck).toBeGreaterThanOrEqual(beforeTime);
      expect(setCall[0].lastIntervalCheck).toBeLessThanOrEqual(afterTime);
    });

    test('should store timer state when starting interval timer', async () => {
      const beforeTime = Date.now();
      await toggleHybridTimer(true, 10000, 5000);
      const afterTime = Date.now();

      const setCall = mockChrome.storage.local.set.mock.calls.find((call: any) =>
        call[0].usingIntervalTimer === true
      );

      expect(setCall[0]).toMatchObject({
        usingIntervalTimer: true,
        intervalDelayMs: 10000,
      });
      expect(setCall[0].lastIntervalStart).toBeGreaterThanOrEqual(beforeTime);
      expect(setCall[0].lastIntervalStart).toBeLessThanOrEqual(afterTime);
    });

    test('should clear timer state when stopping interval timer', async () => {
      await toggleHybridTimer(true, 10000, 5000);
      jest.clearAllMocks();

      await toggleHybridTimer(false, 10000, 5000);

      const setCall = mockChrome.storage.local.set.mock.calls.find((call: any) =>
        call[0].usingIntervalTimer === false
      );

      expect(setCall[0]).toMatchObject({
        usingIntervalTimer: false,
        intervalDelayMs: undefined,
        lastIntervalStart: undefined,
        lastIntervalCheck: undefined,
      });
    });
  });

  describe('Alarm Timer Behavior', () => {
    test('should create periodic alarm with correct timing', async () => {
      await toggleHybridTimer(true, 90000, 5000); // 90 seconds = 1.5 minutes

      expect(mockChrome.alarms.create).toHaveBeenCalledWith('tabSwitcher', {
        delayInMinutes: 1.5,
        periodInMinutes: 1.5,
      });
    });

    test('should clear alarm when stopping', async () => {
      await toggleHybridTimer(true, 60000, 5000);
      jest.clearAllMocks();

      await toggleHybridTimer(false, 60000, 5000);

      expect(mockChrome.alarms.clear).toHaveBeenCalledWith('tabSwitcher');
    });
  });

  describe('setupAlarmListener() - Main Alarm', () => {
    test('should register alarm listener', () => {
      setupAlarmListener();

      expect(mockChrome.alarms.onAlarm.addListener).toHaveBeenCalledWith(
        expect.any(Function)
      );
    });

    test('should execute tab switch when main alarm fires', async () => {
      // Start timer first to set in-memory flags
      await toggleHybridTimer(true, 60000, 5000);

      setupAlarmListener();

      const listener = mockChrome.alarms.onAlarm.addListener.mock.calls[0][0];

      // Simulate alarm firing
      await listener({ name: 'tabSwitcher' });

      expect(switchTab).toHaveBeenCalled();
      expect(updateBadge).toHaveBeenCalledWith(true, false);
    });

    test('should handle pause when main alarm fires', async () => {
      (isPaused as jest.Mock).mockResolvedValue(true);

      // Start timer first to set in-memory flags
      await toggleHybridTimer(true, 60000, 5000);

      setupAlarmListener();

      const listener = mockChrome.alarms.onAlarm.addListener.mock.calls[0][0];
      await listener({ name: 'tabSwitcher' });

      expect(switchTab).not.toHaveBeenCalled();
      expect(updateBadge).toHaveBeenCalledWith(true, true);
    });

    test('should not switch when disabled on alarm', async () => {
      (getSettings as jest.Mock).mockResolvedValue({ enabled: false });

      setupAlarmListener();

      const listener = mockChrome.alarms.onAlarm.addListener.mock.calls[0][0];
      await listener({ name: 'tabSwitcher' });

      expect(switchTab).not.toHaveBeenCalled();
      expect(updateBadge).not.toHaveBeenCalled();
    });
  });

  describe('setupAlarmListener() - Keep-Alive Alarm', () => {
    test('should handle keep-alive alarm', async () => {
      // Start an interval timer first
      await toggleHybridTimer(true, 10000, 5000);

      mockChrome.storage.local.get.mockResolvedValue({
        usingIntervalTimer: false,
      });

      setupAlarmListener();

      const listener = mockChrome.alarms.onAlarm.addListener.mock.calls[0][0];

      // Simulate keep-alive alarm
      await listener({ name: 'keepAlive' });

      // Should have checked storage for timer state
      expect(mockChrome.storage.local.get).toHaveBeenCalled();
    });

    test('should restore interval timer after service worker wake', async () => {
      const oldTime = Date.now() - 100000; // 100 seconds ago

      // Start timer first
      await toggleHybridTimer(true, 10000, 5000);

      mockChrome.storage.local.get.mockResolvedValue({
        usingIntervalTimer: true,
        enabled: true,
        intervalDelayMs: 10000,
        lastIntervalCheck: oldTime, // 100s > 10s * 2, should trigger restore
      });

      setupAlarmListener();

      const listener = mockChrome.alarms.onAlarm.addListener.mock.calls[0][0];
      await listener({ name: 'keepAlive' });

      // Should have restarted the interval timer
      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 10000);
      expect(logger.warn).toHaveBeenCalledWith(
        'TimingHybrid',
        'Service worker suspension detected, restoring interval timer',
        expect.objectContaining({
          expectedInterval: 10000,
        })
      );
    });

    test('should not restore if interval timer is running', async () => {
      const recentTime = Date.now() - 5000; // 5 seconds ago

      mockChrome.storage.local.get.mockResolvedValue({
        usingIntervalTimer: true,
        enabled: true,
        intervalDelayMs: 10000,
        lastIntervalCheck: recentTime, // 5s < 10s * 2, no restoration needed
      });

      setupAlarmListener();

      const listener = mockChrome.alarms.onAlarm.addListener.mock.calls[0][0];
      await listener({ name: 'keepAlive' });

      // Should NOT restart the interval timer
      expect(setIntervalSpy).not.toHaveBeenCalled();
    });

    test('should not restore if not using interval timer', async () => {
      mockChrome.storage.local.get.mockResolvedValue({
        usingIntervalTimer: false,
        enabled: true,
      });

      setupAlarmListener();

      const listener = mockChrome.alarms.onAlarm.addListener.mock.calls[0][0];
      await listener({ name: 'keepAlive' });

      expect(setIntervalSpy).not.toHaveBeenCalled();
    });

    test('should not restore if disabled', async () => {
      mockChrome.storage.local.get.mockResolvedValue({
        usingIntervalTimer: true,
        enabled: false,
        intervalDelayMs: 10000,
        lastIntervalCheck: Date.now() - 100000,
      });

      setupAlarmListener();

      const listener = mockChrome.alarms.onAlarm.addListener.mock.calls[0][0];
      await listener({ name: 'keepAlive' });

      expect(setIntervalSpy).not.toHaveBeenCalled();
    });

    test('should handle missing intervalDelayMs', async () => {
      mockChrome.storage.local.get.mockResolvedValue({
        usingIntervalTimer: true,
        enabled: true,
        // intervalDelayMs missing
        lastIntervalCheck: Date.now() - 100000,
      });

      setupAlarmListener();

      const listener = mockChrome.alarms.onAlarm.addListener.mock.calls[0][0];
      await listener({ name: 'keepAlive' });

      expect(setIntervalSpy).not.toHaveBeenCalled();
    });

    test('should calculate gap intervals correctly', async () => {
      const oldTime = Date.now() - 50000; // 50 seconds ago

      // Start timer first
      await toggleHybridTimer(true, 10000, 5000);

      mockChrome.storage.local.get.mockResolvedValue({
        usingIntervalTimer: true,
        enabled: true,
        intervalDelayMs: 10000, // 10 second intervals
        lastIntervalCheck: oldTime,
      });

      setupAlarmListener();

      const listener = mockChrome.alarms.onAlarm.addListener.mock.calls[0][0];
      await listener({ name: 'keepAlive' });

      expect(logger.warn).toHaveBeenCalledWith(
        'TimingHybrid',
        'Service worker suspension detected, restoring interval timer',
        expect.objectContaining({
          gapIntervals: 5, // 50s / 10s = 5 intervals
        })
      );
    });
  });

  describe('Edge Cases', () => {
    test('should handle very small delays', async () => {
      await toggleHybridTimer(true, 100, 5000); // 0.1 second, will be clamped to 5s

      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 5000);
    });

    test('should handle very large delays', async () => {
      await toggleHybridTimer(true, 3600000, 5000); // 1 hour

      expect(mockChrome.alarms.create).toHaveBeenCalledWith('tabSwitcher', {
        delayInMinutes: 60,
        periodInMinutes: 60,
      });
    });

    test('should handle default enabled value when getSettings returns undefined', async () => {
      (getSettings as jest.Mock).mockResolvedValue({});

      await toggleHybridTimer(true, 10000, 5000);

      const intervalCallback = setIntervalSpy.mock.calls[0][0];
      await intervalCallback();

      // Should use DEFAULT_ENABLED (false), so no switch
      expect(switchTab).not.toHaveBeenCalled();
    });

    test('should handle missing lastIntervalCheck in storage', async () => {
      mockChrome.storage.local.get.mockResolvedValue({
        usingIntervalTimer: true,
        enabled: true,
        intervalDelayMs: 10000,
        // lastIntervalCheck missing
      });

      setupAlarmListener();

      const listener = mockChrome.alarms.onAlarm.addListener.mock.calls[0][0];

      // Should not throw, should use Date.now() as fallback
      await expect(listener({ name: 'keepAlive' })).resolves.not.toThrow();
    });

    test('should handle alarm with unknown name', async () => {
      setupAlarmListener();

      const listener = mockChrome.alarms.onAlarm.addListener.mock.calls[0][0];

      // Should not throw or do anything
      await expect(listener({ name: 'unknownAlarm' })).resolves.not.toThrow();

      expect(switchTab).not.toHaveBeenCalled();
      expect(setIntervalSpy).not.toHaveBeenCalled();
    });
  });

  describe('Service Worker Resilience', () => {
    test('should persist interval timer state to storage', async () => {
      await toggleHybridTimer(true, 10000, 5000);

      expect(mockChrome.storage.local.set).toHaveBeenCalledWith(
        expect.objectContaining({
          usingIntervalTimer: true,
          intervalDelayMs: 10000,
          lastIntervalStart: expect.any(Number),
          lastIntervalCheck: expect.any(Number),
        })
      );
    });

    test('should detect service worker suspension (2x interval gap)', async () => {
      const intervalDelayMs = 10000;
      const gapTime = intervalDelayMs * 2.5; // More than 2x
      const oldTime = Date.now() - gapTime;

      // Start timer first
      await toggleHybridTimer(true, 10000, 5000);

      mockChrome.storage.local.get.mockResolvedValue({
        usingIntervalTimer: true,
        enabled: true,
        intervalDelayMs,
        lastIntervalCheck: oldTime,
      });

      setupAlarmListener();

      const listener = mockChrome.alarms.onAlarm.addListener.mock.calls[0][0];
      await listener({ name: 'keepAlive' });

      // Should detect suspension and restore
      expect(setIntervalSpy).toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith(
        'TimingHybrid',
        expect.stringContaining('Service worker suspension detected'),
        expect.any(Object)
      );
    });

    test('should not falsely detect suspension with normal gaps', async () => {
      const intervalDelayMs = 10000;
      const normalGapTime = intervalDelayMs * 1.5; // Less than 2x
      const recentTime = Date.now() - normalGapTime;

      mockChrome.storage.local.get.mockResolvedValue({
        usingIntervalTimer: true,
        enabled: true,
        intervalDelayMs,
        lastIntervalCheck: recentTime,
      });

      setupAlarmListener();

      const listener = mockChrome.alarms.onAlarm.addListener.mock.calls[0][0];
      await listener({ name: 'keepAlive' });

      // Should NOT restore
      expect(setIntervalSpy).not.toHaveBeenCalled();
      expect(logger.warn).not.toHaveBeenCalled();
    });
  });
});
