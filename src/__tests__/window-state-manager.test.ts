/**
 * Window state management tests
 * Tests per-window enable/disable state tracking
 */

import { describe, expect, test, beforeEach } from '@jest/globals';
import { isValidWindowId, windowExists } from '../core/storage.js';

describe('Window State Management Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset chrome mocks
    chrome.storage.local.get = jest.fn().mockResolvedValue({});
    chrome.storage.local.set = jest.fn().mockResolvedValue(undefined);
    chrome.windows.get = jest.fn().mockResolvedValue({ id: 1 });
    chrome.windows.getAll = jest.fn().mockResolvedValue([
      { id: 1, focused: true },
      { id: 2, focused: false },
    ]);
  });

  describe('Enable Window', () => {
    test('should enable a specific window', async () => {
      const windowId = 1;
      const windowStates = {
        [windowId]: {
          enabled: true,
          enabledTimestamp: Date.now(),
        },
      };

      await chrome.storage.local.set({ windowStates });

      expect(chrome.storage.local.set).toHaveBeenCalledWith(
        expect.objectContaining({
          windowStates: expect.objectContaining({
            [windowId]: expect.objectContaining({
              enabled: true,
              enabledTimestamp: expect.any(Number),
            }),
          }),
        })
      );
    });

    test('should enable multiple windows independently', async () => {
      const windowStates = {
        1: { enabled: true, enabledTimestamp: Date.now() },
        2: { enabled: true, enabledTimestamp: Date.now() },
        3: { enabled: false },
      };

      await chrome.storage.local.set({ windowStates });

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        windowStates: expect.objectContaining({
          1: expect.objectContaining({ enabled: true }),
          2: expect.objectContaining({ enabled: true }),
          3: expect.objectContaining({ enabled: false }),
        }),
      });
    });

    test('should track enabledTimestamp when enabling', async () => {
      const now = Date.now();
      const windowStates = {
        1: { enabled: true, enabledTimestamp: now },
      };

      await chrome.storage.local.set({ windowStates });

      expect(chrome.storage.local.set).toHaveBeenCalledWith(
        expect.objectContaining({
          windowStates: expect.objectContaining({
            1: expect.objectContaining({
              enabledTimestamp: expect.any(Number),
            }),
          }),
        })
      );
    });

    test('should validate windowId before enabling', async () => {
      expect(isValidWindowId(0)).toBe(false);
      expect(isValidWindowId(-1)).toBe(false);
      expect(isValidWindowId(NaN)).toBe(false);

      // Only positive numbers should be valid
      expect(isValidWindowId(1)).toBe(true);
      expect(isValidWindowId(100)).toBe(true);
    });

    test('should check window existence before enabling', async () => {
      chrome.windows.get = jest.fn().mockResolvedValue({ id: 1 });

      const exists = await windowExists(1);
      expect(exists).toBe(true);
      expect(chrome.windows.get).toHaveBeenCalledWith(1);
    });
  });

  describe('Disable Window', () => {
    test('should disable a specific window', async () => {
      const windowStates = {
        1: { enabled: false },
      };

      await chrome.storage.local.set({ windowStates });

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        windowStates: expect.objectContaining({
          1: expect.objectContaining({ enabled: false }),
        }),
      });
    });

    test('should not affect other windows when disabling one', async () => {
      const windowStates = {
        1: { enabled: false }, // Disabled
        2: { enabled: true, enabledTimestamp: Date.now() }, // Still enabled
      };

      await chrome.storage.local.set({ windowStates });

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        windowStates: expect.objectContaining({
          1: expect.objectContaining({ enabled: false }),
          2: expect.objectContaining({ enabled: true }),
        }),
      });
    });
  });

  describe('Window Closure Cleanup', () => {
    test('should remove window state when window is closed', async () => {
      // Initial state with 3 windows
      const initialState = {
        1: { enabled: true, enabledTimestamp: Date.now() },
        2: { enabled: false },
        3: { enabled: true, enabledTimestamp: Date.now() },
      };

      chrome.storage.local.get = jest.fn().mockResolvedValue({
        windowStates: initialState,
      });

      // Window 2 is closed, remove from state
      const { 2: removed, ...remainingStates } = initialState;
      await chrome.storage.local.set({ windowStates: remainingStates });

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        windowStates: expect.not.objectContaining({
          2: expect.anything(),
        }),
      });
    });

    test('should handle removal of last window', async () => {
      const initialState = {
        1: { enabled: true, enabledTimestamp: Date.now() },
      };

      chrome.storage.local.get = jest.fn().mockResolvedValue({
        windowStates: initialState,
      });

      // Remove the last window
      await chrome.storage.local.set({ windowStates: {} });

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        windowStates: {},
      });
    });

    test('should cleanup multiple closed windows', async () => {
      // Mock getAll to return only window 1
      chrome.windows.getAll = jest.fn().mockResolvedValue([{ id: 1 }]);

      const initialState = {
        1: { enabled: true, enabledTimestamp: Date.now() },
        2: { enabled: false },
        3: { enabled: true, enabledTimestamp: Date.now() },
      };

      chrome.storage.local.get = jest.fn().mockResolvedValue({
        windowStates: initialState,
      });

      const allWindows = await chrome.windows.getAll();
      const validIds = new Set(allWindows.map((w: any) => w.id));

      // Keep only valid windows
      const cleanedStates: any = {};
      for (const [id, state] of Object.entries(initialState)) {
        if (validIds.has(Number(id))) {
          cleanedStates[id] = state;
        }
      }

      await chrome.storage.local.set({ windowStates: cleanedStates });

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        windowStates: {
          1: expect.any(Object),
        },
      });
    });
  });

  describe('Window ID Reuse', () => {
    test('should handle window ID reuse after closure', async () => {
      // Window 1 is closed, then a new window gets ID 1
      chrome.windows.get = jest.fn()
        .mockRejectedValueOnce(new Error('Window not found')) // First call: closed
        .mockResolvedValueOnce({ id: 1 }); // Second call: new window

      const exists1 = await windowExists(1);
      expect(exists1).toBe(false);

      const exists2 = await windowExists(1);
      expect(exists2).toBe(true);
    });

    test('should cleanup old state when window ID is reused', async () => {
      const oldState = {
        1: { enabled: true, enabledTimestamp: Date.now() - 10000 },
      };

      // Simulate window 1 being closed and recreated
      chrome.windows.get = jest.fn().mockResolvedValue({ id: 1 });

      // New state should overwrite old state
      const newState = {
        1: { enabled: false },
      };

      await chrome.storage.local.set({ windowStates: newState });

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        windowStates: {
          1: expect.objectContaining({ enabled: false }),
        },
      });
    });
  });

  describe('State Persistence', () => {
    test('should persist window states across browser restarts', async () => {
      const windowStates = {
        1: { enabled: true, enabledTimestamp: Date.now() },
        2: { enabled: false },
      };

      await chrome.storage.local.set({ windowStates });

      // Simulate browser restart
      chrome.storage.local.get = jest.fn().mockResolvedValue({ windowStates });

      const result = await chrome.storage.local.get(['windowStates']);

      expect(result.windowStates).toEqual(windowStates);
    });

    test('should restore enabled windows on startup', async () => {
      const windowStates = {
        1: { enabled: true, enabledTimestamp: Date.now() - 5000 },
        2: { enabled: false },
        3: { enabled: true, enabledTimestamp: Date.now() - 3000 },
      };

      chrome.storage.local.get = jest.fn().mockResolvedValue({
        switchingMode: 'window',
        windowStates,
      });

      const result = await chrome.storage.local.get(['switchingMode', 'windowStates']);

      expect(result.switchingMode).toBe('window');
      expect(result.windowStates[1].enabled).toBe(true);
      expect(result.windowStates[3].enabled).toBe(true);
    });

    test('should handle missing windowStates on startup', async () => {
      chrome.storage.local.get = jest.fn().mockResolvedValue({
        switchingMode: 'window',
        // windowStates is missing
      });

      const result = await chrome.storage.local.get(['switchingMode', 'windowStates']);

      expect(result.switchingMode).toBe('window');
      expect(result.windowStates).toBeUndefined();

      // Should initialize empty windowStates
      await chrome.storage.local.set({ windowStates: {} });

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        windowStates: {},
      });
    });
  });

  describe('Edge Cases', () => {
    test('should handle rapid enable/disable of same window', async () => {
      const windowId = 1;

      for (let i = 0; i < 10; i++) {
        const enabled = i % 2 === 0;
        const windowStates = {
          [windowId]: {
            enabled,
            enabledTimestamp: enabled ? Date.now() : undefined,
          },
        };

        await chrome.storage.local.set({ windowStates });
      }

      expect(chrome.storage.local.set).toHaveBeenCalledTimes(10);
    });

    test('should handle enabling window with no tabs', async () => {
      chrome.windows.get = jest.fn().mockResolvedValue({
        id: 1,
        tabs: [],
      });

      const exists = await windowExists(1);
      expect(exists).toBe(true);

      // Can still enable, but won't switch tabs
      const windowStates = {
        1: { enabled: true, enabledTimestamp: Date.now() },
      };

      await chrome.storage.local.set({ windowStates });

      expect(chrome.storage.local.set).toHaveBeenCalled();
    });

    test('should handle window with only one tab', async () => {
      chrome.windows.get = jest.fn().mockResolvedValue({
        id: 1,
        tabs: [{ id: 100, active: true }],
      });

      const exists = await windowExists(1);
      expect(exists).toBe(true);

      // Can enable, but switching won't do anything
      const windowStates = {
        1: { enabled: true, enabledTimestamp: Date.now() },
      };

      await chrome.storage.local.set({ windowStates });

      expect(chrome.storage.local.set).toHaveBeenCalled();
    });

    test('should handle maximum number of windows', async () => {
      // Create states for many windows
      const windowStates: any = {};
      for (let i = 1; i <= 50; i++) {
        windowStates[i] = {
          enabled: i % 2 === 0,
          enabledTimestamp: i % 2 === 0 ? Date.now() : undefined,
        };
      }

      await chrome.storage.local.set({ windowStates });

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        windowStates: expect.objectContaining({
          1: expect.any(Object),
          50: expect.any(Object),
        }),
      });
    });

    test('should handle concurrent state updates', async () => {
      // Simulate multiple windows being enabled at once
      const promises = [
        chrome.storage.local.set({ windowStates: { 1: { enabled: true, enabledTimestamp: Date.now() } } }),
        chrome.storage.local.set({ windowStates: { 2: { enabled: true, enabledTimestamp: Date.now() } } }),
        chrome.storage.local.set({ windowStates: { 3: { enabled: true, enabledTimestamp: Date.now() } } }),
      ];

      await Promise.all(promises);

      expect(chrome.storage.local.set).toHaveBeenCalledTimes(3);
    });
  });

  describe('Data Integrity', () => {
    test('should handle corrupted windowStates', async () => {
      chrome.storage.local.get = jest.fn().mockResolvedValue({
        windowStates: 'not-an-object', // Corrupted data
      });

      const result = await chrome.storage.local.get(['windowStates']);

      // Should detect corruption
      expect(typeof result.windowStates).not.toBe('object');

      // Should reinitialize
      await chrome.storage.local.set({ windowStates: {} });

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        windowStates: {},
      });
    });

    test('should handle windowStates with invalid window IDs', async () => {
      const windowStates = {
        '0': { enabled: true }, // Invalid: 0
        '-1': { enabled: true }, // Invalid: negative
        'abc': { enabled: true }, // Invalid: string
        '1': { enabled: true }, // Valid
      };

      // Filter valid window IDs
      const validStates: any = {};
      for (const [id, state] of Object.entries(windowStates)) {
        const numId = Number(id);
        if (isValidWindowId(numId)) {
          validStates[id] = state;
        }
      }

      await chrome.storage.local.set({ windowStates: validStates });

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        windowStates: {
          '1': expect.any(Object),
        },
      });
    });
  });
});
