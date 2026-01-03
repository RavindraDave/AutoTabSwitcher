/**
 * Comprehensive tests for tab-switcher.ts
 * Tests core tab switching logic, window mode handling, and edge cases
 */

import { jest, describe, test, expect, beforeEach } from '@jest/globals';

// Mock the logger module before importing tab-switcher
jest.mock('../core/logger.js', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  logTabSwitch: jest.fn(),
}));

// Mock badge-manager module
jest.mock('../core/badge-manager.js', () => ({
  updateBadge: jest.fn(),
}));

const mockChrome = (global as any).chrome;

describe('Tab Switcher', () => {
  let switchTab: any;
  let logger: any;
  let logTabSwitch: any;
  let updateBadge: any;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Reset chrome mocks
    mockChrome.windows.get.mockReset();
    mockChrome.windows.getCurrent.mockReset();
    mockChrome.windows.getLastFocused.mockReset();
    mockChrome.tabs.query.mockReset();
    mockChrome.tabs.update.mockReset();
    mockChrome.storage.local.get.mockReset();
    mockChrome.storage.local.set.mockReset();

    // Import fresh modules
    const tabSwitcherModule = await import('../core/tab-switcher.js');
    const loggerModule = await import('../core/logger.js');
    const badgeModule = await import('../core/badge-manager.js');

    switchTab = tabSwitcherModule.switchTab;
    logger = loggerModule.logger;
    logTabSwitch = loggerModule.logTabSwitch;
    updateBadge = badgeModule.updateBadge;
  });

  describe('Window Mode (specific window ID provided)', () => {
    test('should switch tabs in specified window', async () => {
      const mockTabs = [
        { id: 1, index: 0, active: true, title: 'Tab 1' },
        { id: 2, index: 1, active: false, title: 'Tab 2' },
        { id: 3, index: 2, active: false, title: 'Tab 3' },
      ];

      mockChrome.windows.get.mockResolvedValue({ id: 100 });
      mockChrome.tabs.query.mockResolvedValue(mockTabs);
      mockChrome.tabs.update.mockResolvedValue({});
      mockChrome.storage.local.get.mockResolvedValue({ lastSwitchTimes: {} });
      mockChrome.storage.local.set.mockResolvedValue(undefined);

      await switchTab(100);

      expect(mockChrome.windows.get).toHaveBeenCalledWith(100);
      expect(mockChrome.tabs.query).toHaveBeenCalledWith({ windowId: 100 });
      expect(mockChrome.tabs.update).toHaveBeenCalledWith(2, { active: true });
      expect(logTabSwitch).toHaveBeenCalledWith({
        windowId: 100,
        mode: 'window',
        previousTabId: 1,
        newTabId: 2,
        previousTabTitle: 'Tab 1',
        newTabTitle: 'Tab 2',
      });
    });

    test('should handle window not existing', async () => {
      mockChrome.windows.get.mockRejectedValue(new Error('Window not found'));

      await switchTab(999);

      expect(mockChrome.windows.get).toHaveBeenCalledWith(999);
      expect(mockChrome.tabs.query).not.toHaveBeenCalled();
      expect(mockChrome.tabs.update).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith(
        'TabSwitcher',
        'Specified window no longer exists',
        { windowId: 999 }
      );
    });

    test('should wrap around to first tab from last tab', async () => {
      const mockTabs = [
        { id: 1, index: 0, active: false, title: 'Tab 1' },
        { id: 2, index: 1, active: false, title: 'Tab 2' },
        { id: 3, index: 2, active: true, title: 'Tab 3' },
      ];

      mockChrome.windows.get.mockResolvedValue({ id: 100 });
      mockChrome.tabs.query.mockResolvedValue(mockTabs);
      mockChrome.tabs.update.mockResolvedValue({});
      mockChrome.storage.local.get.mockResolvedValue({ lastSwitchTimes: {} });
      mockChrome.storage.local.set.mockResolvedValue(undefined);

      await switchTab(100);

      expect(mockChrome.tabs.update).toHaveBeenCalledWith(1, { active: true });
    });

    test('should update lastSwitchTimes for window', async () => {
      const mockTabs = [
        { id: 1, index: 0, active: true, title: 'Tab 1' },
        { id: 2, index: 1, active: false, title: 'Tab 2' },
      ];

      mockChrome.windows.get.mockResolvedValue({ id: 100 });
      mockChrome.tabs.query.mockResolvedValue(mockTabs);
      mockChrome.tabs.update.mockResolvedValue({});
      mockChrome.storage.local.get.mockResolvedValue({
        lastSwitchTimes: { 50: 1000000 },
      });
      mockChrome.storage.local.set.mockResolvedValue(undefined);

      const beforeTime = Date.now();
      await switchTab(100);
      const afterTime = Date.now();

      const setCall = mockChrome.storage.local.set.mock.calls[0][0];
      expect(setCall.lastSwitchTimes[100]).toBeGreaterThanOrEqual(beforeTime);
      expect(setCall.lastSwitchTimes[100]).toBeLessThanOrEqual(afterTime);
      expect(setCall.lastSwitchTimes[50]).toBe(1000000); // Preserved
    });
  });

  describe('Global Mode (no specific window)', () => {
    test('should switch tabs in currently focused window', async () => {
      const mockTabs = [
        { id: 10, index: 0, active: true, title: 'Current Tab' },
        { id: 11, index: 1, active: false, title: 'Next Tab' },
      ];

      mockChrome.storage.local.get.mockResolvedValue({
        windowMode: 'global',
        lastSwitchTimes: {},
      });
      mockChrome.windows.getLastFocused.mockResolvedValue({ id: 200 });
      mockChrome.tabs.query.mockResolvedValue(mockTabs);
      mockChrome.tabs.update.mockResolvedValue({});
      mockChrome.storage.local.set.mockResolvedValue(undefined);

      await switchTab();

      expect(mockChrome.windows.getLastFocused).toHaveBeenCalled();
      expect(mockChrome.tabs.query).toHaveBeenCalledWith({ windowId: 200 });
      expect(mockChrome.tabs.update).toHaveBeenCalledWith(11, { active: true });
      expect(logTabSwitch).toHaveBeenCalledWith({
        windowId: 200,
        mode: 'global',
        previousTabId: 10,
        newTabId: 11,
        previousTabTitle: 'Current Tab',
        newTabTitle: 'Next Tab',
      });
    });

    test('should default to global mode when windowMode is undefined', async () => {
      const mockTabs = [
        { id: 10, index: 0, active: true, title: 'Tab A' },
        { id: 11, index: 1, active: false, title: 'Tab B' },
      ];

      mockChrome.storage.local.get.mockResolvedValue({ lastSwitchTimes: {} });
      mockChrome.windows.getLastFocused.mockResolvedValue({ id: 200 });
      mockChrome.tabs.query.mockResolvedValue(mockTabs);
      mockChrome.tabs.update.mockResolvedValue({});
      mockChrome.storage.local.set.mockResolvedValue(undefined);

      await switchTab();

      expect(mockChrome.windows.getLastFocused).toHaveBeenCalled();
      expect(mockChrome.tabs.update).toHaveBeenCalled();
    });
  });

  describe('Current-Window Mode', () => {
    test('should switch tabs in selected window', async () => {
      const mockTabs = [
        { id: 20, index: 0, active: true, title: 'Selected Tab 1' },
        { id: 21, index: 1, active: false, title: 'Selected Tab 2' },
      ];

      mockChrome.storage.local.get.mockResolvedValue({
        windowMode: 'current-window',
        selectedWindowId: 300,
        lastSwitchTimes: {},
      });
      mockChrome.windows.get.mockResolvedValue({ id: 300 });
      mockChrome.tabs.query.mockResolvedValue(mockTabs);
      mockChrome.tabs.update.mockResolvedValue({});
      mockChrome.storage.local.set.mockResolvedValue(undefined);

      await switchTab();

      expect(mockChrome.windows.get).toHaveBeenCalledWith(300);
      expect(mockChrome.tabs.query).toHaveBeenCalledWith({ windowId: 300 });
      expect(mockChrome.tabs.update).toHaveBeenCalledWith(21, { active: true });
    });

    test('should warn and return when no selectedWindowId', async () => {
      mockChrome.storage.local.get.mockResolvedValue({
        windowMode: 'current-window',
        // selectedWindowId is missing
      });

      await switchTab();

      expect(mockChrome.tabs.query).not.toHaveBeenCalled();
      expect(mockChrome.tabs.update).not.toHaveBeenCalled();
    });

    test('should disable when selected window no longer exists', async () => {
      mockChrome.storage.local.get.mockResolvedValue({
        windowMode: 'current-window',
        selectedWindowId: 999,
      });
      mockChrome.windows.get.mockRejectedValue(new Error('Window closed'));
      mockChrome.storage.local.set.mockResolvedValue(undefined);

      await switchTab();

      expect(mockChrome.storage.local.set).toHaveBeenCalledWith({ enabled: false });
      expect(updateBadge).toHaveBeenCalledWith(false);
      expect(logger.warn).toHaveBeenCalledWith(
        'TabSwitcher',
        'Selected window no longer exists, disabling',
        { selectedWindowId: 999 }
      );
    });
  });

  describe('Edge Cases', () => {
    test('should do nothing when only one tab exists', async () => {
      const mockTabs = [{ id: 1, index: 0, active: true, title: 'Only Tab' }];

      mockChrome.windows.get.mockResolvedValue({ id: 100 });
      mockChrome.tabs.query.mockResolvedValue(mockTabs);

      await switchTab(100);

      expect(mockChrome.tabs.update).not.toHaveBeenCalled();
      expect(logTabSwitch).not.toHaveBeenCalled();
    });

    test('should do nothing when no tabs exist', async () => {
      mockChrome.windows.get.mockResolvedValue({ id: 100 });
      mockChrome.tabs.query.mockResolvedValue([]);

      await switchTab(100);

      expect(mockChrome.tabs.update).not.toHaveBeenCalled();
    });

    test('should handle no active tab found', async () => {
      const mockTabs = [
        { id: 1, index: 0, active: false, title: 'Tab 1' },
        { id: 2, index: 1, active: false, title: 'Tab 2' },
      ];

      mockChrome.windows.get.mockResolvedValue({ id: 100 });
      mockChrome.tabs.query.mockResolvedValue(mockTabs);

      await switchTab(100);

      expect(mockChrome.tabs.update).not.toHaveBeenCalled();
    });

    test('should handle active tab with undefined index', async () => {
      const mockTabs = [
        { id: 1, active: true, title: 'Bad Tab' }, // no index
        { id: 2, index: 1, active: false, title: 'Tab 2' },
      ];

      mockChrome.windows.get.mockResolvedValue({ id: 100 });
      mockChrome.tabs.query.mockResolvedValue(mockTabs);

      await switchTab(100);

      expect(mockChrome.tabs.update).not.toHaveBeenCalled();
    });

    test('should handle next tab with no ID', async () => {
      const mockTabs = [
        { id: 1, index: 0, active: true, title: 'Tab 1' },
        { index: 1, active: false, title: 'Tab 2' }, // no id
      ];

      mockChrome.windows.get.mockResolvedValue({ id: 100 });
      mockChrome.tabs.query.mockResolvedValue(mockTabs);

      await switchTab(100);

      expect(mockChrome.tabs.update).not.toHaveBeenCalled();
    });

    test('should handle tabs with missing titles', async () => {
      const mockTabs = [
        { id: 1, index: 0, active: true }, // no title
        { id: 2, index: 1, active: false }, // no title
      ];

      mockChrome.windows.get.mockResolvedValue({ id: 100 });
      mockChrome.tabs.query.mockResolvedValue(mockTabs);
      mockChrome.tabs.update.mockResolvedValue({});
      mockChrome.storage.local.get.mockResolvedValue({ lastSwitchTimes: {} });
      mockChrome.storage.local.set.mockResolvedValue(undefined);

      await switchTab(100);

      expect(logTabSwitch).toHaveBeenCalledWith(
        expect.objectContaining({
          previousTabTitle: 'Unknown',
          newTabTitle: 'Unknown',
        })
      );
    });

    test('should handle errors gracefully', async () => {
      const error = new Error('Chrome API error');
      mockChrome.windows.get.mockResolvedValue({ id: 100 });
      mockChrome.tabs.query.mockRejectedValue(error);

      await switchTab(100);

      expect(logger.error).toHaveBeenCalledWith(
        'TabSwitcher',
        'Error switching tabs',
        { error: 'Chrome API error' }
      );
    });

    test('should handle non-Error exceptions', async () => {
      mockChrome.windows.get.mockResolvedValue({ id: 100 });
      mockChrome.tabs.query.mockRejectedValue('String error');

      await switchTab(100);

      expect(logger.error).toHaveBeenCalledWith(
        'TabSwitcher',
        'Error switching tabs',
        { error: 'String error' }
      );
    });
  });

  describe('Multiple Tabs Navigation', () => {
    test('should navigate through 5 tabs sequentially', async () => {
      const mockTabs = [
        { id: 1, index: 0, active: false, title: 'Tab 1' },
        { id: 2, index: 1, active: false, title: 'Tab 2' },
        { id: 3, index: 2, active: false, title: 'Tab 3' },
        { id: 4, index: 3, active: false, title: 'Tab 4' },
        { id: 5, index: 4, active: false, title: 'Tab 5' },
      ];

      mockChrome.windows.get.mockResolvedValue({ id: 100 });
      mockChrome.storage.local.get.mockResolvedValue({ lastSwitchTimes: {} });
      mockChrome.storage.local.set.mockResolvedValue(undefined);

      // Start at tab 1
      mockTabs[0].active = true;
      mockChrome.tabs.query.mockResolvedValue(mockTabs);
      mockChrome.tabs.update.mockResolvedValue({});
      await switchTab(100);
      expect(mockChrome.tabs.update).toHaveBeenCalledWith(2, { active: true });

      // Move to tab 3
      jest.clearAllMocks();
      mockTabs[0].active = false;
      mockTabs[1].active = false;
      mockTabs[2].active = true;
      mockChrome.windows.get.mockResolvedValue({ id: 100 });
      mockChrome.tabs.query.mockResolvedValue(mockTabs);
      mockChrome.tabs.update.mockResolvedValue({});
      mockChrome.storage.local.get.mockResolvedValue({ lastSwitchTimes: {} });
      mockChrome.storage.local.set.mockResolvedValue(undefined);
      await switchTab(100);
      expect(mockChrome.tabs.update).toHaveBeenCalledWith(4, { active: true });

      // Wrap around from tab 5 to tab 1
      jest.clearAllMocks();
      mockTabs.forEach(t => (t.active = false));
      mockTabs[4].active = true;
      mockChrome.windows.get.mockResolvedValue({ id: 100 });
      mockChrome.tabs.query.mockResolvedValue(mockTabs);
      mockChrome.tabs.update.mockResolvedValue({});
      mockChrome.storage.local.get.mockResolvedValue({ lastSwitchTimes: {} });
      mockChrome.storage.local.set.mockResolvedValue(undefined);
      await switchTab(100);
      expect(mockChrome.tabs.update).toHaveBeenCalledWith(1, { active: true });
    });
  });
});
