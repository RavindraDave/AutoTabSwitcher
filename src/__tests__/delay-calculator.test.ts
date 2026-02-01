/**
 * Tests for delay-calculator module
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { getEffectiveDelay, getCurrentEffectiveDelay } from '../core/delay-calculator.js';

// Mock dependencies
jest.mock('../core/logger.js', () => ({
  logger: {
    debug: jest.fn().mockResolvedValue(undefined),
    error: jest.fn().mockResolvedValue(undefined),
    warn: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../core/premium-access.js', () => ({
  canAccessPremium: jest.fn().mockResolvedValue(false),
}));

jest.mock('../core/build-config.js', () => ({
  PREMIUM_FEATURES_AVAILABLE: false,
}));

const mockChrome = (global as any).chrome;
import * as premiumAccess from '../core/premium-access.js';

describe('delay-calculator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockChrome.storage.local.get.mockResolvedValue({});
  });

  describe('getEffectiveDelay', () => {
    it('should return global delay when no custom delays are set', async () => {
      const result = await getEffectiveDelay(5000);

      expect(result).toEqual({
        delay: 5000,
        source: 'global',
      });
    });

    it('should return window delay when windowId and windowStates are provided', async () => {
      const windowStates = {
        123: {
          enabled: true,
          customDelayTime: 3000,
        },
      };

      const result = await getEffectiveDelay(5000, 123, windowStates);

      expect(result).toEqual({
        delay: 3000,
        source: 'window',
      });
    });

    it('should return global delay when window has no custom delay', async () => {
      const windowStates = {
        123: {
          enabled: true,
          // No customDelayTime
        },
      };

      const result = await getEffectiveDelay(5000, 123, windowStates);

      expect(result).toEqual({
        delay: 5000,
        source: 'global',
      });
    });

    it('should return global delay when windowId is provided but not in windowStates', async () => {
      const windowStates = {
        123: {
          enabled: true,
          customDelayTime: 3000,
        },
      };

      const result = await getEffectiveDelay(5000, 456, windowStates);

      expect(result).toEqual({
        delay: 5000,
        source: 'global',
      });
    });

    it('should handle undefined windowStates', async () => {
      const result = await getEffectiveDelay(5000, 123, undefined);

      expect(result).toEqual({
        delay: 5000,
        source: 'global',
      });
    });

    it('should handle empty windowStates', async () => {
      const result = await getEffectiveDelay(5000, 123, {});

      expect(result).toEqual({
        delay: 5000,
        source: 'global',
      });
    });

    it('should handle zero delay times', async () => {
      const windowStates = {
        123: {
          enabled: true,
          customDelayTime: 0,
        },
      };

      const result = await getEffectiveDelay(5000, 123, windowStates);

      expect(result).toEqual({
        delay: 0,
        source: 'window',
      });
    });

    it('should handle very large delay times', async () => {
      const windowStates = {
        123: {
          enabled: true,
          customDelayTime: 999999,
        },
      };

      const result = await getEffectiveDelay(5000, 123, windowStates);

      expect(result).toEqual({
        delay: 999999,
        source: 'window',
      });
    });

    it('should prioritize window delay over global delay', async () => {
      const windowStates = {
        123: {
          enabled: true,
          customDelayTime: 2000,
        },
        456: {
          enabled: true,
          customDelayTime: 8000,
        },
      };

      // Window 123 should get its custom delay
      const result1 = await getEffectiveDelay(5000, 123, windowStates);
      expect(result1).toEqual({
        delay: 2000,
        source: 'window',
      });

      // Window 456 should get its custom delay
      const result2 = await getEffectiveDelay(5000, 456, windowStates);
      expect(result2).toEqual({
        delay: 8000,
        source: 'window',
      });

      // No window ID should get global delay
      const result3 = await getEffectiveDelay(5000, undefined, windowStates);
      expect(result3).toEqual({
        delay: 5000,
        source: 'global',
      });
    });

    it('should handle customDelayTime of undefined explicitly', async () => {
      const windowStates = {
        123: {
          enabled: true,
          customDelayTime: undefined,
        },
      };

      const result = await getEffectiveDelay(5000, 123, windowStates);

      expect(result).toEqual({
        delay: 5000,
        source: 'global',
      });
    });

    it('should work with different window IDs', async () => {
      const windowStates = {
        1: { enabled: true, customDelayTime: 1000 },
        2: { enabled: true, customDelayTime: 2000 },
        999: { enabled: true, customDelayTime: 9000 },
      };

      const result1 = await getEffectiveDelay(5000, 1, windowStates);
      expect(result1.delay).toBe(1000);

      const result2 = await getEffectiveDelay(5000, 2, windowStates);
      expect(result2.delay).toBe(2000);

      const result999 = await getEffectiveDelay(5000, 999, windowStates);
      expect(result999.delay).toBe(9000);
    });
  });

  describe('getCurrentEffectiveDelay', () => {
    it('should read from storage and return effective delay', async () => {
      mockChrome.storage.local.get.mockResolvedValue({
        delayTime: 6000,
        windowStates: {},
      });

      const delay = await getCurrentEffectiveDelay();

      expect(delay).toBe(6000);
      expect(mockChrome.storage.local.get).toHaveBeenCalledWith([
        'delayTime',
        'windowStates',
      ]);
    });

    it('should return window custom delay when windowId is provided', async () => {
      mockChrome.storage.local.get.mockResolvedValue({
        delayTime: 6000,
        windowStates: {
          123: {
            enabled: true,
            customDelayTime: 3000,
          },
        },
      });

      const delay = await getCurrentEffectiveDelay(123);

      expect(delay).toBe(3000);
    });

    it('should use default delay when storage is empty', async () => {
      mockChrome.storage.local.get.mockResolvedValue({});

      const delay = await getCurrentEffectiveDelay();

      expect(delay).toBe(5000); // Default 5 seconds
    });

    it('should use default delay when delayTime is undefined', async () => {
      mockChrome.storage.local.get.mockResolvedValue({
        delayTime: undefined,
        windowStates: {},
      });

      const delay = await getCurrentEffectiveDelay();

      expect(delay).toBe(5000);
    });

    it('should handle storage errors gracefully', async () => {
      const logger = await import('../core/logger.js');
      mockChrome.storage.local.get.mockRejectedValue(new Error('Storage error'));

      const delay = await getCurrentEffectiveDelay();

      expect(delay).toBe(5000); // Fallback to 5 seconds
      expect(logger.logger.error).toHaveBeenCalledWith(
        'DelayCalculator',
        'Error getting effective delay',
        expect.objectContaining({
          error: 'Storage error',
        })
      );
    });

    it('should handle null windowStates', async () => {
      mockChrome.storage.local.get.mockResolvedValue({
        delayTime: 7000,
        windowStates: null,
      });

      const delay = await getCurrentEffectiveDelay();

      expect(delay).toBe(7000);
    });

    it('should work with different global delay values', async () => {
      // Test 1 second
      mockChrome.storage.local.get.mockResolvedValue({
        delayTime: 1000,
      });
      expect(await getCurrentEffectiveDelay()).toBe(1000);

      // Test 30 seconds
      mockChrome.storage.local.get.mockResolvedValue({
        delayTime: 30000,
      });
      expect(await getCurrentEffectiveDelay()).toBe(30000);

      // Test 0 seconds (instant)
      mockChrome.storage.local.get.mockResolvedValue({
        delayTime: 0,
      });
      expect(await getCurrentEffectiveDelay()).toBe(0);
    });

    it('should prioritize window delay over global delay', async () => {
      mockChrome.storage.local.get.mockResolvedValue({
        delayTime: 10000,
        windowStates: {
          123: {
            enabled: true,
            customDelayTime: 2000,
          },
        },
      });

      // With window ID should get window delay
      expect(await getCurrentEffectiveDelay(123)).toBe(2000);

      // Without window ID should get global delay
      expect(await getCurrentEffectiveDelay()).toBe(10000);
    });

    it('should handle multiple windows with different delays', async () => {
      mockChrome.storage.local.get.mockResolvedValue({
        delayTime: 5000,
        windowStates: {
          1: { enabled: true, customDelayTime: 1000 },
          2: { enabled: true, customDelayTime: 2000 },
          3: { enabled: true, customDelayTime: 3000 },
        },
      });

      expect(await getCurrentEffectiveDelay(1)).toBe(1000);
      expect(await getCurrentEffectiveDelay(2)).toBe(2000);
      expect(await getCurrentEffectiveDelay(3)).toBe(3000);
      expect(await getCurrentEffectiveDelay()).toBe(5000);
    });
  });
});
