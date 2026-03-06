/**
 * Tests for Statistics Tracker
 */

import { recordTabSwitch, getStatsSummary, resetStats } from '../core/statistics-tracker';

jest.mock('../core/storage', () => ({
  getTabStatistics: jest.fn(),
  updateTabStatistics: jest.fn(),
  resetTabStatistics: jest.fn(),
}));

jest.mock('../core/logger', () => ({
  logger: {
    info: jest.fn().mockResolvedValue(undefined),
    warn: jest.fn().mockResolvedValue(undefined),
    error: jest.fn().mockResolvedValue(undefined),
    debug: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../core/build-config', () => ({
  PREMIUM_FEATURES_AVAILABLE: false,
  BUILD_TYPE: 'test',
  BUILD_TIMESTAMP: Date.now(),
}));

const { getTabStatistics, updateTabStatistics, resetTabStatistics } = require('../core/storage');

describe('Statistics Tracker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('recordTabSwitch', () => {
    it('should call updateTabStatistics with correct parameters', async () => {
      updateTabStatistics.mockResolvedValue(undefined);

      await recordTabSwitch(1, 'Dashboard', 5, 2);

      expect(updateTabStatistics).toHaveBeenCalledWith(1, 'Dashboard', 5, 2);
    });

    it('should handle errors gracefully', async () => {
      updateTabStatistics.mockRejectedValue(new Error('Storage error'));

      // Should not throw
      await recordTabSwitch(1, 'Dashboard', 5);
    });
  });

  describe('getStatsSummary', () => {
    it('should return formatted summary', async () => {
      const now = Date.now();
      getTabStatistics.mockResolvedValue({
        totalSwitches: 42,
        totalCycles: 7,
        sessionStartTime: now - 3600000, // 1 hour ago
        lastResetTime: now - 3600000,
        perTabVisits: {
          1: { visitCount: 15, totalViewTime: 120000, lastVisitTime: now, tabTitle: 'Dashboard' },
          2: { visitCount: 10, totalViewTime: 80000, lastVisitTime: now - 5000, tabTitle: 'Monitoring' },
          3: { visitCount: 8, totalViewTime: 60000, lastVisitTime: now - 10000, tabTitle: 'Alerts' },
        },
      });

      const summary = await getStatsSummary();

      expect(summary.totalSwitches).toBe(42);
      expect(summary.totalCycles).toBe(7);
      expect(summary.sessionDuration).toBe('1h 0m');
      expect(summary.topTabs).toHaveLength(3);
      expect(summary.topTabs[0].title).toBe('Dashboard');
      expect(summary.topTabs[0].visits).toBe(15);
    });

    it('should return empty summary when no stats', async () => {
      getTabStatistics.mockResolvedValue({
        totalSwitches: 0,
        totalCycles: 0,
        sessionStartTime: Date.now(),
        lastResetTime: Date.now(),
        perTabVisits: {},
      });

      const summary = await getStatsSummary();

      expect(summary.totalSwitches).toBe(0);
      expect(summary.totalCycles).toBe(0);
      expect(summary.topTabs).toHaveLength(0);
    });

    it('should limit top tabs to 5', async () => {
      const now = Date.now();
      const perTabVisits: Record<number, any> = {};
      for (let i = 1; i <= 10; i++) {
        perTabVisits[i] = {
          visitCount: 10 - i,
          totalViewTime: 10000,
          lastVisitTime: now,
          tabTitle: `Tab ${i}`,
        };
      }

      getTabStatistics.mockResolvedValue({
        totalSwitches: 100,
        totalCycles: 10,
        sessionStartTime: now - 60000,
        lastResetTime: now - 60000,
        perTabVisits,
      });

      const summary = await getStatsSummary();

      expect(summary.topTabs).toHaveLength(5);
    });
  });

  describe('resetStats', () => {
    it('should call resetTabStatistics', async () => {
      resetTabStatistics.mockResolvedValue(undefined);

      await resetStats();

      expect(resetTabStatistics).toHaveBeenCalled();
    });
  });
});
