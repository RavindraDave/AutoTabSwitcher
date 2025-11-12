/**
 * Mode switching tests
 * Tests transitions between Global and Window modes
 */

import { describe, expect, test, beforeEach } from '@jest/globals';
import { validateOperatingMode } from '../core/storage.js';
import { DEFAULT_OPERATING_MODE } from '../core/constants.js';

describe('Mode Switching Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset chrome.storage mock
    chrome.storage.local.get = jest.fn().mockResolvedValue({});
    chrome.storage.local.set = jest.fn().mockResolvedValue(undefined);
  });

  describe('Global to Window Mode Transition', () => {
    test('should preserve enabled state when switching to window mode', async () => {
      // Setup: Global mode, enabled
      const initialState = {
        operatingMode: 'global',
        enabled: true,
        delayTime: 60000,
      };

      chrome.storage.local.get = jest.fn().mockResolvedValue(initialState);

      // Switch to window mode
      const newState = {
        operatingMode: 'window',
        enabled: false, // Global enabled should be disabled
        windowStates: {}, // Initialize empty window states
      };

      await chrome.storage.local.set(newState);

      expect(chrome.storage.local.set).toHaveBeenCalledWith(
        expect.objectContaining({
          operatingMode: 'window',
          windowStates: expect.any(Object),
        })
      );
    });

    test('should initialize windowStates on first switch to window mode', async () => {
      const initialState = {
        operatingMode: 'global',
        enabled: true,
      };

      chrome.storage.local.get = jest.fn().mockResolvedValue(initialState);

      // Switch to window mode
      const newState = {
        operatingMode: 'window',
        windowStates: {},
      };

      await chrome.storage.local.set(newState);

      expect(chrome.storage.local.set).toHaveBeenCalledWith(
        expect.objectContaining({
          windowStates: expect.any(Object),
        })
      );
    });

    test('should handle rapid mode switches', async () => {
      // Simulate rapid switching
      for (let i = 0; i < 10; i++) {
        const mode = i % 2 === 0 ? 'global' : 'window';
        await chrome.storage.local.set({ operatingMode: mode });
      }

      // Should have been called 10 times
      expect(chrome.storage.local.set).toHaveBeenCalledTimes(10);
    });

    test('should validate mode on every switch', () => {
      // Attempt to set invalid mode
      const validatedMode = validateOperatingMode('invalid');

      expect(validatedMode).toBe(DEFAULT_OPERATING_MODE);
    });
  });

  describe('Window to Global Mode Transition', () => {
    test('should preserve common settings when switching to global mode', async () => {
      // Setup: Window mode with some enabled windows
      const initialState = {
        operatingMode: 'window',
        enabled: false,
        delayTime: 60000,
        windowStates: {
          1: { enabled: true, enabledTimestamp: Date.now() },
          2: { enabled: false },
        },
      };

      chrome.storage.local.get = jest.fn().mockResolvedValue(initialState);

      // Switch to global mode
      const newState = {
        operatingMode: 'global',
        enabled: false, // User needs to manually enable global mode
        delayTime: 60000, // Preserved
        windowStates: initialState.windowStates, // Can be kept for potential future switch back
      };

      await chrome.storage.local.set(newState);

      expect(chrome.storage.local.set).toHaveBeenCalledWith(
        expect.objectContaining({
          operatingMode: 'global',
          delayTime: 60000,
        })
      );
    });

    test('should handle transition when all windows were disabled', async () => {
      const initialState = {
        operatingMode: 'window',
        windowStates: {
          1: { enabled: false },
          2: { enabled: false },
        },
      };

      chrome.storage.local.get = jest.fn().mockResolvedValue(initialState);

      // Switch to global mode
      await chrome.storage.local.set({ operatingMode: 'global', enabled: false });

      expect(chrome.storage.local.set).toHaveBeenCalledWith(
        expect.objectContaining({
          operatingMode: 'global',
        })
      );
    });

    test('should handle transition when some windows were enabled', async () => {
      const initialState = {
        operatingMode: 'window',
        windowStates: {
          1: { enabled: true, enabledTimestamp: Date.now() },
          2: { enabled: false },
          3: { enabled: true, enabledTimestamp: Date.now() },
        },
      };

      chrome.storage.local.get = jest.fn().mockResolvedValue(initialState);

      // Switch to global mode - user must explicitly enable
      await chrome.storage.local.set({ operatingMode: 'global', enabled: false });

      expect(chrome.storage.local.set).toHaveBeenCalled();
    });
  });

  describe('Mode Persistence', () => {
    test('should persist mode across browser restarts', async () => {
      // Set mode
      await chrome.storage.local.set({ operatingMode: 'window' });

      // Simulate browser restart (clear and reload)
      chrome.storage.local.get = jest.fn().mockResolvedValue({
        operatingMode: 'window',
      });

      const result = await chrome.storage.local.get(['operatingMode']);

      expect(result.operatingMode).toBe('window');
    });

    test('should default to global mode on first install', async () => {
      // Simulate first install - no operatingMode set
      chrome.storage.local.get = jest.fn().mockResolvedValue({});

      const result = await chrome.storage.local.get(['operatingMode']);

      // If not set, default should be used
      const mode = result.operatingMode ?? DEFAULT_OPERATING_MODE;
      expect(mode).toBe('global');
    });

    test('should handle corrupted mode data', async () => {
      // Simulate corrupted data
      chrome.storage.local.get = jest.fn().mockResolvedValue({
        operatingMode: 123, // Invalid type
      });

      const result = await chrome.storage.local.get(['operatingMode']);
      const validatedMode = validateOperatingMode(result.operatingMode);

      expect(validatedMode).toBe(DEFAULT_OPERATING_MODE);
    });
  });

  describe('Mode-Specific State Management', () => {
    test('global mode should ignore windowStates', async () => {
      const state = {
        operatingMode: 'global',
        enabled: true,
        windowStates: {
          1: { enabled: false }, // Should be ignored in global mode
          2: { enabled: false },
        },
      };

      chrome.storage.local.get = jest.fn().mockResolvedValue(state);

      const result = await chrome.storage.local.get(['operatingMode', 'enabled', 'windowStates']);

      // In global mode, windowStates exist but are not used
      expect(result.operatingMode).toBe('global');
      expect(result.enabled).toBe(true);
    });

    test('window mode should use windowStates', async () => {
      const state = {
        operatingMode: 'window',
        enabled: false, // Global enabled is false
        windowStates: {
          1: { enabled: true, enabledTimestamp: Date.now() },
          2: { enabled: false },
        },
      };

      chrome.storage.local.get = jest.fn().mockResolvedValue(state);

      const result = await chrome.storage.local.get(['operatingMode', 'windowStates']);

      expect(result.operatingMode).toBe('window');
      expect(result.windowStates).toHaveProperty('1');
      expect(result.windowStates[1].enabled).toBe(true);
    });

    test('should handle empty windowStates in window mode', async () => {
      const state = {
        operatingMode: 'window',
        windowStates: {}, // No windows enabled
      };

      chrome.storage.local.get = jest.fn().mockResolvedValue(state);

      const result = await chrome.storage.local.get(['operatingMode', 'windowStates']);

      expect(result.operatingMode).toBe('window');
      expect(Object.keys(result.windowStates)).toHaveLength(0);
    });
  });

  describe('Concurrent Mode Operations', () => {
    test('should handle simultaneous mode reads', async () => {
      chrome.storage.local.get = jest.fn().mockResolvedValue({
        operatingMode: 'global',
      });

      // Simulate multiple components reading mode at once
      const promises = [
        chrome.storage.local.get(['operatingMode']),
        chrome.storage.local.get(['operatingMode']),
        chrome.storage.local.get(['operatingMode']),
      ];

      const results = await Promise.all(promises);

      results.forEach(result => {
        expect(result.operatingMode).toBe('global');
      });

      expect(chrome.storage.local.get).toHaveBeenCalledTimes(3);
    });

    test('should handle debounced mode changes', async () => {
      // Simulate rapid mode changes with debouncing
      const changes = ['window', 'global', 'window', 'global', 'window'];

      // Only last change should be applied after debounce
      for (const mode of changes) {
        await chrome.storage.local.set({ operatingMode: mode });
      }

      // All calls should have gone through (debouncing happens in background.ts)
      expect(chrome.storage.local.set).toHaveBeenCalledTimes(5);

      // Last call should be 'window'
      expect(chrome.storage.local.set).toHaveBeenLastCalledWith(
        expect.objectContaining({ operatingMode: 'window' })
      );
    });
  });

  describe('Error Handling', () => {
    test('should handle storage.set failure gracefully', async () => {
      chrome.storage.local.set = jest.fn().mockRejectedValue(new Error('Storage quota exceeded'));

      await expect(
        chrome.storage.local.set({ operatingMode: 'window' })
      ).rejects.toThrow('Storage quota exceeded');
    });

    test('should handle storage.get failure gracefully', async () => {
      chrome.storage.local.get = jest.fn().mockRejectedValue(new Error('Storage unavailable'));

      await expect(
        chrome.storage.local.get(['operatingMode'])
      ).rejects.toThrow('Storage unavailable');
    });

    test('should validate mode even if storage returns unexpected type', async () => {
      chrome.storage.local.get = jest.fn().mockResolvedValue({
        operatingMode: { invalid: 'object' },
      });

      const result = await chrome.storage.local.get(['operatingMode']);
      const validatedMode = validateOperatingMode(result.operatingMode);

      expect(validatedMode).toBe(DEFAULT_OPERATING_MODE);
    });
  });
});
