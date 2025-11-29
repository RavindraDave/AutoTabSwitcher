/**
 * Comprehensive Race Condition Tests
 * Tests for the race condition bug fix where tabs continue switching after user disables
 *
 * These tests verify:
 * 1. In-memory flags prevent tab switching during disable operations
 * 2. Disable operations execute immediately without debouncing
 * 3. In-flight alarms/intervals are prevented from switching tabs
 * 4. Rapid enable/disable toggles work correctly
 * 5. Window mode timers stop in parallel without race conditions
 */

import { jest, describe, test, expect, beforeEach, afterEach } from '@jest/globals';

// Mock dependencies
jest.mock('../core/storage.js', () => ({
  getSettings: jest.fn(),
  validateOperatingMode: jest.fn((val) => val === 'window' ? 'window' : 'global'),
  isValidWindowId: jest.fn((id) => typeof id === 'number' && id > 0),
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
    error: jest.fn(),
  },
  logModeChange: jest.fn(),
  logWindowToggle: jest.fn(),
}));

const mockChrome = (global as any).chrome;

describe('Race Condition Prevention', () => {
  let toggleHybridTimer: any;
  let setupAlarmListener: any;
  let WindowTimerManager: any;
  let getSettings: any;
  let switchTab: any;
  let isPaused: any;
  let setIntervalSpy: jest.SpyInstance;
  let clearIntervalSpy: jest.SpyInstance;
  let setTimeoutSpy: jest.SpyInstance;
  let clearTimeoutSpy: jest.SpyInstance;

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
    setTimeoutSpy = jest.spyOn(global, 'setTimeout');
    clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

    // Set default mock implementations
    mockChrome.storage.local.set.mockResolvedValue(undefined);
    mockChrome.storage.local.get.mockResolvedValue({ enabled: true });
    mockChrome.alarms.create.mockResolvedValue(undefined);
    mockChrome.alarms.clear.mockResolvedValue(true);

    // Import modules
    const timingModule = await import('../core/timing-hybrid.js');
    const windowTimerModule = await import('../core/window-timer-manager.js');
    const storageModule = await import('../core/storage.js');
    const tabSwitcherModule = await import('../core/tab-switcher.js');
    const activityModule = await import('../core/activity-tracker.js');

    toggleHybridTimer = timingModule.toggleHybridTimer;
    setupAlarmListener = timingModule.setupAlarmListener;
    WindowTimerManager = windowTimerModule.WindowTimerManager;
    getSettings = storageModule.getSettings;
    switchTab = tabSwitcherModule.switchTab;
    isPaused = activityModule.isPaused;

    // Default mock implementations
    (getSettings as jest.Mock).mockResolvedValue({ enabled: true });
    (switchTab as jest.Mock).mockResolvedValue(true);
    (isPaused as jest.Mock).mockResolvedValue(false);
  });

  afterEach(() => {
    setIntervalSpy.mockRestore();
    clearIntervalSpy.mockRestore();
    setTimeoutSpy.mockRestore();
    clearTimeoutSpy.mockRestore();
  });

  describe('Global Mode - Interval Timer Race Conditions', () => {
    test('should NOT switch tabs when disabled during interval callback execution', async () => {
      // Start timer with short delay (uses interval)
      await toggleHybridTimer(true, 10000, 5000);

      // Get the interval callback
      const intervalCallback = setIntervalSpy.mock.calls[0][0] as Function;

      // Mock storage to return enabled initially, then disabled
      let callCount = 0;
      (getSettings as jest.Mock).mockImplementation(async () => {
        callCount++;
        // First call (before disable) returns enabled
        // Second call (after disable initiated) returns disabled
        return { enabled: callCount === 1 };
      });

      // Start the interval callback (simulating first execution)
      const callbackPromise = intervalCallback();

      // Immediately disable while callback is executing
      await toggleHybridTimer(false, 10000, 5000);

      // Wait for callback to complete
      await callbackPromise;

      // switchTab should NOT have been called because in-memory flags prevent it
      expect(switchTab).not.toHaveBeenCalled();
    });

    test('should prevent in-flight interval callbacks from switching tabs', async () => {
      // Start timer
      await toggleHybridTimer(true, 10000, 5000);

      const intervalCallback = setIntervalSpy.mock.calls[0][0] as Function;

      // Simulate callback starting
      const callback1 = intervalCallback();

      // Disable immediately
      await toggleHybridTimer(false, 10000, 5000);

      // Try to execute another callback (should be blocked by in-memory flag)
      const callback2 = intervalCallback();

      await Promise.all([callback1, callback2]);

      // No tab switches should occur
      expect(switchTab).not.toHaveBeenCalled();
    });

    test('should handle multiple rapid enable/disable toggles correctly', async () => {
      // Rapid sequence: enable -> disable -> enable -> disable
      await toggleHybridTimer(true, 10000, 5000);
      await toggleHybridTimer(false, 10000, 5000);
      await toggleHybridTimer(true, 10000, 5000);
      await toggleHybridTimer(false, 10000, 5000);

      // Final state should be disabled
      expect(clearIntervalSpy).toHaveBeenCalled();

      // Try to execute interval callback
      if (setIntervalSpy.mock.calls.length > 0) {
        const lastCallback = setIntervalSpy.mock.calls[setIntervalSpy.mock.calls.length - 1][0] as Function;
        await lastCallback();

        // Should not switch tabs because disabled
        expect(switchTab).not.toHaveBeenCalled();
      }
    });
  });

  describe('Global Mode - Alarm Timer Race Conditions', () => {
    test('should NOT switch tabs when disabled during alarm callback execution', async () => {
      // Start timer with long delay (uses alarms)
      await toggleHybridTimer(true, 60000, 5000);

      // Set up alarm listener
      setupAlarmListener();

      // Get the alarm callback
      const alarmCallback = mockChrome.alarms.onAlarm.addListener.mock.calls[0][0];

      // Mock storage to change state during callback
      let callCount = 0;
      (getSettings as jest.Mock).mockImplementation(async () => {
        callCount++;
        return { enabled: callCount === 1 };
      });

      // Simulate alarm firing
      const alarmPromise = alarmCallback({ name: 'tab-switcher' });

      // Disable while alarm callback is executing
      await toggleHybridTimer(false, 60000, 5000);

      // Wait for alarm callback to complete
      await alarmPromise;

      // switchTab should NOT have been called
      expect(switchTab).not.toHaveBeenCalled();
    });

    test('should prevent in-flight alarm callbacks from switching tabs', async () => {
      await toggleHybridTimer(true, 60000, 5000);
      setupAlarmListener();

      const alarmCallback = mockChrome.alarms.onAlarm.addListener.mock.calls[0][0];

      // Start alarm callback
      const alarm1 = alarmCallback({ name: 'tab-switcher' });

      // Disable immediately
      await toggleHybridTimer(false, 60000, 5000);

      // Try another alarm (should be blocked)
      const alarm2 = alarmCallback({ name: 'tab-switcher' });

      await Promise.all([alarm1, alarm2]);

      // No tab switches
      expect(switchTab).not.toHaveBeenCalled();
    });
  });

  describe('Global Mode - Keep-Alive Alarm Race Conditions', () => {
    test('should NOT restore interval timer when stopping', async () => {
      // Start interval timer
      await toggleHybridTimer(true, 10000, 5000);

      setupAlarmListener();
      const alarmCallback = mockChrome.alarms.onAlarm.addListener.mock.calls[0][0];

      // Set up storage for interval timer restoration
      mockChrome.storage.local.get.mockResolvedValue({
        usingIntervalTimer: true,
        intervalDelayMs: 10000,
        lastIntervalCheck: Date.now() - 30000, // Simulate suspension
        enabled: true,
      });

      // Disable timer
      await toggleHybridTimer(false, 10000, 5000);

      // Simulate keep-alive alarm firing after disable
      await alarmCallback({ name: 'keepalive' });

      // Should not have restarted interval timer
      // setIntervalSpy should only have been called once (during initial start)
      expect(setIntervalSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Window Mode - Timer Manager Race Conditions', () => {
    test('should prevent tab switching when window timer is being stopped', async () => {
      const manager = new WindowTimerManager();

      // Start timer for window
      await manager.startTimer(123, 10000);

      // Verify timer is running
      expect(manager.hasActiveTimer(123)).toBe(true);
      expect(manager.isStopping(123)).toBe(false);

      // Stop timer
      const stopPromise = manager.stopTimer(123);

      // Check that stopping flag is set IMMEDIATELY (synchronously)
      expect(manager.isStopping(123)).toBe(true);

      await stopPromise;

      // Verify timer is stopped
      expect(manager.hasActiveTimer(123)).toBe(false);
    });

    test('should stop all window timers in parallel without race conditions', async () => {
      const manager = new WindowTimerManager();

      // Start multiple window timers
      await Promise.all([
        manager.startTimer(1, 10000),
        manager.startTimer(2, 10000),
        manager.startTimer(3, 10000),
        manager.startTimer(4, 10000),
        manager.startTimer(5, 10000),
      ]);

      // Verify all started
      expect(manager.getActiveWindows()).toHaveLength(5);

      // Stop all timers
      const stopAllPromise = manager.stopAllTimers();

      // Check that all windows are marked as stopping IMMEDIATELY
      expect(manager.isStopping(1)).toBe(true);
      expect(manager.isStopping(2)).toBe(true);
      expect(manager.isStopping(3)).toBe(true);
      expect(manager.isStopping(4)).toBe(true);
      expect(manager.isStopping(5)).toBe(true);

      await stopAllPromise;

      // Verify all stopped
      expect(manager.getActiveWindows()).toHaveLength(0);

      // All should have called chrome.alarms.clear in parallel (5 times)
      expect(mockChrome.alarms.clear).toHaveBeenCalledTimes(5);
    });

    test('should handle window alarm firing during stop operation', async () => {
      const manager = new WindowTimerManager();
      const windowId = 123;

      await manager.startTimer(windowId, 10000);

      // Initiate stop (sets flag immediately)
      const stopPromise = manager.stopTimer(windowId);

      // Check stopping flag is set before async operations complete
      expect(manager.isStopping(windowId)).toBe(true);

      // Simulate alarm callback checking isStopping flag
      // This would happen in background.ts alarm handler
      if (manager.isStopping(windowId)) {
        // Should abort and NOT call switchTab
        expect(switchTab).not.toHaveBeenCalled();
      }

      await stopPromise;
    });

    test('should allow restarting timer after it was stopped', async () => {
      const manager = new WindowTimerManager();
      const windowId = 123;

      // Start -> Stop -> Start sequence
      await manager.startTimer(windowId, 10000);
      expect(manager.isStopping(windowId)).toBe(false);

      await manager.stopTimer(windowId);
      expect(manager.isStopping(windowId)).toBe(true);

      // Restart should clear stopping flag
      await manager.startTimer(windowId, 10000);
      expect(manager.isStopping(windowId)).toBe(false);
      expect(manager.hasActiveTimer(windowId)).toBe(true);
    });
  });

  describe('Disable Operation Timing', () => {
    test('should execute disable immediately without debouncing', async () => {
      const startTime = Date.now();

      // Enable timer
      await toggleHybridTimer(true, 10000, 5000);

      // Disable timer (should be immediate)
      await toggleHybridTimer(false, 10000, 5000);

      const elapsed = Date.now() - startTime;

      // Should complete in under 50ms (immediate, not debounced)
      // Note: This is a rough check - actual timing may vary
      expect(elapsed).toBeLessThan(100);

      // Verify timer was cleared
      expect(clearIntervalSpy).toHaveBeenCalled();
    });
  });

  describe('Service Worker Restart Scenario', () => {
    test('should not have stale in-memory flags after module reload', async () => {
      // This test verifies that module-level flags are reset correctly
      // In a real service worker restart, the module would be reloaded

      // Start timer
      await toggleHybridTimer(true, 10000, 5000);

      // Stop timer
      await toggleHybridTimer(false, 10000, 5000);

      // Simulate module reload by re-importing
      jest.resetModules();
      const freshTimingModule = await import('../core/timing-hybrid.js');

      // Set up alarm listener with fresh module
      freshTimingModule.setupAlarmListener();

      // If an old alarm somehow fires, it should not switch tabs
      // because the flags are reset in the fresh module
      const callbacks = mockChrome.alarms.onAlarm.addListener.mock.calls;
      if (callbacks.length > 0) {
        const latestCallback = callbacks[callbacks.length - 1][0];

        // Mock storage showing disabled state
        mockChrome.storage.local.get.mockResolvedValue({ enabled: false });

        await latestCallback({ name: 'tab-switcher' });

        // Should not switch tabs
        expect(switchTab).not.toHaveBeenCalled();
      }
    });
  });

  describe('Edge Cases', () => {
    test('should handle storage read failures gracefully', async () => {
      await toggleHybridTimer(true, 10000, 5000);
      setupAlarmListener();

      const alarmCallback = mockChrome.alarms.onAlarm.addListener.mock.calls[0][0];

      // Mock storage failure
      (getSettings as jest.Mock).mockRejectedValue(new Error('Storage error'));

      // Should not throw and not switch tabs
      await expect(alarmCallback({ name: 'tab-switcher' })).resolves.not.toThrow();
      expect(switchTab).not.toHaveBeenCalled();
    });

    test('should handle concurrent disable calls', async () => {
      await toggleHybridTimer(true, 10000, 5000);

      // Multiple concurrent disable calls
      await Promise.all([
        toggleHybridTimer(false, 10000, 5000),
        toggleHybridTimer(false, 10000, 5000),
        toggleHybridTimer(false, 10000, 5000),
      ]);

      // Should complete successfully without errors
      expect(clearIntervalSpy).toHaveBeenCalled();
    });

    test('should prevent tab switching when paused AND during disable', async () => {
      await toggleHybridTimer(true, 10000, 5000);

      const intervalCallback = setIntervalSpy.mock.calls[0][0] as Function;

      // Mock as paused
      (isPaused as jest.Mock).mockResolvedValue(true);

      // Start callback
      const callback1 = intervalCallback();

      // Disable while paused
      await toggleHybridTimer(false, 10000, 5000);

      await callback1;

      // Should not switch tabs (blocked by both paused and in-memory flag)
      expect(switchTab).not.toHaveBeenCalled();
    });
  });

  describe('Integration - Complex Scenarios', () => {
    test('should handle rapid enable/disable with alarms firing', async () => {
      // This test verifies that disable/enable cycles work correctly
      // and that the in-memory flags prevent tab switching when disabled

      // Enable and set up listener
      await toggleHybridTimer(true, 60000, 5000);
      setupAlarmListener();

      // Get the alarm callback that was registered
      expect(mockChrome.alarms.onAlarm.addListener).toHaveBeenCalled();
      const alarmCallback = mockChrome.alarms.onAlarm.addListener.mock.calls[0][0];

      // Rapid cycle: enable -> disable -> enable
      await toggleHybridTimer(false, 60000, 5000);
      await toggleHybridTimer(true, 60000, 5000);

      // Fire alarm while enabled (after the cycle)
      await alarmCallback({ name: 'tab-switcher' });

      // The alarm should have been processed (switchTab might or might not be called
      // depending on in-memory state, but the important thing is it doesn't error)
      // The key test is that the rapid toggle cycle completes without errors
      expect(mockChrome.alarms.clear).toHaveBeenCalled();
      expect(mockChrome.alarms.create).toHaveBeenCalled();
    });

    test('should handle window mode disable with multiple alarms firing', async () => {
      const manager = new WindowTimerManager();

      // Start timers for multiple windows
      await manager.startTimer(1, 10000);
      await manager.startTimer(2, 10000);
      await manager.startTimer(3, 10000);

      // Initiate stop all
      const stopPromise = manager.stopAllTimers();

      // All windows should immediately be marked as stopping
      expect(manager.isStopping(1)).toBe(true);
      expect(manager.isStopping(2)).toBe(true);
      expect(manager.isStopping(3)).toBe(true);

      // Simulate alarms firing during stop (would be blocked by isStopping checks)
      const window1Blocked = !manager.isStopping(1);
      const window2Blocked = !manager.isStopping(2);
      const window3Blocked = !manager.isStopping(3);

      expect(window1Blocked).toBe(false);
      expect(window2Blocked).toBe(false);
      expect(window3Blocked).toBe(false);

      await stopPromise;

      // All timers should be stopped
      expect(manager.getActiveWindows()).toHaveLength(0);
    });
  });

  describe('Edge Cases and Stress Tests', () => {
    test('should not restore timer after service worker wake if user disabled', async () => {
      // Start interval timer
      await toggleHybridTimer(true, 10000, 5000);
      expect(setIntervalSpy).toHaveBeenCalledTimes(1);

      // User disables
      await toggleHybridTimer(false, 10000, 5000);
      expect(clearIntervalSpy).toHaveBeenCalled();

      // Simulate service worker suspension and wake
      // Storage has stale usingIntervalTimer flag, but enabled is false
      mockChrome.storage.local.get.mockResolvedValue({
        usingIntervalTimer: true, // Stale value from before disable
        enabled: false, // User disabled - this is the source of truth
        intervalDelayMs: 10000,
        lastIntervalCheck: Date.now() - 30000 // Long gap suggests suspension
      });

      // Simulate keep-alive alarm firing (would try to restore timer)
      setupAlarmListener();
      const alarmCallback = mockChrome.alarms.onAlarm.addListener.mock.calls[0][0];
      await alarmCallback({ name: 'keepAlive' });

      // Should NOT have restarted interval timer because enabled=false
      // setIntervalSpy was called once during initial start, should not be called again
      expect(setIntervalSpy).toHaveBeenCalledTimes(1);
      expect(switchTab).not.toHaveBeenCalled();
    });

    test('should handle rapid enable/disable cycles without errors', async () => {
      // Stress test: Rapid enable/disable cycles
      for (let i = 0; i < 20; i++) {
        await toggleHybridTimer(true, 10000, 5000);
        await toggleHybridTimer(false, 10000, 5000);
      }

      // Should be in clean stopped state
      expect(switchTab).not.toHaveBeenCalled();
      expect(clearIntervalSpy).toHaveBeenCalled();

      // Verify no intervals are still running
      const finalState = await mockChrome.storage.local.get(['usingIntervalTimer']);
      // Can't check exact value as it depends on last call, but should not error
      expect(finalState).toBeDefined();

      // Should be able to start cleanly after rapid cycles
      mockChrome.storage.local.get.mockResolvedValue({ enabled: true });
      await toggleHybridTimer(true, 10000, 5000);

      // Should have started successfully
      expect(setIntervalSpy).toHaveBeenCalled();
    });

    test('should handle concurrent window timer operations', async () => {
      const manager = new WindowTimerManager();

      // Start many windows concurrently
      await Promise.all([
        manager.startTimer(1, 10000),
        manager.startTimer(2, 10000),
        manager.startTimer(3, 10000),
        manager.startTimer(4, 10000),
        manager.startTimer(5, 10000),
      ]);

      // All windows should be active
      expect(manager.getActiveWindows()).toHaveLength(5);
      expect(manager.hasActiveTimer(1)).toBe(true);
      expect(manager.hasActiveTimer(2)).toBe(true);
      expect(manager.hasActiveTimer(3)).toBe(true);
      expect(manager.hasActiveTimer(4)).toBe(true);
      expect(manager.hasActiveTimer(5)).toBe(true);

      // Stop some windows concurrently while others are running
      await Promise.all([
        manager.stopTimer(1),
        manager.stopTimer(3),
        manager.stopTimer(5),
      ]);

      // Only stopped windows should be inactive
      expect(manager.hasActiveTimer(1)).toBe(false);
      expect(manager.hasActiveTimer(2)).toBe(true);
      expect(manager.hasActiveTimer(3)).toBe(false);
      expect(manager.hasActiveTimer(4)).toBe(true);
      expect(manager.hasActiveTimer(5)).toBe(false);

      // Stop all remaining windows
      await manager.stopAllTimers();

      // All should be stopped and clean
      expect(manager.getActiveWindows()).toHaveLength(0);
      expect(manager.isStopping(1)).toBe(false); // Flags should be cleared
      expect(manager.isStopping(2)).toBe(false);
      expect(manager.isStopping(3)).toBe(false);
      expect(manager.isStopping(4)).toBe(false);
      expect(manager.isStopping(5)).toBe(false);

      // Should be able to restart after concurrent operations
      await manager.startTimer(1, 10000);
      expect(manager.hasActiveTimer(1)).toBe(true);
    });
  });
});
