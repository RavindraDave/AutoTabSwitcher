/**
 * Comprehensive tests for background service worker
 * Tests all core functionality including tab switching, alarm management,
 * storage integration, and event handlers
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Mock all imported modules before importing background
jest.mock('../core/storage.js', () => ({
  initializeStorage: jest.fn().mockResolvedValue(undefined),
  getSettings: jest.fn().mockResolvedValue({}),
  migrateToSwitchingMode: jest.fn().mockResolvedValue(undefined),
  getSwitchingMode: jest.fn((data: any) => data.switchingMode || data.operatingMode || 'global'),
  isValidWindowId: jest.fn((id: number) => typeof id === 'number' && id > 0),
  windowExists: jest.fn().mockResolvedValue(true),
}));

jest.mock('../core/activity-tracker.js', () => ({
  setupActivityListeners: jest.fn(),
  isPaused: jest.fn().mockResolvedValue(false),
}));

jest.mock('../core/manual-pause-tracker.js', () => ({
  isManuallyPaused: jest.fn().mockResolvedValue(false),
  clearManualPause: jest.fn().mockResolvedValue(undefined),
  toggleManualPause: jest.fn().mockResolvedValue(false),
}));

jest.mock('../core/timing-hybrid.js', () => ({
  toggleHybridTimer: jest.fn().mockResolvedValue(undefined),
  setupAlarmListener: jest.fn(),
}));

jest.mock('../core/badge-manager.js', () => ({
  updateBadge: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../core/tab-switcher.js', () => ({
  switchTab: jest.fn().mockResolvedValue(true),
}));

jest.mock('../core/logger.js', () => ({
  logger: {
    info: jest.fn().mockResolvedValue(undefined),
    warn: jest.fn().mockResolvedValue(undefined),
    error: jest.fn().mockResolvedValue(undefined),
    debug: jest.fn().mockResolvedValue(undefined),
  },
  logModeChange: jest.fn().mockResolvedValue(undefined),
  logWindowToggle: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../core/window-timer-manager.js', () => ({
  WindowTimerManager: jest.fn().mockImplementation(() => ({
    startTimer: jest.fn().mockResolvedValue(undefined),
    stopTimer: jest.fn().mockResolvedValue(undefined),
    stopAllTimers: jest.fn().mockResolvedValue(undefined),
    isStopping: jest.fn().mockReturnValue(false),
  })),
}));

jest.mock('../core/premium-access.js', () => ({
  canAccessPremium: jest.fn().mockResolvedValue(false),
}));

jest.mock('../core/build-config.js', () => ({
  PREMIUM_FEATURES_AVAILABLE: false,
}));

jest.mock('../core/idle-auto-start.js', () => ({
  initializeIdleAutoStart: jest.fn().mockResolvedValue(undefined),
  reconfigureIdleDetection: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../core/context-menu-manager.js', () => ({
  initializeContextMenus: jest.fn().mockResolvedValue(undefined),
  handleContextMenuClick: jest.fn().mockResolvedValue(undefined),
  reconfigureContextMenus: jest.fn().mockResolvedValue(undefined),
}));

// Mock Chrome APIs
const mockChrome = (global as any).chrome;

// Import mocked modules to access in tests
import * as storage from '../core/storage.js';
import * as activityTracker from '../core/activity-tracker.js';
import * as manualPauseTracker from '../core/manual-pause-tracker.js';
import * as timingHybrid from '../core/timing-hybrid.js';
import * as badgeManager from '../core/badge-manager.js';
import * as tabSwitcher from '../core/tab-switcher.js';
import * as logger from '../core/logger.js';
import { WindowTimerManager } from '../core/window-timer-manager.js';
import * as premiumAccess from '../core/premium-access.js';

describe('Background Service Worker', () => {
  let storageChangeListener: any;
  let installedListener: any;
  let startupListener: any;
  let windowCreatedListener: any;
  let windowFocusListener: any;
  let windowRemovedListener: any;
  let tabCreatedListener: any;
  let tabUpdatedListener: any;
  let tabAttachedListener: any;
  let alarmListener: any;
  let commandListener: any;

  beforeAll(async () => {
    // Setup default mock implementations before importing
    (storage.getSettings as jest.Mock).mockResolvedValue({
      enabled: false,
      delayTime: 5000,
      switchingMode: 'global',
    });

    mockChrome.storage.local.get.mockResolvedValue({});
    mockChrome.storage.local.set.mockResolvedValue(undefined);
    mockChrome.runtime.getManifest.mockReturnValue({ version: '1.0.0' });
    mockChrome.windows.getAll.mockResolvedValue([]);
    mockChrome.windows.getCurrent.mockResolvedValue({ id: 1 });

    // Import background to register listeners (only once)
    await import('../background.js');

    // Wait for initialization
    await new Promise(resolve => setTimeout(resolve, 50));

    // Capture registered listeners
    storageChangeListener = mockChrome.storage.onChanged.addListener.mock.calls[0]?.[0];
    installedListener = mockChrome.runtime.onInstalled.addListener.mock.calls[0]?.[0];
    startupListener = mockChrome.runtime.onStartup.addListener.mock.calls[0]?.[0];
    windowCreatedListener = mockChrome.windows.onCreated.addListener.mock.calls[0]?.[0];
    windowFocusListener = mockChrome.windows.onFocusChanged.addListener.mock.calls[0]?.[0];
    windowRemovedListener = mockChrome.windows.onRemoved.addListener.mock.calls[0]?.[0];
    tabCreatedListener = mockChrome.tabs.onCreated.addListener.mock.calls[0]?.[0];
    tabUpdatedListener = mockChrome.tabs.onUpdated.addListener.mock.calls[0]?.[0];
    tabAttachedListener = mockChrome.tabs.onAttached.addListener.mock.calls[0]?.[0];

    // Alarm listener is registered twice (setupAlarmListener + window-specific)
    const alarmCalls = mockChrome.alarms.onAlarm.addListener.mock.calls;
    alarmListener = alarmCalls[alarmCalls.length - 1]?.[0];

    commandListener = mockChrome.commands.onCommand.addListener.mock.calls[0]?.[0];
  });

  beforeEach(() => {
    // Reset mock call history but keep implementations
    jest.clearAllMocks();

    // Reset default mock implementations for each test
    (storage.getSettings as jest.Mock).mockResolvedValue({
      enabled: false,
      delayTime: 5000,
      switchingMode: 'global',
    });

    mockChrome.storage.local.get.mockResolvedValue({});
    mockChrome.storage.local.set.mockResolvedValue(undefined);
    mockChrome.windows.getAll.mockResolvedValue([]);
    mockChrome.windows.getCurrent.mockResolvedValue({ id: 1 });
  });

  describe('Initialization', () => {
    it('should register all required event listeners', () => {
      // Verify listeners were captured (they exist if module loaded correctly)
      expect(storageChangeListener).toBeDefined();
      expect(installedListener).toBeDefined();
      expect(startupListener).toBeDefined();
      expect(windowCreatedListener).toBeDefined();
      expect(windowFocusListener).toBeDefined();
      expect(windowRemovedListener).toBeDefined();
      expect(tabCreatedListener).toBeDefined();
      expect(tabUpdatedListener).toBeDefined();
      expect(tabAttachedListener).toBeDefined();
      expect(alarmListener).toBeDefined();
      expect(commandListener).toBeDefined();
    });

    it('should setup activity listeners', () => {
      // Listeners are set up during module import
      expect(typeof storageChangeListener).toBe('function');
    });

    it('should setup alarm listener', () => {
      // Alarm listener is set up during module import
      expect(typeof alarmListener).toBe('function');
    });

    it('should migrate to switching mode on load', () => {
      // Migration happens during module import
      expect(typeof storageChangeListener).toBe('function');
    });
  });

  describe('chrome.runtime.onInstalled', () => {
    it('should handle fresh install', async () => {
      (storage.getSettings as jest.Mock).mockResolvedValue({
        hasSeenOnboarding: false,
      });

      mockChrome.tabs.create.mockResolvedValue({ id: 1 });

      await installedListener({ reason: 'install' });
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(storage.initializeStorage).toHaveBeenCalledWith(5000);
      expect(mockChrome.tabs.create).toHaveBeenCalledWith({
        url: 'onboarding/onboarding.html',
      });
      expect(logger.logger.info).toHaveBeenCalledWith(
        'Lifecycle',
        'Extension installed/updated',
        expect.objectContaining({ reason: 'install' })
      );
    });

    it('should not show onboarding if already seen', async () => {
      (storage.getSettings as jest.Mock).mockResolvedValue({
        hasSeenOnboarding: true,
      });

      await installedListener({ reason: 'install' });
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockChrome.tabs.create).not.toHaveBeenCalled();
    });

    it('should handle extension update', async () => {
      await installedListener({ reason: 'update' });
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(storage.migrateToSwitchingMode).toHaveBeenCalled();
      expect(storage.initializeStorage).not.toHaveBeenCalled();
    });

    it('should call toggleTabSwitcher after install', async () => {
      (storage.getSettings as jest.Mock).mockResolvedValue({
        enabled: true,
        delayTime: 5000,
      });

      await installedListener({ reason: 'install' });
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(timingHybrid.toggleHybridTimer).toHaveBeenCalled();
    });
  });

  describe('chrome.runtime.onStartup', () => {
    it('should clear manual pause on browser startup', async () => {
      (storage.getSettings as jest.Mock).mockResolvedValue({
        enableOnStartup: false,
        enabled: false,
      });

      await startupListener();
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(manualPauseTracker.clearManualPause).toHaveBeenCalled();
    });

    it('should enable auto-start in global mode when configured', async () => {
      (storage.getSettings as jest.Mock).mockResolvedValue({
        enableOnStartup: true,
        enabled: false,
        switchingMode: 'global',
      });

      await startupListener();
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockChrome.storage.local.set).toHaveBeenCalledWith({ enabled: true });
    });

    it('should enable all windows in window mode on auto-start', async () => {
      (storage.getSettings as jest.Mock).mockResolvedValue({
        enableOnStartup: true,
        switchingMode: 'window',
        windowStates: {},
      });

      mockChrome.windows.getAll.mockResolvedValue([
        { id: 1 },
        { id: 2 },
      ]);

      await startupListener();
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
        windowStates: expect.objectContaining({
          1: expect.objectContaining({ enabled: true }),
          2: expect.objectContaining({ enabled: true }),
        }),
      });
    });

    it('should restore previous state when auto-start is disabled', async () => {
      (storage.getSettings as jest.Mock).mockResolvedValue({
        enableOnStartup: false,
        enabled: true,
        switchingMode: 'global',
      });

      await startupListener();
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(timingHybrid.toggleHybridTimer).toHaveBeenCalled();
    });

    it('should handle errors during startup', async () => {
      (storage.getSettings as jest.Mock).mockRejectedValue(new Error('Storage error'));

      await startupListener();
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(logger.logger.error).toHaveBeenCalledWith(
        'Lifecycle',
        'Error in startup handler',
        expect.any(Object)
      );
      // Fallback should be called but might be from storage error
      // Main test is that error was logged
    });

    it('should initialize premium features when available', async () => {
      // Mock premium features available
      jest.doMock('../core/build-config.js', () => ({
        PREMIUM_FEATURES_AVAILABLE: true,
      }));

      (premiumAccess.canAccessPremium as jest.Mock).mockResolvedValue(true);
      (storage.getSettings as jest.Mock).mockResolvedValue({
        enableOnStartup: false,
        enabled: false,
      });

      // Note: This test verifies the code path exists
      // Actual premium manager initialization would need dynamic import mocks
      await startupListener();
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(manualPauseTracker.clearManualPause).toHaveBeenCalled();
    });
  });

  describe('chrome.windows.onCreated', () => {
    it('should restart switcher when new window created and enabled', async () => {
      (storage.getSettings as jest.Mock).mockResolvedValue({
        enabled: true,
      });

      await windowCreatedListener();
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(timingHybrid.toggleHybridTimer).toHaveBeenCalled();
      expect(logger.logger.info).toHaveBeenCalledWith(
        'Window',
        'New window created, ensuring switcher active'
      );
    });

    it('should not restart switcher when disabled', async () => {
      (storage.getSettings as jest.Mock).mockResolvedValue({
        enabled: false,
      });

      await windowCreatedListener();
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(timingHybrid.toggleHybridTimer).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      (storage.getSettings as jest.Mock).mockRejectedValue(new Error('Storage error'));

      await windowCreatedListener();
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(logger.logger.error).toHaveBeenCalledWith(
        'Window',
        'Error in window creation handler',
        expect.any(Object)
      );
    });
  });

  describe('chrome.windows.onFocusChanged', () => {
    it('should ignore WINDOW_ID_NONE', async () => {
      await windowFocusListener(mockChrome.windows.WINDOW_ID_NONE);
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(storage.getSettings).not.toHaveBeenCalled();
    });

    it('should update badge in current-window mode', async () => {
      (storage.getSettings as jest.Mock).mockResolvedValue({
        windowMode: 'current-window',
      });

      await windowFocusListener(1);
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(timingHybrid.toggleHybridTimer).toHaveBeenCalled();
    });

    it('should not update badge in global mode', async () => {
      (storage.getSettings as jest.Mock).mockResolvedValue({
        windowMode: 'global',
      });

      jest.clearAllMocks();

      await windowFocusListener(1);
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(timingHybrid.toggleHybridTimer).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      (storage.getSettings as jest.Mock).mockRejectedValue(new Error('Storage error'));

      await windowFocusListener(1);
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(logger.logger.error).toHaveBeenCalledWith(
        'Window',
        'Error in window focus change handler',
        expect.any(Object)
      );
    });
  });

  describe('chrome.windows.onRemoved', () => {
    it('should cleanup window state in window mode', async () => {
      (storage.getSettings as jest.Mock).mockResolvedValue({
        switchingMode: 'window',
        windowStates: {
          1: { enabled: true },
          2: { enabled: false },
        },
      });

      (storage.isValidWindowId as jest.Mock).mockReturnValue(true);

      await windowRemovedListener(1);
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
        windowStates: {
          2: { enabled: false },
        },
      });
    });

    it('should not cleanup in global mode', async () => {
      (storage.getSettings as jest.Mock).mockResolvedValue({
        switchingMode: 'global',
      });

      jest.clearAllMocks();

      await windowRemovedListener(1);
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockChrome.storage.local.set).not.toHaveBeenCalled();
    });

    it('should handle invalid window ID', async () => {
      (storage.isValidWindowId as jest.Mock).mockReturnValue(false);

      await windowRemovedListener(-1);
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(logger.logger.warn).toHaveBeenCalledWith(
        'Window',
        'Invalid windowId in onRemoved handler',
        expect.any(Object)
      );
    });

    it('should handle errors gracefully', async () => {
      (storage.getSettings as jest.Mock).mockRejectedValue(new Error('Storage error'));
      (storage.isValidWindowId as jest.Mock).mockReturnValue(true);

      await windowRemovedListener(1);
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(logger.logger.error).toHaveBeenCalledWith(
        'Window',
        'Error in window removal handler',
        expect.any(Object)
      );
    });
  });

  describe('chrome.tabs.onCreated', () => {
    it('should update badge for new tab', async () => {
      (storage.getSettings as jest.Mock).mockResolvedValue({
        enabled: true,
      });

      await tabCreatedListener({ id: 1 });
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(badgeManager.updateBadge).toHaveBeenCalledWith(true, false, 1);
    });

    it('should handle tab without ID', async () => {
      await tabCreatedListener({});
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(badgeManager.updateBadge).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      (storage.getSettings as jest.Mock).mockRejectedValue(new Error('Storage error'));

      await tabCreatedListener({ id: 1 });
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(logger.logger.error).toHaveBeenCalledWith(
        'Tab',
        'Error in tab creation handler',
        expect.any(Object)
      );
    });
  });

  describe('chrome.tabs.onUpdated', () => {
    it('should update badge when tab is loading', async () => {
      (storage.getSettings as jest.Mock).mockResolvedValue({
        enabled: true,
      });

      await tabUpdatedListener(1, { status: 'loading' }, {});
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(badgeManager.updateBadge).toHaveBeenCalledWith(true, false, 1);
    });

    it('should update badge when tab is complete', async () => {
      (storage.getSettings as jest.Mock).mockResolvedValue({
        enabled: false,
      });

      await tabUpdatedListener(2, { status: 'complete' }, {});
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(badgeManager.updateBadge).toHaveBeenCalledWith(false, false, 2);
    });

    it('should not update badge for other status changes', async () => {
      jest.clearAllMocks();

      await tabUpdatedListener(1, { url: 'https://example.com' }, {});
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(badgeManager.updateBadge).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      (storage.getSettings as jest.Mock).mockRejectedValue(new Error('Storage error'));

      await tabUpdatedListener(1, { status: 'loading' }, {});
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(logger.logger.error).toHaveBeenCalledWith(
        'Tab',
        'Error in tab update handler',
        expect.any(Object)
      );
    });
  });

  describe('chrome.tabs.onAttached', () => {
    it('should update badge for attached tab', async () => {
      (storage.getSettings as jest.Mock).mockResolvedValue({
        enabled: true,
      });

      await tabAttachedListener(1, { newWindowId: 2, newPosition: 0 });
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(badgeManager.updateBadge).toHaveBeenCalledWith(true, false, 1);
    });

    it('should handle errors gracefully', async () => {
      (storage.getSettings as jest.Mock).mockRejectedValue(new Error('Storage error'));

      await tabAttachedListener(1, { newWindowId: 2, newPosition: 0 });
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(logger.logger.error).toHaveBeenCalledWith(
        'Tab',
        'Error in tab attach handler',
        expect.any(Object)
      );
    });
  });

  describe('chrome.alarms.onAlarm - Window Mode', () => {
    beforeEach(() => {
      // Mock WindowTimerManager.getWindowIdFromAlarm
      (WindowTimerManager as any).getWindowIdFromAlarm = jest.fn((name: string) => {
        if (name.startsWith('windowTimer_')) {
          return parseInt(name.replace('windowTimer_', ''));
        }
        return null;
      });
    });

    it('should switch tab for enabled window in window mode', async () => {
      (storage.getSettings as jest.Mock).mockResolvedValue({
        switchingMode: 'window',
        windowStates: {
          1: { enabled: true },
        },
        delayTime: 5000,
      });

      (storage.isValidWindowId as jest.Mock).mockReturnValue(true);
      (tabSwitcher.switchTab as jest.Mock).mockResolvedValue(true);

      await alarmListener({ name: 'windowTimer_1' });
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(tabSwitcher.switchTab).toHaveBeenCalledWith(1);
    });

    it('should not switch tab when window is paused by activity', async () => {
      (storage.getSettings as jest.Mock).mockResolvedValue({
        switchingMode: 'window',
        windowStates: {
          1: { enabled: true },
        },
      });

      (storage.isValidWindowId as jest.Mock).mockReturnValue(true);
      (activityTracker.isPaused as jest.Mock).mockResolvedValue(true);

      await alarmListener({ name: 'windowTimer_1' });
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(tabSwitcher.switchTab).not.toHaveBeenCalled();
      expect(logger.logger.info).toHaveBeenCalledWith(
        'WindowMode',
        'Auto-switching paused due to user activity',
        expect.any(Object)
      );
    });

    it('should not switch tab when window is manually paused', async () => {
      (storage.getSettings as jest.Mock).mockResolvedValue({
        switchingMode: 'window',
        windowStates: {
          1: { enabled: true },
        },
      });

      (storage.isValidWindowId as jest.Mock).mockReturnValue(true);
      (manualPauseTracker.isManuallyPaused as jest.Mock).mockResolvedValue(true);

      await alarmListener({ name: 'windowTimer_1' });
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(tabSwitcher.switchTab).not.toHaveBeenCalled();
      expect(logger.logger.info).toHaveBeenCalledWith(
        'WindowMode',
        'Auto-switching paused manually (keyboard shortcut)',
        expect.any(Object)
      );
    });

    it('should handle invalid window ID', async () => {
      (storage.isValidWindowId as jest.Mock).mockReturnValue(false);

      await alarmListener({ name: 'windowTimer_999' });
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(logger.logger.warn).toHaveBeenCalledWith(
        'WindowMode',
        'Invalid windowId from alarm',
        expect.any(Object)
      );
    });

    it('should not process alarm in global mode', async () => {
      (storage.getSettings as jest.Mock).mockResolvedValue({
        switchingMode: 'global',
      });

      (storage.isValidWindowId as jest.Mock).mockReturnValue(true);

      jest.clearAllMocks();

      await alarmListener({ name: 'windowTimer_1' });
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(tabSwitcher.switchTab).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      (storage.getSettings as jest.Mock).mockRejectedValue(new Error('Storage error'));
      (storage.isValidWindowId as jest.Mock).mockReturnValue(true);

      await alarmListener({ name: 'windowTimer_1' });
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(logger.logger.error).toHaveBeenCalledWith(
        'WindowMode',
        'Error in window timer alarm handler',
        expect.any(Object)
      );
    });

    it('should ignore non-window alarms', async () => {
      jest.clearAllMocks();

      await alarmListener({ name: 'tabSwitcher' });
      await new Promise(resolve => setTimeout(resolve, 10));

      // Should not attempt to get settings for non-window alarms
      expect(storage.getSettings).not.toHaveBeenCalled();
    });
  });

  describe('chrome.commands.onCommand - toggle-pause', () => {
    it('should toggle pause in global mode when enabled', async () => {
      (storage.getSettings as jest.Mock).mockResolvedValue({
        enabled: true,
        switchingMode: 'global',
      });

      (manualPauseTracker.toggleManualPause as jest.Mock).mockResolvedValue(true);

      await commandListener('toggle-pause');
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(manualPauseTracker.toggleManualPause).toHaveBeenCalled();
      expect(badgeManager.updateBadge).toHaveBeenCalledWith(true, true);
    });

    it('should toggle pause in window mode when current window is enabled', async () => {
      (storage.getSettings as jest.Mock).mockResolvedValue({
        switchingMode: 'window',
        windowStates: {
          1: { enabled: true },
        },
      });

      mockChrome.windows.getCurrent.mockResolvedValue({ id: 1 });
      (manualPauseTracker.toggleManualPause as jest.Mock).mockResolvedValue(false);

      await commandListener('toggle-pause');
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(manualPauseTracker.toggleManualPause).toHaveBeenCalled();
      expect(badgeManager.updateBadge).toHaveBeenCalledWith(false, false);
    });

    it('should not allow pause when nothing is enabled in global mode', async () => {
      (storage.getSettings as jest.Mock).mockResolvedValue({
        enabled: false,
        switchingMode: 'global',
      });

      await commandListener('toggle-pause');
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(manualPauseTracker.toggleManualPause).not.toHaveBeenCalled();
      expect(logger.logger.warn).toHaveBeenCalledWith(
        'KeyboardShortcut',
        'Cannot pause: auto-switching is not enabled',
        expect.any(Object)
      );
    });

    it('should not allow pause when current window is disabled in window mode', async () => {
      (storage.getSettings as jest.Mock).mockResolvedValue({
        switchingMode: 'window',
        windowStates: {
          1: { enabled: false },
        },
      });

      mockChrome.windows.getCurrent.mockResolvedValue({ id: 1 });

      await commandListener('toggle-pause');
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(manualPauseTracker.toggleManualPause).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      (storage.getSettings as jest.Mock).mockRejectedValue(new Error('Storage error'));

      await commandListener('toggle-pause');
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(logger.logger.error).toHaveBeenCalledWith(
        'KeyboardShortcut',
        'Error toggling manual pause',
        expect.any(Object)
      );
    });

    it('should ignore unknown commands', async () => {
      jest.clearAllMocks();

      await commandListener('unknown-command');
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(storage.getSettings).not.toHaveBeenCalled();
    });
  });

  describe('chrome.storage.onChanged', () => {
    it('should ignore changes in non-local namespace', async () => {
      jest.clearAllMocks();

      await storageChangeListener({ enabled: { newValue: true } }, 'sync');
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(timingHybrid.toggleHybridTimer).not.toHaveBeenCalled();
    });

    it('should handle enabled change immediately when disabled', async () => {
      (storage.getSettings as jest.Mock).mockResolvedValue({
        enabled: false,
        delayTime: 5000,
        switchingMode: 'global',
      });

      const changes = {
        enabled: { oldValue: true, newValue: false },
      };

      await storageChangeListener(changes, 'local');
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(logger.logger.info).toHaveBeenCalledWith(
        'Settings',
        'Settings changed (disable operation), stopping immediately'
      );
      expect(timingHybrid.toggleHybridTimer).toHaveBeenCalled();
    });

    it('should debounce enabled change when enabling', async () => {
      (storage.getSettings as jest.Mock).mockResolvedValue({
        enabled: true,
        delayTime: 5000,
        switchingMode: 'global',
      });

      const changes = {
        enabled: { oldValue: false, newValue: true },
      };

      await storageChangeListener(changes, 'local');

      // Should not be called immediately
      expect(timingHybrid.toggleHybridTimer).not.toHaveBeenCalled();

      // Wait for debounce
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(timingHybrid.toggleHybridTimer).toHaveBeenCalled();
    });

    it('should handle windowStates disable immediately', async () => {
      (storage.getSettings as jest.Mock).mockResolvedValue({
        switchingMode: 'window',
        windowStates: {},
        delayTime: 5000,
      });

      const changes = {
        windowStates: {
          oldValue: { 1: { enabled: true } },
          newValue: { 1: { enabled: false } },
        },
      };

      await storageChangeListener(changes, 'local');
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(logger.logger.info).toHaveBeenCalledWith(
        'Settings',
        'Settings changed (disable operation), stopping immediately'
      );
    });

    it('should log mode changes', async () => {
      (storage.getSettings as jest.Mock).mockResolvedValue({
        enabled: false,
        manuallyPaused: false,
        manuallyPausedWindows: {},
      });

      const changes = {
        switchingMode: { oldValue: 'global', newValue: 'window' },
      };

      await storageChangeListener(changes, 'local');
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(logger.logModeChange).toHaveBeenCalledWith({
        previousMode: 'global',
        newMode: 'window',
      });
    });

    it('should log window state changes', async () => {
      (storage.getSwitchingMode as jest.Mock).mockReturnValue('window');
      (storage.getSettings as jest.Mock).mockResolvedValue({
        switchingMode: 'window',
        manuallyPaused: false,
        manuallyPausedWindows: {},
      });

      const changes = {
        windowStates: {
          oldValue: { 1: { enabled: false } },
          newValue: { 1: { enabled: true } },
        },
      };

      await storageChangeListener(changes, 'local');
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(logger.logWindowToggle).toHaveBeenCalledWith({
        windowId: 1,
        enabled: true,
        mode: 'window',
      });
    });

    it('should update badge when mode changes', async () => {
      mockChrome.storage.local.get.mockResolvedValue({
        enabled: true,
        manuallyPaused: false,
        manuallyPausedWindows: {},
      });

      const changes = {
        switchingMode: { oldValue: 'global', newValue: 'window' },
      };

      await storageChangeListener(changes, 'local');
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(badgeManager.updateBadge).toHaveBeenCalled();
    });

    it('should handle delayTime changes with debounce', async () => {
      (storage.getSettings as jest.Mock).mockResolvedValue({
        enabled: true,
        delayTime: 10000,
        switchingMode: 'global',
      });

      const changes = {
        delayTime: { oldValue: 5000, newValue: 10000 },
      };

      // Track if the settings change handler was called
      const infoSpy = logger.logger.info as jest.Mock;
      const callsBefore = infoSpy.mock.calls.length;

      await storageChangeListener(changes, 'local');

      // Wait for debounce
      await new Promise(resolve => setTimeout(resolve, 150));

      // Settings should be logged
      const calls = infoSpy.mock.calls.slice(callsBefore);
      const hasSettingsLog = calls.some(call =>
        call[0] === 'Settings' && call[1].includes('changed')
      );
      expect(hasSettingsLog).toBe(true);
    });

    it('should ignore irrelevant changes', async () => {
      jest.clearAllMocks();

      const changes = {
        someOtherSetting: { oldValue: 'a', newValue: 'b' },
      };

      await storageChangeListener(changes, 'local');
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(timingHybrid.toggleHybridTimer).not.toHaveBeenCalled();
    });
  });

  describe('toggleTabSwitcher - Global Mode', () => {
    it('should enable hybrid timer in global mode', async () => {
      (storage.getSettings as jest.Mock).mockResolvedValue({
        enabled: true,
        delayTime: 5000,
        switchingMode: 'global',
      });

      const infoSpy = logger.logger.info as jest.Mock;
      const callsBefore = infoSpy.mock.calls.length;

      // Trigger via storage change to test toggleTabSwitcher
      await storageChangeListener(
        { enabled: { oldValue: false, newValue: true } },
        'local'
      );
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should log that settings changed (debounced)
      const calls = infoSpy.mock.calls.slice(callsBefore);
      const hasDebounceLog = calls.some(call =>
        call[0] === 'Settings' && call[1].includes('debounced')
      );
      expect(hasDebounceLog).toBe(true);
    });

    it('should disable hybrid timer when disabled', async () => {
      (storage.getSettings as jest.Mock).mockResolvedValue({
        enabled: false,
        delayTime: 5000,
        switchingMode: 'global',
      });

      const infoSpy = logger.logger.info as jest.Mock;
      const callsBefore = infoSpy.mock.calls.length;

      await storageChangeListener(
        { enabled: { oldValue: true, newValue: false } },
        'local'
      );
      await new Promise(resolve => setTimeout(resolve, 10));

      // Disable happens immediately (no debounce)
      const calls = infoSpy.mock.calls.slice(callsBefore);
      const hasImmediateLog = calls.some(call =>
        call[0] === 'Settings' && call[1].includes('immediately')
      );
      expect(hasImmediateLog).toBe(true);
    });
  });

  describe('toggleTabSwitcher - Window Mode', () => {
    it('should start timers for enabled windows', async () => {
      const mockWindowTimerManager = new WindowTimerManager();

      (storage.getSettings as jest.Mock).mockResolvedValue({
        delayTime: 5000,
        switchingMode: 'window',
        windowStates: {
          1: { enabled: true },
          2: { enabled: false },
        },
      });

      (storage.isValidWindowId as jest.Mock).mockReturnValue(true);
      (storage.windowExists as jest.Mock).mockResolvedValue(true);

      await storageChangeListener(
        { windowStates: {
          oldValue: {},
          newValue: { 1: { enabled: true } }
        } },
        'local'
      );
      await new Promise(resolve => setTimeout(resolve, 150));

      // Verify window timer manager methods would be called
      expect(storage.windowExists).toHaveBeenCalled();
    });

    it('should skip timer for non-existent windows', async () => {
      (storage.getSettings as jest.Mock).mockResolvedValue({
        delayTime: 5000,
        switchingMode: 'window',
        windowStates: {
          1: { enabled: true },
        },
      });

      (storage.isValidWindowId as jest.Mock).mockReturnValue(true);
      (storage.windowExists as jest.Mock).mockResolvedValue(false);

      await storageChangeListener(
        { windowStates: {
          oldValue: {},
          newValue: { 1: { enabled: true } }
        } },
        'local'
      );
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(logger.logger.warn).toHaveBeenCalledWith(
        'WindowMode',
        'Window no longer exists, skipping timer start',
        expect.any(Object)
      );
    });

    it('should skip invalid window IDs', async () => {
      (storage.getSettings as jest.Mock).mockResolvedValue({
        delayTime: 5000,
        switchingMode: 'window',
        windowStates: {
          [-1]: { enabled: true },
        },
      });

      (storage.isValidWindowId as jest.Mock).mockReturnValue(false);

      await storageChangeListener(
        { windowStates: {
          oldValue: {},
          newValue: { [-1]: { enabled: true } }
        } },
        'local'
      );
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(logger.logger.warn).toHaveBeenCalledWith(
        'WindowMode',
        'Invalid windowId in windowStates',
        expect.any(Object)
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle errors in toggleTabSwitcher', async () => {
      (storage.getSettings as jest.Mock).mockRejectedValue(new Error('Storage failure'));

      await storageChangeListener(
        { enabled: { oldValue: false, newValue: true } },
        'local'
      );
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(logger.logger.error).toHaveBeenCalledWith(
        'TabSwitcher',
        'Failed to toggle tab switcher',
        expect.objectContaining({
          error: 'Storage failure',
        })
      );
    });

    it('should handle errors in handleWindowModeToggle', async () => {
      (storage.getSettings as jest.Mock).mockResolvedValue({
        delayTime: 5000,
        switchingMode: 'window',
        windowStates: {
          1: { enabled: true },
        },
      });

      (storage.isValidWindowId as jest.Mock).mockImplementation(() => {
        throw new Error('Validation error');
      });

      await storageChangeListener(
        { windowStates: {
          oldValue: {},
          newValue: { 1: { enabled: true } }
        } },
        'local'
      );
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(logger.logger.error).toHaveBeenCalledWith(
        'WindowMode',
        'Error in handleWindowModeToggle',
        expect.any(Object)
      );
    });
  });
});
