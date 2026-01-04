/**
 * Security validation tests for storage helpers
 * Tests the security hardening features added to prevent invalid data
 */

import { describe, expect, test, beforeEach, jest } from '@jest/globals';

// Mock the logger module
jest.mock('../core/logger.js', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import {
  validateOperatingMode,
  isValidWindowId,
  windowExists,
  getMinDelayMs,
  clampDelayTime,
  setDelayTime,
} from '../core/storage.js';
import { DEFAULT_OPERATING_MODE, MIN_DELAY_MS_DEVELOPMENT, MIN_DELAY_MS_PRODUCTION } from '../core/constants.js';
import * as environment from '../utils/environment.js';
import { logger } from '../core/logger.js';

describe('Security Validation Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateOperatingMode', () => {
    test('should accept valid "global" mode', () => {
      const result = validateOperatingMode('global');
      expect(result).toBe('global');
    });

    test('should accept valid "window" mode', () => {
      const result = validateOperatingMode('window');
      expect(result).toBe('window');
    });

    test('should reject invalid string and default to global', () => {
      const result = validateOperatingMode('invalid-mode');

      expect(result).toBe(DEFAULT_OPERATING_MODE);
      expect(logger.warn).toHaveBeenCalledWith(
        'Storage',
        'Invalid operating mode value, defaulting to global',
        expect.objectContaining({
          invalidValue: 'invalid-mode'
        })
      );
    });

    test('should reject null and default to global', () => {
      const result = validateOperatingMode(null);

      expect(result).toBe(DEFAULT_OPERATING_MODE);
      expect(logger.warn).toHaveBeenCalled();
    });

    test('should reject undefined and default to global', () => {
      const result = validateOperatingMode(undefined);

      expect(result).toBe(DEFAULT_OPERATING_MODE);
      expect(logger.warn).toHaveBeenCalled();
    });

    test('should reject number and default to global', () => {
      const result = validateOperatingMode(123);

      expect(result).toBe(DEFAULT_OPERATING_MODE);
      expect(logger.warn).toHaveBeenCalled();
    });

    test('should reject object and default to global', () => {
      const result = validateOperatingMode({ mode: 'global' });

      expect(result).toBe(DEFAULT_OPERATING_MODE);
      expect(logger.warn).toHaveBeenCalled();
    });

    test('should reject array and default to global', () => {
      const result = validateOperatingMode(['global']);

      expect(result).toBe(DEFAULT_OPERATING_MODE);
      expect(logger.warn).toHaveBeenCalled();
    });

    test('should reject XSS attempt and default to global', () => {
      const result = validateOperatingMode('<script>alert("xss")</script>');

      expect(result).toBe(DEFAULT_OPERATING_MODE);
      expect(logger.warn).toHaveBeenCalled();
    });
  });

  describe('isValidWindowId', () => {
    test('should accept valid positive number', () => {
      expect(isValidWindowId(1)).toBe(true);
      expect(isValidWindowId(100)).toBe(true);
      expect(isValidWindowId(999999)).toBe(true);
    });

    test('should reject zero', () => {
      expect(isValidWindowId(0)).toBe(false);
    });

    test('should reject negative numbers', () => {
      expect(isValidWindowId(-1)).toBe(false);
      expect(isValidWindowId(-100)).toBe(false);
    });

    test('should reject NaN', () => {
      expect(isValidWindowId(NaN)).toBe(false);
    });

    test('should reject Infinity', () => {
      expect(isValidWindowId(Infinity)).toBe(false);
      expect(isValidWindowId(-Infinity)).toBe(false);
    });

    test('should reject string numbers', () => {
      expect(isValidWindowId('123')).toBe(false);
      expect(isValidWindowId('1')).toBe(false);
    });

    test('should reject null', () => {
      expect(isValidWindowId(null)).toBe(false);
    });

    test('should reject undefined', () => {
      expect(isValidWindowId(undefined)).toBe(false);
    });

    test('should reject objects', () => {
      expect(isValidWindowId({ id: 1 })).toBe(false);
    });

    test('should reject arrays', () => {
      expect(isValidWindowId([1])).toBe(false);
    });

    test('should reject boolean', () => {
      expect(isValidWindowId(true)).toBe(false);
      expect(isValidWindowId(false)).toBe(false);
    });

    test('should accept floating point numbers', () => {
      expect(isValidWindowId(1.5)).toBe(true);
      expect(isValidWindowId(0.5)).toBe(true); // Technically valid positive number
      // Note: In practice, Chrome window IDs are integers, but our validation
      // accepts any positive finite number for flexibility
    });
  });

  describe('windowExists', () => {
    test('should return true for existing window', async () => {
      // Mock chrome.windows.get to succeed
      chrome.windows.get = jest.fn().mockResolvedValue({ id: 1 });

      const result = await windowExists(1);
      expect(result).toBe(true);
      expect(chrome.windows.get).toHaveBeenCalledWith(1);
    });

    test('should return false for non-existent window', async () => {
      // Mock chrome.windows.get to fail
      chrome.windows.get = jest.fn().mockRejectedValue(new Error('Window not found'));

      const result = await windowExists(999);
      expect(result).toBe(false);
      expect(chrome.windows.get).toHaveBeenCalledWith(999);
    });

    test('should return false for invalid windowId (zero)', async () => {
      chrome.windows.get = jest.fn();

      const result = await windowExists(0);
      expect(result).toBe(false);
      // Should not even call chrome.windows.get for invalid IDs
      expect(chrome.windows.get).not.toHaveBeenCalled();
    });

    test('should return false for invalid windowId (negative)', async () => {
      chrome.windows.get = jest.fn();

      const result = await windowExists(-1);
      expect(result).toBe(false);
      expect(chrome.windows.get).not.toHaveBeenCalled();
    });

    test('should return false for invalid windowId (NaN)', async () => {
      chrome.windows.get = jest.fn();

      const result = await windowExists(NaN);
      expect(result).toBe(false);
      expect(chrome.windows.get).not.toHaveBeenCalled();
    });

    test('should handle chrome API errors gracefully', async () => {
      // Mock chrome.windows.get to throw an error
      chrome.windows.get = jest.fn().mockRejectedValue(new Error('Chrome API error'));

      const result = await windowExists(1);
      expect(result).toBe(false);
    });

    test('should return false for closed window', async () => {
      // Simulate window that was closed
      chrome.windows.get = jest.fn().mockRejectedValue({ message: 'No window with id: 123' });

      const result = await windowExists(123);
      expect(result).toBe(false);
    });
  });

  describe('Security - Edge Cases', () => {
    test('validateOperatingMode should handle case-sensitive input', () => {
      // TypeScript union types are case-sensitive
      expect(validateOperatingMode('Global')).toBe(DEFAULT_OPERATING_MODE);
      expect(validateOperatingMode('WINDOW')).toBe(DEFAULT_OPERATING_MODE);
      expect(validateOperatingMode('Window')).toBe(DEFAULT_OPERATING_MODE);
    });

    test('validateOperatingMode should handle whitespace', () => {
      expect(validateOperatingMode(' global')).toBe(DEFAULT_OPERATING_MODE);
      expect(validateOperatingMode('global ')).toBe(DEFAULT_OPERATING_MODE);
      expect(validateOperatingMode(' global ')).toBe(DEFAULT_OPERATING_MODE);
    });

    test('isValidWindowId should handle type coercion attempts', () => {
      // These should all fail because we use strict type checking
      expect(isValidWindowId('1' as any)).toBe(false);
      expect(isValidWindowId(true as any)).toBe(false);
      expect(isValidWindowId([] as any)).toBe(false);
      expect(isValidWindowId({} as any)).toBe(false);
    });

    test('windowExists should validate before API call', async () => {
      chrome.windows.get = jest.fn();

      // Should not make API calls for invalid inputs
      await windowExists(0);
      await windowExists(-1);
      await windowExists(NaN);

      expect(chrome.windows.get).not.toHaveBeenCalled();
    });
  });

  describe('Performance - Validation Efficiency', () => {
    test('validateOperatingMode should be fast for valid inputs', () => {
      const start = performance.now();

      for (let i = 0; i < 1000; i++) {
        validateOperatingMode('global');
        validateOperatingMode('window');
      }

      const end = performance.now();
      const duration = end - start;

      // Should complete 2000 validations in under 10ms
      expect(duration).toBeLessThan(10);
    });

    test('isValidWindowId should be fast', () => {
      const start = performance.now();

      for (let i = 0; i < 10000; i++) {
        isValidWindowId(i);
      }

      const end = performance.now();
      const duration = end - start;

      // Should complete 10000 validations in under 10ms
      expect(duration).toBeLessThan(10);
    });
  });

  describe('Timer Duration Clamping', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    describe('getMinDelayMs', () => {
      test('should return production minimum for unpacked extension (consistent with UI)', () => {
        jest.spyOn(environment, 'isPacked').mockReturnValue(false);

        const result = getMinDelayMs();

        // FIXED: Now uses 2-second minimum in both modes for consistency with UI validation
        expect(result).toBe(MIN_DELAY_MS_PRODUCTION);
      });

      test('should return production minimum for packed extension', () => {
        jest.spyOn(environment, 'isPacked').mockReturnValue(true);

        const result = getMinDelayMs();

        expect(result).toBe(MIN_DELAY_MS_PRODUCTION);
      });
    });

    describe('clampDelayTime', () => {
      test('should NOT clamp 10s when unpacked (now consistent with UI)', () => {
        jest.spyOn(environment, 'isPacked').mockReturnValue(false);

        const result = clampDelayTime(10000); // 10 seconds

        // FIXED: Now allows 10s in development mode (>= 2s minimum)
        expect(result).toBe(10000);
        expect(logger.info).not.toHaveBeenCalled();
      });

      test('should clamp to production minimum (2s) when packed', () => {
        jest.spyOn(environment, 'isPacked').mockReturnValue(true);

        const result = clampDelayTime(1000); // 1 second (below 2s minimum)

        expect(result).toBe(MIN_DELAY_MS_PRODUCTION); // 2000ms
        expect(logger.info).toHaveBeenCalledWith(
          'Storage',
          'Clamped delayTime to minimum',
          expect.objectContaining({
            originalMs: 1000,
            clampedMs: 2000
          })
        );
      });

      test('should not clamp when value is above minimum', () => {
        jest.spyOn(environment, 'isPacked').mockReturnValue(false);

        const result = clampDelayTime(120000); // 120 seconds

        expect(result).toBe(120000);
        expect(logger.info).not.toHaveBeenCalled();
      });

      test('should handle edge case: exactly at minimum', () => {
        jest.spyOn(environment, 'isPacked').mockReturnValue(false);

        const result = clampDelayTime(MIN_DELAY_MS_PRODUCTION); // Now uses 2s minimum

        expect(result).toBe(MIN_DELAY_MS_PRODUCTION);
        expect(logger.info).not.toHaveBeenCalled();
      });

      test('should allow 10s in both development and production', () => {
        // Test development mode
        jest.spyOn(environment, 'isPacked').mockReturnValue(false);
        let result = clampDelayTime(10000); // User sets 10 seconds
        expect(result).toBe(10000); // FIXED: Should NOT be clamped

        // Test production mode
        jest.spyOn(environment, 'isPacked').mockReturnValue(true);
        result = clampDelayTime(10000); // User sets 10 seconds
        expect(result).toBe(10000); // Should not be clamped (>= 2s minimum)
      });
    });

    describe('setDelayTime', () => {
      beforeEach(() => {
        chrome.storage = {
          local: {
            set: jest.fn().mockResolvedValue(undefined),
            get: jest.fn(),
            remove: jest.fn(),
            clear: jest.fn(),
          },
        } as any;
      });

      test('should save delayTime to storage without clamping (above minimum)', async () => {
        jest.spyOn(environment, 'isPacked').mockReturnValue(false);

        const result = await setDelayTime(10000);

        // FIXED: 10s is now allowed in development mode
        expect(result).toBe(10000);
        expect(chrome.storage.local.set).toHaveBeenCalledWith({
          delayTime: 10000,
        });
      });

      test('should save additional settings atomically', async () => {
        jest.spyOn(environment, 'isPacked').mockReturnValue(false);

        await setDelayTime(10000, {
          enabled: true,
          pauseOnActivity: true,
        });

        // FIXED: 10s is now allowed in development mode
        expect(chrome.storage.local.set).toHaveBeenCalledWith({
          enabled: true,
          pauseOnActivity: true,
          delayTime: 10000,
        });
      });

      test('should not clamp when value is valid', async () => {
        jest.spyOn(environment, 'isPacked').mockReturnValue(true);

        const result = await setDelayTime(30000);

        expect(result).toBe(30000);
        expect(chrome.storage.local.set).toHaveBeenCalledWith({
          delayTime: 30000,
        });
      });
    });
  });
});
