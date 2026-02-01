/**
 * GroupManager Test Suite
 *
 * Tests cover:
 * - All matcher types (URL, domain, regex, title, manual)
 * - Group CRUD operations
 * - Security validations
 * - Edge cases and error handling
 * - Match options (case sensitive, exact match)
 *
 * Target: 95%+ code coverage
 */

import { GroupManager } from '../../premium/GroupManager';
import type { TabGroup, TabMatcher } from '../../core/types';

// Mock chrome.storage.local
const mockStorage = new Map<string, any>();

global.chrome = {
  storage: {
    local: {
      get: jest.fn((keys: string | string[] | null) => {
        if (keys === null) {
          return Promise.resolve(Object.fromEntries(mockStorage));
        }
        const keysArray = typeof keys === 'string' ? [keys] : keys;
        const result: any = {};
        keysArray.forEach(key => {
          if (mockStorage.has(key)) {
            result[key] = mockStorage.get(key);
          }
        });
        return Promise.resolve(result);
      }),
      set: jest.fn((items: { [key: string]: any }) => {
        Object.entries(items).forEach(([key, value]) => {
          mockStorage.set(key, value);
        });
        return Promise.resolve();
      }),
    },
  },
} as any;

// Helper: Create mock tabs
function createMockTabs(specs: Array<{ url: string; title: string; id?: number; pinned?: boolean }>): chrome.tabs.Tab[] {
  return specs.map((spec, i) => ({
    id: spec.id || (100 + i),
    index: i,
    url: spec.url,
    title: spec.title,
    pinned: spec.pinned || false,
    active: i === 0,
    windowId: 1,
    highlighted: false,
    incognito: false,
    selected: false,
    discarded: false,
    autoDiscardable: true,
    groupId: -1,
  }));
}

describe('GroupManager', () => {
  let manager: GroupManager;

  beforeEach(() => {
    manager = new GroupManager();
    mockStorage.clear();
    jest.clearAllMocks();
  });

  describe('Group CRUD Operations', () => {
    it('should create and save a group', async () => {
      const group: TabGroup = {
        id: 'test-group-1',
        name: 'Test Group',
        description: 'A test group',
        color: '#ff0000',
        tabs: [
          { type: 'url', pattern: 'github.com' }
        ],
        settings: { enabled: true },
        rotationMode: 'within',
        createdAt: Date.now(),
      };

      await manager.saveGroup(group);

      const saved = await manager.getGroup('test-group-1');
      expect(saved).toBeTruthy();
      expect(saved?.name).toBe('Test Group');
      expect(saved?.color).toBe('#ff0000');
    });

    it('should get all groups', async () => {
      const groups: TabGroup[] = [
        {
          id: 'group-1',
          name: 'Group 1',
          tabs: [{ type: 'url', pattern: 'example.com' }],
          settings: { enabled: true },
          createdAt: Date.now(),
        },
        {
          id: 'group-2',
          name: 'Group 2',
          tabs: [{ type: 'domain', pattern: 'test.com' }],
          settings: { enabled: true },
          createdAt: Date.now(),
        },
      ];

      for (const group of groups) {
        await manager.saveGroup(group);
      }

      const allGroups = await manager.getAllGroups();
      expect(allGroups.length).toBe(2);
      expect(allGroups.map(g => g.id)).toEqual(['group-1', 'group-2']);
    });

    it('should update existing group', async () => {
      const group: TabGroup = {
        id: 'update-test',
        name: 'Original Name',
        tabs: [{ type: 'url', pattern: 'old.com' }],
        settings: { enabled: true },
        createdAt: Date.now(),
      };

      await manager.saveGroup(group);

      // Update
      group.name = 'Updated Name';
      group.tabs = [{ type: 'url', pattern: 'new.com' }];
      await manager.saveGroup(group);

      const updated = await manager.getGroup('update-test');
      expect(updated?.name).toBe('Updated Name');
      expect(updated?.tabs[0]?.pattern).toBe('new.com');
    });

    it('should delete a group', async () => {
      const group: TabGroup = {
        id: 'delete-test',
        name: 'To Delete',
        tabs: [{ type: 'url', pattern: 'test.com' }],
        settings: { enabled: true },
        createdAt: Date.now(),
      };

      await manager.saveGroup(group);
      expect(await manager.getGroup('delete-test')).toBeTruthy();

      await manager.deleteGroup('delete-test');
      expect(await manager.getGroup('delete-test')).toBeNull();
    });

    it('should return null for non-existent group', async () => {
      const group = await manager.getGroup('non-existent');
      expect(group).toBeNull();
    });
  });

  describe('URL Matcher', () => {
    it('should match URL by substring (case insensitive)', async () => {
      const tabs = createMockTabs([
        { url: 'https://github.com/user/repo', title: 'GitHub' },
        { url: 'https://example.com', title: 'Example' },
      ]);

      const group: TabGroup = {
        id: 'url-test',
        name: 'URL Test',
        tabs: [{ type: 'url', pattern: 'github' }],
        settings: { enabled: true },
        createdAt: Date.now(),
      };

      await manager.saveGroup(group);
      const matched = await manager.getGroupTabs(tabs, 'url-test');

      expect(matched.length).toBe(1);
      expect(matched[0]?.url).toContain('github.com');
    });

    it('should match URL case sensitively when option is set', async () => {
      const tabs = createMockTabs([
        { url: 'https://GitHub.com/repo', title: 'GitHub' },
        { url: 'https://github.com/repo2', title: 'github' },
      ]);

      const group: TabGroup = {
        id: 'case-test',
        name: 'Case Test',
        tabs: [
          {
            type: 'url',
            pattern: 'GitHub',
            matchOptions: { caseSensitive: true }
          }
        ],
        settings: { enabled: true },
        createdAt: Date.now(),
      };

      await manager.saveGroup(group);
      const matched = await manager.getGroupTabs(tabs, 'case-test');

      expect(matched.length).toBe(1);
      expect(matched[0]?.url).toContain('GitHub.com');
    });

    it('should match URL exactly when exactMatch is set', async () => {
      const tabs = createMockTabs([
        { url: 'https://example.com', title: 'Exact' },
        { url: 'https://example.com/page', title: 'Not Exact' },
      ]);

      const group: TabGroup = {
        id: 'exact-test',
        name: 'Exact Test',
        tabs: [
          {
            type: 'url',
            pattern: 'https://example.com',
            matchOptions: { exactMatch: true }
          }
        ],
        settings: { enabled: true },
        createdAt: Date.now(),
      };

      await manager.saveGroup(group);
      const matched = await manager.getGroupTabs(tabs, 'exact-test');

      expect(matched.length).toBe(1);
      expect(matched[0]?.url).toBe('https://example.com');
    });
  });

  describe('Domain Matcher', () => {
    it('should match domain exactly', async () => {
      const tabs = createMockTabs([
        { url: 'https://example.com/page', title: 'Example' },
        { url: 'https://test.com/page', title: 'Test' },
      ]);

      const group: TabGroup = {
        id: 'domain-test',
        name: 'Domain Test',
        tabs: [{ type: 'domain', pattern: 'example.com' }],
        settings: { enabled: true },
        createdAt: Date.now(),
      };

      await manager.saveGroup(group);
      const matched = await manager.getGroupTabs(tabs, 'domain-test');

      expect(matched.length).toBe(1);
      expect(matched[0]?.url).toContain('example.com');
    });

    it('should match subdomains', async () => {
      const tabs = createMockTabs([
        { url: 'https://www.example.com', title: 'WWW' },
        { url: 'https://api.example.com', title: 'API' },
        { url: 'https://other.com', title: 'Other' },
      ]);

      const group: TabGroup = {
        id: 'subdomain-test',
        name: 'Subdomain Test',
        tabs: [{ type: 'domain', pattern: 'example.com' }],
        settings: { enabled: true },
        createdAt: Date.now(),
      };

      await manager.saveGroup(group);
      const matched = await manager.getGroupTabs(tabs, 'subdomain-test');

      expect(matched.length).toBe(2);
      expect(matched.every(t => t.url?.includes('example.com'))).toBe(true);
    });

    it('should handle invalid URLs gracefully', async () => {
      const tabs = createMockTabs([
        { url: 'not-a-valid-url', title: 'Invalid' },
        { url: 'https://valid.com', title: 'Valid' },
      ]);

      const group: TabGroup = {
        id: 'invalid-url-test',
        name: 'Invalid URL Test',
        tabs: [{ type: 'domain', pattern: 'valid.com' }],
        settings: { enabled: true },
        createdAt: Date.now(),
      };

      await manager.saveGroup(group);
      const matched = await manager.getGroupTabs(tabs, 'invalid-url-test');

      expect(matched.length).toBe(1);
      expect(matched[0]?.url).toBe('https://valid.com');
    });
  });

  describe('Regex Matcher', () => {
    it('should match URL with regex pattern', async () => {
      const tabs = createMockTabs([
        { url: 'https://github.com/user/repo1', title: 'Repo 1' },
        { url: 'https://github.com/user/repo2', title: 'Repo 2' },
        { url: 'https://example.com', title: 'Example' },
      ]);

      const group: TabGroup = {
        id: 'regex-test',
        name: 'Regex Test',
        tabs: [{ type: 'regex', pattern: 'github\\.com/user/repo\\d' }],
        settings: { enabled: true },
        createdAt: Date.now(),
      };

      await manager.saveGroup(group);
      const matched = await manager.getGroupTabs(tabs, 'regex-test');

      expect(matched.length).toBe(2);
      expect(matched.every(t => t.url?.includes('github.com/user/repo'))).toBe(true);
    });

    it('should reject invalid regex patterns', async () => {
      const tabs = createMockTabs([
        { url: 'https://example.com', title: 'Example' },
      ]);

      const group: TabGroup = {
        id: 'invalid-regex',
        name: 'Invalid Regex',
        tabs: [{ type: 'regex', pattern: '(unclosed group' }], // Invalid regex
        settings: { enabled: true },
        createdAt: Date.now(),
      };

      await manager.saveGroup(group);
      const matched = await manager.getGroupTabs(tabs, 'invalid-regex');

      // Invalid regex should match nothing
      expect(matched.length).toBe(0);
    });

    it('should handle regex with case insensitive flag', async () => {
      const tabs = createMockTabs([
        { url: 'https://GITHUB.com/repo', title: 'Upper' },
        { url: 'https://github.com/repo', title: 'Lower' },
      ]);

      const group: TabGroup = {
        id: 'regex-case-test',
        name: 'Regex Case Test',
        tabs: [
          {
            type: 'regex',
            pattern: 'github\\.com',
            matchOptions: { caseSensitive: false }
          }
        ],
        settings: { enabled: true },
        createdAt: Date.now(),
      };

      await manager.saveGroup(group);
      const matched = await manager.getGroupTabs(tabs, 'regex-case-test');

      expect(matched.length).toBe(2);
    });
  });

  describe('Title Matcher', () => {
    it('should match title by substring', async () => {
      const tabs = createMockTabs([
        { url: 'https://example.com', title: 'Dashboard - Main' },
        { url: 'https://example.com', title: 'Settings Page' },
      ]);

      const group: TabGroup = {
        id: 'title-test',
        name: 'Title Test',
        tabs: [{ type: 'title', pattern: 'Dashboard' }],
        settings: { enabled: true },
        createdAt: Date.now(),
      };

      await manager.saveGroup(group);
      const matched = await manager.getGroupTabs(tabs, 'title-test');

      expect(matched.length).toBe(1);
      expect(matched[0]?.title).toContain('Dashboard');
    });

    it('should match title case sensitively', async () => {
      const tabs = createMockTabs([
        { url: 'https://example.com', title: 'GitHub Issues' },
        { url: 'https://example.com', title: 'github projects' },
      ]);

      const group: TabGroup = {
        id: 'title-case-test',
        name: 'Title Case Test',
        tabs: [
          {
            type: 'title',
            pattern: 'GitHub',
            matchOptions: { caseSensitive: true }
          }
        ],
        settings: { enabled: true },
        createdAt: Date.now(),
      };

      await manager.saveGroup(group);
      const matched = await manager.getGroupTabs(tabs, 'title-case-test');

      expect(matched.length).toBe(1);
      expect(matched[0]?.title).toBe('GitHub Issues');
    });
  });

  describe('Manual Matcher', () => {
    it('should match tabs by explicit tab IDs', async () => {
      const tabs = createMockTabs([
        { url: 'https://example.com/1', title: 'Tab 1', id: 101 },
        { url: 'https://example.com/2', title: 'Tab 2', id: 102 },
        { url: 'https://example.com/3', title: 'Tab 3', id: 103 },
      ]);

      const group: TabGroup = {
        id: 'manual-test',
        name: 'Manual Test',
        tabs: [{ type: 'manual', tabIds: [101, 103] }],
        settings: { enabled: true },
        createdAt: Date.now(),
      };

      await manager.saveGroup(group);
      const matched = await manager.getGroupTabs(tabs, 'manual-test');

      expect(matched.length).toBe(2);
      expect(matched.map(t => t.id)).toEqual([101, 103]);
    });

    it('should handle missing tab IDs', async () => {
      const tabs = createMockTabs([
        { url: 'https://example.com/1', title: 'Tab 1', id: 101 },
      ]);

      const group: TabGroup = {
        id: 'missing-ids',
        name: 'Missing IDs',
        tabs: [{ type: 'manual', tabIds: [999, 888] }], // IDs that don't exist
        settings: { enabled: true },
        createdAt: Date.now(),
      };

      await manager.saveGroup(group);
      const matched = await manager.getGroupTabs(tabs, 'missing-ids');

      expect(matched.length).toBe(0);
    });
  });

  describe('Multiple Matchers', () => {
    it('should match if any matcher matches (OR logic)', async () => {
      const tabs = createMockTabs([
        { url: 'https://github.com/repo', title: 'GitHub' },
        { url: 'https://example.com', title: 'Dashboard' },
        { url: 'https://other.com', title: 'Other' },
      ]);

      const group: TabGroup = {
        id: 'multi-test',
        name: 'Multi Matcher',
        tabs: [
          { type: 'url', pattern: 'github' },
          { type: 'title', pattern: 'Dashboard' },
        ],
        settings: { enabled: true },
        createdAt: Date.now(),
      };

      await manager.saveGroup(group);
      const matched = await manager.getGroupTabs(tabs, 'multi-test');

      expect(matched.length).toBe(2);
      expect(matched.map(t => t.title)).toContain('GitHub');
      expect(matched.map(t => t.title)).toContain('Dashboard');
    });
  });

  describe('Security Tests', () => {
    it('should sanitize group names', async () => {
      const group: TabGroup = {
        id: 'sanitize-test',
        name: 'Test<script>alert("xss")</script>',
        description: 'Test\x00null\x1Fbyte',
        tabs: [{ type: 'url', pattern: 'test.com' }],
        settings: { enabled: true },
        createdAt: Date.now(),
      };

      await manager.saveGroup(group);
      const saved = await manager.getGroup('sanitize-test');

      expect(saved?.name).not.toContain('<script>');
      expect(saved?.description).not.toContain('\x00');
    });

    it('should enforce maximum group count', async () => {
      // Create 50 groups (max limit)
      for (let i = 0; i < 50; i++) {
        const group: TabGroup = {
          id: `group-${i}`,
          name: `Group ${i}`,
          tabs: [{ type: 'url', pattern: 'test.com' }],
          settings: { enabled: true },
          createdAt: Date.now(),
        };
        await manager.saveGroup(group);
      }

      // Try to create 51st group
      const extraGroup: TabGroup = {
        id: 'group-51',
        name: 'Extra Group',
        tabs: [{ type: 'url', pattern: 'test.com' }],
        settings: { enabled: true },
        createdAt: Date.now(),
      };

      await expect(manager.saveGroup(extraGroup)).rejects.toThrow();
    });

    it('should limit matcher count per group', async () => {
      const matchers: TabMatcher[] = Array.from({ length: 150 }, (_, i) => ({
        type: 'url',
        pattern: `test${i}.com`
      }));

      const group: TabGroup = {
        id: 'many-matchers',
        name: 'Many Matchers',
        tabs: matchers,
        settings: { enabled: true },
        createdAt: Date.now(),
      };

      await manager.saveGroup(group);
      const saved = await manager.getGroup('many-matchers');

      // Should be limited to 100
      expect(saved?.tabs.length).toBe(100);
    });

    it('should sanitize color values', async () => {
      const group: TabGroup = {
        id: 'color-test',
        name: 'Color Test',
        color: 'javascript:alert(1)', // Malicious
        tabs: [{ type: 'url', pattern: 'test.com' }],
        settings: { enabled: true },
        createdAt: Date.now(),
      };

      await manager.saveGroup(group);
      const saved = await manager.getGroup('color-test');

      // Should fall back to default gray
      expect(saved?.color).toBe('gray');
    });

    it('should validate group structure', async () => {
      const invalidGroups = [
        { id: '', name: 'No ID', tabs: [], settings: { enabled: true } },
        { id: 'test', name: '', tabs: [], settings: { enabled: true } },
        { id: 'test', name: 'Test', tabs: null, settings: { enabled: true } },
        { id: 'test', name: 'Test', tabs: [], settings: null },
      ];

      for (const invalid of invalidGroups) {
        await expect(
          manager.saveGroup(invalid as TabGroup)
        ).rejects.toThrow();
      }
    });

    it('should skip invalid matchers during sanitization', async () => {
      const group: TabGroup = {
        id: 'invalid-matchers',
        name: 'Invalid Matchers',
        tabs: [
          { type: 'url', pattern: 'valid.com' },
          { type: 'manual', tabIds: [] }, // Invalid: no tab IDs
          { type: 'regex', pattern: '' }, // Invalid: empty pattern
          { type: 'url', pattern: 'another.com' },
        ],
        settings: { enabled: true },
        createdAt: Date.now(),
      };

      await manager.saveGroup(group);
      const saved = await manager.getGroup('invalid-matchers');

      // Should only have valid matchers
      expect(saved?.tabs.length).toBe(2);
      expect(saved?.tabs.every(m => m.pattern)).toBe(true);
    });
  });

  describe('Group Settings', () => {
    it('should get and set active group ID', async () => {
      await manager.setActiveGroupId('test-group');
      const activeId = await manager.getActiveGroupId();
      expect(activeId).toBe('test-group');
    });

    it('should get and set group rotation mode', async () => {
      await manager.setGroupRotationMode('within-group');
      const mode = await manager.getGroupRotationMode();
      expect(mode).toBe('within-group');
    });

    it('should return null for active group when not set', async () => {
      const activeId = await manager.getActiveGroupId();
      expect(activeId).toBeNull();
    });

    it('should return independent mode by default', async () => {
      const mode = await manager.getGroupRotationMode();
      expect(mode).toBe('independent');
    });
  });

  describe('Group Filtering', () => {
    it('should filter tabs for within-group mode', async () => {
      const tabs = createMockTabs([
        { url: 'https://github.com/repo1', title: 'Repo 1' },
        { url: 'https://github.com/repo2', title: 'Repo 2' },
        { url: 'https://example.com', title: 'Example' },
      ]);

      const group: TabGroup = {
        id: 'github-group',
        name: 'GitHub',
        tabs: [{ type: 'url', pattern: 'github' }],
        settings: { enabled: true },
        createdAt: Date.now(),
      };

      await manager.saveGroup(group);

      const filtered = await manager.filterTabsByGroupMode(
        tabs,
        'github-group',
        'within-group'
      );

      expect(filtered.length).toBe(2);
      expect(filtered.every(t => t.url?.includes('github'))).toBe(true);
    });

    it('should return all tabs for independent mode', async () => {
      const tabs = createMockTabs([
        { url: 'https://github.com', title: 'GitHub' },
        { url: 'https://example.com', title: 'Example' },
      ]);

      const filtered = await manager.filterTabsByGroupMode(
        tabs,
        'any-group',
        'independent'
      );

      expect(filtered.length).toBe(2);
    });

    it('should skip disabled groups', async () => {
      const tabs = createMockTabs([
        { url: 'https://github.com', title: 'GitHub' },
      ]);

      const group: TabGroup = {
        id: 'disabled-group',
        name: 'Disabled',
        tabs: [{ type: 'url', pattern: 'github' }],
        settings: { enabled: false }, // Disabled
        createdAt: Date.now(),
      };

      await manager.saveGroup(group);

      const matched = await manager.getGroupTabs(tabs, 'disabled-group');
      expect(matched.length).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty tabs array', async () => {
      const tabs: chrome.tabs.Tab[] = [];

      const group: TabGroup = {
        id: 'empty-test',
        name: 'Empty Test',
        tabs: [{ type: 'url', pattern: 'test.com' }],
        settings: { enabled: true },
        createdAt: Date.now(),
      };

      await manager.saveGroup(group);
      const matched = await manager.getGroupTabs(tabs, 'empty-test');

      expect(matched.length).toBe(0);
    });

    it('should handle tabs with missing URLs', async () => {
      const tabs = [
        { id: 101, index: 0, title: 'No URL', url: undefined },
        { id: 102, index: 1, title: 'Has URL', url: 'https://example.com' },
      ] as chrome.tabs.Tab[];

      const group: TabGroup = {
        id: 'missing-url',
        name: 'Missing URL',
        tabs: [{ type: 'url', pattern: 'example' }],
        settings: { enabled: true },
        createdAt: Date.now(),
      };

      await manager.saveGroup(group);
      const matched = await manager.getGroupTabs(tabs, 'missing-url');

      expect(matched.length).toBe(1);
      expect(matched[0]?.title).toBe('Has URL');
    });

    it('should handle storage errors gracefully', async () => {
      // Mock storage.get to throw error
      (chrome.storage.local.get as jest.Mock).mockRejectedValueOnce(new Error('Storage error'));

      const groups = await manager.getAllGroups();
      expect(groups).toEqual([]);
    });
  });
});
