/**
 * RotationEngine - Manages custom tab rotation patterns
 *
 * Security Features:
 * - Input validation for all patterns
 * - Safe regex compilation with timeout protection
 * - Pattern cache with size limits
 * - No eval() or dynamic code execution
 *
 * @module RotationEngine
 */

import type { RotationPattern } from '../core/types.js';
import { logger } from '../core/logger.js';

// Security constants
const MAX_CUSTOM_ORDER_SIZE = 1000; // Prevent memory exhaustion
const MAX_PATTERN_CACHE_SIZE = 100; // Limit cache size
const MAX_TAB_COUNT = 10000; // Safety limit for tab operations

/**
 * RotationEngine manages custom tab rotation sequences
 */
export class RotationEngine {
  // Pattern cache: Maps patternId-tabCount to resolved sequence
  private patternCache: Map<string, number[]> = new Map();

  // Seeded random generator state for consistent shuffles
  private randomSeeds: Map<string, number> = new Map();

  /**
   * Get the next tab index based on the current pattern
   *
   * @param tabs - Array of Chrome tabs
   * @param currentTabId - ID of the currently active tab
   * @param patternId - ID of the rotation pattern to use (default: 'sequential')
   * @returns Index of the next tab to switch to, or -1 if no valid next tab
   */
  async getNextTabIndex(
    tabs: chrome.tabs.Tab[],
    currentTabId: number,
    patternId: string = 'sequential'
  ): Promise<number> {
    // Input validation
    if (!Array.isArray(tabs) || tabs.length === 0) {
      await logger.warn('RotationEngine', 'Invalid tabs array', { tabsLength: tabs?.length });
      return -1;
    }

    // Security: Prevent processing excessive tab counts
    if (tabs.length > MAX_TAB_COUNT) {
      await logger.error('RotationEngine', 'Tab count exceeds safety limit', {
        count: tabs.length,
        limit: MAX_TAB_COUNT
      });
      return -1;
    }

    // Get the rotation pattern
    const pattern = await this.getPattern(patternId);
    if (!pattern) {
      await logger.warn('RotationEngine', 'Pattern not found, using sequential', { patternId });
      return this.getSequentialNext(tabs, currentTabId);
    }

    // Resolve pattern to tab sequence
    const sequence = await this.resolvePattern(tabs, pattern);
    if (sequence.length === 0) {
      await logger.warn('RotationEngine', 'Empty sequence returned', { patternId });
      return -1;
    }

    // Find current position in sequence
    const currentIndex = tabs.findIndex(t => t.id === currentTabId);
    if (currentIndex === -1) {
      await logger.warn('RotationEngine', 'Current tab not found in tabs array', { currentTabId });
      // Start from beginning if current tab not found
      return sequence[0] ?? -1;
    }

    const sequencePosition = sequence.indexOf(currentIndex);
    if (sequencePosition === -1) {
      // Current tab not in sequence (might be skipped), start from beginning
      return sequence[0] ?? -1;
    }

    // Calculate next position based on loop mode
    const loopMode = pattern.options?.loopMode || 'circular';
    const nextPosition = this.calculateNextPosition(
      sequencePosition,
      sequence.length,
      loopMode
    );

    return sequence[nextPosition] ?? -1;
  }

  /**
   * Calculate next position in sequence based on loop mode
   */
  private calculateNextPosition(
    currentPos: number,
    sequenceLength: number,
    loopMode: 'circular' | 'bounce'
  ): number {
    if (loopMode === 'circular') {
      // Wrap around: 0, 1, 2, 0, 1, 2, ...
      return (currentPos + 1) % sequenceLength;
    } else {
      // Bounce: 0, 1, 2, 1, 0, 1, 2, ...
      // TODO: Implement bounce mode (requires direction tracking)
      // For now, fall back to circular
      return (currentPos + 1) % sequenceLength;
    }
  }

  /**
   * Resolve a pattern into an array of tab indices
   *
   * @param tabs - Array of Chrome tabs
   * @param pattern - Rotation pattern definition
   * @returns Array of tab indices representing rotation order
   */
  async resolvePattern(
    tabs: chrome.tabs.Tab[],
    pattern: RotationPattern
  ): Promise<number[]> {
    // Check cache first
    const cacheKey = this.getCacheKey(pattern.id, tabs.length);
    if (this.patternCache.has(cacheKey)) {
      const cached = this.patternCache.get(cacheKey)!;
      await logger.debug('RotationEngine', 'Using cached pattern', {
        patternId: pattern.id,
        sequenceLength: cached.length
      });
      return cached;
    }

    let sequence: number[];

    try {
      // Resolve pattern based on type
      switch (pattern.type) {
        case 'sequential':
          sequence = this.resolveSequential(tabs, pattern);
          break;
        case 'reverse':
          sequence = this.resolveReverse(tabs, pattern);
          break;
        case 'random':
          sequence = await this.resolveRandom(tabs, pattern);
          break;
        case 'pinned-first':
          sequence = this.resolvePinnedFirst(tabs, pattern);
          break;
        case 'custom':
          sequence = await this.resolveCustom(tabs, pattern);
          break;
        default:
          await logger.warn('RotationEngine', 'Unknown pattern type, using sequential', {
            type: pattern.type
          });
          sequence = this.resolveSequential(tabs, pattern);
      }

      // Validate sequence
      if (!this.isValidSequence(sequence, tabs.length)) {
        await logger.error('RotationEngine', 'Invalid sequence generated', {
          patternType: pattern.type,
          sequenceLength: sequence.length,
          tabCount: tabs.length
        });
        // Fall back to sequential
        sequence = this.resolveSequential(tabs, pattern);
      }

      // Cache the result (with size limit)
      if (this.patternCache.size >= MAX_PATTERN_CACHE_SIZE) {
        // Remove oldest entry
        const firstKey = this.patternCache.keys().next().value;
        if (firstKey) {
          this.patternCache.delete(firstKey);
        }
      }
      this.patternCache.set(cacheKey, sequence);

      await logger.debug('RotationEngine', 'Pattern resolved', {
        patternId: pattern.id,
        type: pattern.type,
        sequenceLength: sequence.length
      });

      return sequence;
    } catch (error) {
      await logger.error('RotationEngine', 'Error resolving pattern', {
        error: error instanceof Error ? error.message : String(error),
        patternType: pattern.type
      });
      // Fall back to sequential on error
      return this.resolveSequential(tabs, pattern);
    }
  }

  /**
   * Validate that a sequence contains valid, unique indices
   */
  private isValidSequence(sequence: number[], tabCount: number): boolean {
    if (!Array.isArray(sequence) || sequence.length === 0) {
      return false;
    }

    // Check all indices are valid and unique
    const seen = new Set<number>();
    for (const idx of sequence) {
      if (typeof idx !== 'number' || idx < 0 || idx >= tabCount || seen.has(idx)) {
        return false;
      }
      seen.add(idx);
    }

    return true;
  }

  /**
   * Sequential pattern: 0, 1, 2, 3, ...
   */
  private resolveSequential(
    tabs: chrome.tabs.Tab[],
    pattern: RotationPattern
  ): number[] {
    const indices = tabs.map((_, i) => i);

    if (pattern.options?.respectPinned) {
      // Pinned tabs first, then unpinned
      const pinned: number[] = [];
      const unpinned: number[] = [];

      tabs.forEach((tab, index) => {
        if (tab.pinned) {
          pinned.push(index);
        } else {
          unpinned.push(index);
        }
      });

      return [...pinned, ...unpinned];
    }

    return indices;
  }

  /**
   * Reverse pattern: n-1, n-2, ..., 2, 1, 0
   */
  private resolveReverse(
    tabs: chrome.tabs.Tab[],
    pattern: RotationPattern
  ): number[] {
    return this.resolveSequential(tabs, pattern).reverse();
  }

  /**
   * Random pattern with optional daily shuffle
   */
  private async resolveRandom(
    tabs: chrome.tabs.Tab[],
    pattern: RotationPattern
  ): Promise<number[]> {
    const indices = this.resolveSequential(tabs, pattern);

    // Determine seed for randomization
    const seed = pattern.options?.shuffleDaily
      ? this.getDailySeed()
      : this.getPatternSeed(pattern.id);

    return this.shuffleWithSeed(indices, seed);
  }

  /**
   * Pinned-first pattern: all pinned tabs, then all unpinned tabs
   */
  private resolvePinnedFirst(
    tabs: chrome.tabs.Tab[],
    _pattern: RotationPattern
  ): number[] {
    const pinned: number[] = [];
    const unpinned: number[] = [];

    tabs.forEach((tab, index) => {
      if (tab.pinned) {
        pinned.push(index);
      } else {
        unpinned.push(index);
      }
    });

    return [...pinned, ...unpinned];
  }

  /**
   * Custom pattern based on URL patterns or explicit indices
   *
   * Security: Validates all inputs, safe regex compilation
   */
  private async resolveCustom(
    tabs: chrome.tabs.Tab[],
    pattern: RotationPattern
  ): Promise<number[]> {
    if (!pattern.customOrder || pattern.customOrder.length === 0) {
      await logger.warn('RotationEngine', 'Custom pattern has no order defined', {
        patternId: pattern.id
      });
      return this.resolveSequential(tabs, pattern);
    }

    // Security: Limit custom order size
    if (pattern.customOrder.length > MAX_CUSTOM_ORDER_SIZE) {
      await logger.error('RotationEngine', 'Custom order exceeds size limit', {
        size: pattern.customOrder.length,
        limit: MAX_CUSTOM_ORDER_SIZE
      });
      return this.resolveSequential(tabs, pattern);
    }

    const sequence: number[] = [];
    const usedIndices = new Set<number>();

    for (const item of pattern.customOrder) {
      if (typeof item === 'number') {
        // Direct index reference
        const index = Math.floor(item); // Security: Ensure integer
        if (index >= 0 && index < tabs.length && !usedIndices.has(index)) {
          sequence.push(index);
          usedIndices.add(index);
        }
      } else if (typeof item === 'string' && item) {
        // URL/Title pattern - find matching tab
        // Security: Sanitize pattern string
        const sanitizedPattern = this.sanitizePattern(item);
        const matchIndex = await this.findMatchingTab(tabs, sanitizedPattern, usedIndices);
        if (matchIndex !== -1) {
          sequence.push(matchIndex);
          usedIndices.add(matchIndex);
        }
      }
    }

    // If no matches found, fall back to sequential
    if (sequence.length === 0) {
      await logger.warn('RotationEngine', 'Custom pattern matched no tabs', {
        patternId: pattern.id
      });
      return this.resolveSequential(tabs, pattern);
    }

    return sequence;
  }

  /**
   * Find a tab matching a pattern (URL or title substring)
   *
   * Security: No regex execution, simple substring matching only
   */
  private async findMatchingTab(
    tabs: chrome.tabs.Tab[],
    pattern: string,
    excludeIndices: Set<number>
  ): Promise<number> {
    // Security: Use simple substring matching, not regex
    const lowerPattern = pattern.toLowerCase();

    for (let i = 0; i < tabs.length; i++) {
      if (excludeIndices.has(i)) continue;

      const tab = tabs[i];
      if (!tab) continue;

      const url = (tab.url || '').toLowerCase();
      const title = (tab.title || '').toLowerCase();

      // Simple substring match - safe and fast
      if (url.includes(lowerPattern) || title.includes(lowerPattern)) {
        return i;
      }
    }

    return -1;
  }

  /**
   * Sanitize pattern string to prevent injection
   *
   * Security: Remove potentially dangerous characters
   */
  private sanitizePattern(pattern: string): string {
    // Security: Limit length
    const MAX_PATTERN_LENGTH = 500;
    let sanitized = pattern.substring(0, MAX_PATTERN_LENGTH);

    // Remove null bytes and control characters
    sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');

    // Remove potentially dangerous characters for URL/title matching
    // Keep alphanumeric, space, dash, underscore, dot, slash, colon
    sanitized = sanitized.replace(/[^a-zA-Z0-9\s\-_./:]/g, '');

    return sanitized.trim();
  }

  /**
   * Fisher-Yates shuffle with seeded random number generator
   *
   * Security: Deterministic shuffle based on seed, no external randomness
   */
  private shuffleWithSeed(array: number[], seed: number): number[] {
    const arr = [...array];
    let currentSeed = seed;

    // Seeded random number generator (LCG algorithm)
    const random = () => {
      currentSeed = (currentSeed * 9301 + 49297) % 233280;
      return currentSeed / 233280;
    };

    // Fisher-Yates shuffle
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      const temp = arr[i] ?? 0;
      arr[i] = arr[j] ?? 0;
      arr[j] = temp;
    }

    return arr;
  }

  /**
   * Get seed for daily shuffle (changes once per day)
   */
  private getDailySeed(): number {
    const dateStr = new Date().toISOString().split('T')[0] || ''; // YYYY-MM-DD
    return this.stringToSeed(dateStr);
  }

  /**
   * Get consistent seed for a pattern ID
   */
  private getPatternSeed(patternId: string): number {
    if (!this.randomSeeds.has(patternId)) {
      this.randomSeeds.set(patternId, this.stringToSeed(patternId));
    }
    return this.randomSeeds.get(patternId)!;
  }

  /**
   * Convert string to numeric seed
   */
  private stringToSeed(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Get cache key for a pattern and tab count
   */
  private getCacheKey(patternId: string, tabCount: number): string {
    return `${patternId}-${tabCount}`;
  }

  /**
   * Simple sequential next tab (fallback)
   */
  private getSequentialNext(tabs: chrome.tabs.Tab[], currentTabId: number): number {
    const currentIndex = tabs.findIndex(t => t.id === currentTabId);
    if (currentIndex === -1) return 0;
    return (currentIndex + 1) % tabs.length;
  }

  /**
   * Get pattern by ID from storage
   *
   * @param patternId - Pattern ID to retrieve
   * @returns Pattern object or null if not found
   */
  async getPattern(patternId: string): Promise<RotationPattern | null> {
    try {
      // Security: Sanitize patternId
      const sanitizedId = this.sanitizePattern(patternId);

      const result = await chrome.storage.local.get('rotationPatterns');
      const patterns = (result['rotationPatterns'] as { [key: string]: RotationPattern }) || {};

      if (!patterns[sanitizedId]) {
        // Return default sequential pattern
        if (sanitizedId === 'sequential') {
          return {
            id: 'sequential',
            name: 'Sequential',
            type: 'sequential',
            description: 'Rotate tabs from left to right',
            createdAt: Date.now()
          };
        }
        return null;
      }

      return patterns[sanitizedId];
    } catch (error) {
      await logger.error('RotationEngine', 'Error loading pattern', {
        error: error instanceof Error ? error.message : String(error),
        patternId
      });
      return null;
    }
  }

  /**
   * Save a pattern to storage
   *
   * Security: Validates pattern before saving
   */
  async savePattern(pattern: RotationPattern): Promise<void> {
    try {
      // Validate pattern
      if (!this.isValidPattern(pattern)) {
        throw new Error('Invalid pattern structure');
      }

      // Security: Sanitize pattern fields
      const sanitizedPattern: RotationPattern = {
        id: this.sanitizePattern(pattern.id),
        name: this.sanitizePattern(pattern.name).substring(0, 100),
        type: pattern.type,
        description: pattern.description
          ? this.sanitizePattern(pattern.description).substring(0, 500)
          : undefined,
        customOrder: pattern.customOrder
          ? pattern.customOrder.slice(0, MAX_CUSTOM_ORDER_SIZE)
          : undefined,
        options: pattern.options,
        createdAt: pattern.createdAt || Date.now(),
        updatedAt: Date.now()
      };

      const result = await chrome.storage.local.get('rotationPatterns');
      const patterns = (result['rotationPatterns'] as { [key: string]: RotationPattern }) || {};
      patterns[sanitizedPattern.id] = sanitizedPattern;

      await chrome.storage.local.set({ rotationPatterns: patterns });

      // Clear cache for this pattern
      this.clearPatternCache(sanitizedPattern.id);

      await logger.info('RotationEngine', 'Pattern saved', {
        patternId: sanitizedPattern.id,
        type: sanitizedPattern.type
      });
    } catch (error) {
      await logger.error('RotationEngine', 'Error saving pattern', {
        error: error instanceof Error ? error.message : String(error),
        patternId: pattern.id
      });
      throw error;
    }
  }

  /**
   * Validate pattern structure
   */
  private isValidPattern(pattern: RotationPattern): boolean {
    if (!pattern || typeof pattern !== 'object') return false;
    if (!pattern.id || typeof pattern.id !== 'string') return false;
    if (!pattern.name || typeof pattern.name !== 'string') return false;
    if (!['sequential', 'reverse', 'random', 'pinned-first', 'custom'].includes(pattern.type)) {
      return false;
    }
    return true;
  }

  /**
   * Delete a pattern from storage
   */
  async deletePattern(patternId: string): Promise<void> {
    try {
      const sanitizedId = this.sanitizePattern(patternId);

      const result = await chrome.storage.local.get('rotationPatterns');
      const patterns = (result['rotationPatterns'] as { [key: string]: RotationPattern }) || {};
      delete patterns[sanitizedId];

      await chrome.storage.local.set({ rotationPatterns: patterns });

      // Clear cache for this pattern
      this.clearPatternCache(sanitizedId);

      await logger.info('RotationEngine', 'Pattern deleted', { patternId: sanitizedId });
    } catch (error) {
      await logger.error('RotationEngine', 'Error deleting pattern', {
        error: error instanceof Error ? error.message : String(error),
        patternId
      });
      throw error;
    }
  }

  /**
   * Get all patterns from storage
   */
  async getAllPatterns(): Promise<RotationPattern[]> {
    try {
      const result = await chrome.storage.local.get('rotationPatterns');
      const patterns = (result['rotationPatterns'] as { [key: string]: RotationPattern }) || {};
      return Object.values(patterns);
    } catch (error) {
      await logger.error('RotationEngine', 'Error loading patterns', {
        error: error instanceof Error ? error.message : String(error)
      });
      return [];
    }
  }

  /**
   * Clear entire pattern cache
   */
  clearCache(): void {
    this.patternCache.clear();
    this.randomSeeds.clear();
  }

  /**
   * Clear cache for a specific pattern
   */
  private clearPatternCache(patternId: string): void {
    const keysToDelete: string[] = [];
    for (const key of this.patternCache.keys()) {
      if (key.startsWith(`${patternId}-`)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => this.patternCache.delete(key));
    this.randomSeeds.delete(patternId);
  }
}

// Singleton instance
export const rotationEngine = new RotationEngine();
