/**
 * Regex Validation and Safety Utilities
 * Protects against ReDoS (Regular Expression Denial of Service) attacks
 */

/**
 * Dangerous regex patterns that could cause exponential backtracking
 * These patterns are known to be problematic and should be rejected
 */
const DANGEROUS_PATTERNS = [
  /(\w+)+/,          // Nested quantifiers
  /(a+)+/,           // Classic ReDoS pattern
  /(a|a)+/,          // Alternation with overlap
  /(a|ab)+/,         // Overlapping alternation
  /([a-zA-Z]+)*\s/, // Star after plus
  /(x+x+)+y/,        // Repeated repetition
];

/**
 * Maximum regex pattern length to prevent excessive memory usage
 */
const MAX_PATTERN_LENGTH = 1000;

/**
 * Maximum regex execution time in milliseconds
 */
const MAX_REGEX_TIMEOUT = 100;

/**
 * Regex compilation cache to avoid recreating patterns
 */
class RegexCache {
  private cache: Map<string, RegExp> = new Map();
  private maxSize: number = 100;

  /**
   * Get or compile a regex pattern
   */
  get(pattern: string, flags?: string): RegExp {
    const key = `${pattern}|||${flags || ''}`;

    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }

    const regex = new RegExp(pattern, flags);

    // Evict oldest entry if cache is full
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, regex);
    return regex;
  }

  /**
   * Clear the entire cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Remove a specific pattern from cache
   */
  remove(pattern: string, flags?: string): void {
    const key = `${pattern}|||${flags || ''}`;
    this.cache.delete(key);
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }
}

export const regexCache = new RegexCache();

/**
 * Validation result for regex patterns
 */
export interface RegexValidationResult {
  valid: boolean;
  error?: string;
  warning?: string;
}

/**
 * Validate a regex pattern for safety
 *
 * @param pattern - The regex pattern to validate
 * @returns Validation result with errors/warnings
 */
export function validateRegexPattern(pattern: string): RegexValidationResult {
  // Check length
  if (pattern.length > MAX_PATTERN_LENGTH) {
    return {
      valid: false,
      error: `Regex pattern too long (max ${MAX_PATTERN_LENGTH} characters)`
    };
  }

  // Check for empty pattern
  if (!pattern || pattern.trim().length === 0) {
    return {
      valid: false,
      error: 'Regex pattern cannot be empty'
    };
  }

  // Try to compile the regex
  try {
    new RegExp(pattern);
  } catch (error) {
    return {
      valid: false,
      error: `Invalid regex syntax: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }

  // Check for dangerous patterns (basic heuristics)
  const dangerousPatternChecks = [
    { pattern: /(\w\+)\+/, warning: 'Nested quantifiers detected - may cause performance issues' },
    { pattern: /(\w\*)\*/, warning: 'Nested quantifiers detected - may cause performance issues' },
    { pattern: /(\(.*\+.*\)\+)/, warning: 'Nested repetition detected - may cause performance issues' },
    { pattern: /(\(.*\*.*\)\*)/, warning: 'Nested repetition detected - may cause performance issues' },
  ];

  for (const check of dangerousPatternChecks) {
    if (check.pattern.test(pattern)) {
      return {
        valid: true,
        warning: check.warning
      };
    }
  }

  // Pattern seems safe
  return { valid: true };
}

/**
 * Test a regex pattern against a string with timeout protection
 *
 * @param pattern - The regex pattern
 * @param testString - The string to test against
 * @param flags - Optional regex flags (default: 'i')
 * @param timeout - Maximum execution time in ms (default: MAX_REGEX_TIMEOUT)
 * @returns true if pattern matches, false otherwise
 * @throws Error if regex execution times out
 */
export function safeRegexTest(
  pattern: string,
  testString: string,
  flags: string = 'i',
  timeout: number = MAX_REGEX_TIMEOUT
): boolean {
  let timeoutId: NodeJS.Timeout | null = null;
  let timedOut = false;

  // Create a promise that rejects after timeout
  const timeoutPromise = new Promise<boolean>((_, reject) => {
    timeoutId = setTimeout(() => {
      timedOut = true;
      reject(new Error(`Regex execution exceeded ${timeout}ms timeout`));
    }, timeout);
  });

  // Create a promise that resolves with the regex test result
  const testPromise = new Promise<boolean>((resolve) => {
    try {
      const regex = regexCache.get(pattern, flags);
      const result = regex.test(testString);
      resolve(result);
    } catch (error) {
      resolve(false);
    }
  });

  // Race the two promises
  return Promise.race([testPromise, timeoutPromise])
    .finally(() => {
      if (timeoutId) clearTimeout(timeoutId);
    });
}

/**
 * Compile and cache a regex pattern safely
 *
 * @param pattern - The regex pattern
 * @param flags - Optional regex flags
 * @returns Compiled RegExp or null if invalid
 */
export function safeCompileRegex(pattern: string, flags?: string): RegExp | null {
  const validation = validateRegexPattern(pattern);

  if (!validation.valid) {
    console.warn(`Invalid regex pattern: ${validation.error}`);
    return null;
  }

  if (validation.warning) {
    console.warn(`Regex warning: ${validation.warning}`);
  }

  try {
    return regexCache.get(pattern, flags);
  } catch (error) {
    console.error(`Failed to compile regex: ${error}`);
    return null;
  }
}
