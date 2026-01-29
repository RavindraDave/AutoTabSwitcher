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

// Mock premium-access module
jest.mock('../core/premium-access.js', () => ({
  canAccessPremium: jest.fn().mockResolvedValue(false),
}));

// Mock premium modules with exportable functions
const mockSkipRuleEngine = {
  filterTabs: jest.fn(),
};

const mockRefreshManager = {
  shouldRefresh: jest.fn(),
  preemptiveRefresh: jest.fn(),
  postSwitchRefresh: jest.fn(),
};

jest.mock('../premium/SkipRuleEngine.js', () => ({
  skipRuleEngine: mockSkipRuleEngine,
}));

jest.mock('../premium/RefreshManager.js', () => ({
  refreshManager: mockRefreshManager,
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

  describe('Window Mode Bug Detection (Lines 79-84)', () => {
    test('should detect and log bug when window mode used without specificWindowId', async () => {
      // Set up window mode without providing specificWindowId (bug scenario)
      mockChrome.storage.local.get.mockResolvedValue({
        switchingMode: 'window',
        windowMode: 'global', // Not legacy current-window
      });

      const result = await switchTab(); // Called without specificWindowId

      expect(logger.error).toHaveBeenCalledWith(
        'TabSwitcher',
        expect.stringContaining('BUG: Window mode without specificWindowId'),
        expect.objectContaining({
          switchingMode: 'window',
          callStack: expect.any(String),
        })
      );
      expect(result).toBe(false);
      expect(mockChrome.tabs.query).not.toHaveBeenCalled();
    });

    test('should not trigger bug detection for legacy current-window mode', async () => {
      mockChrome.storage.local.get.mockResolvedValue({
        switchingMode: 'window',
        windowMode: 'current-window', // Legacy mode
        selectedWindowId: 300,
      });
      mockChrome.windows.get.mockResolvedValue({ id: 300 });
      mockChrome.tabs.query.mockResolvedValue([
        { id: 1, index: 0, active: true, title: 'Tab 1' },
        { id: 2, index: 1, active: false, title: 'Tab 2' },
      ]);
      mockChrome.tabs.update.mockResolvedValue({});
      mockChrome.storage.local.set.mockResolvedValue(undefined);

      await switchTab();

      // Should not log the bug error
      expect(logger.error).not.toHaveBeenCalledWith(
        'TabSwitcher',
        expect.stringContaining('BUG'),
        expect.anything()
      );
      expect(mockChrome.tabs.update).toHaveBeenCalled();
    });
  });

  describe('Window States Update for Window Mode (Lines 211-221)', () => {
    test('should update windowStates when in window mode with existing state', async () => {
      const existingTimestamp = 1000000;
      const mockTabs = [
        { id: 1, index: 0, active: true, title: 'Tab 1' },
        { id: 2, index: 1, active: false, title: 'Tab 2' },
      ];

      mockChrome.windows.get.mockResolvedValue({ id: 100 });
      mockChrome.tabs.query.mockResolvedValue(mockTabs);
      mockChrome.tabs.update.mockResolvedValue({});
      mockChrome.storage.local.get.mockImplementation((keys) => {
        if (Array.isArray(keys) && keys.includes('lastSwitchTimes')) {
          return Promise.resolve({
            lastSwitchTimes: {},
            windowStates: {
              100: {
                enabled: true,
                enabledTimestamp: existingTimestamp,
                lastSwitchTime: 900000,
              },
            },
            switchingMode: 'window',
          });
        }
        return Promise.resolve({});
      });
      mockChrome.storage.local.set.mockResolvedValue(undefined);

      const beforeTime = Date.now();
      await switchTab(100); // specificWindowId triggers window mode
      const afterTime = Date.now();

      const setCall = mockChrome.storage.local.set.mock.calls.find((call) =>
        call[0].windowStates !== undefined
      );
      expect(setCall).toBeDefined();
      expect(setCall[0].windowStates[100].enabled).toBe(true);
      expect(setCall[0].windowStates[100].enabledTimestamp).toBe(
        existingTimestamp
      );
      expect(setCall[0].windowStates[100].lastSwitchTime).toBeGreaterThanOrEqual(
        beforeTime
      );
      expect(setCall[0].windowStates[100].lastSwitchTime).toBeLessThanOrEqual(
        afterTime
      );
    });

    test('should only update lastSwitchTimes when windowState does not exist', async () => {
      const mockTabs = [
        { id: 1, index: 0, active: true, title: 'Tab 1' },
        { id: 2, index: 1, active: false, title: 'Tab 2' },
      ];

      mockChrome.windows.get.mockResolvedValue({ id: 100 });
      mockChrome.tabs.query.mockResolvedValue(mockTabs);
      mockChrome.tabs.update.mockResolvedValue({});
      mockChrome.storage.local.get.mockImplementation((keys) => {
        if (Array.isArray(keys) && keys.includes('lastSwitchTimes')) {
          return Promise.resolve({
            lastSwitchTimes: {},
            windowStates: {
              200: { enabled: true, enabledTimestamp: 1000000 }, // Different window
            },
            switchingMode: 'window',
          });
        }
        return Promise.resolve({});
      });
      mockChrome.storage.local.set.mockResolvedValue(undefined);

      await switchTab(100);

      // Should only update lastSwitchTimes, not windowStates
      const setCall = mockChrome.storage.local.set.mock.calls[0][0];
      expect(setCall.lastSwitchTimes[100]).toBeDefined();
      expect(setCall.windowStates).toBeUndefined();
    });

    test('should handle inconsistent windowStates (Line 221)', async () => {
      // Edge case: windowStates[targetWindowId] exists but currentState is null/undefined
      const mockTabs = [
        { id: 1, index: 0, active: true, title: 'Tab 1' },
        { id: 2, index: 1, active: false, title: 'Tab 2' },
      ];

      mockChrome.windows.get.mockResolvedValue({ id: 100 });
      mockChrome.tabs.query.mockResolvedValue(mockTabs);
      mockChrome.tabs.update.mockResolvedValue({});
      mockChrome.storage.local.get.mockImplementation((keys) => {
        if (Array.isArray(keys) && keys.includes('lastSwitchTimes')) {
          return Promise.resolve({
            lastSwitchTimes: {},
            windowStates: {
              100: null, // Inconsistent state: key exists but value is null
            },
            switchingMode: 'window',
          });
        }
        return Promise.resolve({});
      });
      mockChrome.storage.local.set.mockResolvedValue(undefined);

      await switchTab(100);

      // Should update lastSwitchTimes without windowStates (line 221)
      const setCall = mockChrome.storage.local.set.mock.calls[0][0];
      expect(setCall.lastSwitchTimes[100]).toBeDefined();
      expect(setCall.windowStates).toBeUndefined();
    });

    test('should only update lastSwitchTimes in global mode', async () => {
      const mockTabs = [
        { id: 1, index: 0, active: true, title: 'Tab 1' },
        { id: 2, index: 1, active: false, title: 'Tab 2' },
      ];

      mockChrome.storage.local.get.mockImplementation((keys) => {
        if (Array.isArray(keys) && keys.includes('lastSwitchTimes')) {
          return Promise.resolve({
            lastSwitchTimes: {},
            windowStates: {
              200: { enabled: true, enabledTimestamp: 1000000 },
            },
            switchingMode: 'global',
          });
        }
        return Promise.resolve({ windowMode: 'global' });
      });
      mockChrome.windows.getLastFocused.mockResolvedValue({ id: 200 });
      mockChrome.tabs.query.mockResolvedValue(mockTabs);
      mockChrome.tabs.update.mockResolvedValue({});
      mockChrome.storage.local.set.mockResolvedValue(undefined);

      await switchTab();

      // Should only update lastSwitchTimes in global mode
      const setCall = mockChrome.storage.local.set.mock.calls[0][0];
      expect(setCall.lastSwitchTimes[200]).toBeDefined();
      expect(setCall.windowStates).toBeUndefined();
    });
  });

  describe('Premium Features Error Handling', () => {
    let canAccessPremium: any;

    beforeEach(async () => {
      // Get the mocked canAccessPremium function
      const premiumAccessModule = await import('../core/premium-access.js');
      canAccessPremium = premiumAccessModule.canAccessPremium as jest.Mock;

      // Reset all premium mocks
      mockSkipRuleEngine.filterTabs.mockReset();
      mockRefreshManager.shouldRefresh.mockReset();
      mockRefreshManager.preemptiveRefresh.mockReset();
      mockRefreshManager.postSwitchRefresh.mockReset();
    });

    describe('Skip Rule Engine Errors (Lines 125-135)', () => {
      test('should handle skip rule engine errors and use original tabs', async () => {
        const mockTabs = [
          { id: 1, index: 0, active: true, title: 'Tab 1' },
          { id: 2, index: 1, active: false, title: 'Tab 2' },
          { id: 3, index: 2, active: false, title: 'Tab 3' },
        ];

        canAccessPremium.mockResolvedValue(true);
        mockSkipRuleEngine.filterTabs.mockRejectedValue(new Error('Skip rule error'));

        mockChrome.windows.get.mockResolvedValue({ id: 100 });
        mockChrome.tabs.query.mockResolvedValue(mockTabs);
        mockChrome.tabs.update.mockResolvedValue({});
        mockChrome.storage.local.get.mockResolvedValue({ lastSwitchTimes: {} });
        mockChrome.storage.local.set.mockResolvedValue(undefined);

        await switchTab(100);

        // Should still switch tabs with original tabs
        expect(mockChrome.tabs.update).toHaveBeenCalledWith(2, { active: true });
        expect(logger.error).toHaveBeenCalledWith(
          'Premium',
          'Error applying skip rules, using all tabs',
          expect.objectContaining({ error: 'Skip rule error' })
        );
      });

      test('should handle non-Error exceptions in skip rules', async () => {
        const mockTabs = [
          { id: 1, index: 0, active: true, title: 'Tab 1' },
          { id: 2, index: 1, active: false, title: 'Tab 2' },
        ];

        canAccessPremium.mockResolvedValue(true);
        mockSkipRuleEngine.filterTabs.mockRejectedValue('String error');

        mockChrome.windows.get.mockResolvedValue({ id: 100 });
        mockChrome.tabs.query.mockResolvedValue(mockTabs);
        mockChrome.tabs.update.mockResolvedValue({});
        mockChrome.storage.local.get.mockResolvedValue({ lastSwitchTimes: {} });
        mockChrome.storage.local.set.mockResolvedValue(undefined);

        await switchTab(100);

        // Should continue with tab switching
        expect(mockChrome.tabs.update).toHaveBeenCalled();
        expect(logger.error).toHaveBeenCalledWith(
          'Premium',
          'Error applying skip rules, using all tabs',
          expect.objectContaining({ error: 'String error' })
        );
      });

      test('should use filtered tabs when skip rules succeed', async () => {
        const mockTabs = [
          { id: 1, index: 0, active: true, title: 'Tab 1' },
          { id: 2, index: 1, active: false, title: 'Tab 2' },
          { id: 3, index: 2, active: false, title: 'Tab 3' },
        ];
        const filteredTabs = [mockTabs[0], mockTabs[2]]; // Skip tab 2

        canAccessPremium.mockResolvedValue(true);
        mockSkipRuleEngine.filterTabs.mockResolvedValue(filteredTabs);

        mockChrome.windows.get.mockResolvedValue({ id: 100 });
        mockChrome.tabs.query.mockResolvedValue(mockTabs);
        mockChrome.tabs.update.mockResolvedValue({});
        mockChrome.storage.local.get.mockResolvedValue({ lastSwitchTimes: {} });
        mockChrome.storage.local.set.mockResolvedValue(undefined);

        await switchTab(100);

        // Should switch to tab 3 (skipping tab 2)
        expect(mockChrome.tabs.update).toHaveBeenCalledWith(3, { active: true });
        expect(logger.info).toHaveBeenCalledWith(
          'Premium',
          'Skip rules applied',
          expect.objectContaining({
            // Note: originalCount is logged as filteredTabs.length due to tabs reassignment
            originalCount: 2,
            filteredCount: 2,
          })
        );
      });
    });

    describe('Preemptive Refresh Errors (Lines 166-176)', () => {
      test('should handle preemptive refresh errors and continue switching', async () => {
        const mockTabs = [
          { id: 1, index: 0, active: true, title: 'Tab 1' },
          { id: 2, index: 1, active: false, title: 'Tab 2' },
        ];

        canAccessPremium.mockResolvedValue(true);
        mockRefreshManager.shouldRefresh.mockResolvedValue(true);
        mockRefreshManager.preemptiveRefresh.mockRejectedValue(
          new Error('Refresh failed')
        );

        mockChrome.windows.get.mockResolvedValue({ id: 100 });
        mockChrome.tabs.query.mockResolvedValue(mockTabs);
        mockChrome.tabs.update.mockResolvedValue({});
        mockChrome.storage.local.get.mockResolvedValue({ lastSwitchTimes: {} });
        mockChrome.storage.local.set.mockResolvedValue(undefined);

        await switchTab(100);

        // Should still switch tabs despite refresh error
        expect(mockChrome.tabs.update).toHaveBeenCalledWith(2, { active: true });
        expect(logger.error).toHaveBeenCalledWith(
          'Premium',
          'Error in preemptive refresh',
          expect.objectContaining({
            error: 'Refresh failed',
            tabId: 2,
          })
        );
      });

      test('should handle non-Error exceptions in preemptive refresh', async () => {
        const mockTabs = [
          { id: 1, index: 0, active: true, title: 'Tab 1' },
          { id: 2, index: 1, active: false, title: 'Tab 2' },
        ];

        canAccessPremium.mockResolvedValue(true);
        mockRefreshManager.shouldRefresh.mockResolvedValue(true);
        mockRefreshManager.preemptiveRefresh.mockRejectedValue('String error');

        mockChrome.windows.get.mockResolvedValue({ id: 100 });
        mockChrome.tabs.query.mockResolvedValue(mockTabs);
        mockChrome.tabs.update.mockResolvedValue({});
        mockChrome.storage.local.get.mockResolvedValue({ lastSwitchTimes: {} });
        mockChrome.storage.local.set.mockResolvedValue(undefined);

        await switchTab(100);

        // Should continue normally
        expect(mockChrome.tabs.update).toHaveBeenCalled();
        expect(logger.error).toHaveBeenCalledWith(
          'Premium',
          'Error in preemptive refresh',
          expect.objectContaining({ error: 'String error' })
        );
      });

      test('should complete preemptive refresh successfully', async () => {
        const mockTabs = [
          { id: 1, index: 0, active: true, title: 'Tab 1' },
          { id: 2, index: 1, active: false, title: 'Tab 2' },
        ];

        canAccessPremium.mockResolvedValue(true);
        mockRefreshManager.shouldRefresh.mockResolvedValue(true);
        mockRefreshManager.preemptiveRefresh.mockResolvedValue(undefined);

        mockChrome.windows.get.mockResolvedValue({ id: 100 });
        mockChrome.tabs.query.mockResolvedValue(mockTabs);
        mockChrome.tabs.update.mockResolvedValue({});
        mockChrome.storage.local.get.mockResolvedValue({ lastSwitchTimes: {} });
        mockChrome.storage.local.set.mockResolvedValue(undefined);

        await switchTab(100);

        expect(mockChrome.tabs.update).toHaveBeenCalledWith(2, { active: true });
        expect(logger.info).toHaveBeenCalledWith(
          'Premium',
          'Preemptive refresh completed',
          expect.objectContaining({
            tabId: 2,
            title: 'Tab 2',
          })
        );
      });
    });

    describe('Post-Switch Refresh Errors (Lines 187-194)', () => {
      test('should handle post-switch refresh errors gracefully', async () => {
        const mockTabs = [
          { id: 1, index: 0, active: true, title: 'Tab 1' },
          { id: 2, index: 1, active: false, title: 'Tab 2' },
        ];

        canAccessPremium.mockResolvedValue(true);
        mockRefreshManager.postSwitchRefresh.mockRejectedValue(
          new Error('Post-switch failed')
        );

        mockChrome.windows.get.mockResolvedValue({ id: 100 });
        mockChrome.tabs.query.mockResolvedValue(mockTabs);
        mockChrome.tabs.update.mockResolvedValue({});
        mockChrome.storage.local.get.mockResolvedValue({ lastSwitchTimes: {} });
        mockChrome.storage.local.set.mockResolvedValue(undefined);

        const result = await switchTab(100);

        // Should complete successfully
        expect(result).toBe(true);
        expect(mockChrome.tabs.update).toHaveBeenCalledWith(2, { active: true });
        expect(logger.error).toHaveBeenCalledWith(
          'Premium',
          'Error in post-switch refresh',
          expect.objectContaining({
            error: 'Post-switch failed',
            tabId: 2,
          })
        );
      });

      test('should handle non-Error exceptions in post-switch refresh', async () => {
        const mockTabs = [
          { id: 1, index: 0, active: true, title: 'Tab 1' },
          { id: 2, index: 1, active: false, title: 'Tab 2' },
        ];

        canAccessPremium.mockResolvedValue(true);
        mockRefreshManager.postSwitchRefresh.mockRejectedValue('String error');

        mockChrome.windows.get.mockResolvedValue({ id: 100 });
        mockChrome.tabs.query.mockResolvedValue(mockTabs);
        mockChrome.tabs.update.mockResolvedValue({});
        mockChrome.storage.local.get.mockResolvedValue({ lastSwitchTimes: {} });
        mockChrome.storage.local.set.mockResolvedValue(undefined);

        const result = await switchTab(100);

        expect(result).toBe(true);
        expect(logger.error).toHaveBeenCalledWith(
          'Premium',
          'Error in post-switch refresh',
          expect.objectContaining({ error: 'String error' })
        );
      });

      test('should complete post-switch refresh successfully', async () => {
        const mockTabs = [
          { id: 1, index: 0, active: true, title: 'Tab 1' },
          { id: 2, index: 1, active: false, title: 'Tab 2' },
        ];

        canAccessPremium.mockResolvedValue(true);
        mockRefreshManager.postSwitchRefresh.mockResolvedValue(undefined);

        mockChrome.windows.get.mockResolvedValue({ id: 100 });
        mockChrome.tabs.query.mockResolvedValue(mockTabs);
        mockChrome.tabs.update.mockResolvedValue({});
        mockChrome.storage.local.get.mockResolvedValue({ lastSwitchTimes: {} });
        mockChrome.storage.local.set.mockResolvedValue(undefined);

        await switchTab(100);

        expect(mockChrome.tabs.update).toHaveBeenCalled();
        expect(logger.info).toHaveBeenCalledWith(
          'Premium',
          'Post-switch refresh completed',
          expect.objectContaining({
            tabId: 2,
            title: 'Tab 2',
          })
        );
      });
    });
  });

  describe('Additional Edge Cases for Coverage', () => {
    test('should return false when tabs.length is exactly 1', async () => {
      const mockTabs = [{ id: 1, index: 0, active: true, title: 'Only Tab' }];

      mockChrome.windows.get.mockResolvedValue({ id: 100 });
      mockChrome.tabs.query.mockResolvedValue(mockTabs);

      const result = await switchTab(100);

      expect(result).toBe(false);
      expect(mockChrome.tabs.update).not.toHaveBeenCalled();
    });

    test('should return false when nextTab has no id', async () => {
      const mockTabs = [
        { id: 1, index: 0, active: true, title: 'Tab 1' },
        { index: 1, active: false, title: 'Tab without id' },
      ];

      mockChrome.windows.get.mockResolvedValue({ id: 100 });
      mockChrome.tabs.query.mockResolvedValue(mockTabs);

      const result = await switchTab(100);

      expect(result).toBe(false);
      expect(mockChrome.tabs.update).not.toHaveBeenCalled();
    });

    test('should return false when nextTab is undefined', async () => {
      // Edge case where tabs array might be malformed
      const mockTabs = [{ id: 1, index: 0, active: true, title: 'Tab 1' }];

      mockChrome.windows.get.mockResolvedValue({ id: 100 });
      mockChrome.tabs.query.mockResolvedValue(mockTabs);

      const result = await switchTab(100);

      expect(result).toBe(false);
    });

    test('should handle targetWindowId being undefined edge case', async () => {
      const mockTabs = [
        { id: 1, index: 0, active: true, title: 'Tab 1' },
        { id: 2, index: 1, active: false, title: 'Tab 2' },
      ];

      // Create a scenario where window.id is undefined
      mockChrome.storage.local.get.mockResolvedValue({ windowMode: 'global' });
      mockChrome.windows.getLastFocused.mockResolvedValue({}); // No id
      mockChrome.tabs.query.mockResolvedValue(mockTabs);

      const result = await switchTab();

      // Should return false because targetWindowId is undefined
      expect(result).toBe(false);
    });
  });
});
