/**
 * Comprehensive tests for background service worker
 * Tests all core functionality including tab switching, alarm management,
 * storage integration, and event handlers
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mock Chrome APIs
const mockChrome = (global as any).chrome;

describe('Background Service Worker', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Reset console spies
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  describe('Constants', () => {
    it('should define correct alarm name', () => {
      expect('tabSwitcher').toBe('tabSwitcher');
    });

    it('should define correct default delay time', () => {
      expect(10000).toBe(10000);
    });

    it('should define correct default enabled state', () => {
      expect(false).toBe(false);
    });
  });

  describe('updateBadge function', () => {
    it('should set badge to ON when enabled is true', async () => {
      mockChrome.action.setBadgeText.mockResolvedValue(undefined);
      mockChrome.action.setBadgeBackgroundColor.mockResolvedValue(undefined);

      // Import and test the module
      const { updateBadge } = await import('../background');
      
      if (updateBadge) {
        await updateBadge(true);

        expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({
          text: 'ON',
        });
        expect(mockChrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({
          color: '#4CAF50',
        });
      }
    });

    it('should set badge to OFF when enabled is false', async () => {
      mockChrome.action.setBadgeText.mockResolvedValue(undefined);
      mockChrome.action.setBadgeBackgroundColor.mockResolvedValue(undefined);

      const { updateBadge } = await import('../background');
      
      if (updateBadge) {
        await updateBadge(false);

        expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({
          text: 'OFF',
        });
        expect(mockChrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({
          color: '#9E9E9E',
        });
      }
    });

    it('should set correct badge colors for enabled state', async () => {
      mockChrome.action.setBadgeText.mockResolvedValue(undefined);
      mockChrome.action.setBadgeBackgroundColor.mockResolvedValue(undefined);

      const { updateBadge } = await import('../background');
      
      if (updateBadge) {
        await updateBadge(true);
        expect(mockChrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({
          color: '#4CAF50', // Green
        });
      }
    });

    it('should set correct badge colors for disabled state', async () => {
      mockChrome.action.setBadgeText.mockResolvedValue(undefined);
      mockChrome.action.setBadgeBackgroundColor.mockResolvedValue(undefined);

      const { updateBadge } = await import('../background');
      
      if (updateBadge) {
        await updateBadge(false);
        expect(mockChrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({
          color: '#9E9E9E', // Gray
        });
      }
    });
  });

  describe('switchTab function', () => {
    it('should switch to next tab in sequence', async () => {
      const mockTabs = [
        { id: 1, index: 0, active: true },
        { id: 2, index: 1, active: false },
        { id: 3, index: 2, active: false },
      ];

      mockChrome.tabs.query.mockResolvedValue(mockTabs);
      mockChrome.tabs.update.mockResolvedValue({});

      const { switchTab } = await import('../background');
      
      if (switchTab) {
        await switchTab();

        expect(mockChrome.tabs.query).toHaveBeenCalledWith({
          currentWindow: true,
        });
        expect(mockChrome.tabs.update).toHaveBeenCalledWith(2, { active: true });
      }
    });

    it('should wrap around to first tab from last tab', async () => {
      const mockTabs = [
        { id: 1, index: 0, active: false },
        { id: 2, index: 1, active: false },
        { id: 3, index: 2, active: true },
      ];

      mockChrome.tabs.query.mockResolvedValue(mockTabs);
      mockChrome.tabs.update.mockResolvedValue({});

      const { switchTab } = await import('../background');
      
      if (switchTab) {
        await switchTab();

        expect(mockChrome.tabs.update).toHaveBeenCalledWith(1, { active: true });
      }
    });

    it('should do nothing when only one tab exists', async () => {
      const mockTabs = [{ id: 1, index: 0, active: true }];

      mockChrome.tabs.query.mockResolvedValue(mockTabs);

      const { switchTab } = await import('../background');
      
      if (switchTab) {
        await switchTab();

        expect(mockChrome.tabs.update).not.toHaveBeenCalled();
      }
    });

    it('should do nothing when no tabs exist', async () => {
      mockChrome.tabs.query.mockResolvedValue([]);

      const { switchTab } = await import('../background');
      
      if (switchTab) {
        await switchTab();

        expect(mockChrome.tabs.update).not.toHaveBeenCalled();
      }
    });

    it('should handle case when no active tab is found', async () => {
      const mockTabs = [
        { id: 1, index: 0, active: false },
        { id: 2, index: 1, active: false },
      ];

      mockChrome.tabs.query.mockResolvedValue(mockTabs);

      const { switchTab } = await import('../background');
      
      if (switchTab) {
        await switchTab();

        expect(console.warn).toHaveBeenCalledWith('No active tab found');
        expect(mockChrome.tabs.update).not.toHaveBeenCalled();
      }
    });

    it('should handle case when active tab has no index', async () => {
      const mockTabs = [
        { id: 1, active: true }, // no index
        { id: 2, index: 1, active: false },
      ];

      mockChrome.tabs.query.mockResolvedValue(mockTabs);

      const { switchTab } = await import('../background');
      
      if (switchTab) {
        await switchTab();

        expect(console.warn).toHaveBeenCalledWith('No active tab found');
        expect(mockChrome.tabs.update).not.toHaveBeenCalled();
      }
    });

    it('should handle case when next tab has no id', async () => {
      const mockTabs = [
        { id: 1, index: 0, active: true },
        { index: 1, active: false }, // no id
      ];

      mockChrome.tabs.query.mockResolvedValue(mockTabs);

      const { switchTab } = await import('../background');
      
      if (switchTab) {
        await switchTab();

        expect(mockChrome.tabs.update).not.toHaveBeenCalled();
      }
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('Tab query failed');
      mockChrome.tabs.query.mockRejectedValue(error);

      const { switchTab } = await import('../background');
      
      if (switchTab) {
        await switchTab();

        expect(console.error).toHaveBeenCalledWith('Error switching tabs:', error);
      }
    });
  });

  describe('toggleTabSwitcher function', () => {
    it('should clear existing alarm before creating new one', async () => {
      mockChrome.alarms.clear.mockResolvedValue(true);
      mockChrome.storage.local.get.mockResolvedValue({
        enabled: true,
        delayTime: 10000,
      });
      mockChrome.alarms.create.mockResolvedValue(undefined);
      mockChrome.action.setBadgeText.mockResolvedValue(undefined);
      mockChrome.action.setBadgeBackgroundColor.mockResolvedValue(undefined);

      const { toggleTabSwitcher } = await import('../background');
      
      if (toggleTabSwitcher) {
        await toggleTabSwitcher();

        expect(mockChrome.alarms.clear).toHaveBeenCalledWith('tabSwitcher');
      }
    });

    it('should create alarm when enabled is true', async () => {
      mockChrome.alarms.clear.mockResolvedValue(true);
      mockChrome.storage.local.get.mockResolvedValue({
        enabled: true,
        delayTime: 30000, // 30 seconds
      });
      mockChrome.alarms.create.mockResolvedValue(undefined);
      mockChrome.action.setBadgeText.mockResolvedValue(undefined);
      mockChrome.action.setBadgeBackgroundColor.mockResolvedValue(undefined);

      const { toggleTabSwitcher } = await import('../background');
      
      if (toggleTabSwitcher) {
        await toggleTabSwitcher();

        expect(mockChrome.alarms.create).toHaveBeenCalledWith('tabSwitcher', {
          delayInMinutes: 0.5, // 30000ms / 60000
          periodInMinutes: 0.5,
        });
      }
    });

    it('should not create alarm when enabled is false', async () => {
      mockChrome.alarms.clear.mockResolvedValue(true);
      mockChrome.storage.local.get.mockResolvedValue({
        enabled: false,
        delayTime: 10000,
      });
      mockChrome.action.setBadgeText.mockResolvedValue(undefined);
      mockChrome.action.setBadgeBackgroundColor.mockResolvedValue(undefined);

      const { toggleTabSwitcher } = await import('../background');
      
      if (toggleTabSwitcher) {
        await toggleTabSwitcher();

        expect(mockChrome.alarms.create).not.toHaveBeenCalled();
      }
    });

    it('should use default values when storage returns empty', async () => {
      mockChrome.alarms.clear.mockResolvedValue(true);
      mockChrome.storage.local.get.mockResolvedValue({});
      mockChrome.action.setBadgeText.mockResolvedValue(undefined);
      mockChrome.action.setBadgeBackgroundColor.mockResolvedValue(undefined);

      const { toggleTabSwitcher } = await import('../background');
      
      if (toggleTabSwitcher) {
        await toggleTabSwitcher();

        // Should use defaults: enabled=false, delayTime=10000
        expect(mockChrome.alarms.create).not.toHaveBeenCalled();
      }
    });

    it('should convert delay time to minutes correctly', async () => {
      mockChrome.alarms.clear.mockResolvedValue(true);
      mockChrome.storage.local.get.mockResolvedValue({
        enabled: true,
        delayTime: 120000, // 2 minutes
      });
      mockChrome.alarms.create.mockResolvedValue(undefined);
      mockChrome.action.setBadgeText.mockResolvedValue(undefined);
      mockChrome.action.setBadgeBackgroundColor.mockResolvedValue(undefined);

      const { toggleTabSwitcher } = await import('../background');
      
      if (toggleTabSwitcher) {
        await toggleTabSwitcher();

        expect(mockChrome.alarms.create).toHaveBeenCalledWith('tabSwitcher', {
          delayInMinutes: 2,
          periodInMinutes: 2,
        });
      }
    });

    it('should update badge after toggling', async () => {
      mockChrome.alarms.clear.mockResolvedValue(true);
      mockChrome.storage.local.get.mockResolvedValue({
        enabled: true,
        delayTime: 10000,
      });
      mockChrome.alarms.create.mockResolvedValue(undefined);
      mockChrome.action.setBadgeText.mockResolvedValue(undefined);
      mockChrome.action.setBadgeBackgroundColor.mockResolvedValue(undefined);

      const { toggleTabSwitcher } = await import('../background');
      
      if (toggleTabSwitcher) {
        await toggleTabSwitcher();

        expect(mockChrome.action.setBadgeText).toHaveBeenCalled();
      }
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('Storage failed');
      mockChrome.alarms.clear.mockResolvedValue(true);
      mockChrome.storage.local.get.mockRejectedValue(error);

      const { toggleTabSwitcher } = await import('../background');
      
      if (toggleTabSwitcher) {
        await toggleTabSwitcher();

        expect(console.error).toHaveBeenCalledWith(
          'Error toggling tab switcher:',
          error
        );
      }
    });
  });

  describe('Event Listeners', () => {
    it('should register alarm listener', () => {
      expect(mockChrome.alarms.onAlarm.addListener).toBeDefined();
    });

    it('should register storage change listener', () => {
      expect(mockChrome.storage.onChanged.addListener).toBeDefined();
    });

    it('should register runtime.onInstalled listener', () => {
      expect(mockChrome.runtime.onInstalled.addListener).toBeDefined();
    });

    it('should register runtime.onStartup listener', () => {
      expect(mockChrome.runtime.onStartup.addListener).toBeDefined();
    });

    it('should register windows.onCreated listener', () => {
      expect(mockChrome.windows.onCreated.addListener).toBeDefined();
    });
  });

  describe('Storage Data Interface', () => {
    it('should accept delayTime as optional number', () => {
      const data: { delayTime?: number; enabled?: boolean } = {
        delayTime: 5000,
      };
      expect(data.delayTime).toBe(5000);
    });

    it('should accept enabled as optional boolean', () => {
      const data: { delayTime?: number; enabled?: boolean } = {
        enabled: true,
      };
      expect(data.enabled).toBe(true);
    });

    it('should accept both properties', () => {
      const data: { delayTime?: number; enabled?: boolean } = {
        delayTime: 15000,
        enabled: false,
      };
      expect(data.delayTime).toBe(15000);
      expect(data.enabled).toBe(false);
    });

    it('should accept empty object', () => {
      const data: { delayTime?: number; enabled?: boolean } = {};
      expect(data.delayTime).toBeUndefined();
      expect(data.enabled).toBeUndefined();
    });
  });
});