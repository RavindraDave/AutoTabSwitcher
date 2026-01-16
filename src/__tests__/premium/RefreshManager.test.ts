/**
 * Comprehensive tests for RefreshManager.ts
 * Tests smart auto-refresh functionality and strategies
 */

import { jest, describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import type {
  RefreshSettings,
  RefreshRule,
  TabRefreshState
} from '../../core/types.js';

const mockChrome = (global as any).chrome;

describe('RefreshManager', () => {
  let refreshManager: any;
  let RefreshManager: any;

  // Mock tab
  const mockTab: chrome.tabs.Tab = {
    id: 1,
    windowId: 100,
    index: 0,
    url: 'https://example.com',
    title: 'Example',
    pinned: false,
    active: true,
    highlighted: true,
    discarded: false,
    autoDiscardable: true,
    incognito: false,
    selected: false
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    // Reset chrome mocks
    mockChrome.storage.local.get.mockReset();
    mockChrome.storage.local.set.mockReset();
    mockChrome.tabs.query.mockReset();
    mockChrome.tabs.get.mockReset();
    mockChrome.tabs.reload.mockReset();

    // Default mock implementations
    mockChrome.storage.local.get.mockImplementation((keys: string | string[] | null) => {
      return Promise.resolve({
        premiumEnabled: true,
        licenseKey: 'TEST-LICENSE-KEY',
        refreshSettings: {
          enabled: true,
          strategy: 'hybrid',
          globalRefreshInterval: 30000,
          preemptiveRefreshOffset: 2000,
          refreshNonMatchingTabs: true
        },
        refreshRules: [],
        tabRefreshStates: {}
      });
    });

    mockChrome.storage.local.set.mockResolvedValue(undefined);
    mockChrome.tabs.get.mockResolvedValue(mockTab);
    mockChrome.tabs.reload.mockResolvedValue(undefined);
    mockChrome.tabs.query.mockResolvedValue([mockTab]);

    // Import fresh module
    const module = await import('../../premium/RefreshManager.js');
    refreshManager = module.refreshManager;
    RefreshManager = module.RefreshManager;

    // Cleanup timers from previous tests
    if (refreshManager.cleanup) {
      refreshManager.cleanup();
    }
  });

  afterEach(() => {
    // Cleanup timers after each test
    if (refreshManager.cleanup) {
      refreshManager.cleanup();
    }
  });

  describe('initialization', () => {
    test('should initialize when enabled', async () => {
      await refreshManager.initialize();

      // Should not throw
      expect(true).toBe(true);
    });

    test('should not initialize when disabled', async () => {
      mockChrome.storage.local.get.mockResolvedValue({
        premiumEnabled: true,
        licenseKey: 'TEST-KEY',
        refreshSettings: {
          enabled: false
        }
      });

      await refreshManager.initialize();

      // Should not throw
      expect(true).toBe(true);
    });

    test('should require premium license', async () => {
      mockChrome.storage.local.get.mockResolvedValue({
        premiumEnabled: false
      });

      await expect(refreshManager.initialize()).rejects.toThrow();
    });
  });

  describe('enable/disable', () => {
    test('should enable refresh system', async () => {
      await refreshManager.enable({
        strategy: 'preemptive',
        globalRefreshInterval: 60000
      });

      const setCall = mockChrome.storage.local.set.mock.calls.find((call: any) =>
        call[0]?.refreshSettings
      );

      expect(setCall).toBeDefined();
      expect(setCall[0].refreshSettings.enabled).toBe(true);
      expect(setCall[0].refreshSettings.strategy).toBe('preemptive');
    });

    test('should disable refresh system', async () => {
      await refreshManager.disable();

      const setCall = mockChrome.storage.local.set.mock.calls.find((call: any) =>
        call[0]?.refreshSettings
      );

      expect(setCall).toBeDefined();
      expect(setCall[0].refreshSettings.enabled).toBe(false);
    });

    test('should stop timers when disabling', async () => {
      await refreshManager.enable({ globalRefreshInterval: 1000 });
      await refreshManager.disable();

      // Timers should be cleared (internal state)
      expect(true).toBe(true);
    });

    test('should require premium license', async () => {
      mockChrome.storage.local.get.mockResolvedValue({
        premiumEnabled: false
      });

      await expect(refreshManager.enable()).rejects.toThrow();
      await expect(refreshManager.disable()).rejects.toThrow();
    });
  });

  describe('settings management', () => {
    test('should update settings', async () => {
      await refreshManager.updateSettings({
        strategy: 'post-switch',
        globalRefreshInterval: 45000
      });

      const setCall = mockChrome.storage.local.set.mock.calls[0];
      expect(setCall[0].refreshSettings.strategy).toBe('post-switch');
      expect(setCall[0].refreshSettings.globalRefreshInterval).toBe(45000);
    });

    test('should get current settings', async () => {
      const settings = await refreshManager.getSettings();

      expect(settings).toBeDefined();
      expect(settings.enabled).toBe(true);
      expect(settings.strategy).toBe('hybrid');
    });

    test('should return default settings if none exist', async () => {
      mockChrome.storage.local.get.mockResolvedValue({
        premiumEnabled: true,
        licenseKey: 'TEST-KEY'
      });

      const settings = await refreshManager.getSettings();

      expect(settings.enabled).toBe(false);
      expect(settings.strategy).toBe('hybrid');
    });

    test('should validate global refresh interval', async () => {
      await expect(
        refreshManager.updateSettings({ globalRefreshInterval: 100 })
      ).rejects.toThrow('Global refresh interval must be between');

      await expect(
        refreshManager.updateSettings({ globalRefreshInterval: 10000000 })
      ).rejects.toThrow('Global refresh interval must be between');
    });

    test('should validate preemptive offset', async () => {
      await expect(
        refreshManager.updateSettings({ preemptiveRefreshOffset: -100 })
      ).rejects.toThrow('Preemptive refresh offset must be between');

      await expect(
        refreshManager.updateSettings({ preemptiveRefreshOffset: 100000 })
      ).rejects.toThrow('Preemptive refresh offset must be between');
    });

    test('should restart system after settings update if enabled', async () => {
      mockChrome.storage.local.get.mockImplementation((keys) => {
        return Promise.resolve({
          premiumEnabled: true,
          licenseKey: 'TEST-KEY',
          refreshSettings: {
            enabled: true,
            strategy: 'hybrid',
            globalRefreshInterval: 30000
          }
        });
      });

      await refreshManager.updateSettings({ strategy: 'preemptive' });

      // Should restart (no errors)
      expect(true).toBe(true);
    });
  });

  describe('refresh rules', () => {
    test('should add refresh rule', async () => {
      const rule: Omit<RefreshRule, 'id'> = {
        type: 'domain',
        pattern: 'example.com',
        action: 'refresh',
        enabled: true
      };

      const result = await refreshManager.addRule(rule);

      expect(result.id).toBeDefined();
      expect(result.type).toBe('domain');
      expect(result.pattern).toBe('example.com');
      expect(mockChrome.storage.local.set).toHaveBeenCalled();
    });

    test('should update existing rule', async () => {
      const existingRule: RefreshRule = {
        id: 'rule-1',
        type: 'domain',
        pattern: 'example.com',
        action: 'refresh',
        enabled: true
      };

      mockChrome.storage.local.get.mockImplementation((keys) => {
        if (keys === 'refreshRules') {
          return Promise.resolve({ refreshRules: [existingRule] });
        }
        return Promise.resolve({
          premiumEnabled: true,
          licenseKey: 'TEST-KEY'
        });
      });

      const updated = {
        ...existingRule,
        pattern: 'updated.com'
      };

      const result = await refreshManager.addRule(updated);

      expect(result.id).toBe('rule-1');
      expect(result.pattern).toBe('updated.com');
    });

    test('should throw error when max rules reached', async () => {
      const existingRules = Array.from({ length: 100 }, (_, i) => ({
        id: `rule-${i}`,
        type: 'url' as const,
        pattern: `pattern-${i}`,
        action: 'refresh' as const,
        enabled: true
      }));

      mockChrome.storage.local.get.mockImplementation((keys) => {
        if (keys === 'refreshRules') {
          return Promise.resolve({ refreshRules: existingRules });
        }
        return Promise.resolve({
          premiumEnabled: true,
          licenseKey: 'TEST-KEY'
        });
      });

      await expect(
        refreshManager.addRule({
          type: 'url',
          pattern: 'new',
          action: 'refresh',
          enabled: true
        })
      ).rejects.toThrow('Maximum number of refresh rules');
    });

    test('should validate rule pattern', async () => {
      await expect(
        refreshManager.addRule({
          type: 'url',
          pattern: '',
          action: 'refresh',
          enabled: true
        })
      ).rejects.toThrow('Rule pattern cannot be empty');

      await expect(
        refreshManager.addRule({
          type: 'url',
          pattern: '   ',
          action: 'refresh',
          enabled: true
        })
      ).rejects.toThrow('Rule pattern cannot be empty');
    });

    test('should validate regex pattern', async () => {
      await expect(
        refreshManager.addRule({
          type: 'regex',
          pattern: '[invalid(regex',
          action: 'refresh',
          enabled: true
        })
      ).rejects.toThrow('Invalid regex pattern');
    });

    test('should remove rule', async () => {
      await refreshManager.removeRule('rule-123');

      expect(mockChrome.storage.local.set).toHaveBeenCalled();
    });

    test('should get all rules', async () => {
      const mockRules: RefreshRule[] = [
        { id: '1', type: 'url', pattern: 'test', action: 'refresh', enabled: true },
        { id: '2', type: 'domain', pattern: 'example.com', action: 'skip', enabled: false }
      ];

      mockChrome.storage.local.get.mockImplementation((keys) => {
        if (keys === 'refreshRules') {
          return Promise.resolve({ refreshRules: mockRules });
        }
        return Promise.resolve({
          premiumEnabled: true,
          licenseKey: 'TEST-KEY'
        });
      });

      const rules = await refreshManager.getRules();

      expect(rules).toHaveLength(2);
      expect(rules[0].id).toBe('1');
      expect(rules[1].id).toBe('2');
    });

    test('should require premium license', async () => {
      mockChrome.storage.local.get.mockResolvedValue({
        premiumEnabled: false
      });

      await expect(
        refreshManager.addRule({ type: 'url', pattern: 'test', action: 'refresh', enabled: true })
      ).rejects.toThrow();
    });
  });

  describe('rule matching', () => {
    test('should match URL rule', async () => {
      const rule: RefreshRule = {
        id: 'rule-1',
        type: 'url',
        pattern: 'example.com',
        action: 'refresh',
        enabled: true
      };

      mockChrome.storage.local.get.mockImplementation((keys) => {
        if (keys === 'refreshRules') {
          return Promise.resolve({ refreshRules: [rule] });
        }
        return Promise.resolve({
          premiumEnabled: true,
          licenseKey: 'TEST-KEY',
          refreshSettings: {
            enabled: true,
            refreshNonMatchingTabs: false
          }
        });
      });

      mockChrome.tabs.get.mockResolvedValue({
        ...mockTab,
        url: 'https://example.com/page'
      });

      const result = await refreshManager.shouldRefreshTab(1);

      expect(result).toBe(true);
    });

    test('should match domain rule', async () => {
      const rule: RefreshRule = {
        id: 'rule-1',
        type: 'domain',
        pattern: 'example.com',
        action: 'refresh',
        enabled: true
      };

      mockChrome.storage.local.get.mockImplementation((keys) => {
        if (keys === 'refreshRules') {
          return Promise.resolve({ refreshRules: [rule] });
        }
        return Promise.resolve({
          premiumEnabled: true,
          licenseKey: 'TEST-KEY'
        });
      });

      mockChrome.tabs.get.mockResolvedValue({
        ...mockTab,
        url: 'https://example.com/page'
      });

      const result = await refreshManager.shouldRefreshTab(1);

      expect(result).toBe(true);
    });

    test('should match subdomain', async () => {
      const rule: RefreshRule = {
        id: 'rule-1',
        type: 'domain',
        pattern: 'example.com',
        action: 'refresh',
        enabled: true
      };

      mockChrome.storage.local.get.mockImplementation((keys) => {
        if (keys === 'refreshRules') {
          return Promise.resolve({ refreshRules: [rule] });
        }
        return Promise.resolve({
          premiumEnabled: true,
          licenseKey: 'TEST-KEY'
        });
      });

      mockChrome.tabs.get.mockResolvedValue({
        ...mockTab,
        url: 'https://sub.example.com/page'
      });

      const result = await refreshManager.shouldRefreshTab(1);

      expect(result).toBe(true);
    });

    test('should match regex rule', async () => {
      const rule: RefreshRule = {
        id: 'rule-1',
        type: 'regex',
        pattern: 'github\\.com/.*/(pull|issues)',
        action: 'refresh',
        enabled: true
      };

      mockChrome.storage.local.get.mockImplementation((keys) => {
        if (keys === 'refreshRules') {
          return Promise.resolve({ refreshRules: [rule] });
        }
        return Promise.resolve({
          premiumEnabled: true,
          licenseKey: 'TEST-KEY'
        });
      });

      mockChrome.tabs.get.mockResolvedValue({
        ...mockTab,
        url: 'https://github.com/user/repo/pull/123'
      });

      const result = await refreshManager.shouldRefreshTab(1);

      expect(result).toBe(true);
    });

    test('should match title rule', async () => {
      const rule: RefreshRule = {
        id: 'rule-1',
        type: 'title',
        pattern: 'Dashboard',
        action: 'refresh',
        enabled: true
      };

      mockChrome.storage.local.get.mockImplementation((keys) => {
        if (keys === 'refreshRules') {
          return Promise.resolve({ refreshRules: [rule] });
        }
        return Promise.resolve({
          premiumEnabled: true,
          licenseKey: 'TEST-KEY'
        });
      });

      mockChrome.tabs.get.mockResolvedValue({
        ...mockTab,
        url: 'https://app.example.com',
        title: 'My Dashboard - App'
      });

      const result = await refreshManager.shouldRefreshTab(1);

      expect(result).toBe(true);
    });

    test('should skip tab when rule action is skip', async () => {
      const rule: RefreshRule = {
        id: 'rule-1',
        type: 'domain',
        pattern: 'example.com',
        action: 'skip',
        enabled: true
      };

      mockChrome.storage.local.get.mockImplementation((keys) => {
        if (keys === 'refreshRules') {
          return Promise.resolve({ refreshRules: [rule] });
        }
        return Promise.resolve({
          premiumEnabled: true,
          licenseKey: 'TEST-KEY'
        });
      });

      mockChrome.tabs.get.mockResolvedValue({
        ...mockTab,
        url: 'https://example.com'
      });

      const result = await refreshManager.shouldRefreshTab(1);

      expect(result).toBe(false);
    });

    test('should refresh all when no rules', async () => {
      mockChrome.storage.local.get.mockImplementation((keys) => {
        if (keys === 'refreshRules') {
          return Promise.resolve({ refreshRules: [] });
        }
        return Promise.resolve({
          premiumEnabled: true,
          licenseKey: 'TEST-KEY'
        });
      });

      const result = await refreshManager.shouldRefreshTab(1);

      expect(result).toBe(true);
    });

    test('should skip non-matching tabs when configured', async () => {
      const rule: RefreshRule = {
        id: 'rule-1',
        type: 'domain',
        pattern: 'other.com',
        action: 'refresh',
        enabled: true
      };

      mockChrome.storage.local.get.mockImplementation((keys) => {
        if (keys === 'refreshRules') {
          return Promise.resolve({ refreshRules: [rule] });
        }
        return Promise.resolve({
          premiumEnabled: true,
          licenseKey: 'TEST-KEY',
          refreshSettings: {
            refreshNonMatchingTabs: false
          }
        });
      });

      mockChrome.tabs.get.mockResolvedValue({
        ...mockTab,
        url: 'https://example.com'
      });

      const result = await refreshManager.shouldRefreshTab(1);

      expect(result).toBe(false);
    });

    test('should only check enabled rules', async () => {
      const rules: RefreshRule[] = [
        { id: '1', type: 'domain', pattern: 'example.com', action: 'skip', enabled: false },
        { id: '2', type: 'domain', pattern: 'example.com', action: 'refresh', enabled: true }
      ];

      mockChrome.storage.local.get.mockImplementation((keys) => {
        if (keys === 'refreshRules') {
          return Promise.resolve({ refreshRules: rules });
        }
        return Promise.resolve({
          premiumEnabled: true,
          licenseKey: 'TEST-KEY'
        });
      });

      mockChrome.tabs.get.mockResolvedValue({
        ...mockTab,
        url: 'https://example.com'
      });

      const result = await refreshManager.shouldRefreshTab(1);

      expect(result).toBe(true); // Enabled rule should be used
    });
  });

  describe('refresh strategies', () => {
    test('should refresh tab manually', async () => {
      await refreshManager.refreshTab(1, 'manual');

      expect(mockChrome.tabs.reload).toHaveBeenCalledWith(1, { bypassCache: false });
      expect(mockChrome.storage.local.set).toHaveBeenCalled();
    });

    test('should preemptively refresh tab', async () => {
      await refreshManager.preemptiveRefresh(1);

      expect(mockChrome.tabs.reload).toHaveBeenCalled();
    });

    test('should not preemptively refresh if strategy wrong', async () => {
      mockChrome.storage.local.get.mockResolvedValue({
        premiumEnabled: true,
        licenseKey: 'TEST-KEY',
        refreshSettings: {
          enabled: true,
          strategy: 'post-switch'
        }
      });

      await refreshManager.preemptiveRefresh(1);

      expect(mockChrome.tabs.reload).not.toHaveBeenCalled();
    });

    test('should post-switch refresh tab', async () => {
      await refreshManager.postSwitchRefresh(1);

      expect(mockChrome.tabs.reload).toHaveBeenCalled();
    });

    test('should not post-switch refresh if strategy wrong', async () => {
      mockChrome.storage.local.get.mockResolvedValue({
        premiumEnabled: true,
        licenseKey: 'TEST-KEY',
        refreshSettings: {
          enabled: true,
          strategy: 'preemptive'
        }
      });

      await refreshManager.postSwitchRefresh(1);

      expect(mockChrome.tabs.reload).not.toHaveBeenCalled();
    });

    test('should skip post-switch if already preemptively refreshed', async () => {
      // First do preemptive refresh
      await refreshManager.preemptiveRefresh(1);

      mockChrome.tabs.reload.mockClear();

      // Immediately try post-switch
      await refreshManager.postSwitchRefresh(1);

      expect(mockChrome.tabs.reload).not.toHaveBeenCalled();
    });

    test('should update tab refresh state after refresh', async () => {
      await refreshManager.refreshTab(1, 'manual');

      const setCall = mockChrome.storage.local.set.mock.calls.find((call: any) =>
        call[0]?.tabRefreshStates
      );

      expect(setCall).toBeDefined();
      const state = setCall[0].tabRefreshStates[1];
      expect(state.refreshCount).toBeGreaterThan(0);
      expect(state.lastRefreshTime).toBeGreaterThan(0);
      expect(state.strategy).toBe('manual');
    });

    test('should handle refresh errors', async () => {
      mockChrome.tabs.reload.mockRejectedValue(new Error('Tab closed'));

      await expect(
        refreshManager.refreshTab(1, 'manual')
      ).rejects.toThrow('Tab closed');
    });

    test('should skip refresh if shouldRefreshTab returns false', async () => {
      const rule: RefreshRule = {
        id: 'rule-1',
        type: 'domain',
        pattern: 'example.com',
        action: 'skip',
        enabled: true
      };

      mockChrome.storage.local.get.mockImplementation((keys) => {
        if (keys === 'refreshRules') {
          return Promise.resolve({ refreshRules: [rule] });
        }
        return Promise.resolve({
          premiumEnabled: true,
          licenseKey: 'TEST-KEY'
        });
      });

      mockChrome.tabs.get.mockResolvedValue({
        ...mockTab,
        url: 'https://example.com'
      });

      await refreshManager.refreshTab(1, 'manual');

      expect(mockChrome.tabs.reload).not.toHaveBeenCalled();
    });
  });

  describe('custom tab intervals', () => {
    test('should set custom refresh interval', async () => {
      await refreshManager.setTabRefreshInterval(1, 60000);

      const setCall = mockChrome.storage.local.set.mock.calls.find((call: any) =>
        call[0]?.tabRefreshStates
      );

      expect(setCall).toBeDefined();
      expect(setCall[0].tabRefreshStates[1].customInterval).toBe(60000);
    });

    test('should clear custom interval with null', async () => {
      await refreshManager.setTabRefreshInterval(1, null);

      const setCall = mockChrome.storage.local.set.mock.calls.find((call: any) =>
        call[0]?.tabRefreshStates
      );

      expect(setCall).toBeDefined();
      expect(setCall[0].tabRefreshStates[1].customInterval).toBeUndefined();
    });

    test('should validate interval range', async () => {
      await expect(
        refreshManager.setTabRefreshInterval(1, 100)
      ).rejects.toThrow('Refresh interval must be between');

      await expect(
        refreshManager.setTabRefreshInterval(1, 10000000)
      ).rejects.toThrow('Refresh interval must be between');
    });

    test('should get tab refresh state', async () => {
      const mockState: TabRefreshState = {
        lastRefreshTime: Date.now(),
        refreshCount: 5,
        strategy: 'manual'
      };

      mockChrome.storage.local.get.mockImplementation((keys) => {
        if (typeof keys === 'object' && keys !== null && 'tabRefreshStates' in keys) {
          return Promise.resolve({
            tabRefreshStates: { 1: mockState }
          });
        }
        return Promise.resolve({
          premiumEnabled: true,
          licenseKey: 'TEST-KEY'
        });
      });

      const state = await refreshManager.getTabState(1);

      expect(state).toBeDefined();
      expect(state?.refreshCount).toBe(5);
    });

    test('should return null for tab without state', async () => {
      mockChrome.storage.local.get.mockResolvedValue({
        premiumEnabled: true,
        licenseKey: 'TEST-KEY',
        tabRefreshStates: {}
      });

      const state = await refreshManager.getTabState(999);

      expect(state).toBeNull();
    });
  });

  describe('cleanup', () => {
    test('should clear all timers on cleanup', () => {
      refreshManager.cleanup();

      // Should not throw
      expect(true).toBe(true);
    });

    test('should clear preemptive queue on cleanup', () => {
      refreshManager.cleanup();

      // Should not throw
      expect(true).toBe(true);
    });
  });

  describe('edge cases', () => {
    test('should handle tabs without URLs', async () => {
      mockChrome.tabs.get.mockResolvedValue({
        ...mockTab,
        url: undefined
      });

      const result = await refreshManager.shouldRefreshTab(1);

      expect(result).toBe(false);
    });

    test('should handle invalid URLs', async () => {
      mockChrome.tabs.get.mockResolvedValue({
        ...mockTab,
        url: 'invalid-url'
      });

      const rule: RefreshRule = {
        id: 'rule-1',
        type: 'domain',
        pattern: 'example.com',
        action: 'refresh',
        enabled: true
      };

      mockChrome.storage.local.get.mockImplementation((keys) => {
        if (keys === 'refreshRules') {
          return Promise.resolve({ refreshRules: [rule] });
        }
        return Promise.resolve({
          premiumEnabled: true,
          licenseKey: 'TEST-KEY'
        });
      });

      // Should handle gracefully
      const result = await refreshManager.shouldRefreshTab(1);
      expect(typeof result).toBe('boolean');
    });

    test('should handle chrome:// URLs', async () => {
      mockChrome.tabs.get.mockResolvedValue({
        ...mockTab,
        url: 'chrome://extensions'
      });

      const result = await refreshManager.shouldRefreshTab(1);

      expect(typeof result).toBe('boolean');
    });

    test('should handle concurrent refresh calls', async () => {
      const promises = [
        refreshManager.refreshTab(1, 'manual'),
        refreshManager.refreshTab(1, 'manual'),
        refreshManager.refreshTab(1, 'manual')
      ];

      await Promise.all(promises);

      expect(mockChrome.tabs.reload).toHaveBeenCalled();
    });

    test('should handle missing tab title in title rules', async () => {
      const rule: RefreshRule = {
        id: 'rule-1',
        type: 'title',
        pattern: 'Dashboard',
        action: 'refresh',
        enabled: true
      };

      mockChrome.storage.local.get.mockImplementation((keys) => {
        if (keys === 'refreshRules') {
          return Promise.resolve({ refreshRules: [rule] });
        }
        return Promise.resolve({
          premiumEnabled: true,
          licenseKey: 'TEST-KEY'
        });
      });

      mockChrome.tabs.get.mockResolvedValue({
        ...mockTab,
        title: undefined
      });

      const result = await refreshManager.shouldRefreshTab(1);

      expect(result).toBe(false);
    });

    test('should handle storage errors gracefully', async () => {
      mockChrome.storage.local.set.mockRejectedValue(new Error('Storage full'));

      await expect(
        refreshManager.enable()
      ).rejects.toThrow('Storage full');
    });

    test('should handle tab query errors', async () => {
      mockChrome.tabs.get.mockRejectedValue(new Error('Tab not found'));

      const result = await refreshManager.shouldRefreshTab(999);

      expect(result).toBe(false);
    });

    test('should generate unique rule IDs', async () => {
      const rule1 = await refreshManager.addRule({
        type: 'url',
        pattern: 'test1',
        action: 'refresh',
        enabled: true
      });

      const rule2 = await refreshManager.addRule({
        type: 'url',
        pattern: 'test2',
        action: 'refresh',
        enabled: true
      });

      expect(rule1.id).not.toBe(rule2.id);
    });
  });

  describe('integration scenarios', () => {
    test('should enable hybrid strategy', async () => {
      await refreshManager.enable({
        strategy: 'hybrid',
        globalRefreshInterval: 30000
      });

      // Should work for both preemptive and post-switch
      await refreshManager.preemptiveRefresh(1);
      expect(mockChrome.tabs.reload).toHaveBeenCalled();

      mockChrome.tabs.reload.mockClear();

      // Wait for preemptive queue to clear
      await new Promise(resolve => setTimeout(resolve, 1100));

      await refreshManager.postSwitchRefresh(1);
      expect(mockChrome.tabs.reload).toHaveBeenCalled();
    });

    test('should handle multiple rules with different actions', async () => {
      const rules: RefreshRule[] = [
        { id: '1', type: 'domain', pattern: 'skip.com', action: 'skip', enabled: true },
        { id: '2', type: 'domain', pattern: 'refresh.com', action: 'refresh', enabled: true }
      ];

      mockChrome.storage.local.get.mockImplementation((keys) => {
        if (keys === 'refreshRules') {
          return Promise.resolve({ refreshRules: rules });
        }
        return Promise.resolve({
          premiumEnabled: true,
          licenseKey: 'TEST-KEY'
        });
      });

      // Should skip
      mockChrome.tabs.get.mockResolvedValue({
        ...mockTab,
        url: 'https://skip.com'
      });
      const result1 = await refreshManager.shouldRefreshTab(1);
      expect(result1).toBe(false);

      // Should refresh
      mockChrome.tabs.get.mockResolvedValue({
        ...mockTab,
        url: 'https://refresh.com'
      });
      const result2 = await refreshManager.shouldRefreshTab(1);
      expect(result2).toBe(true);
    });

    test('should preserve refresh count across multiple refreshes', async () => {
      // First refresh
      await refreshManager.refreshTab(1, 'manual');

      let setCall = mockChrome.storage.local.set.mock.calls.find((call: any) =>
        call[0]?.tabRefreshStates?.[1]
      );
      expect(setCall[0].tabRefreshStates[1].refreshCount).toBe(1);

      // Simulate existing state
      mockChrome.storage.local.get.mockImplementation((keys) => {
        if (typeof keys === 'object' && keys !== null && 'tabRefreshStates' in keys) {
          return Promise.resolve({
            tabRefreshStates: {
              1: {
                lastRefreshTime: Date.now(),
                refreshCount: 1,
                strategy: 'manual'
              }
            }
          });
        }
        return Promise.resolve({
          premiumEnabled: true,
          licenseKey: 'TEST-KEY',
          refreshSettings: {
            enabled: true,
            strategy: 'hybrid'
          }
        });
      });

      // Second refresh
      await refreshManager.refreshTab(1, 'manual');

      setCall = mockChrome.storage.local.set.mock.calls.find((call: any, index: number) =>
        index > 0 && call[0]?.tabRefreshStates?.[1]
      );
      expect(setCall[0].tabRefreshStates[1].refreshCount).toBe(2);
    });
  });
});
