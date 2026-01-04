/**
 * Comprehensive tests for badge-manager.ts
 * Tests badge state logic, window mode handling, and bulk updates
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

describe('Badge Manager', () => {
  let updateBadge: any;
  let logger: any;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Reset chrome mocks
    mockChrome.storage.local.get.mockReset();
    mockChrome.tabs.get.mockReset();
    mockChrome.windows.getAll.mockReset();
    mockChrome.action.setBadgeText.mockReset();
    mockChrome.action.setBadgeBackgroundColor.mockReset();

    // Import fresh module
    const badgeModule = await import('../core/badge-manager.js');
    updateBadge = badgeModule.updateBadge;

    // Import logger mock
    const loggerModule = await import('../core/logger.js');
    logger = loggerModule.logger;
  });

  describe('Global Mode Badge States', () => {
    beforeEach(() => {
      mockChrome.storage.local.get.mockResolvedValue({
        windowMode: 'global',
      });
    });

    test('should show OFF (gray) when disabled', async () => {
      const mockWindows = [
        {
          id: 1,
          tabs: [{ id: 10 }, { id: 11 }],
        },
      ];

      mockChrome.windows.getAll.mockResolvedValue(mockWindows);
      mockChrome.action.setBadgeText.mockResolvedValue(undefined);
      mockChrome.action.setBadgeBackgroundColor.mockResolvedValue(undefined);

      await updateBadge(false, false);

      // Check all badge updates
      const textCalls = mockChrome.action.setBadgeText.mock.calls;
      const colorCalls = mockChrome.action.setBadgeBackgroundColor.mock.calls;

      expect(textCalls).toHaveLength(2);
      expect(textCalls[0][0]).toEqual({ tabId: 10, text: 'OFF' });
      expect(textCalls[1][0]).toEqual({ tabId: 11, text: 'OFF' });

      expect(colorCalls).toHaveLength(2);
      expect(colorCalls[0][0]).toEqual({ tabId: 10, color: '#9E9E9E' });
      expect(colorCalls[1][0]).toEqual({ tabId: 11, color: '#9E9E9E' });
    });

    test('should show ON (green) when enabled', async () => {
      const mockWindows = [
        {
          id: 1,
          tabs: [{ id: 10 }],
        },
      ];

      mockChrome.windows.getAll.mockResolvedValue(mockWindows);
      mockChrome.action.setBadgeText.mockResolvedValue(undefined);
      mockChrome.action.setBadgeBackgroundColor.mockResolvedValue(undefined);

      await updateBadge(true, false);

      expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({
        tabId: 10,
        text: 'ON',
      });
      expect(mockChrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({
        tabId: 10,
        color: '#4CAF50',
      });
    });

    test('should show pause symbol (orange) when paused', async () => {
      const mockWindows = [
        {
          id: 1,
          tabs: [{ id: 10 }],
        },
      ];

      mockChrome.windows.getAll.mockResolvedValue(mockWindows);
      mockChrome.action.setBadgeText.mockResolvedValue(undefined);
      mockChrome.action.setBadgeBackgroundColor.mockResolvedValue(undefined);

      await updateBadge(true, true);

      expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({
        tabId: 10,
        text: '⏸',
      });
      expect(mockChrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({
        tabId: 10,
        color: '#FF9800',
      });
    });

    test('should update badges across multiple windows', async () => {
      const mockWindows = [
        { id: 1, tabs: [{ id: 10 }, { id: 11 }] },
        { id: 2, tabs: [{ id: 20 }, { id: 21 }] },
      ];

      mockChrome.windows.getAll.mockResolvedValue(mockWindows);
      mockChrome.action.setBadgeText.mockResolvedValue(undefined);
      mockChrome.action.setBadgeBackgroundColor.mockResolvedValue(undefined);

      await updateBadge(true, false);

      // Should update all 4 tabs
      expect(mockChrome.action.setBadgeText).toHaveBeenCalledTimes(4);
      expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({
        tabId: 10,
        text: 'ON',
      });
      expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({
        tabId: 20,
        text: 'ON',
      });
    });

    test('should default to global mode when windowMode is undefined', async () => {
      mockChrome.storage.local.get.mockResolvedValue({});

      const mockWindows = [
        {
          id: 1,
          tabs: [{ id: 10 }],
        },
      ];

      mockChrome.windows.getAll.mockResolvedValue(mockWindows);
      mockChrome.action.setBadgeText.mockResolvedValue(undefined);
      mockChrome.action.setBadgeBackgroundColor.mockResolvedValue(undefined);

      await updateBadge(true, false);

      // Should show ON for all windows
      expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({
        tabId: 10,
        text: 'ON',
      });
    });
  });

  describe('Current-Window Mode Badge States', () => {
    test('should show ON only for selected window', async () => {
      mockChrome.storage.local.get.mockResolvedValue({
        windowMode: 'current-window',
        selectedWindowId: 1,
      });

      const mockWindows = [
        { id: 1, tabs: [{ id: 10 }] }, // Selected window
        { id: 2, tabs: [{ id: 20 }] }, // Other window
      ];

      mockChrome.windows.getAll.mockResolvedValue(mockWindows);
      mockChrome.action.setBadgeText.mockResolvedValue(undefined);
      mockChrome.action.setBadgeBackgroundColor.mockResolvedValue(undefined);

      await updateBadge(true, false);

      // Selected window should show ON
      expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({
        tabId: 10,
        text: 'ON',
      });
      expect(mockChrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({
        tabId: 10,
        color: '#4CAF50',
      });

      // Other window should show OFF
      expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({
        tabId: 20,
        text: 'OFF',
      });
      expect(mockChrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({
        tabId: 20,
        color: '#9E9E9E',
      });
    });

    test('should show pause in selected window only', async () => {
      mockChrome.storage.local.get.mockResolvedValue({
        windowMode: 'current-window',
        selectedWindowId: 2,
      });

      const mockWindows = [
        { id: 1, tabs: [{ id: 10 }] },
        { id: 2, tabs: [{ id: 20 }] }, // Selected window
      ];

      mockChrome.windows.getAll.mockResolvedValue(mockWindows);
      mockChrome.action.setBadgeText.mockResolvedValue(undefined);
      mockChrome.action.setBadgeBackgroundColor.mockResolvedValue(undefined);

      await updateBadge(true, true);

      // Selected window should show pause
      expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({
        tabId: 20,
        text: '⏸',
      });
      expect(mockChrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({
        tabId: 20,
        color: '#FF9800',
      });

      // Other window should still show OFF
      expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({
        tabId: 10,
        text: 'OFF',
      });
    });

    test('should show OFF for all windows when disabled in current-window mode', async () => {
      mockChrome.storage.local.get.mockResolvedValue({
        windowMode: 'current-window',
        selectedWindowId: 1,
      });

      const mockWindows = [
        { id: 1, tabs: [{ id: 10 }] },
        { id: 2, tabs: [{ id: 20 }] },
      ];

      mockChrome.windows.getAll.mockResolvedValue(mockWindows);
      mockChrome.action.setBadgeText.mockResolvedValue(undefined);
      mockChrome.action.setBadgeBackgroundColor.mockResolvedValue(undefined);

      await updateBadge(false, false);

      // All windows should show OFF
      expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({
        tabId: 10,
        text: 'OFF',
      });
      expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({
        tabId: 20,
        text: 'OFF',
      });
    });
  });

  describe('Window Mode Badge States (New Operating Mode)', () => {
    test('should show ON for enabled window, OFF for disabled windows', async () => {
      mockChrome.storage.local.get.mockResolvedValue({
        switchingMode: 'window',
        windowStates: {
          1: { enabled: true },
          2: { enabled: false },
        },
      });

      const mockWindows = [
        { id: 1, tabs: [{ id: 10 }, { id: 11 }] }, // Enabled window
        { id: 2, tabs: [{ id: 20 }, { id: 21 }] }, // Disabled window
      ];

      mockChrome.windows.getAll.mockResolvedValue(mockWindows);
      mockChrome.action.setBadgeText.mockResolvedValue(undefined);
      mockChrome.action.setBadgeBackgroundColor.mockResolvedValue(undefined);

      await updateBadge(true, false); // enabled param is ignored in window mode

      // Window 1 tabs should show ON (green)
      expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({
        tabId: 10,
        text: 'ON',
      });
      expect(mockChrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({
        tabId: 10,
        color: '#4CAF50',
      });
      expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({
        tabId: 11,
        text: 'ON',
      });

      // Window 2 tabs should show OFF (gray)
      expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({
        tabId: 20,
        text: 'OFF',
      });
      expect(mockChrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({
        tabId: 20,
        color: '#9E9E9E',
      });
      expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({
        tabId: 21,
        text: 'OFF',
      });
    });

    test('should show pause (orange) for enabled window when paused', async () => {
      mockChrome.storage.local.get.mockResolvedValue({
        switchingMode: 'window',
        windowStates: {
          1: { enabled: true },
        },
      });

      const mockWindows = [
        { id: 1, tabs: [{ id: 10 }] },
      ];

      mockChrome.windows.getAll.mockResolvedValue(mockWindows);
      mockChrome.action.setBadgeText.mockResolvedValue(undefined);
      mockChrome.action.setBadgeBackgroundColor.mockResolvedValue(undefined);

      await updateBadge(true, true); // paused = true

      // Should show pause symbol
      expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({
        tabId: 10,
        text: '⏸',
      });
      expect(mockChrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({
        tabId: 10,
        color: '#FF9800',
      });
    });

    test('should show OFF for disabled window even when paused', async () => {
      mockChrome.storage.local.get.mockResolvedValue({
        switchingMode: 'window',
        windowStates: {
          1: { enabled: false },
        },
      });

      const mockWindows = [
        { id: 1, tabs: [{ id: 10 }] },
      ];

      mockChrome.windows.getAll.mockResolvedValue(mockWindows);
      mockChrome.action.setBadgeText.mockResolvedValue(undefined);
      mockChrome.action.setBadgeBackgroundColor.mockResolvedValue(undefined);

      await updateBadge(true, true); // paused = true

      // Disabled window should show OFF, not pause
      expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({
        tabId: 10,
        text: 'OFF',
      });
      expect(mockChrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({
        tabId: 10,
        color: '#9E9E9E',
      });
    });

    test('should show OFF for window not in windowStates (defaults to disabled)', async () => {
      mockChrome.storage.local.get.mockResolvedValue({
        switchingMode: 'window',
        windowStates: {
          1: { enabled: true },
          // Window 2 not in windowStates
        },
      });

      const mockWindows = [
        { id: 1, tabs: [{ id: 10 }] },
        { id: 2, tabs: [{ id: 20 }] }, // Not in windowStates
      ];

      mockChrome.windows.getAll.mockResolvedValue(mockWindows);
      mockChrome.action.setBadgeText.mockResolvedValue(undefined);
      mockChrome.action.setBadgeBackgroundColor.mockResolvedValue(undefined);

      await updateBadge(true, false);

      // Window 1 should show ON
      expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({
        tabId: 10,
        text: 'ON',
      });

      // Window 2 should default to OFF
      expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({
        tabId: 20,
        text: 'OFF',
      });
      expect(mockChrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({
        tabId: 20,
        color: '#9E9E9E',
      });
    });

    test('should handle undefined windowStates in window mode', async () => {
      mockChrome.storage.local.get.mockResolvedValue({
        switchingMode: 'window',
        // windowStates is undefined
      });

      const mockWindows = [
        { id: 1, tabs: [{ id: 10 }] },
      ];

      mockChrome.windows.getAll.mockResolvedValue(mockWindows);
      mockChrome.action.setBadgeText.mockResolvedValue(undefined);
      mockChrome.action.setBadgeBackgroundColor.mockResolvedValue(undefined);

      await updateBadge(true, false);

      // All windows should default to OFF when windowStates is undefined
      expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({
        tabId: 10,
        text: 'OFF',
      });
      expect(mockChrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({
        tabId: 10,
        color: '#9E9E9E',
      });
    });

    test('should update badge for specific tab in window mode', async () => {
      mockChrome.storage.local.get.mockResolvedValue({
        switchingMode: 'window',
        windowStates: {
          1: { enabled: true },
          2: { enabled: false },
        },
      });

      mockChrome.tabs.get.mockResolvedValue({
        id: 123,
        windowId: 1, // Enabled window
      });
      mockChrome.action.setBadgeText.mockResolvedValue(undefined);
      mockChrome.action.setBadgeBackgroundColor.mockResolvedValue(undefined);

      await updateBadge(true, false, 123);

      // Should only update this tab, and should show ON (from enabled window)
      expect(mockChrome.tabs.get).toHaveBeenCalledWith(123);
      expect(mockChrome.windows.getAll).not.toHaveBeenCalled();
      expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({
        tabId: 123,
        text: 'ON',
      });
      expect(mockChrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({
        tabId: 123,
        color: '#4CAF50',
      });
      expect(mockChrome.action.setBadgeText).toHaveBeenCalledTimes(1);
    });

    test('should update badge for tab in disabled window', async () => {
      mockChrome.storage.local.get.mockResolvedValue({
        switchingMode: 'window',
        windowStates: {
          1: { enabled: true },
          2: { enabled: false },
        },
      });

      mockChrome.tabs.get.mockResolvedValue({
        id: 123,
        windowId: 2, // Disabled window
      });
      mockChrome.action.setBadgeText.mockResolvedValue(undefined);
      mockChrome.action.setBadgeBackgroundColor.mockResolvedValue(undefined);

      await updateBadge(true, false, 123);

      // Should show OFF (from disabled window)
      expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({
        tabId: 123,
        text: 'OFF',
      });
      expect(mockChrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({
        tabId: 123,
        color: '#9E9E9E',
      });
    });

    test('should handle multiple windows with mixed states', async () => {
      mockChrome.storage.local.get.mockResolvedValue({
        switchingMode: 'window',
        windowStates: {
          1: { enabled: true },
          2: { enabled: false },
          3: { enabled: true },
          4: { enabled: false },
        },
      });

      const mockWindows = [
        { id: 1, tabs: [{ id: 10 }] }, // Enabled
        { id: 2, tabs: [{ id: 20 }] }, // Disabled
        { id: 3, tabs: [{ id: 30 }] }, // Enabled
        { id: 4, tabs: [{ id: 40 }] }, // Disabled
      ];

      mockChrome.windows.getAll.mockResolvedValue(mockWindows);
      mockChrome.action.setBadgeText.mockResolvedValue(undefined);
      mockChrome.action.setBadgeBackgroundColor.mockResolvedValue(undefined);

      await updateBadge(true, false);

      // Enabled windows should show ON
      expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({
        tabId: 10,
        text: 'ON',
      });
      expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({
        tabId: 30,
        text: 'ON',
      });

      // Disabled windows should show OFF
      expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({
        tabId: 20,
        text: 'OFF',
      });
      expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({
        tabId: 40,
        text: 'OFF',
      });

      expect(mockChrome.action.setBadgeText).toHaveBeenCalledTimes(4);
    });

    test('should prioritize operatingMode over legacy windowMode', async () => {
      mockChrome.storage.local.get.mockResolvedValue({
        switchingMode: 'window', // New mode
        windowMode: 'global', // Legacy mode - should be ignored
        windowStates: {
          1: { enabled: true },
          2: { enabled: false },
        },
      });

      const mockWindows = [
        { id: 1, tabs: [{ id: 10 }] },
        { id: 2, tabs: [{ id: 20 }] },
      ];

      mockChrome.windows.getAll.mockResolvedValue(mockWindows);
      mockChrome.action.setBadgeText.mockResolvedValue(undefined);
      mockChrome.action.setBadgeBackgroundColor.mockResolvedValue(undefined);

      await updateBadge(true, false);

      // Should use operatingMode (window), not legacy windowMode (global)
      // Window 1 should show ON, Window 2 should show OFF
      expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({
        tabId: 10,
        text: 'ON',
      });
      expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({
        tabId: 20,
        text: 'OFF',
      });
    });
  });

  describe('Specific Tab Updates', () => {
    test('should update only specified tab', async () => {
      mockChrome.storage.local.get.mockResolvedValue({
        windowMode: 'global',
      });

      mockChrome.tabs.get.mockResolvedValue({
        id: 123,
        windowId: 1,
      });
      mockChrome.action.setBadgeText.mockResolvedValue(undefined);
      mockChrome.action.setBadgeBackgroundColor.mockResolvedValue(undefined);

      await updateBadge(true, false, 123);

      // Should only call chrome.tabs.get, not chrome.windows.getAll
      expect(mockChrome.tabs.get).toHaveBeenCalledWith(123);
      expect(mockChrome.windows.getAll).not.toHaveBeenCalled();

      // Should update only this tab
      expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({
        tabId: 123,
        text: 'ON',
      });
      expect(mockChrome.action.setBadgeText).toHaveBeenCalledTimes(1);
    });

    test('should handle tab update in current-window mode for non-selected window', async () => {
      mockChrome.storage.local.get.mockResolvedValue({
        windowMode: 'current-window',
        selectedWindowId: 2,
      });

      mockChrome.tabs.get.mockResolvedValue({
        id: 123,
        windowId: 1, // Not the selected window
      });
      mockChrome.action.setBadgeText.mockResolvedValue(undefined);
      mockChrome.action.setBadgeBackgroundColor.mockResolvedValue(undefined);

      await updateBadge(true, false, 123);

      // Should show OFF for non-selected window
      expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({
        tabId: 123,
        text: 'OFF',
      });
    });

    test('should handle tab with no windowId', async () => {
      mockChrome.storage.local.get.mockResolvedValue({
        windowMode: 'global',
      });

      mockChrome.tabs.get.mockResolvedValue({
        id: 123,
        // windowId is undefined
      });

      await updateBadge(true, false, 123);

      // Should not attempt to set badge
      expect(mockChrome.action.setBadgeText).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    test('should skip windows with no id', async () => {
      mockChrome.storage.local.get.mockResolvedValue({
        windowMode: 'global',
      });

      const mockWindows = [
        { id: undefined, tabs: [{ id: 10 }] }, // Invalid window
        { id: 2, tabs: [{ id: 20 }] }, // Valid window
      ];

      mockChrome.windows.getAll.mockResolvedValue(mockWindows);
      mockChrome.action.setBadgeText.mockResolvedValue(undefined);
      mockChrome.action.setBadgeBackgroundColor.mockResolvedValue(undefined);

      await updateBadge(true, false);

      // Should only update tab 20 (from valid window)
      expect(mockChrome.action.setBadgeText).toHaveBeenCalledTimes(1);
      expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({
        tabId: 20,
        text: 'ON',
      });
    });

    test('should skip windows with no tabs', async () => {
      mockChrome.storage.local.get.mockResolvedValue({
        windowMode: 'global',
      });

      const mockWindows = [
        { id: 1, tabs: undefined }, // No tabs array
        { id: 2, tabs: [{ id: 20 }] },
      ];

      mockChrome.windows.getAll.mockResolvedValue(mockWindows);
      mockChrome.action.setBadgeText.mockResolvedValue(undefined);
      mockChrome.action.setBadgeBackgroundColor.mockResolvedValue(undefined);

      await updateBadge(true, false);

      // Should only update tab from window with tabs
      expect(mockChrome.action.setBadgeText).toHaveBeenCalledTimes(1);
    });

    test('should skip tabs with undefined id', async () => {
      mockChrome.storage.local.get.mockResolvedValue({
        windowMode: 'global',
      });

      const mockWindows = [
        {
          id: 1,
          tabs: [
            { id: undefined }, // Invalid tab
            { id: 20 }, // Valid tab
          ],
        },
      ];

      mockChrome.windows.getAll.mockResolvedValue(mockWindows);
      mockChrome.action.setBadgeText.mockResolvedValue(undefined);
      mockChrome.action.setBadgeBackgroundColor.mockResolvedValue(undefined);

      await updateBadge(true, false);

      // Should only update valid tab
      expect(mockChrome.action.setBadgeText).toHaveBeenCalledTimes(1);
      expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({
        tabId: 20,
        text: 'ON',
      });
    });

    test('should handle chrome API errors gracefully', async () => {
      mockChrome.storage.local.get.mockResolvedValue({
        windowMode: 'global',
      });
      mockChrome.windows.getAll.mockRejectedValue(new Error('API error'));

      await updateBadge(true, false);

      expect(logger.error).toHaveBeenCalledWith(
        'BadgeManager',
        'Error updating badge',
        expect.objectContaining({
          error: expect.any(String)
        })
      );
    });

    test('should handle empty windows array', async () => {
      mockChrome.storage.local.get.mockResolvedValue({
        windowMode: 'global',
      });
      mockChrome.windows.getAll.mockResolvedValue([]);

      await updateBadge(true, false);

      // Should not crash, just not update any badges
      expect(mockChrome.action.setBadgeText).not.toHaveBeenCalled();
    });
  });

  describe('Badge State Priority', () => {
    test('disabled should take priority over paused', async () => {
      mockChrome.storage.local.get.mockResolvedValue({
        windowMode: 'global',
      });

      const mockWindows = [{ id: 1, tabs: [{ id: 10 }] }];

      mockChrome.windows.getAll.mockResolvedValue(mockWindows);
      mockChrome.action.setBadgeText.mockResolvedValue(undefined);
      mockChrome.action.setBadgeBackgroundColor.mockResolvedValue(undefined);

      await updateBadge(false, true);

      // Should show OFF (disabled), not pause
      expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({
        tabId: 10,
        text: 'OFF',
      });
      expect(mockChrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({
        tabId: 10,
        color: '#9E9E9E',
      });
    });

    test('non-selected window in current-window mode should show OFF regardless of state', async () => {
      mockChrome.storage.local.get.mockResolvedValue({
        windowMode: 'current-window',
        selectedWindowId: 2,
      });

      const mockWindows = [{ id: 1, tabs: [{ id: 10 }] }];

      mockChrome.windows.getAll.mockResolvedValue(mockWindows);
      mockChrome.action.setBadgeText.mockResolvedValue(undefined);
      mockChrome.action.setBadgeBackgroundColor.mockResolvedValue(undefined);

      // Even though enabled=true, paused=true, should show OFF
      await updateBadge(true, true);

      expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({
        tabId: 10,
        text: 'OFF',
      });
    });
  });
});
