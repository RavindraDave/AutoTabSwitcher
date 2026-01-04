/**
 * Integration tests for badge updates on storage changes
 * Tests that badge updates are triggered correctly when window states or operating modes change
 */

import { jest, describe, test, expect, beforeEach, afterEach } from '@jest/globals';

const mockChrome = (global as any).chrome;

describe('Badge Integration Tests', () => {
  let updateBadge: any;
  let storageChangeListeners: Array<(changes: any, namespace: string) => void>;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Track storage change listeners
    storageChangeListeners = [];
    mockChrome.storage.onChanged.addListener = jest.fn((listener) => {
      storageChangeListeners.push(listener);
    });

    // Reset chrome mocks
    mockChrome.storage.local.get.mockReset();
    mockChrome.tabs.get.mockReset();
    mockChrome.windows.getAll.mockReset();
    mockChrome.action.setBadgeText.mockReset();
    mockChrome.action.setBadgeBackgroundColor.mockReset();

    // Import fresh module
    const badgeModule = await import('../core/badge-manager.js');
    updateBadge = badgeModule.updateBadge;
  });

  afterEach(() => {
    storageChangeListeners = [];
  });

  describe('Window State Changes', () => {
    test('should update badges when window is enabled in Window mode', async () => {
      // Setup: Window mode with window 1 disabled
      mockChrome.storage.local.get.mockResolvedValue({
        switchingMode: 'window',
        windowStates: {
          1: { enabled: false },
          2: { enabled: true },
        },
      });

      const mockWindows = [
        { id: 1, tabs: [{ id: 10 }, { id: 11 }] },
        { id: 2, tabs: [{ id: 20 }] },
      ];

      mockChrome.windows.getAll.mockResolvedValue(mockWindows);
      mockChrome.action.setBadgeText.mockResolvedValue(undefined);
      mockChrome.action.setBadgeBackgroundColor.mockResolvedValue(undefined);

      // Initial badge update
      await updateBadge(false, false);
      mockChrome.action.setBadgeText.mockClear();
      mockChrome.action.setBadgeBackgroundColor.mockClear();

      // Simulate enabling window 1
      mockChrome.storage.local.get.mockResolvedValue({
        switchingMode: 'window',
        windowStates: {
          1: { enabled: true }, // Changed from false to true
          2: { enabled: true },
        },
      });

      // Update badges after state change
      await updateBadge(false, false);

      // Window 1 tabs should now show ON (previously OFF)
      expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({
        tabId: 10,
        text: 'ON',
      });
      expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({
        tabId: 11,
        text: 'ON',
      });
      expect(mockChrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({
        tabId: 10,
        color: '#4CAF50',
      });
    });

    test('should update badges when window is disabled in Window mode', async () => {
      // Setup: Window mode with window 1 enabled
      mockChrome.storage.local.get.mockResolvedValue({
        switchingMode: 'window',
        windowStates: {
          1: { enabled: true },
        },
      });

      const mockWindows = [
        { id: 1, tabs: [{ id: 10 }, { id: 11 }] },
      ];

      mockChrome.windows.getAll.mockResolvedValue(mockWindows);
      mockChrome.action.setBadgeText.mockResolvedValue(undefined);
      mockChrome.action.setBadgeBackgroundColor.mockResolvedValue(undefined);

      // Initial badge update
      await updateBadge(false, false);
      mockChrome.action.setBadgeText.mockClear();
      mockChrome.action.setBadgeBackgroundColor.mockClear();

      // Simulate disabling window 1
      mockChrome.storage.local.get.mockResolvedValue({
        switchingMode: 'window',
        windowStates: {
          1: { enabled: false }, // Changed from true to false
        },
      });

      // Update badges after state change
      await updateBadge(false, false);

      // Window 1 tabs should now show OFF (previously ON)
      expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({
        tabId: 10,
        text: 'OFF',
      });
      expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({
        tabId: 11,
        text: 'OFF',
      });
      expect(mockChrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({
        tabId: 10,
        color: '#9E9E9E',
      });
    });

    test('should update badges for multiple windows when states change', async () => {
      // Setup: Window mode with multiple windows
      mockChrome.storage.local.get.mockResolvedValue({
        switchingMode: 'window',
        windowStates: {
          1: { enabled: true },
          2: { enabled: false },
          3: { enabled: true },
        },
      });

      const mockWindows = [
        { id: 1, tabs: [{ id: 10 }] },
        { id: 2, tabs: [{ id: 20 }] },
        { id: 3, tabs: [{ id: 30 }] },
      ];

      mockChrome.windows.getAll.mockResolvedValue(mockWindows);
      mockChrome.action.setBadgeText.mockResolvedValue(undefined);
      mockChrome.action.setBadgeBackgroundColor.mockResolvedValue(undefined);

      // Initial badge update
      await updateBadge(false, false);
      mockChrome.action.setBadgeText.mockClear();
      mockChrome.action.setBadgeBackgroundColor.mockClear();

      // Simulate toggling multiple windows
      mockChrome.storage.local.get.mockResolvedValue({
        switchingMode: 'window',
        windowStates: {
          1: { enabled: false }, // Changed: ON -> OFF
          2: { enabled: true },  // Changed: OFF -> ON
          3: { enabled: true },  // Unchanged
        },
      });

      // Update badges after state change
      await updateBadge(false, false);

      // Window 1 should now be OFF
      expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({
        tabId: 10,
        text: 'OFF',
      });
      expect(mockChrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({
        tabId: 10,
        color: '#9E9E9E',
      });

      // Window 2 should now be ON
      expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({
        tabId: 20,
        text: 'ON',
      });
      expect(mockChrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({
        tabId: 20,
        color: '#4CAF50',
      });

      // Window 3 should still be ON
      expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({
        tabId: 30,
        text: 'ON',
      });
    });
  });

  describe('Operating Mode Changes', () => {
    test('should update badges when switching from Global to Window mode', async () => {
      // Setup: Global mode, enabled
      mockChrome.storage.local.get.mockResolvedValue({
        switchingMode: 'global',
        enabled: true,
      });

      const mockWindows = [
        { id: 1, tabs: [{ id: 10 }] },
        { id: 2, tabs: [{ id: 20 }] },
      ];

      mockChrome.windows.getAll.mockResolvedValue(mockWindows);
      mockChrome.action.setBadgeText.mockResolvedValue(undefined);
      mockChrome.action.setBadgeBackgroundColor.mockResolvedValue(undefined);

      // Initial badge update - both windows should show ON
      await updateBadge(true, false);
      expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({
        tabId: 10,
        text: 'ON',
      });
      expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({
        tabId: 20,
        text: 'ON',
      });

      mockChrome.action.setBadgeText.mockClear();
      mockChrome.action.setBadgeBackgroundColor.mockClear();

      // Switch to Window mode with only window 1 enabled
      mockChrome.storage.local.get.mockResolvedValue({
        switchingMode: 'window',
        enabled: false,
        windowStates: {
          1: { enabled: true },
          2: { enabled: false },
        },
      });

      // Update badges after mode change
      await updateBadge(false, false);

      // Window 1 should show ON
      expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({
        tabId: 10,
        text: 'ON',
      });
      expect(mockChrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({
        tabId: 10,
        color: '#4CAF50',
      });

      // Window 2 should show OFF (changed from ON in global mode)
      expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({
        tabId: 20,
        text: 'OFF',
      });
      expect(mockChrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({
        tabId: 20,
        color: '#9E9E9E',
      });
    });

    test('should update badges when switching from Window to Global mode', async () => {
      // Setup: Window mode with mixed states
      mockChrome.storage.local.get.mockResolvedValue({
        switchingMode: 'window',
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

      // Initial badge update
      await updateBadge(false, false);
      expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({
        tabId: 10,
        text: 'ON',
      });
      expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({
        tabId: 20,
        text: 'OFF',
      });

      mockChrome.action.setBadgeText.mockClear();
      mockChrome.action.setBadgeBackgroundColor.mockClear();

      // Switch to Global mode, enabled
      mockChrome.storage.local.get.mockResolvedValue({
        switchingMode: 'global',
        enabled: true,
      });

      // Update badges after mode change
      await updateBadge(true, false);

      // Both windows should now show ON
      expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({
        tabId: 10,
        text: 'ON',
      });
      expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({
        tabId: 20,
        text: 'ON',
      });
      expect(mockChrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({
        tabId: 10,
        color: '#4CAF50',
      });
      expect(mockChrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({
        tabId: 20,
        color: '#4CAF50',
      });
    });

    test('should update badges when switching to Window mode with all windows disabled', async () => {
      // Setup: Global mode, enabled
      mockChrome.storage.local.get.mockResolvedValue({
        switchingMode: 'global',
        enabled: true,
      });

      const mockWindows = [
        { id: 1, tabs: [{ id: 10 }] },
        { id: 2, tabs: [{ id: 20 }] },
      ];

      mockChrome.windows.getAll.mockResolvedValue(mockWindows);
      mockChrome.action.setBadgeText.mockResolvedValue(undefined);
      mockChrome.action.setBadgeBackgroundColor.mockResolvedValue(undefined);

      // Initial badge update
      await updateBadge(true, false);
      mockChrome.action.setBadgeText.mockClear();

      // Switch to Window mode with all windows disabled
      mockChrome.storage.local.get.mockResolvedValue({
        switchingMode: 'window',
        windowStates: {
          1: { enabled: false },
          2: { enabled: false },
        },
      });

      // Update badges after mode change
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

  describe('Badge Updates Without Page Refresh', () => {
    test('should update badge immediately when window state changes (no page refresh)', async () => {
      // This test verifies the fix for the bug where badges only updated on page refresh
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

      // Initial state: OFF
      await updateBadge(false, false);
      expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({
        tabId: 10,
        text: 'OFF',
      });

      // Clear mocks to verify next update
      mockChrome.action.setBadgeText.mockClear();
      mockChrome.action.setBadgeBackgroundColor.mockClear();

      // Change state to enabled (simulating user clicking toggle in popup)
      mockChrome.storage.local.get.mockResolvedValue({
        switchingMode: 'window',
        windowStates: {
          1: { enabled: true },
        },
      });

      // Immediately update badge (this would be called by storage change listener in background.ts)
      await updateBadge(false, false);

      // Badge should immediately update to ON without requiring page refresh
      expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({
        tabId: 10,
        text: 'ON',
      });
      expect(mockChrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({
        tabId: 10,
        color: '#4CAF50',
      });

      // Verify update was called
      expect(mockChrome.action.setBadgeText).toHaveBeenCalledTimes(1);
      expect(mockChrome.action.setBadgeBackgroundColor).toHaveBeenCalledTimes(1);
    });

    test('should update badges for all tabs in window without page refresh', async () => {
      mockChrome.storage.local.get.mockResolvedValue({
        switchingMode: 'window',
        windowStates: {
          1: { enabled: false },
        },
      });

      // Window with multiple tabs
      const mockWindows = [
        { id: 1, tabs: [{ id: 10 }, { id: 11 }, { id: 12 }] },
      ];

      mockChrome.windows.getAll.mockResolvedValue(mockWindows);
      mockChrome.action.setBadgeText.mockResolvedValue(undefined);
      mockChrome.action.setBadgeBackgroundColor.mockResolvedValue(undefined);

      // Initial state
      await updateBadge(false, false);
      mockChrome.action.setBadgeText.mockClear();

      // Enable window
      mockChrome.storage.local.get.mockResolvedValue({
        switchingMode: 'window',
        windowStates: {
          1: { enabled: true },
        },
      });

      // Update badges
      await updateBadge(false, false);

      // All tabs should be updated
      expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({
        tabId: 10,
        text: 'ON',
      });
      expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({
        tabId: 11,
        text: 'ON',
      });
      expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({
        tabId: 12,
        text: 'ON',
      });
      expect(mockChrome.action.setBadgeText).toHaveBeenCalledTimes(3);
    });
  });

  describe('Paused State with Window Mode', () => {
    test('should update badges correctly when window is enabled and then paused', async () => {
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

      // Initial state: enabled, not paused
      await updateBadge(false, false);
      expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({
        tabId: 10,
        text: 'ON',
      });

      mockChrome.action.setBadgeText.mockClear();

      // Update to paused state
      await updateBadge(false, true);

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

    test('should not show pause for disabled window even when paused=true', async () => {
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

      // Disabled window with paused=true
      await updateBadge(false, true);

      // Should show OFF, not pause
      expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({
        tabId: 10,
        text: 'OFF',
      });
      expect(mockChrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({
        tabId: 10,
        color: '#9E9E9E',
      });
    });
  });
});
