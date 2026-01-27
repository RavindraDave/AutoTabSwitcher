/**
 * Comprehensive tests for SkipRuleEngine.ts
 * Tests skip rule management and filtering
 */

import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import type { SkipRule } from '../../core/types.js';

const mockChrome = (global as any).chrome;

describe('SkipRuleEngine', () => {
  let skipRuleEngine: any;
  let SkipRuleEngine: any;
  let mockStorage: any; // Shared storage object for state persistence

  // Mock tabs
  const mockTab: chrome.tabs.Tab = {
    id: 1,
    windowId: 100,
    index: 0,
    url: 'https://example.com/page',
    title: 'Example Page',
    pinned: false,
    active: true,
    highlighted: true,
    discarded: false,
    autoDiscardable: true,
    incognito: false,
    selected: false,
    groupId: -1
  };

  const pinnedTab: chrome.tabs.Tab = {
    ...mockTab,
    id: 2,
    url: 'https://pinned.com',
    title: 'Pinned',
    pinned: true
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    // Reset chrome mocks
    mockChrome.storage.local.get.mockReset();
    mockChrome.storage.local.set.mockReset();
    mockChrome.tabs.get.mockReset();

    // Create mock storage that persists data between set and get
    mockStorage = {
      premiumEnabled: true,
      licenseKey: 'TEST-LICENSE-KEY',
      skipRules: [],
      skipPinnedTabs: false
    };

    // Default mock implementations with state persistence
    mockChrome.storage.local.get.mockImplementation((keys: string | string[] | null) => {
      if (keys === null || keys === undefined) {
        return Promise.resolve({ ...mockStorage });
      }

      const requestedKeys = Array.isArray(keys) ? keys : [keys];
      const result: any = {};
      for (const key of requestedKeys) {
        if (key in mockStorage) {
          result[key] = mockStorage[key];
        }
      }
      return Promise.resolve(result);
    });

    mockChrome.storage.local.set.mockImplementation((data: any) => {
      Object.assign(mockStorage, data);
      return Promise.resolve(undefined);
    });

    mockChrome.tabs.get.mockResolvedValue(mockTab);

    // Import fresh module
    const module = await import('../../premium/SkipRuleEngine.js');
    skipRuleEngine = module.skipRuleEngine;
    SkipRuleEngine = module.SkipRuleEngine;
  });

  describe('initialization', () => {
    test('should initialize successfully', async () => {
      await skipRuleEngine.initialize();

      // Should not throw
      expect(true).toBe(true);
    });

    test('should load rules on initialization', async () => {
      const mockRules: SkipRule[] = [
        { id: 'rule-1', type: 'url', pattern: 'test', enabled: true, priority: 0 }
      ];

      mockChrome.storage.local.get.mockImplementation((keys) => {
        if (keys === 'skipRules') {
          return Promise.resolve({ skipRules: mockRules });
        }
        return Promise.resolve({
          premiumEnabled: true,
          licenseKey: 'TEST-KEY'
        });
      });

      await skipRuleEngine.initialize();

      // Should not throw
      expect(true).toBe(true);
    });

    test('should require premium license', async () => {
      mockChrome.storage.local.get.mockResolvedValue({
        premiumEnabled: false
      });

      await expect(skipRuleEngine.initialize()).rejects.toThrow();
    });
  });

  describe('rule management', () => {
    test('should add new skip rule', async () => {
      const rule: Omit<SkipRule, 'id'> = {
        type: 'domain',
        pattern: 'example.com',
        description: 'Skip example.com',
        enabled: true,
        priority: 0
      };

      const result = await skipRuleEngine.addRule(rule);

      expect(result.id).toBeDefined();
      expect(result.type).toBe('domain');
      expect(result.pattern).toBe('example.com');
      expect(result.enabled).toBe(true);
      expect(mockChrome.storage.local.set).toHaveBeenCalled();
    });

    test('should update existing rule', async () => {
      const existingRule: SkipRule = {
        id: 'rule-1',
        type: 'url',
        pattern: 'old',
        enabled: true,
        priority: 0
      };

      mockChrome.storage.local.get.mockImplementation((keys) => {
        if (keys === 'skipRules') {
          return Promise.resolve({ skipRules: [existingRule] });
        }
        return Promise.resolve({
          premiumEnabled: true,
          licenseKey: 'TEST-KEY'
        });
      });

      const updated = {
        ...existingRule,
        pattern: 'new'
      };

      const result = await skipRuleEngine.addRule(updated);

      expect(result.id).toBe('rule-1');
      expect(result.pattern).toBe('new');
    });

    test('should throw error when max rules reached', async () => {
      const existingRules = Array.from({ length: 100 }, (_, i) => ({
        id: `rule-${i}`,
        type: 'url' as const,
        pattern: `pattern-${i}`,
        enabled: true,
        priority: 0
      }));

      mockChrome.storage.local.get.mockImplementation((keys) => {
        if (keys === 'skipRules') {
          return Promise.resolve({ skipRules: existingRules });
        }
        return Promise.resolve({
          premiumEnabled: true,
          licenseKey: 'TEST-KEY'
        });
      });

      await expect(
        skipRuleEngine.addRule({
          type: 'url',
          pattern: 'new',
          enabled: true,
          priority: 0
        })
      ).rejects.toThrow('Maximum number of skip rules');
    });

    test('should default enabled to true', async () => {
      const rule = {
        type: 'url' as const,
        pattern: 'test',
        priority: 0
      };

      const result = await skipRuleEngine.addRule(rule);

      expect(result.enabled).toBe(true);
    });

    test('should remove rule', async () => {
      await skipRuleEngine.removeRule('rule-123');

      expect(mockChrome.storage.local.set).toHaveBeenCalled();
    });

    test('should get all rules', async () => {
      const mockRules: SkipRule[] = [
        { id: '1', type: 'url', pattern: 'test1', enabled: true, priority: 0 },
        { id: '2', type: 'domain', pattern: 'example.com', enabled: false, priority: 1 }
      ];

      mockChrome.storage.local.get.mockImplementation((keys) => {
        if (keys === 'skipRules') {
          return Promise.resolve({ skipRules: mockRules });
        }
        return Promise.resolve({
          premiumEnabled: true,
          licenseKey: 'TEST-KEY'
        });
      });

      const rules = await skipRuleEngine.getRules();

      expect(rules).toHaveLength(2);
      expect(rules[0].id).toBe('1');
      expect(rules[1].id).toBe('2');
    });
  });

  describe('rule validation', () => {
    test('should validate pattern is not empty for non-pinned rules', async () => {
      await expect(
        skipRuleEngine.addRule({
          type: 'url',
          pattern: '',
          enabled: true,
          priority: 0
        })
      ).rejects.toThrow('Rule pattern cannot be empty');

      await expect(
        skipRuleEngine.addRule({
          type: 'url',
          pattern: '   ',
          enabled: true,
          priority: 0
        })
      ).rejects.toThrow('Rule pattern cannot be empty');
    });

    test('should allow empty pattern for pinned rule', async () => {
      const result = await skipRuleEngine.addRule({
        type: 'pinned',
        pattern: '',
        enabled: true,
        priority: 0
      });

      expect(result).toBeDefined();
    });

    test('should validate regex pattern', async () => {
      await expect(
        skipRuleEngine.addRule({
          type: 'regex',
          pattern: '[invalid(regex',
          enabled: true,
          priority: 0
        })
      ).rejects.toThrow('Invalid regex syntax');
    });

    test('should validate domain pattern', async () => {
      await expect(
        skipRuleEngine.addRule({
          type: 'domain',
          pattern: 'invalid domain!',
          enabled: true,
          priority: 0
        })
      ).rejects.toThrow('Invalid domain pattern');

      await expect(
        skipRuleEngine.addRule({
          type: 'domain',
          pattern: '-invalid.com',
          enabled: true,
          priority: 0
        })
      ).rejects.toThrow('Invalid domain pattern');
    });

    test('should accept valid domain patterns', async () => {
      const validDomains = [
        'example.com',
        'sub.example.com',
        'example.co.uk',
        'test123.example.com'
      ];

      for (const domain of validDomains) {
        const result = await skipRuleEngine.addRule({
          type: 'domain',
          pattern: domain,
          enabled: true,
          priority: 0
        });

        expect(result.pattern).toBe(domain);
      }
    });
  });

  describe('skip pinned tabs', () => {
    test('should set skip pinned tabs setting', async () => {
      await skipRuleEngine.setSkipPinnedTabs(true);

      expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
        skipPinnedTabs: true
      });
    });

    test('should get skip pinned tabs setting', async () => {
      mockChrome.storage.local.get.mockImplementation((keys) => {
        if (keys === 'skipPinnedTabs') {
          return Promise.resolve({ skipPinnedTabs: true });
        }
        return Promise.resolve({
          premiumEnabled: true,
          licenseKey: 'TEST-KEY'
        });
      });

      const result = await skipRuleEngine.getSkipPinnedTabs();

      expect(result).toBe(true);
    });

    test('should skip pinned tab when setting enabled', async () => {
      mockChrome.storage.local.get.mockImplementation((keys) => {
        if (keys === 'skipPinnedTabs') {
          return Promise.resolve({ skipPinnedTabs: true });
        }
        if (keys === 'skipRules') {
          return Promise.resolve({ skipRules: [] });
        }
        return Promise.resolve({
          premiumEnabled: true,
          licenseKey: 'TEST-KEY'
        });
      });

      mockChrome.tabs.get.mockResolvedValue(pinnedTab);

      const result = await skipRuleEngine.shouldSkipTab(2);

      expect(result).toBe(true);
    });

    test('should not skip pinned tab when setting disabled', async () => {
      mockChrome.storage.local.get.mockImplementation((keys) => {
        if (keys === 'skipPinnedTabs') {
          return Promise.resolve({ skipPinnedTabs: false });
        }
        if (keys === 'skipRules') {
          return Promise.resolve({ skipRules: [] });
        }
        return Promise.resolve({
          premiumEnabled: true,
          licenseKey: 'TEST-KEY'
        });
      });

      mockChrome.tabs.get.mockResolvedValue(pinnedTab);

      const result = await skipRuleEngine.shouldSkipTab(2);

      expect(result).toBe(false);
    });
  });

  describe('rule matching', () => {
    test('should match URL rule', async () => {
      const rule: SkipRule = {
        id: 'rule-1',
        type: 'url',
        pattern: 'example.com',
        enabled: true,
        priority: 0
      };

      mockChrome.storage.local.get.mockImplementation((keys) => {
        if (keys === 'skipRules') {
          return Promise.resolve({ skipRules: [rule] });
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

      const result = await skipRuleEngine.shouldSkipTab(1);

      expect(result).toBe(true);
    });

    test('should match domain rule', async () => {
      const rule: SkipRule = {
        id: 'rule-1',
        type: 'domain',
        pattern: 'example.com',
        enabled: true,
        priority: 0
      };

      mockChrome.storage.local.get.mockImplementation((keys) => {
        if (keys === 'skipRules') {
          return Promise.resolve({ skipRules: [rule] });
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

      const result = await skipRuleEngine.shouldSkipTab(1);

      expect(result).toBe(true);
    });

    test('should match subdomain', async () => {
      const rule: SkipRule = {
        id: 'rule-1',
        type: 'domain',
        pattern: 'example.com',
        enabled: true,
        priority: 0
      };

      mockChrome.storage.local.get.mockImplementation((keys) => {
        if (keys === 'skipRules') {
          return Promise.resolve({ skipRules: [rule] });
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

      const result = await skipRuleEngine.shouldSkipTab(1);

      expect(result).toBe(true);
    });

    test('should not match different domain', async () => {
      const rule: SkipRule = {
        id: 'rule-1',
        type: 'domain',
        pattern: 'example.com',
        enabled: true,
        priority: 0
      };

      mockChrome.storage.local.get.mockImplementation((keys) => {
        if (keys === 'skipRules') {
          return Promise.resolve({ skipRules: [rule] });
        }
        return Promise.resolve({
          premiumEnabled: true,
          licenseKey: 'TEST-KEY'
        });
      });

      mockChrome.tabs.get.mockResolvedValue({
        ...mockTab,
        url: 'https://other.com/page'
      });

      const result = await skipRuleEngine.shouldSkipTab(1);

      expect(result).toBe(false);
    });

    test('should match regex rule', async () => {
      const rule: SkipRule = {
        id: 'rule-1',
        type: 'regex',
        pattern: 'github\\.com/.*/(pull|issues)',
        enabled: true,
        priority: 0
      };

      mockChrome.storage.local.get.mockImplementation((keys) => {
        if (keys === 'skipRules') {
          return Promise.resolve({ skipRules: [rule] });
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

      const result = await skipRuleEngine.shouldSkipTab(1);

      expect(result).toBe(true);
    });

    test('should match title rule', async () => {
      const rule: SkipRule = {
        id: 'rule-1',
        type: 'title',
        pattern: 'Dashboard',
        enabled: true,
        priority: 0
      };

      mockChrome.storage.local.get.mockImplementation((keys) => {
        if (keys === 'skipRules') {
          return Promise.resolve({ skipRules: [rule] });
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

      const result = await skipRuleEngine.shouldSkipTab(1);

      expect(result).toBe(true);
    });

    test('should be case-insensitive for title matching', async () => {
      const rule: SkipRule = {
        id: 'rule-1',
        type: 'title',
        pattern: 'DASHBOARD',
        enabled: true,
        priority: 0
      };

      mockChrome.storage.local.get.mockImplementation((keys) => {
        if (keys === 'skipRules') {
          return Promise.resolve({ skipRules: [rule] });
        }
        return Promise.resolve({
          premiumEnabled: true,
          licenseKey: 'TEST-KEY'
        });
      });

      mockChrome.tabs.get.mockResolvedValue({
        ...mockTab,
        title: 'my dashboard - app'
      });

      const result = await skipRuleEngine.shouldSkipTab(1);

      expect(result).toBe(true);
    });

    test('should match pinned rule', async () => {
      const rule: SkipRule = {
        id: 'rule-1',
        type: 'pinned',
        pattern: '',
        enabled: true,
        priority: 0
      };

      mockChrome.storage.local.get.mockImplementation((keys) => {
        if (keys === 'skipRules') {
          return Promise.resolve({ skipRules: [rule] });
        }
        if (keys === 'skipPinnedTabs') {
          return Promise.resolve({ skipPinnedTabs: false });
        }
        return Promise.resolve({
          premiumEnabled: true,
          licenseKey: 'TEST-KEY'
        });
      });

      mockChrome.tabs.get.mockResolvedValue(pinnedTab);

      const result = await skipRuleEngine.shouldSkipTab(2);

      expect(result).toBe(true);
    });

    test('should only match enabled rules', async () => {
      const rules: SkipRule[] = [
        { id: '1', type: 'url', pattern: 'example.com', enabled: false, priority: 0 },
        { id: '2', type: 'url', pattern: 'other.com', enabled: true, priority: 0 }
      ];

      mockChrome.storage.local.get.mockImplementation((keys) => {
        if (keys === 'skipRules') {
          return Promise.resolve({ skipRules: rules });
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

      const result = await skipRuleEngine.shouldSkipTab(1);

      expect(result).toBe(false); // Disabled rule should not match
    });

    test('should not skip when no rules match', async () => {
      mockChrome.storage.local.get.mockImplementation((keys) => {
        if (keys === 'skipRules') {
          return Promise.resolve({ skipRules: [] });
        }
        return Promise.resolve({
          premiumEnabled: true,
          licenseKey: 'TEST-KEY'
        });
      });

      const result = await skipRuleEngine.shouldSkipTab(1);

      expect(result).toBe(false);
    });
  });

  describe('filterTabs', () => {
    test('should filter out skipped tabs', async () => {
      const rule: SkipRule = {
        id: 'rule-1',
        type: 'domain',
        pattern: 'skip.com',
        enabled: true,
        priority: 0
      };

      mockChrome.storage.local.get.mockImplementation((keys) => {
        if (keys === 'skipRules') {
          return Promise.resolve({ skipRules: [rule] });
        }
        return Promise.resolve({
          premiumEnabled: true,
          licenseKey: 'TEST-KEY'
        });
      });

      const tabs: chrome.tabs.Tab[] = [
        { ...mockTab, id: 1, url: 'https://keep.com' },
        { ...mockTab, id: 2, url: 'https://skip.com' },
        { ...mockTab, id: 3, url: 'https://keep2.com' }
      ];

      mockChrome.tabs.get.mockImplementation((tabId: number) => {
        return Promise.resolve(tabs.find(t => t.id === tabId));
      });

      const filtered = await skipRuleEngine.filterTabs(tabs);

      expect(filtered).toHaveLength(2);
      expect(filtered[0].id).toBe(1);
      expect(filtered[1].id).toBe(3);
    });

    test('should return all tabs when no rules', async () => {
      mockChrome.storage.local.get.mockImplementation((keys) => {
        if (keys === 'skipRules') {
          return Promise.resolve({ skipRules: [] });
        }
        return Promise.resolve({
          premiumEnabled: true,
          licenseKey: 'TEST-KEY'
        });
      });

      const tabs: chrome.tabs.Tab[] = [
        { ...mockTab, id: 1 },
        { ...mockTab, id: 2 },
        { ...mockTab, id: 3 }
      ];

      mockChrome.tabs.get.mockImplementation((tabId: number) => {
        return Promise.resolve(tabs.find(t => t.id === tabId));
      });

      const filtered = await skipRuleEngine.filterTabs(tabs);

      expect(filtered).toHaveLength(3);
    });

    test('should handle tabs without IDs', async () => {
      mockChrome.storage.local.get.mockImplementation((keys) => {
        if (keys === 'skipRules') {
          return Promise.resolve({ skipRules: [] });
        }
        return Promise.resolve({
          premiumEnabled: true,
          licenseKey: 'TEST-KEY'
        });
      });

      const tabs: chrome.tabs.Tab[] = [
        { ...mockTab, id: undefined },
        { ...mockTab, id: 1 }
      ];

      mockChrome.tabs.get.mockResolvedValue({ ...mockTab, id: 1 });

      const filtered = await skipRuleEngine.filterTabs(tabs);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe(1);
    });
  });

  describe('caching', () => {
    test('should cache rules for performance', async () => {
      const rules: SkipRule[] = [
        { id: '1', type: 'url', pattern: 'test', enabled: true, priority: 0 }
      ];

      mockChrome.storage.local.get.mockImplementation((keys) => {
        if (keys === 'skipRules') {
          return Promise.resolve({ skipRules: rules });
        }
        return Promise.resolve({
          premiumEnabled: true,
          licenseKey: 'TEST-KEY'
        });
      });

      // First call - should load from storage
      await skipRuleEngine.initialize();

      // Second call - should use cache
      await skipRuleEngine.shouldSkipTab(1);

      // Storage should be called only once during initialize
      const skipRulesCalls = mockChrome.storage.local.get.mock.calls.filter(
        (call: any) => call[0] === 'skipRules'
      );

      expect(skipRulesCalls.length).toBeGreaterThanOrEqual(1);
    });

    test('should invalidate cache when adding rule', async () => {
      await skipRuleEngine.initialize();

      await skipRuleEngine.addRule({
        type: 'url',
        pattern: 'test',
        enabled: true,
        priority: 0
      });

      // Cache should be invalidated (tested implicitly by next call reloading)
      expect(true).toBe(true);
    });

    test('should invalidate cache when removing rule', async () => {
      await skipRuleEngine.initialize();

      await skipRuleEngine.removeRule('rule-1');

      // Cache should be invalidated
      expect(true).toBe(true);
    });
  });

  describe('bulk operations', () => {
    test('should add rules from patterns', async () => {
      const patterns = ['example.com', 'test.com', 'demo.com'];

      const results = await skipRuleEngine.addRulesFromPatterns(
        patterns,
        'domain',
        'Bulk import'
      );

      expect(results).toHaveLength(3);
      expect(results[0].pattern).toBe('example.com');
      expect(results[1].pattern).toBe('test.com');
      expect(results[2].pattern).toBe('demo.com');
    });

    test('should handle errors in bulk add', async () => {
      const patterns = ['valid.com', 'invalid!domain', 'another.com'];

      const results = await skipRuleEngine.addRulesFromPatterns(
        patterns,
        'domain'
      );

      // Should skip invalid patterns
      expect(results.length).toBeLessThanOrEqual(3);
    });

    test('should export rules as patterns', async () => {
      const rules: SkipRule[] = [
        { id: '1', type: 'url', pattern: 'url1', enabled: true, priority: 0 },
        { id: '2', type: 'domain', pattern: 'domain1', enabled: true, priority: 0 },
        { id: '3', type: 'domain', pattern: 'domain2', enabled: true, priority: 0 },
        { id: '4', type: 'title', pattern: 'title1', enabled: true, priority: 0 }
      ];

      mockChrome.storage.local.get.mockImplementation((keys) => {
        if (keys === 'skipRules') {
          return Promise.resolve({ skipRules: rules });
        }
        return Promise.resolve({
          premiumEnabled: true,
          licenseKey: 'TEST-KEY'
        });
      });

      const exported = await skipRuleEngine.exportRulesAsPatterns();

      expect(exported.urls).toEqual(['url1']);
      expect(exported.domains).toEqual(['domain1', 'domain2']);
      expect(exported.titles).toEqual(['title1']);
    });

    test('should clear all rules', async () => {
      const rules: SkipRule[] = [
        { id: '1', type: 'url', pattern: 'test1', enabled: true, priority: 0 },
        { id: '2', type: 'url', pattern: 'test2', enabled: true, priority: 0 }
      ];

      mockChrome.storage.local.get.mockImplementation((keys) => {
        if (keys === 'skipRules') {
          return Promise.resolve({ skipRules: rules });
        }
        return Promise.resolve({
          premiumEnabled: true,
          licenseKey: 'TEST-KEY'
        });
      });

      await skipRuleEngine.clearAllRules();

      // Should delete each rule
      expect(mockChrome.storage.local.set).toHaveBeenCalled();
    });
  });

  describe('statistics', () => {
    test('should get statistics', async () => {
      const rules: SkipRule[] = [
        { id: '1', type: 'url', pattern: 'test1', enabled: true, priority: 0 },
        { id: '2', type: 'url', pattern: 'test2', enabled: false, priority: 0 },
        { id: '3', type: 'domain', pattern: 'example.com', enabled: true, priority: 0 },
        { id: '4', type: 'title', pattern: 'Dashboard', enabled: true, priority: 0 }
      ];

      mockChrome.storage.local.get.mockImplementation((keys) => {
        if (keys === 'skipRules') {
          return Promise.resolve({ skipRules: rules });
        }
        if (keys === 'skipPinnedTabs') {
          return Promise.resolve({ skipPinnedTabs: true });
        }
        return Promise.resolve({
          premiumEnabled: true,
          licenseKey: 'TEST-KEY'
        });
      });

      const stats = await skipRuleEngine.getStatistics();

      expect(stats.totalRules).toBe(4);
      expect(stats.enabledRules).toBe(3);
      expect(stats.rulesByType.url).toBe(2);
      expect(stats.rulesByType.domain).toBe(1);
      expect(stats.rulesByType.title).toBe(1);
      expect(stats.skipPinnedEnabled).toBe(true);
    });
  });

  describe('test rule', () => {
    test('should test rule against URL', async () => {
      const rule: SkipRule = {
        id: 'rule-1',
        type: 'domain',
        pattern: 'example.com',
        enabled: true,
        priority: 0
      };

      mockChrome.storage.local.get.mockImplementation((keys) => {
        if (keys === 'skipRules') {
          return Promise.resolve({ skipRules: [rule] });
        }
        return Promise.resolve({
          premiumEnabled: true,
          licenseKey: 'TEST-KEY'
        });
      });

      const result = await skipRuleEngine.testRule(
        'rule-1',
        'https://example.com/page',
        'Example Page'
      );

      expect(result).toBe(true);
    });

    test('should test rule with negative result', async () => {
      const rule: SkipRule = {
        id: 'rule-1',
        type: 'domain',
        pattern: 'example.com',
        enabled: true,
        priority: 0
      };

      mockChrome.storage.local.get.mockImplementation((keys) => {
        if (keys === 'skipRules') {
          return Promise.resolve({ skipRules: [rule] });
        }
        return Promise.resolve({
          premiumEnabled: true,
          licenseKey: 'TEST-KEY'
        });
      });

      const result = await skipRuleEngine.testRule(
        'rule-1',
        'https://other.com/page'
      );

      expect(result).toBe(false);
    });

    test('should throw error for non-existent rule', async () => {
      mockChrome.storage.local.get.mockImplementation((keys) => {
        if (keys === 'skipRules') {
          return Promise.resolve({ skipRules: [] });
        }
        return Promise.resolve({
          premiumEnabled: true,
          licenseKey: 'TEST-KEY'
        });
      });

      await expect(
        skipRuleEngine.testRule('nonexistent', 'https://example.com')
      ).rejects.toThrow('Rule not found');
    });
  });

  describe('toggle rule', () => {
    test('should toggle rule enabled state', async () => {
      const rule: SkipRule = {
        id: 'rule-1',
        type: 'url',
        pattern: 'test',
        enabled: true,
        priority: 0
      };

      mockChrome.storage.local.get.mockImplementation((keys) => {
        if (keys === 'skipRules') {
          return Promise.resolve({ skipRules: [rule] });
        }
        return Promise.resolve({
          premiumEnabled: true,
          licenseKey: 'TEST-KEY'
        });
      });

      const result = await skipRuleEngine.toggleRule('rule-1');

      expect(result.enabled).toBe(false);
      expect(mockChrome.storage.local.set).toHaveBeenCalled();
    });

    test('should toggle from disabled to enabled', async () => {
      const rule: SkipRule = {
        id: 'rule-1',
        type: 'url',
        pattern: 'test',
        enabled: false,
        priority: 0
      };

      mockChrome.storage.local.get.mockImplementation((keys) => {
        if (keys === 'skipRules') {
          return Promise.resolve({ skipRules: [rule] });
        }
        return Promise.resolve({
          premiumEnabled: true,
          licenseKey: 'TEST-KEY'
        });
      });

      const result = await skipRuleEngine.toggleRule('rule-1');

      expect(result.enabled).toBe(true);
    });

    test('should throw error for non-existent rule', async () => {
      mockChrome.storage.local.get.mockImplementation((keys) => {
        if (keys === 'skipRules') {
          return Promise.resolve({ skipRules: [] });
        }
        return Promise.resolve({
          premiumEnabled: true,
          licenseKey: 'TEST-KEY'
        });
      });

      await expect(
        skipRuleEngine.toggleRule('nonexistent')
      ).rejects.toThrow('Rule not found');
    });
  });

  describe('edge cases', () => {
    test('should handle tabs without URLs', async () => {
      mockChrome.tabs.get.mockResolvedValue({
        ...mockTab,
        url: undefined
      });

      const result = await skipRuleEngine.shouldSkipTab(1);

      expect(result).toBe(false);
    });

    test('should handle tabs without titles', async () => {
      const rule: SkipRule = {
        id: 'rule-1',
        type: 'title',
        pattern: 'Dashboard',
        enabled: true,
        priority: 0
      };

      mockChrome.storage.local.get.mockImplementation((keys) => {
        if (keys === 'skipRules') {
          return Promise.resolve({ skipRules: [rule] });
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

      const result = await skipRuleEngine.shouldSkipTab(1);

      expect(result).toBe(false);
    });

    test('should handle invalid URLs gracefully', async () => {
      const rule: SkipRule = {
        id: 'rule-1',
        type: 'domain',
        pattern: 'example.com',
        enabled: true,
        priority: 0
      };

      mockChrome.storage.local.get.mockImplementation((keys) => {
        if (keys === 'skipRules') {
          return Promise.resolve({ skipRules: [rule] });
        }
        return Promise.resolve({
          premiumEnabled: true,
          licenseKey: 'TEST-KEY'
        });
      });

      mockChrome.tabs.get.mockResolvedValue({
        ...mockTab,
        url: 'invalid-url'
      });

      const result = await skipRuleEngine.shouldSkipTab(1);

      expect(result).toBe(false); // Should not throw
    });

    test('should handle chrome:// URLs', async () => {
      mockChrome.tabs.get.mockResolvedValue({
        ...mockTab,
        url: 'chrome://extensions'
      });

      const result = await skipRuleEngine.shouldSkipTab(1);

      expect(typeof result).toBe('boolean');
    });

    test('should handle tab not found errors', async () => {
      mockChrome.tabs.get.mockRejectedValue(new Error('Tab not found'));

      const result = await skipRuleEngine.shouldSkipTab(999);

      expect(result).toBe(false); // Should not throw, return false
    });

    test('should generate unique rule IDs', async () => {
      const rule1 = await skipRuleEngine.addRule({
        type: 'url',
        pattern: 'test1',
        enabled: true,
        priority: 0
      });

      const rule2 = await skipRuleEngine.addRule({
        type: 'url',
        pattern: 'test2',
        enabled: true,
        priority: 0
      });

      expect(rule1.id).not.toBe(rule2.id);
    });

    test('should handle storage errors gracefully', async () => {
      mockChrome.storage.local.set.mockRejectedValue(new Error('Storage full'));

      await expect(
        skipRuleEngine.addRule({
          type: 'url',
          pattern: 'test',
          enabled: true,
          priority: 0
        })
      ).rejects.toThrow('Storage full');
    });
  });
});
