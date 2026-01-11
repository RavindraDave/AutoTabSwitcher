/**
 * Comprehensive tests for manual-pause-tracker.ts
 * Tests manual pause state management, toggle behavior, and mode-specific logic
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

describe('Manual Pause Tracker', () => {
  let isManuallyPaused: any;
  let toggleManualPause: any;
  let setManualPause: any;
  let clearManualPause: any;
  let logger: any;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Reset chrome mocks
    mockChrome.storage.local.get.mockReset();
    mockChrome.storage.local.set.mockReset();
    mockChrome.windows.getCurrent.mockReset();

    // Default mock for storage.get
    mockChrome.storage.local.get.mockResolvedValue({});
    mockChrome.storage.local.set.mockResolvedValue(undefined);
    mockChrome.windows.getCurrent.mockResolvedValue({ id: 1 });

    // Reset module by clearing cache and reimporting
    jest.resetModules();

    // Import logger mock after reset
    const loggerModule = await import('../core/logger.js');
    logger = loggerModule.logger;

    const manualPauseModule = await import('../core/manual-pause-tracker.js');
    isManuallyPaused = manualPauseModule.isManuallyPaused;
    toggleManualPause = manualPauseModule.toggleManualPause;
    setManualPause = manualPauseModule.setManualPause;
    clearManualPause = manualPauseModule.clearManualPause;
  });

  describe('isManuallyPaused() - Global Mode', () => {
    test('should return false when not paused in global mode', async () => {
      mockChrome.storage.local.get.mockResolvedValue({
        switchingMode: 'global',
        manuallyPaused: false,
      });

      const paused = await isManuallyPaused();

      expect(paused).toBe(false);
    });

    test('should return true when paused in global mode', async () => {
      mockChrome.storage.local.get.mockResolvedValue({
        switchingMode: 'global',
        manuallyPaused: true,
      });

      const paused = await isManuallyPaused();

      expect(paused).toBe(true);
    });

    test('should default to false when manuallyPaused is undefined', async () => {
      mockChrome.storage.local.get.mockResolvedValue({
        switchingMode: 'global',
      });

      const paused = await isManuallyPaused();

      expect(paused).toBe(false);
    });

    test('should use global mode when switchingMode is undefined', async () => {
      mockChrome.storage.local.get.mockResolvedValue({
        manuallyPaused: true,
      });

      const paused = await isManuallyPaused();

      expect(paused).toBe(true);
    });
  });

  describe('isManuallyPaused() - Window Mode', () => {
    test('should return false when window is not paused', async () => {
      mockChrome.storage.local.get.mockResolvedValue({
        switchingMode: 'window',
        manuallyPausedWindows: {
          1: false,
          2: true,
        },
      });

      const paused = await isManuallyPaused(1);

      expect(paused).toBe(false);
    });

    test('should return true when window is paused', async () => {
      mockChrome.storage.local.get.mockResolvedValue({
        switchingMode: 'window',
        manuallyPausedWindows: {
          1: true,
          2: false,
        },
      });

      const paused = await isManuallyPaused(1);

      expect(paused).toBe(true);
    });

    test('should return false for undefined window', async () => {
      mockChrome.storage.local.get.mockResolvedValue({
        switchingMode: 'window',
        manuallyPausedWindows: {
          1: true,
        },
      });

      const paused = await isManuallyPaused(99);

      expect(paused).toBe(false);
    });

    test('should default to false when manuallyPausedWindows is undefined', async () => {
      mockChrome.storage.local.get.mockResolvedValue({
        switchingMode: 'window',
      });

      const paused = await isManuallyPaused(1);

      expect(paused).toBe(false);
    });

    test('should use global state when windowId is not provided in window mode', async () => {
      mockChrome.storage.local.get.mockResolvedValue({
        switchingMode: 'window',
        manuallyPaused: true,
        manuallyPausedWindows: {
          1: false,
        },
      });

      const paused = await isManuallyPaused();

      expect(paused).toBe(true);
    });
  });

  describe('toggleManualPause() - Global Mode', () => {
    test('should toggle from false to true in global mode', async () => {
      mockChrome.storage.local.get.mockResolvedValue({
        switchingMode: 'global',
        manuallyPaused: false,
      });

      const newState = await toggleManualPause();

      expect(newState).toBe(true);
      expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
        manuallyPaused: true,
      });
      expect(logger.info).toHaveBeenCalledWith(
        'ManualPauseTracker',
        'Manual pause toggled globally',
        { paused: true }
      );
    });

    test('should toggle from true to false in global mode', async () => {
      mockChrome.storage.local.get.mockResolvedValue({
        switchingMode: 'global',
        manuallyPaused: true,
      });

      const newState = await toggleManualPause();

      expect(newState).toBe(false);
      expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
        manuallyPaused: false,
      });
      expect(logger.info).toHaveBeenCalledWith(
        'ManualPauseTracker',
        'Manual pause toggled globally',
        { paused: false }
      );
    });

    test('should default to false when undefined, then toggle to true', async () => {
      mockChrome.storage.local.get.mockResolvedValue({
        switchingMode: 'global',
      });

      const newState = await toggleManualPause();

      expect(newState).toBe(true);
      expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
        manuallyPaused: true,
      });
    });
  });

  describe('toggleManualPause() - Window Mode', () => {
    test('should toggle current window from false to true', async () => {
      mockChrome.windows.getCurrent.mockResolvedValue({ id: 5 });
      mockChrome.storage.local.get.mockResolvedValue({
        switchingMode: 'window',
        manuallyPausedWindows: {
          5: false,
        },
      });

      const newState = await toggleManualPause();

      expect(newState).toBe(true);
      expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
        manuallyPausedWindows: {
          5: true,
        },
      });
      expect(logger.info).toHaveBeenCalledWith(
        'ManualPauseTracker',
        'Manual pause toggled for window',
        { windowId: 5, paused: true }
      );
    });

    test('should toggle current window from true to false', async () => {
      mockChrome.windows.getCurrent.mockResolvedValue({ id: 3 });
      mockChrome.storage.local.get.mockResolvedValue({
        switchingMode: 'window',
        manuallyPausedWindows: {
          3: true,
        },
      });

      const newState = await toggleManualPause();

      expect(newState).toBe(false);
      expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
        manuallyPausedWindows: {
          3: false,
        },
      });
    });

    test('should initialize window state to true when undefined', async () => {
      mockChrome.windows.getCurrent.mockResolvedValue({ id: 7 });
      mockChrome.storage.local.get.mockResolvedValue({
        switchingMode: 'window',
        manuallyPausedWindows: {},
      });

      const newState = await toggleManualPause();

      expect(newState).toBe(true);
      expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
        manuallyPausedWindows: {
          7: true,
        },
      });
    });

    test('should preserve other window states when toggling', async () => {
      mockChrome.windows.getCurrent.mockResolvedValue({ id: 2 });
      mockChrome.storage.local.get.mockResolvedValue({
        switchingMode: 'window',
        manuallyPausedWindows: {
          1: true,
          2: false,
          3: true,
        },
      });

      await toggleManualPause();

      expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
        manuallyPausedWindows: {
          1: true,
          2: true,
          3: true,
        },
      });
    });

    test('should handle missing current window gracefully', async () => {
      mockChrome.windows.getCurrent.mockResolvedValue({});
      mockChrome.storage.local.get.mockResolvedValue({
        switchingMode: 'window',
      });

      const newState = await toggleManualPause();

      expect(newState).toBe(false);
      expect(logger.warn).toHaveBeenCalledWith(
        'ManualPauseTracker',
        'Cannot toggle pause: no current window'
      );
      expect(mockChrome.storage.local.set).not.toHaveBeenCalled();
    });
  });

  describe('setManualPause() - Global Mode', () => {
    test('should set pause to true in global mode', async () => {
      mockChrome.storage.local.get.mockResolvedValue({
        switchingMode: 'global',
      });

      await setManualPause(true);

      expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
        manuallyPaused: true,
      });
      expect(logger.info).toHaveBeenCalledWith(
        'ManualPauseTracker',
        'Manual pause set globally',
        { paused: true }
      );
    });

    test('should set pause to false in global mode', async () => {
      mockChrome.storage.local.get.mockResolvedValue({
        switchingMode: 'global',
      });

      await setManualPause(false);

      expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
        manuallyPaused: false,
      });
      expect(logger.info).toHaveBeenCalledWith(
        'ManualPauseTracker',
        'Manual pause set globally',
        { paused: false }
      );
    });
  });

  describe('setManualPause() - Window Mode', () => {
    test('should set pause for specific window', async () => {
      mockChrome.storage.local.get.mockResolvedValue({
        switchingMode: 'window',
        manuallyPausedWindows: {
          1: false,
        },
      });

      await setManualPause(true, 1);

      expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
        manuallyPausedWindows: {
          1: true,
        },
      });
      expect(logger.info).toHaveBeenCalledWith(
        'ManualPauseTracker',
        'Manual pause set for window',
        { windowId: 1, paused: true }
      );
    });

    test('should preserve other window states', async () => {
      mockChrome.storage.local.get.mockResolvedValue({
        switchingMode: 'window',
        manuallyPausedWindows: {
          1: true,
          2: false,
        },
      });

      await setManualPause(true, 2);

      expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
        manuallyPausedWindows: {
          1: true,
          2: true,
        },
      });
    });

    test('should use global mode when windowId not provided', async () => {
      mockChrome.storage.local.get.mockResolvedValue({
        switchingMode: 'window',
      });

      await setManualPause(true);

      expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
        manuallyPaused: true,
      });
    });
  });

  describe('clearManualPause()', () => {
    test('should clear all pause states', async () => {
      await clearManualPause();

      expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
        manuallyPaused: false,
        manuallyPausedWindows: {},
      });
      expect(logger.info).toHaveBeenCalledWith(
        'ManualPauseTracker',
        'Manual pause states cleared'
      );
    });

    test('should be idempotent when called multiple times', async () => {
      await clearManualPause();
      await clearManualPause();

      expect(mockChrome.storage.local.set).toHaveBeenCalledTimes(2);
      expect(mockChrome.storage.local.set).toHaveBeenNthCalledWith(1, {
        manuallyPaused: false,
        manuallyPausedWindows: {},
      });
      expect(mockChrome.storage.local.set).toHaveBeenNthCalledWith(2, {
        manuallyPaused: false,
        manuallyPausedWindows: {},
      });
    });
  });

  describe('Edge Cases', () => {
    test('should handle storage errors gracefully in isManuallyPaused', async () => {
      mockChrome.storage.local.get.mockRejectedValue(new Error('Storage error'));

      await expect(isManuallyPaused()).rejects.toThrow('Storage error');
    });

    test('should handle multiple concurrent toggles', async () => {
      mockChrome.storage.local.get.mockResolvedValue({
        switchingMode: 'global',
        manuallyPaused: false,
      });

      const results = await Promise.all([
        toggleManualPause(),
        toggleManualPause(),
        toggleManualPause(),
      ]);

      // All should return true (from false to true)
      expect(results).toEqual([true, true, true]);
    });

    test('should handle window mode with empty manuallyPausedWindows', async () => {
      mockChrome.storage.local.get.mockResolvedValue({
        switchingMode: 'window',
        manuallyPausedWindows: {},
      });

      const paused = await isManuallyPaused(1);

      expect(paused).toBe(false);
    });

    test('should handle null windowId', async () => {
      mockChrome.storage.local.get.mockResolvedValue({
        switchingMode: 'window',
        manuallyPausedWindows: {
          1: true,
        },
      });

      const paused = await isManuallyPaused(null as any);

      // Should fall back to global mode when windowId is invalid
      expect(paused).toBe(false);
    });
  });

  describe('Integration Scenarios', () => {
    test('should support switching between global and window modes', async () => {
      // Start in global mode, pause globally
      mockChrome.storage.local.get.mockResolvedValue({
        switchingMode: 'global',
        manuallyPaused: true,
      });

      let paused = await isManuallyPaused();
      expect(paused).toBe(true);

      // Switch to window mode
      mockChrome.storage.local.get.mockResolvedValue({
        switchingMode: 'window',
        manuallyPaused: true, // Global state still there
        manuallyPausedWindows: {},
      });

      // Window 1 should not be paused (uses window-specific state)
      paused = await isManuallyPaused(1);
      expect(paused).toBe(false);
    });

    test('should handle rapid pause/unpause cycles', async () => {
      let currentState = false;

      for (let i = 0; i < 10; i++) {
        mockChrome.storage.local.get.mockResolvedValue({
          switchingMode: 'global',
          manuallyPaused: currentState,
        });

        const newState = await toggleManualPause();
        expect(newState).toBe(!currentState);
        currentState = newState;
      }

      expect(currentState).toBe(false); // Should be back to false after 10 toggles
    });
  });
});
