/**
 * RotationEngine Test Suite
 *
 * Tests cover:
 * - All rotation pattern types
 * - Security validations
 * - Edge cases and error handling
 * - Cache behavior
 * - Input sanitization
 *
 * Target: 95%+ code coverage
 */

import { RotationEngine } from '../../premium/RotationEngine';
import type { RotationPattern } from '../../core/types';

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
function createMockTabs(count: number, pinnedCount: number = 0): chrome.tabs.Tab[] {
  return Array.from({ length: count }, (_, i) => ({
    id: 100 + i,
    index: i,
    pinned: i < pinnedCount,
    active: i === 0,
    title: `Tab ${i}`,
    url: `https://example.com/tab${i}`,
    windowId: 1,
    highlighted: false,
    incognito: false,
    selected: false,
    discarded: false,
    autoDiscardable: true,
    groupId: -1,
  }));
}

describe('RotationEngine', () => {
  let engine: RotationEngine;

  beforeEach(() => {
    engine = new RotationEngine();
    mockStorage.clear();
    jest.clearAllMocks();
  });

  describe('Sequential Pattern', () => {
    it('should rotate tabs sequentially', async () => {
      const tabs = createMockTabs(5);
      const pattern: RotationPattern = {
        id: 'test-sequential',
        name: 'Sequential',
        type: 'sequential',
        createdAt: Date.now(),
      };

      // Save pattern
      await engine.savePattern(pattern);

      // Test rotation: 0 -> 1 -> 2 -> 3 -> 4 -> 0
      const next1 = await engine.getNextTabIndex(tabs, 100, 'test-sequential');
      expect(next1).toBe(1); // Index 0 -> 1

      const next2 = await engine.getNextTabIndex(tabs, 101, 'test-sequential');
      expect(next2).toBe(2); // Index 1 -> 2

      const next3 = await engine.getNextTabIndex(tabs, 104, 'test-sequential');
      expect(next3).toBe(0); // Index 4 -> 0 (wrap around)
    });

    it('should respect pinned tabs when option is set', async () => {
      const tabs = createMockTabs(5, 2); // 2 pinned, 3 unpinned
      const pattern: RotationPattern = {
        id: 'test-pinned-respect',
        name: 'Sequential with Pinned',
        type: 'sequential',
        options: { respectPinned: true },
        createdAt: Date.now(),
      };

      await engine.savePattern(pattern);

      const sequence = await engine.resolvePattern(tabs, pattern);

      // Should have pinned tabs first [0, 1], then unpinned [2, 3, 4]
      expect(sequence).toEqual([0, 1, 2, 3, 4]);
    });
  });

  describe('Reverse Pattern', () => {
    it('should rotate tabs in reverse order', async () => {
      const tabs = createMockTabs(4);
      const pattern: RotationPattern = {
        id: 'test-reverse',
        name: 'Reverse',
        type: 'reverse',
        createdAt: Date.now(),
      };

      await engine.savePattern(pattern);

      const sequence = await engine.resolvePattern(tabs, pattern);

      // Reverse: [3, 2, 1, 0]
      expect(sequence).toEqual([3, 2, 1, 0]);
    });
  });

  describe('Random Pattern', () => {
    it('should shuffle tabs randomly with consistent seed', async () => {
      const tabs = createMockTabs(10);
      const pattern: RotationPattern = {
        id: 'test-random',
        name: 'Random',
        type: 'random',
        createdAt: Date.now(),
      };

      await engine.savePattern(pattern);

      const sequence1 = await engine.resolvePattern(tabs, pattern);
      const sequence2 = await engine.resolvePattern(tabs, pattern);

      // Same seed should produce same shuffle
      expect(sequence1).toEqual(sequence2);

      // Should contain all indices
      expect(sequence1.sort()).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    });

    it('should shuffle differently for different patterns', async () => {
      const tabs = createMockTabs(10);

      const pattern1: RotationPattern = {
        id: 'random1',
        name: 'Random 1',
        type: 'random',
        createdAt: Date.now(),
      };

      const pattern2: RotationPattern = {
        id: 'random2',
        name: 'Random 2',
        type: 'random',
        createdAt: Date.now(),
      };

      await engine.savePattern(pattern1);
      await engine.savePattern(pattern2);

      const sequence1 = await engine.resolvePattern(tabs, pattern1);
      const sequence2 = await engine.resolvePattern(tabs, pattern2);

      // Different seeds should produce different shuffles (with high probability)
      expect(sequence1).not.toEqual(sequence2);
    });
  });

  describe('Pinned-First Pattern', () => {
    it('should rotate pinned tabs before unpinned tabs', async () => {
      const tabs = createMockTabs(6, 2); // 2 pinned, 4 unpinned
      const pattern: RotationPattern = {
        id: 'test-pinned-first',
        name: 'Pinned First',
        type: 'pinned-first',
        createdAt: Date.now(),
      };

      await engine.savePattern(pattern);

      const sequence = await engine.resolvePattern(tabs, pattern);

      // Pinned tabs [0, 1] then unpinned [2, 3, 4, 5]
      expect(sequence).toEqual([0, 1, 2, 3, 4, 5]);
    });

    it('should handle all pinned tabs', async () => {
      const tabs = createMockTabs(3, 3); // All pinned
      const pattern: RotationPattern = {
        id: 'test-all-pinned',
        name: 'All Pinned',
        type: 'pinned-first',
        createdAt: Date.now(),
      };

      await engine.savePattern(pattern);

      const sequence = await engine.resolvePattern(tabs, pattern);

      expect(sequence).toEqual([0, 1, 2]);
    });

    it('should handle no pinned tabs', async () => {
      const tabs = createMockTabs(3, 0); // No pinned
      const pattern: RotationPattern = {
        id: 'test-no-pinned',
        name: 'No Pinned',
        type: 'pinned-first',
        createdAt: Date.now(),
      };

      await engine.savePattern(pattern);

      const sequence = await engine.resolvePattern(tabs, pattern);

      expect(sequence).toEqual([0, 1, 2]);
    });
  });

  describe('Custom Pattern', () => {
    it('should follow custom index order', async () => {
      const tabs = createMockTabs(5);
      const pattern: RotationPattern = {
        id: 'test-custom-indices',
        name: 'Custom Indices',
        type: 'custom',
        customOrder: [2, 0, 4, 1], // Custom order
        createdAt: Date.now(),
      };

      await engine.savePattern(pattern);

      const sequence = await engine.resolvePattern(tabs, pattern);

      expect(sequence).toEqual([2, 0, 4, 1]);
    });

    it('should match tabs by URL pattern', async () => {
      const tabs = [
        { id: 100, index: 0, url: 'https://github.com/repo', title: 'GitHub', pinned: false },
        { id: 101, index: 1, url: 'https://google.com', title: 'Google', pinned: false },
        { id: 102, index: 2, url: 'https://github.com/issues', title: 'Issues', pinned: false },
      ] as chrome.tabs.Tab[];

      const pattern: RotationPattern = {
        id: 'test-url-match',
        name: 'URL Match',
        type: 'custom',
        customOrder: ['github', 'google'], // URL patterns
        createdAt: Date.now(),
      };

      await engine.savePattern(pattern);

      const sequence = await engine.resolvePattern(tabs, pattern);

      // Should match github (index 0), then google (index 1)
      expect(sequence).toEqual([0, 1]);
    });

    it('should match tabs by title pattern', async () => {
      const tabs = [
        { id: 100, index: 0, url: 'https://example.com/1', title: 'Dashboard', pinned: false },
        { id: 101, index: 1, url: 'https://example.com/2', title: 'Settings', pinned: false },
        { id: 102, index: 2, url: 'https://example.com/3', title: 'Profile', pinned: false },
      ] as chrome.tabs.Tab[];

      const pattern: RotationPattern = {
        id: 'test-title-match',
        name: 'Title Match',
        type: 'custom',
        customOrder: ['settings', 'profile', 'dashboard'],
        createdAt: Date.now(),
      };

      await engine.savePattern(pattern);

      const sequence = await engine.resolvePattern(tabs, pattern);

      // Should match settings (1), profile (2), dashboard (0)
      expect(sequence).toEqual([1, 2, 0]);
    });

    it('should skip duplicate indices in custom order', async () => {
      const tabs = createMockTabs(5);
      const pattern: RotationPattern = {
        id: 'test-duplicates',
        name: 'Duplicates',
        type: 'custom',
        customOrder: [0, 1, 1, 2, 0, 3], // Has duplicates
        createdAt: Date.now(),
      };

      await engine.savePattern(pattern);

      const sequence = await engine.resolvePattern(tabs, pattern);

      // Should deduplicate: [0, 1, 2, 3]
      expect(sequence).toEqual([0, 1, 2, 3]);
    });

    it('should fallback to sequential for empty custom order', async () => {
      const tabs = createMockTabs(3);
      const pattern: RotationPattern = {
        id: 'test-empty-custom',
        name: 'Empty Custom',
        type: 'custom',
        customOrder: [],
        createdAt: Date.now(),
      };

      await engine.savePattern(pattern);

      const sequence = await engine.resolvePattern(tabs, pattern);

      // Should fall back to sequential
      expect(sequence).toEqual([0, 1, 2]);
    });
  });

  describe('Edge Cases', () => {
    it('should handle single tab', async () => {
      const tabs = createMockTabs(1);
      const pattern: RotationPattern = {
        id: 'test-single',
        name: 'Single',
        type: 'sequential',
        createdAt: Date.now(),
      };

      await engine.savePattern(pattern);

      const nextIndex = await engine.getNextTabIndex(tabs, 100, 'test-single');

      // With 1 tab, next should wrap to itself
      expect(nextIndex).toBe(0);
    });

    it('should handle empty tabs array', async () => {
      const tabs: chrome.tabs.Tab[] = [];

      const nextIndex = await engine.getNextTabIndex(tabs, 100, 'sequential');

      expect(nextIndex).toBe(-1); // Invalid
    });

    it('should handle current tab not in tabs array', async () => {
      const tabs = createMockTabs(3);

      const nextIndex = await engine.getNextTabIndex(tabs, 999, 'sequential');

      // Should start from beginning
      expect(nextIndex).toBe(0);
    });

    it('should handle very large tab count', async () => {
      const tabs = createMockTabs(1000);
      const pattern: RotationPattern = {
        id: 'test-large',
        name: 'Large',
        type: 'sequential',
        createdAt: Date.now(),
      };

      await engine.savePattern(pattern);

      const sequence = await engine.resolvePattern(tabs, pattern);

      expect(sequence.length).toBe(1000);
      expect(sequence[0]).toBe(0);
      expect(sequence[999]).toBe(999);
    });

    it('should reject excessively large tab count', async () => {
      const tabs = createMockTabs(10001); // Exceeds MAX_TAB_COUNT

      const nextIndex = await engine.getNextTabIndex(tabs, 100, 'sequential');

      expect(nextIndex).toBe(-1); // Should reject
    });
  });

  describe('Security Tests', () => {
    it('should sanitize pattern names', async () => {
      const pattern: RotationPattern = {
        id: 'test-sanitize',
        name: 'Test<script>alert("xss")</script>',
        type: 'sequential',
        description: 'Test\x00null\x1Fbyte',
        createdAt: Date.now(),
      };

      await engine.savePattern(pattern);

      const saved = await engine.getPattern('test-sanitize');

      // Should remove dangerous characters
      expect(saved?.name).not.toContain('<script>');
      expect(saved?.description).not.toContain('\x00');
    });

    it('should limit custom order size', async () => {
      const tabs = createMockTabs(10);
      const hugeOrder = Array.from({ length: 2000 }, (_, i) => i);

      const pattern: RotationPattern = {
        id: 'test-huge-order',
        name: 'Huge Order',
        type: 'custom',
        customOrder: hugeOrder,
        createdAt: Date.now(),
      };

      await engine.savePattern(pattern);

      const sequence = await engine.resolvePattern(tabs, pattern);

      // Should fall back to sequential due to size limit
      expect(sequence).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    });

    it('should sanitize URL patterns in custom order', async () => {
      const tabs = createMockTabs(3);

      const pattern: RotationPattern = {
        id: 'test-sanitize-url',
        name: 'Sanitize URL',
        type: 'custom',
        customOrder: [
          'javascript:alert(1)', // Dangerous
          '<script>alert(2)</script>', // Dangerous
          'normal-pattern',
        ],
        createdAt: Date.now(),
      };

      await engine.savePattern(pattern);

      const sequence = await engine.resolvePattern(tabs, pattern);

      // Should not crash or execute code
      expect(Array.isArray(sequence)).toBe(true);
    });

    it('should validate pattern structure before saving', async () => {
      const invalidPatterns = [
        { id: '', name: 'No ID', type: 'sequential' }, // No ID
        { id: 'test', name: '', type: 'sequential' }, // No name
        { id: 'test', name: 'Test', type: 'invalid' }, // Invalid type
        { name: 'Test', type: 'sequential' }, // Missing ID
      ];

      for (const invalid of invalidPatterns) {
        await expect(
          engine.savePattern(invalid as RotationPattern)
        ).rejects.toThrow();
      }
    });
  });

  describe('Cache Behavior', () => {
    it('should cache resolved patterns', async () => {
      const tabs = createMockTabs(5);
      const pattern: RotationPattern = {
        id: 'test-cache',
        name: 'Cache Test',
        type: 'random',
        createdAt: Date.now(),
      };

      await engine.savePattern(pattern);

      const sequence1 = await engine.resolvePattern(tabs, pattern);
      const sequence2 = await engine.resolvePattern(tabs, pattern);

      // Should return same sequence from cache
      expect(sequence1).toEqual(sequence2);
    });

    it('should invalidate cache when pattern is updated', async () => {
      const tabs = createMockTabs(5);
      const pattern: RotationPattern = {
        id: 'test-cache-invalidate',
        name: 'Cache Invalidate',
        type: 'sequential',
        createdAt: Date.now(),
      };

      await engine.savePattern(pattern);

      const sequence1 = await engine.resolvePattern(tabs, pattern);

      // Update pattern
      pattern.type = 'reverse';
      await engine.savePattern(pattern);

      const sequence2 = await engine.resolvePattern(tabs, pattern);

      // Should return different sequence after update
      expect(sequence1).not.toEqual(sequence2);
    });

    it('should clear all caches', async () => {
      const tabs = createMockTabs(3);
      const pattern: RotationPattern = {
        id: 'test-clear',
        name: 'Clear Test',
        type: 'random',
        createdAt: Date.now(),
      };

      await engine.savePattern(pattern);

      await engine.resolvePattern(tabs, pattern);
      engine.clearCache();

      // After clearing cache, should still work
      const sequence = await engine.resolvePattern(tabs, pattern);
      expect(Array.isArray(sequence)).toBe(true);
    });
  });

  describe('Pattern Storage', () => {
    it('should save and retrieve patterns', async () => {
      const pattern: RotationPattern = {
        id: 'test-storage',
        name: 'Storage Test',
        type: 'sequential',
        description: 'Test description',
        createdAt: Date.now(),
      };

      await engine.savePattern(pattern);

      const retrieved = await engine.getPattern('test-storage');

      expect(retrieved).toBeTruthy();
      expect(retrieved?.id).toBe('test-storage');
      expect(retrieved?.name).toBe('Storage Test');
      expect(retrieved?.type).toBe('sequential');
    });

    it('should get all patterns', async () => {
      const patterns: RotationPattern[] = [
        { id: 'p1', name: 'Pattern 1', type: 'sequential', createdAt: Date.now() },
        { id: 'p2', name: 'Pattern 2', type: 'reverse', createdAt: Date.now() },
        { id: 'p3', name: 'Pattern 3', type: 'random', createdAt: Date.now() },
      ];

      for (const p of patterns) {
        await engine.savePattern(p);
      }

      const allPatterns = await engine.getAllPatterns();

      expect(allPatterns.length).toBe(3);
      expect(allPatterns.map(p => p.id).sort()).toEqual(['p1', 'p2', 'p3']);
    });

    it('should delete patterns', async () => {
      const pattern: RotationPattern = {
        id: 'test-delete',
        name: 'Delete Test',
        type: 'sequential',
        createdAt: Date.now(),
      };

      await engine.savePattern(pattern);

      let retrieved = await engine.getPattern('test-delete');
      expect(retrieved).toBeTruthy();

      await engine.deletePattern('test-delete');

      retrieved = await engine.getPattern('test-delete');
      expect(retrieved).toBeNull();
    });

    it('should return default sequential pattern if not found', async () => {
      const pattern = await engine.getPattern('sequential');

      expect(pattern).toBeTruthy();
      expect(pattern?.type).toBe('sequential');
    });
  });

  describe('Pattern Integration', () => {
    it('should work with getNextTabIndex using pattern ID', async () => {
      const tabs = createMockTabs(4);
      const pattern: RotationPattern = {
        id: 'integration-test',
        name: 'Integration',
        type: 'reverse',
        createdAt: Date.now(),
      };

      await engine.savePattern(pattern);

      // Start from tab 0 (id 100)
      const next1 = await engine.getNextTabIndex(tabs, 100, 'integration-test');
      expect(next1).toBe(3); // Reverse: 0 -> 3

      // From tab 3 (id 103)
      const next2 = await engine.getNextTabIndex(tabs, 103, 'integration-test');
      expect(next2).toBe(2); // Reverse: 3 -> 2
    });

    it('should handle pattern not found gracefully', async () => {
      const tabs = createMockTabs(3);

      const nextIndex = await engine.getNextTabIndex(tabs, 100, 'nonexistent');

      // Should fall back to sequential
      expect(nextIndex).toBe(1);
    });
  });
});
