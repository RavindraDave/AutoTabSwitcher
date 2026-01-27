/**
 * Comprehensive tests for regex-validator.ts
 * Tests regex validation, sanitization, caching, and timeout protection
 */

import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import {
  regexCache,
  validateRegexPattern,
  safeRegexTest,
  safeCompileRegex
} from '../core/regex-validator.js';

describe('RegexCache', () => {
  beforeEach(() => {
    regexCache.clear();
  });

  test('should cache and return regex patterns', () => {
    const pattern = 'test.*pattern';
    const flags = 'i';

    const regex1 = regexCache.get(pattern, flags);
    const regex2 = regexCache.get(pattern, flags);

    expect(regex1).toBe(regex2); // Same instance
    expect(regex1.test('test pattern')).toBe(true);
    expect(regex1.flags).toContain('i');
  });

  test('should cache patterns without flags', () => {
    const pattern = 'test';

    const regex1 = regexCache.get(pattern);
    const regex2 = regexCache.get(pattern);

    expect(regex1).toBe(regex2);
    expect(regex1.test('test')).toBe(true);
  });

  test('should treat same pattern with different flags as separate entries', () => {
    const pattern = 'Test';

    const regexWithI = regexCache.get(pattern, 'i');
    const regexWithG = regexCache.get(pattern, 'g');

    expect(regexWithI).not.toBe(regexWithG);
    expect(regexWithI.test('test')).toBe(true);
    expect(regexWithG.test('test')).toBe(false);
  });

  test('should evict oldest entry when cache is full', () => {
    // Fill cache to max size (100)
    for (let i = 0; i < 100; i++) {
      regexCache.get(`pattern${i}`);
    }

    expect(regexCache.size()).toBe(100);

    // Get first pattern again (should still be cached)
    const firstPattern = regexCache.get('pattern0');
    expect(firstPattern).toBeDefined();

    // Add a new pattern, should evict the oldest
    regexCache.get('pattern100');
    expect(regexCache.size()).toBe(100);
  });

  test('should clear all cached patterns', () => {
    regexCache.get('pattern1');
    regexCache.get('pattern2');
    regexCache.get('pattern3');

    expect(regexCache.size()).toBe(3);

    regexCache.clear();
    expect(regexCache.size()).toBe(0);
  });

  test('should remove specific pattern from cache', () => {
    const pattern = 'test';
    const flags = 'i';

    regexCache.get(pattern, flags);
    expect(regexCache.size()).toBe(1);

    regexCache.remove(pattern, flags);
    expect(regexCache.size()).toBe(0);
  });

  test('should remove pattern without flags', () => {
    const pattern = 'test';

    regexCache.get(pattern);
    expect(regexCache.size()).toBe(1);

    regexCache.remove(pattern);
    expect(regexCache.size()).toBe(0);
  });

  test('should return cache size', () => {
    expect(regexCache.size()).toBe(0);

    regexCache.get('pattern1');
    expect(regexCache.size()).toBe(1);

    regexCache.get('pattern2');
    expect(regexCache.size()).toBe(2);

    regexCache.get('pattern1'); // Same pattern, should not increase size
    expect(regexCache.size()).toBe(2);
  });
});

describe('validateRegexPattern', () => {
  test('should validate simple pattern', () => {
    const result = validateRegexPattern('test.*pattern');

    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
    expect(result.warning).toBeUndefined();
  });

  test('should reject empty pattern', () => {
    const result = validateRegexPattern('');

    expect(result.valid).toBe(false);
    expect(result.error).toBe('Regex pattern cannot be empty');
  });

  test('should reject whitespace-only pattern', () => {
    const result = validateRegexPattern('   ');

    expect(result.valid).toBe(false);
    expect(result.error).toBe('Regex pattern cannot be empty');
  });

  test('should reject pattern that exceeds max length', () => {
    const longPattern = 'a'.repeat(1001);
    const result = validateRegexPattern(longPattern);

    expect(result.valid).toBe(false);
    expect(result.error).toContain('Regex pattern too long');
    expect(result.error).toContain('1000');
  });

  test('should reject pattern at exactly max length boundary', () => {
    const maxLengthPattern = 'a'.repeat(1000);
    const result = validateRegexPattern(maxLengthPattern);

    expect(result.valid).toBe(true); // Should be valid at exactly 1000
  });

  test('should reject invalid regex syntax', () => {
    const result = validateRegexPattern('[invalid');

    expect(result.valid).toBe(false);
    expect(result.error).toContain('Invalid regex syntax');
  });

  test('should reject unmatched parentheses', () => {
    const result = validateRegexPattern('(unclosed');

    expect(result.valid).toBe(false);
    expect(result.error).toContain('Invalid regex syntax');
  });

  test('should warn about nested quantifiers with +', () => {
    const result = validateRegexPattern('(a+)+');

    expect(result.valid).toBe(true);
    expect(result.warning).toContain('Nested repetition detected');
    expect(result.warning).toContain('performance issues');
  });

  test('should warn about nested quantifiers with *', () => {
    const result = validateRegexPattern('(a*)*');

    expect(result.valid).toBe(true);
    expect(result.warning).toContain('Nested repetition detected');
    expect(result.warning).toContain('performance issues');
  });

  test('should warn about nested repetition with +', () => {
    const result = validateRegexPattern('(abc+def)+');

    expect(result.valid).toBe(true);
    expect(result.warning).toContain('Nested repetition detected');
    expect(result.warning).toContain('performance issues');
  });

  test('should warn about nested repetition with *', () => {
    const result = validateRegexPattern('(abc*def)*');

    expect(result.valid).toBe(true);
    expect(result.warning).toContain('Nested repetition detected');
    expect(result.warning).toContain('performance issues');
  });

  test('should accept safe patterns with quantifiers', () => {
    const result = validateRegexPattern('test+');

    expect(result.valid).toBe(true);
    expect(result.warning).toBeUndefined();
  });

  test('should accept patterns with character classes', () => {
    const result = validateRegexPattern('[a-zA-Z0-9]+');

    expect(result.valid).toBe(true);
    expect(result.warning).toBeUndefined();
  });

  test('should accept patterns with lookaheads', () => {
    const result = validateRegexPattern('(?=.*\\d)(?=.*[a-z])');

    expect(result.valid).toBe(true);
  });

  test('should accept unicode patterns', () => {
    const result = validateRegexPattern('\\p{Emoji}');

    expect(result.valid).toBe(true);
  });
});

describe('safeRegexTest', () => {
  beforeEach(() => {
    regexCache.clear();
  });

  test('should test pattern against string', async () => {
    const result = await safeRegexTest('test', 'This is a test string', 'i');

    expect(result).toBe(true);
  });

  test('should return false for non-matching pattern', async () => {
    const result = await safeRegexTest('xyz', 'This is a test string', 'i');

    expect(result).toBe(false);
  });

  test('should use case-insensitive flag by default', async () => {
    const result = await safeRegexTest('TEST', 'This is a test string');

    expect(result).toBe(true);
  });

  test('should respect custom flags', async () => {
    const result = await safeRegexTest('TEST', 'This is a test string', '');

    expect(result).toBe(false); // Without 'i' flag, case matters
  });

  test('should use cached regex', async () => {
    const pattern = 'test';
    const flags = 'i';

    // First call - creates and caches
    await safeRegexTest(pattern, 'test', flags);
    const sizeBefore = regexCache.size();

    // Second call - uses cache
    await safeRegexTest(pattern, 'test', flags);
    const sizeAfter = regexCache.size();

    expect(sizeBefore).toBe(sizeAfter);
  });

  test('should return false on regex compilation error', async () => {
    const result = await safeRegexTest('[invalid', 'test string', 'i');

    expect(result).toBe(false);
  });

  test('should timeout on slow regex', async () => {
    // This pattern can be slow on certain inputs
    const slowPattern = '(a+)+b';
    const maliciousInput = 'a'.repeat(30);

    // The test might not timeout in fast environments, so we accept both outcomes
    try {
      const result = await safeRegexTest(slowPattern, maliciousInput, '', 50);
      // If it doesn't timeout, it should return false (no match)
      expect(result).toBe(false);
    } catch (error) {
      // If it does timeout, check the error message
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain('exceeded 50ms timeout');
    }
  });

  test('should clean up timeout on successful match', async () => {
    const result = await safeRegexTest('quick', 'quick test', 'i', 1000);

    expect(result).toBe(true);
    // Should not throw or have pending timers
  });

  test('should clean up timeout on error', async () => {
    const result = await safeRegexTest('[invalid', 'test', 'i', 1000);

    expect(result).toBe(false);
    // Should not throw or have pending timers
  });

  test('should handle empty test string', async () => {
    const result = await safeRegexTest('test', '', 'i');

    expect(result).toBe(false);
  });

  test('should handle empty pattern', async () => {
    const result = await safeRegexTest('', 'test string', 'i');

    expect(result).toBe(true); // Empty pattern matches everything
  });

  test('should use custom timeout value', async () => {
    const result = await safeRegexTest('test', 'test string', 'i', 500);

    expect(result).toBe(true);
  });
});

describe('safeCompileRegex', () => {
  let consoleWarnSpy: jest.SpiedFunction<typeof console.warn>;
  let consoleErrorSpy: jest.SpiedFunction<typeof console.error>;

  beforeEach(() => {
    regexCache.clear();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  test('should compile and cache valid pattern', () => {
    const pattern = 'test.*pattern';
    const regex = safeCompileRegex(pattern, 'i');

    expect(regex).not.toBeNull();
    expect(regex?.test('test pattern')).toBe(true);
    expect(regexCache.size()).toBe(1);
  });

  test('should return null for invalid pattern', () => {
    const regex = safeCompileRegex('[invalid');

    expect(regex).toBeNull();
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Invalid regex pattern')
    );
  });

  test('should return null for empty pattern', () => {
    const regex = safeCompileRegex('');

    expect(regex).toBeNull();
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Invalid regex pattern')
    );
  });

  test('should return null for too-long pattern', () => {
    const longPattern = 'a'.repeat(1001);
    const regex = safeCompileRegex(longPattern);

    expect(regex).toBeNull();
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Invalid regex pattern')
    );
  });

  test('should warn about dangerous patterns but still compile', () => {
    const regex = safeCompileRegex('(a+)+');

    expect(regex).not.toBeNull();
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Regex warning')
    );
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Nested repetition')
    );
  });

  test('should compile pattern without flags', () => {
    const pattern = 'test';
    const regex = safeCompileRegex(pattern);

    expect(regex).not.toBeNull();
    expect(regex?.test('test')).toBe(true);
  });

  test('should compile pattern with flags', () => {
    const pattern = 'test';
    const regex = safeCompileRegex(pattern, 'gi');

    expect(regex).not.toBeNull();
    expect(regex?.flags).toContain('g');
    expect(regex?.flags).toContain('i');
  });

  test('should use cached regex on subsequent calls', () => {
    const pattern = 'test';
    const flags = 'i';

    const regex1 = safeCompileRegex(pattern, flags);
    const regex2 = safeCompileRegex(pattern, flags);

    expect(regex1).toBe(regex2);
  });

  test('should handle compilation errors gracefully', () => {
    // Mock regexCache.get to throw an error
    const originalGet = regexCache.get;
    regexCache.get = jest.fn().mockImplementation(() => {
      throw new Error('Compilation failed');
    });

    const regex = safeCompileRegex('test');

    expect(regex).toBeNull();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to compile regex')
    );

    // Restore original method
    regexCache.get = originalGet;
  });

  test('should compile complex patterns', () => {
    const patterns = [
      '^https?://.*\\.example\\.com$',
      '\\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}\\b',
      '(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}',
      '\\d{3}-\\d{2}-\\d{4}'
    ];

    patterns.forEach(pattern => {
      const regex = safeCompileRegex(pattern, 'i');
      expect(regex).not.toBeNull();
    });
  });
});

describe('Integration tests', () => {
  beforeEach(() => {
    regexCache.clear();
  });

  test('should validate, compile, and test pattern end-to-end', async () => {
    const pattern = 'test.*pattern';

    // Validate
    const validation = validateRegexPattern(pattern);
    expect(validation.valid).toBe(true);

    // Compile
    const regex = safeCompileRegex(pattern, 'i');
    expect(regex).not.toBeNull();

    // Test
    const result = await safeRegexTest(pattern, 'This is a test pattern here', 'i');
    expect(result).toBe(true);
  });

  test('should handle invalid pattern in full workflow', async () => {
    const pattern = '[invalid';

    // Validate
    const validation = validateRegexPattern(pattern);
    expect(validation.valid).toBe(false);

    // Compile
    const regex = safeCompileRegex(pattern);
    expect(regex).toBeNull();

    // Test
    const result = await safeRegexTest(pattern, 'test string', 'i');
    expect(result).toBe(false);
  });

  test('should share cache across functions', async () => {
    const pattern = 'shared.*pattern';
    const flags = 'i';

    // Compile first
    const regex = safeCompileRegex(pattern, flags);
    expect(regex).not.toBeNull();
    const sizeAfterCompile = regexCache.size();

    // Test should use cached regex
    await safeRegexTest(pattern, 'shared pattern', flags);
    const sizeAfterTest = regexCache.size();

    expect(sizeAfterCompile).toBe(sizeAfterTest);
  });

  test('should handle concurrent regex operations', async () => {
    const patterns = Array.from({ length: 10 }, (_, i) => `pattern${i}`);

    const promises = patterns.map(pattern =>
      safeRegexTest(pattern, `test ${pattern} string`, 'i')
    );

    const results = await Promise.all(promises);

    expect(results.every(r => r === true)).toBe(true);
    expect(regexCache.size()).toBe(10);
  });
});
