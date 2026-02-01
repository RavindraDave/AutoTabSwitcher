/**
 * Tests for ConflictDetector
 *
 * Tests skip rule vs group conflict detection
 * Tests all matcher type combinations
 * Tests edge cases
 */

import {
  detectSkipRuleGroupConflicts,
  detectActiveGroupConflicts,
  getConflictSummary,
  type Conflict
} from '../../premium/conflict-detector';
import type { TabGroup, TabMatcher } from '../../core/types';

// Mock logger
jest.mock('../../core/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn()
  }
}));

describe('ConflictDetector', () => {
  describe('detectSkipRuleGroupConflicts', () => {
    it('should detect conflict when skip rule matches group URL matcher', async () => {
      const skipRules = [
        {
          id: 'skip-1',
          pattern: 'example.com',
          type: 'url',
          enabled: true
        }
      ];

      const group: TabGroup = {
        id: 'group-1',
        name: 'Test Group',
        tabs: [
          {
            type: 'url',
            pattern: 'example.com/page'
          } as TabMatcher
        ],
        rotationMode: 'within',
        settings: {
          enabled: true,
          customDelayTime: 5000
        },
        createdAt: Date.now()
      };

      const conflicts = await detectSkipRuleGroupConflicts(skipRules, group);

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0]).toMatchObject({
        type: 'skip-vs-group',
        skipRuleId: 'skip-1',
        skipRulePattern: 'example.com',
        groupId: 'group-1',
        groupName: 'Test Group',
        matcherIndex: 0,
        matcherPattern: 'example.com/page'
      });
      expect(conflicts[0]?.description).toContain('Skip rule');
      expect(conflicts[0]?.description).toContain('Test Group');
    });

    it('should detect conflict when patterns match exactly', async () => {
      const skipRules = [
        {
          id: 'skip-1',
          pattern: 'github.com',
          type: 'domain',
          enabled: true
        }
      ];

      const group: TabGroup = {
        id: 'group-1',
        name: 'Dev Group',
        tabs: [
          {
            type: 'domain',
            pattern: 'github.com'
          } as TabMatcher
        ],
        rotationMode: 'within',
        settings: { enabled: true },
        createdAt: Date.now()
      };

      const conflicts = await detectSkipRuleGroupConflicts(skipRules, group);

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0]?.matcherPattern).toBe('github.com');
    });

    it('should detect conflict when group pattern contains skip pattern', async () => {
      const skipRules = [
        {
          id: 'skip-1',
          pattern: 'ads',
          type: 'url',
          enabled: true
        }
      ];

      const group: TabGroup = {
        id: 'group-1',
        name: 'All Sites',
        tabs: [
          {
            type: 'url',
            pattern: 'example.com/ads/banner'
          } as TabMatcher
        ],
        rotationMode: 'within',
        settings: { enabled: true },
        createdAt: Date.now()
      };

      const conflicts = await detectSkipRuleGroupConflicts(skipRules, group);

      expect(conflicts).toHaveLength(1);
    });

    it('should not detect conflict when types are incompatible', async () => {
      const skipRules = [
        {
          id: 'skip-1',
          pattern: 'example',
          type: 'title',
          enabled: true
        }
      ];

      const group: TabGroup = {
        id: 'group-1',
        name: 'Test Group',
        tabs: [
          {
            type: 'domain',
            pattern: 'example.com'
          } as TabMatcher
        ],
        rotationMode: 'within',
        settings: { enabled: true },
        createdAt: Date.now()
      };

      const conflicts = await detectSkipRuleGroupConflicts(skipRules, group);

      expect(conflicts).toHaveLength(0);
    });

    it('should not detect conflict when patterns do not overlap', async () => {
      const skipRules = [
        {
          id: 'skip-1',
          pattern: 'google.com',
          type: 'url',
          enabled: true
        }
      ];

      const group: TabGroup = {
        id: 'group-1',
        name: 'Test Group',
        tabs: [
          {
            type: 'url',
            pattern: 'github.com'
          } as TabMatcher
        ],
        rotationMode: 'within',
        settings: { enabled: true },
        createdAt: Date.now()
      };

      const conflicts = await detectSkipRuleGroupConflicts(skipRules, group);

      expect(conflicts).toHaveLength(0);
    });

    it('should ignore disabled skip rules', async () => {
      const skipRules = [
        {
          id: 'skip-1',
          pattern: 'example.com',
          type: 'url',
          enabled: false // Disabled!
        }
      ];

      const group: TabGroup = {
        id: 'group-1',
        name: 'Test Group',
        tabs: [
          {
            type: 'url',
            pattern: 'example.com'
          } as TabMatcher
        ],
        rotationMode: 'within',
        settings: { enabled: true },
        createdAt: Date.now()
      };

      const conflicts = await detectSkipRuleGroupConflicts(skipRules, group);

      expect(conflicts).toHaveLength(0);
    });

    it('should detect multiple conflicts for same skip rule', async () => {
      const skipRules = [
        {
          id: 'skip-1',
          pattern: 'example',
          type: 'url',
          enabled: true
        }
      ];

      const group: TabGroup = {
        id: 'group-1',
        name: 'Test Group',
        tabs: [
          {
            type: 'url',
            pattern: 'example.com'
          } as TabMatcher,
          {
            type: 'url',
            pattern: 'example.org'
          } as TabMatcher,
          {
            type: 'url',
            pattern: 'test.example.net'
          } as TabMatcher
        ],
        rotationMode: 'within',
        settings: { enabled: true },
        createdAt: Date.now()
      };

      const conflicts = await detectSkipRuleGroupConflicts(skipRules, group);

      expect(conflicts).toHaveLength(3);
      expect(conflicts[0]?.matcherIndex).toBe(0);
      expect(conflicts[1]?.matcherIndex).toBe(1);
      expect(conflicts[2]?.matcherIndex).toBe(2);
    });

    it('should detect conflicts for multiple skip rules', async () => {
      const skipRules = [
        {
          id: 'skip-1',
          pattern: 'google',
          type: 'url',
          enabled: true
        },
        {
          id: 'skip-2',
          pattern: 'github',
          type: 'url',
          enabled: true
        }
      ];

      const group: TabGroup = {
        id: 'group-1',
        name: 'Test Group',
        tabs: [
          {
            type: 'url',
            pattern: 'google.com'
          } as TabMatcher,
          {
            type: 'url',
            pattern: 'github.com'
          } as TabMatcher
        ],
        rotationMode: 'within',
        settings: { enabled: true },
        createdAt: Date.now()
      };

      const conflicts = await detectSkipRuleGroupConflicts(skipRules, group);

      expect(conflicts).toHaveLength(2);
      expect(conflicts[0]?.skipRuleId).toBe('skip-1');
      expect(conflicts[1]?.skipRuleId).toBe('skip-2');
    });

    it('should handle URL type matching against other types', async () => {
      const skipRules = [
        {
          id: 'skip-1',
          pattern: 'example',
          type: 'url',
          enabled: true
        }
      ];

      const group: TabGroup = {
        id: 'group-1',
        name: 'Test Group',
        tabs: [
          {
            type: 'domain',
            pattern: 'example.com'
          } as TabMatcher
        ],
        rotationMode: 'within',
        settings: { enabled: true },
        createdAt: Date.now()
      };

      const conflicts = await detectSkipRuleGroupConflicts(skipRules, group);

      // URL type should match with domain type
      expect(conflicts).toHaveLength(1);
    });

    it('should be case-insensitive', async () => {
      const skipRules = [
        {
          id: 'skip-1',
          pattern: 'EXAMPLE.COM',
          type: 'url',
          enabled: true
        }
      ];

      const group: TabGroup = {
        id: 'group-1',
        name: 'Test Group',
        tabs: [
          {
            type: 'url',
            pattern: 'example.com'
          } as TabMatcher
        ],
        rotationMode: 'within',
        settings: { enabled: true },
        createdAt: Date.now()
      };

      const conflicts = await detectSkipRuleGroupConflicts(skipRules, group);

      expect(conflicts).toHaveLength(1);
    });

    it('should handle empty skip rules', async () => {
      const group: TabGroup = {
        id: 'group-1',
        name: 'Test Group',
        tabs: [
          {
            type: 'url',
            pattern: 'example.com'
          } as TabMatcher
        ],
        rotationMode: 'within',
        settings: { enabled: true },
        createdAt: Date.now()
      };

      const conflicts = await detectSkipRuleGroupConflicts([], group);

      expect(conflicts).toHaveLength(0);
    });

    it('should handle empty group matchers', async () => {
      const skipRules = [
        {
          id: 'skip-1',
          pattern: 'example.com',
          type: 'url',
          enabled: true
        }
      ];

      const group: TabGroup = {
        id: 'group-1',
        name: 'Test Group',
        tabs: [],
        rotationMode: 'within',
        settings: { enabled: true },
        createdAt: Date.now()
      };

      const conflicts = await detectSkipRuleGroupConflicts(skipRules, group);

      expect(conflicts).toHaveLength(0);
    });

    it('should handle matcher without pattern', async () => {
      const skipRules = [
        {
          id: 'skip-1',
          pattern: 'example.com',
          type: 'url',
          enabled: true
        }
      ];

      const group: TabGroup = {
        id: 'group-1',
        name: 'Test Group',
        tabs: [
          {
            type: 'manual',
            tabIds: [1, 2, 3]
          } as TabMatcher
        ],
        rotationMode: 'within',
        settings: { enabled: true },
        createdAt: Date.now()
      };

      const conflicts = await detectSkipRuleGroupConflicts(skipRules, group);

      expect(conflicts).toHaveLength(0);
    });
  });

  describe('detectActiveGroupConflicts', () => {
    beforeEach(() => {
      jest.resetModules();
    });

    it('should return empty array when no active group', async () => {
      // Mock the dynamic imports
      jest.doMock('../../premium/SkipRuleEngine.js', () => ({
        skipRuleEngine: {
          getRules: jest.fn().mockResolvedValue([])
        }
      }));

      jest.doMock('../../premium/GroupManager.js', () => ({
        groupManager: {
          getActiveGroupId: jest.fn().mockResolvedValue(null),
          getGroup: jest.fn()
        }
      }));

      const conflicts = await detectActiveGroupConflicts();

      expect(conflicts).toHaveLength(0);
    });

    it('should handle errors gracefully', async () => {
      // Mock the dynamic imports to throw error
      jest.doMock('../../premium/SkipRuleEngine.js', () => ({
        skipRuleEngine: {
          getRules: jest.fn().mockRejectedValue(new Error('Storage error'))
        }
      }));

      jest.doMock('../../premium/GroupManager.js', () => ({
        groupManager: {
          getActiveGroupId: jest.fn().mockResolvedValue('group-1'),
          getGroup: jest.fn().mockResolvedValue({
            id: 'group-1',
            name: 'Test',
            tabs: []
          })
        }
      }));

      const conflicts = await detectActiveGroupConflicts();

      expect(conflicts).toHaveLength(0);
    });
  });

  describe('getConflictSummary', () => {
    it('should return "No conflicts" for empty array', () => {
      const summary = getConflictSummary([]);
      expect(summary).toBe('No conflicts detected');
    });

    it('should return description for single conflict', () => {
      const conflicts: Conflict[] = [
        {
          type: 'skip-vs-group',
          skipRuleId: 'skip-1',
          skipRulePattern: 'example.com',
          groupId: 'group-1',
          groupName: 'Test Group',
          matcherIndex: 0,
          matcherPattern: 'example.com/page',
          description: 'Test conflict description'
        }
      ];

      const summary = getConflictSummary(conflicts);
      expect(summary).toBe('Test conflict description');
    });

    it('should return count summary for multiple conflicts', () => {
      const conflicts: Conflict[] = [
        {
          type: 'skip-vs-group',
          skipRuleId: 'skip-1',
          skipRulePattern: 'example.com',
          groupId: 'group-1',
          groupName: 'Test Group',
          matcherIndex: 0,
          matcherPattern: 'example.com/page',
          description: 'Conflict 1'
        },
        {
          type: 'skip-vs-group',
          skipRuleId: 'skip-1',
          skipRulePattern: 'example.com',
          groupId: 'group-1',
          groupName: 'Test Group',
          matcherIndex: 1,
          matcherPattern: 'example.com/other',
          description: 'Conflict 2'
        }
      ];

      const summary = getConflictSummary(conflicts);
      expect(summary).toBe('2 conflicts detected with 1 skip rule');
    });

    it('should use plural for multiple skip rules', () => {
      const conflicts: Conflict[] = [
        {
          type: 'skip-vs-group',
          skipRuleId: 'skip-1',
          skipRulePattern: 'example.com',
          groupId: 'group-1',
          groupName: 'Test Group',
          matcherIndex: 0,
          matcherPattern: 'example.com',
          description: 'Conflict 1'
        },
        {
          type: 'skip-vs-group',
          skipRuleId: 'skip-2',
          skipRulePattern: 'google.com',
          groupId: 'group-1',
          groupName: 'Test Group',
          matcherIndex: 1,
          matcherPattern: 'google.com',
          description: 'Conflict 2'
        }
      ];

      const summary = getConflictSummary(conflicts);
      expect(summary).toBe('2 conflicts detected with 2 skip rules');
    });

    it('should handle null/undefined conflicts array', () => {
      const summary = getConflictSummary(null as any);
      expect(summary).toBe('No conflicts detected');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long patterns', async () => {
      const longPattern = 'a'.repeat(1000);

      const skipRules = [
        {
          id: 'skip-1',
          pattern: longPattern,
          type: 'url',
          enabled: true
        }
      ];

      const group: TabGroup = {
        id: 'group-1',
        name: 'Test Group',
        tabs: [
          {
            type: 'url',
            pattern: longPattern
          } as TabMatcher
        ],
        rotationMode: 'within',
        settings: { enabled: true },
        createdAt: Date.now()
      };

      const conflicts = await detectSkipRuleGroupConflicts(skipRules, group);

      expect(conflicts).toHaveLength(1);
    });

    it('should handle special characters in patterns', async () => {
      const skipRules = [
        {
          id: 'skip-1',
          pattern: 'example.com/path?query=value&foo=bar',
          type: 'url',
          enabled: true
        }
      ];

      const group: TabGroup = {
        id: 'group-1',
        name: 'Test Group',
        tabs: [
          {
            type: 'url',
            pattern: 'example.com/path'
          } as TabMatcher
        ],
        rotationMode: 'within',
        settings: { enabled: true },
        createdAt: Date.now()
      };

      const conflicts = await detectSkipRuleGroupConflicts(skipRules, group);

      expect(conflicts).toHaveLength(1);
    });

    it('should handle empty string patterns', async () => {
      const skipRules = [
        {
          id: 'skip-1',
          pattern: '',
          type: 'url',
          enabled: true
        }
      ];

      const group: TabGroup = {
        id: 'group-1',
        name: 'Test Group',
        tabs: [
          {
            type: 'url',
            pattern: 'example.com'
          } as TabMatcher
        ],
        rotationMode: 'within',
        settings: { enabled: true },
        createdAt: Date.now()
      };

      const conflicts = await detectSkipRuleGroupConflicts(skipRules, group);

      // Empty pattern should match any pattern
      expect(conflicts).toHaveLength(1);
    });
  });
});
