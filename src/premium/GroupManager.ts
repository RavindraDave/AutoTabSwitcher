/**
 * GroupManager - Manages tab groups and categorization
 *
 * Security Features:
 * - Input validation for all group data
 * - Safe regex compilation with timeout protection
 * - Pattern sanitization
 * - Size limits to prevent DoS
 * - No eval() or dynamic code execution
 *
 * @module GroupManager
 */

import type { TabGroup, TabMatcher, GroupRotationMode } from '../core/types.js';
import { logger } from '../core/logger.js';
import { validateRegexPattern, safeRegexTest } from '../core/regex-validator.js';

// Security constants
const MAX_GROUPS = 50; // Prevent excessive groups
const MAX_MATCHERS_PER_GROUP = 100; // Prevent DoS via matcher count
const MAX_PATTERN_LENGTH = 500; // Limit pattern string length
const MAX_GROUP_NAME_LENGTH = 100;
const MAX_GROUP_DESCRIPTION_LENGTH = 500;

/**
 * GroupManager manages tab groups and categorization
 */
export class GroupManager {
  /**
   * Get all groups from storage
   */
  async getAllGroups(): Promise<TabGroup[]> {
    try {
      const result = await chrome.storage.local.get('tabGroups');
      const groups = (result['tabGroups'] as TabGroup[]) || [];
      return groups;
    } catch (error) {
      await logger.error('GroupManager', 'Error loading groups', {
        error: error instanceof Error ? error.message : String(error)
      });
      return [];
    }
  }

  /**
   * Get a specific group by ID
   */
  async getGroup(groupId: string): Promise<TabGroup | null> {
    try {
      const groups = await this.getAllGroups();
      return groups.find(g => g.id === groupId) || null;
    } catch (error) {
      await logger.error('GroupManager', 'Error getting group', {
        error: error instanceof Error ? error.message : String(error),
        groupId
      });
      return null;
    }
  }

  /**
   * Save a group to storage
   *
   * Security: Validates and sanitizes all group data
   */
  async saveGroup(group: TabGroup): Promise<void> {
    try {
      // Validate group structure
      if (!this.isValidGroup(group)) {
        throw new Error('Invalid group structure');
      }

      // Security: Sanitize group fields
      const sanitizedGroup: TabGroup = {
        id: this.sanitizeString(group.id, 50),
        name: this.sanitizeString(group.name, MAX_GROUP_NAME_LENGTH),
        description: group.description
          ? this.sanitizeString(group.description, MAX_GROUP_DESCRIPTION_LENGTH)
          : undefined,
        color: group.color ? this.sanitizeColor(group.color) : undefined,
        icon: group.icon ? this.sanitizeString(group.icon, 50) : undefined,
        tabs: await this.sanitizeMatchers(group.tabs),
        settings: {
          customDelayTime: group.settings.customDelayTime,
          rotationPatternId: group.settings.rotationPatternId
            ? this.sanitizeString(group.settings.rotationPatternId, 50)
            : undefined,
          skipRules: group.settings.skipRules || [],
          enabled: group.settings.enabled ?? true,
        },
        rotationMode: group.rotationMode || 'within',
        createdAt: group.createdAt || Date.now(),
        updatedAt: Date.now(),
      };

      // Get existing groups
      const groups = await this.getAllGroups();

      // Check group count limit
      const existingIndex = groups.findIndex(g => g.id === sanitizedGroup.id);
      if (existingIndex === -1 && groups.length >= MAX_GROUPS) {
        throw new Error(`Maximum group limit (${MAX_GROUPS}) reached`);
      }

      // Update or add group
      if (existingIndex !== -1) {
        groups[existingIndex] = sanitizedGroup;
      } else {
        groups.push(sanitizedGroup);
      }

      // Save to storage
      await chrome.storage.local.set({ tabGroups: groups });

      await logger.info('GroupManager', 'Group saved', {
        groupId: sanitizedGroup.id,
        name: sanitizedGroup.name,
        matcherCount: sanitizedGroup.tabs.length
      });
    } catch (error) {
      await logger.error('GroupManager', 'Error saving group', {
        error: error instanceof Error ? error.message : String(error),
        groupId: group.id
      });
      throw error;
    }
  }

  /**
   * Delete a group from storage
   */
  async deleteGroup(groupId: string): Promise<void> {
    try {
      const groups = await this.getAllGroups();
      const filteredGroups = groups.filter(g => g.id !== groupId);

      await chrome.storage.local.set({ tabGroups: filteredGroups });

      await logger.info('GroupManager', 'Group deleted', { groupId });
    } catch (error) {
      await logger.error('GroupManager', 'Error deleting group', {
        error: error instanceof Error ? error.message : String(error),
        groupId
      });
      throw error;
    }
  }

  /**
   * Get tabs that match a specific group
   *
   * @param tabs - Array of Chrome tabs to filter
   * @param groupId - ID of the group to match against
   * @returns Array of tabs that belong to the group
   */
  async getGroupTabs(tabs: chrome.tabs.Tab[], groupId: string): Promise<chrome.tabs.Tab[]> {
    try {
      const group = await this.getGroup(groupId);
      if (!group || !group.settings.enabled) {
        return [];
      }

      const matchedTabs: chrome.tabs.Tab[] = [];

      for (const tab of tabs) {
        if (await this.tabMatchesGroup(tab, group)) {
          matchedTabs.push(tab);
        }
      }

      await logger.debug('GroupManager', 'Group tabs matched', {
        groupId,
        totalTabs: tabs.length,
        matchedTabs: matchedTabs.length
      });

      return matchedTabs;
    } catch (error) {
      await logger.error('GroupManager', 'Error getting group tabs', {
        error: error instanceof Error ? error.message : String(error),
        groupId
      });
      return [];
    }
  }

  /**
   * Check if a tab matches a group's matchers
   *
   * Security: Safe matching with no eval or dynamic code execution
   */
  async tabMatchesGroup(tab: chrome.tabs.Tab, group: TabGroup): Promise<boolean> {
    try {
      // Check each matcher in the group
      for (const matcher of group.tabs) {
        if (await this.tabMatchesMatcher(tab, matcher)) {
          return true; // Tab matches at least one matcher
        }
      }
      return false;
    } catch (error) {
      await logger.error('GroupManager', 'Error matching tab to group', {
        error: error instanceof Error ? error.message : String(error),
        tabId: tab.id,
        groupId: group.id
      });
      return false;
    }
  }

  /**
   * Check if a tab matches a specific matcher
   *
   * Security: Safe pattern matching with validation
   */
  private async tabMatchesMatcher(tab: chrome.tabs.Tab, matcher: TabMatcher): Promise<boolean> {
    try {
      switch (matcher.type) {
        case 'url':
          return this.matchUrl(tab, matcher);
        case 'domain':
          return this.matchDomain(tab, matcher);
        case 'regex':
          return await this.matchRegex(tab, matcher);
        case 'title':
          return this.matchTitle(tab, matcher);
        case 'manual':
          return this.matchManual(tab, matcher);
        default:
          await logger.warn('GroupManager', 'Unknown matcher type', {
            type: matcher.type
          });
          return false;
      }
    } catch (error) {
      await logger.error('GroupManager', 'Error in matcher', {
        error: error instanceof Error ? error.message : String(error),
        matcherType: matcher.type
      });
      return false;
    }
  }

  /**
   * Match tab by URL pattern (substring)
   */
  private matchUrl(tab: chrome.tabs.Tab, matcher: TabMatcher): boolean {
    if (!matcher.pattern || !tab.url) return false;

    const url = tab.url;
    const pattern = matcher.pattern;

    if (matcher.matchOptions?.exactMatch) {
      return matcher.matchOptions?.caseSensitive
        ? url === pattern
        : url.toLowerCase() === pattern.toLowerCase();
    } else {
      return matcher.matchOptions?.caseSensitive
        ? url.includes(pattern)
        : url.toLowerCase().includes(pattern.toLowerCase());
    }
  }

  /**
   * Match tab by domain
   */
  private matchDomain(tab: chrome.tabs.Tab, matcher: TabMatcher): boolean {
    if (!matcher.pattern || !tab.url) return false;

    try {
      const url = new URL(tab.url);
      const domain = url.hostname;
      const pattern = matcher.pattern.toLowerCase();

      if (matcher.matchOptions?.exactMatch) {
        return domain.toLowerCase() === pattern;
      } else {
        // Allow subdomain matching: pattern "example.com" matches "www.example.com"
        return domain.toLowerCase().includes(pattern) ||
               domain.toLowerCase().endsWith('.' + pattern);
      }
    } catch (error) {
      // Invalid URL
      return false;
    }
  }

  /**
   * Match tab by regex pattern
   *
   * Security: Uses regex-validator for safe compilation and timeout
   */
  private async matchRegex(tab: chrome.tabs.Tab, matcher: TabMatcher): Promise<boolean> {
    if (!matcher.pattern || !tab.url) return false;

    try {
      // Validate regex before using
      const validation = validateRegexPattern(matcher.pattern);
      if (!validation.valid) {
        await logger.warn('GroupManager', 'Invalid regex pattern', {
          pattern: matcher.pattern,
          error: validation.error
        });
        return false;
      }

      // Test regex match with timeout protection
      const flags = matcher.matchOptions?.caseSensitive ? '' : 'i';
      return await safeRegexTest(matcher.pattern, tab.url, flags);
    } catch (error) {
      await logger.error('GroupManager', 'Regex match error', {
        error: error instanceof Error ? error.message : String(error),
        pattern: matcher.pattern
      });
      return false;
    }
  }

  /**
   * Match tab by title (substring)
   */
  private matchTitle(tab: chrome.tabs.Tab, matcher: TabMatcher): boolean {
    if (!matcher.pattern || !tab.title) return false;

    const title = tab.title;
    const pattern = matcher.pattern;

    if (matcher.matchOptions?.exactMatch) {
      return matcher.matchOptions?.caseSensitive
        ? title === pattern
        : title.toLowerCase() === pattern.toLowerCase();
    } else {
      return matcher.matchOptions?.caseSensitive
        ? title.includes(pattern)
        : title.toLowerCase().includes(pattern.toLowerCase());
    }
  }

  /**
   * Match tab by explicit tab IDs
   */
  private matchManual(tab: chrome.tabs.Tab, matcher: TabMatcher): boolean {
    if (!matcher.tabIds || !tab.id) return false;
    return matcher.tabIds.includes(tab.id);
  }

  /**
   * Filter tabs by group rotation mode
   *
   * @param tabs - All tabs in the window
   * @param groupId - Active group ID
   * @param mode - Group rotation mode
   * @returns Filtered tabs based on mode
   */
  async filterTabsByGroupMode(
    tabs: chrome.tabs.Tab[],
    groupId: string,
    mode: GroupRotationMode
  ): Promise<chrome.tabs.Tab[]> {
    try {
      switch (mode) {
        case 'within-group':
          // Only tabs in the active group
          return await this.getGroupTabs(tabs, groupId);

        case 'between-groups':
          // One tab from each group (TODO: requires group tracking)
          // For now, return all tabs
          return tabs;

        case 'sequential-groups':
          // Complete one group before moving to next (TODO: requires state tracking)
          // For now, return all tabs
          return tabs;

        case 'independent':
        default:
          // Groups don't affect rotation
          return tabs;
      }
    } catch (error) {
      await logger.error('GroupManager', 'Error filtering tabs by group mode', {
        error: error instanceof Error ? error.message : String(error),
        groupId,
        mode
      });
      return tabs; // Fall back to all tabs on error
    }
  }

  /**
   * Validate group structure
   */
  private isValidGroup(group: TabGroup): boolean {
    if (!group || typeof group !== 'object') return false;
    if (!group.id || typeof group.id !== 'string') return false;
    if (!group.name || typeof group.name !== 'string') return false;
    if (!Array.isArray(group.tabs)) return false;
    if (!group.settings || typeof group.settings !== 'object') return false;
    return true;
  }

  /**
   * Sanitize matchers array
   *
   * Security: Validates each matcher and limits count
   */
  private async sanitizeMatchers(matchers: TabMatcher[]): Promise<TabMatcher[]> {
    if (!Array.isArray(matchers)) {
      return [];
    }

    // Limit matcher count
    const limitedMatchers = matchers.slice(0, MAX_MATCHERS_PER_GROUP);

    const sanitized: TabMatcher[] = [];

    for (const matcher of limitedMatchers) {
      if (!this.isValidMatcher(matcher)) {
        continue; // Skip invalid matchers
      }

      const sanitizedMatcher: TabMatcher = {
        type: matcher.type,
        pattern: matcher.pattern
          ? this.sanitizeString(matcher.pattern, MAX_PATTERN_LENGTH)
          : undefined,
        tabIds: matcher.tabIds ? matcher.tabIds.filter(id => typeof id === 'number') : undefined,
        matchOptions: matcher.matchOptions,
      };

      // Additional validation for regex patterns
      if (matcher.type === 'regex' && matcher.pattern) {
        const validation = validateRegexPattern(matcher.pattern);
        if (!validation.valid) {
          await logger.warn('GroupManager', 'Skipping invalid regex matcher', {
            pattern: matcher.pattern,
            error: validation.error
          });
          continue;
        }
      }

      sanitized.push(sanitizedMatcher);
    }

    return sanitized;
  }

  /**
   * Validate matcher structure
   */
  private isValidMatcher(matcher: TabMatcher): boolean {
    if (!matcher || typeof matcher !== 'object') return false;
    if (!['url', 'domain', 'regex', 'title', 'manual'].includes(matcher.type)) return false;

    if (matcher.type === 'manual') {
      return Array.isArray(matcher.tabIds) && matcher.tabIds.length > 0;
    } else {
      return typeof matcher.pattern === 'string' && matcher.pattern.length > 0;
    }
  }

  /**
   * Sanitize string input
   *
   * Security: Remove dangerous characters and limit length
   */
  private sanitizeString(str: string, maxLength: number): string {
    let sanitized = String(str).substring(0, maxLength);

    // Remove null bytes and control characters
    sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');

    // Remove HTML tags to prevent XSS
    sanitized = sanitized.replace(/<[^>]*>/g, '');

    // Remove script and style content
    sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    sanitized = sanitized.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

    return sanitized.trim();
  }

  /**
   * Sanitize color value
   *
   * Security: Only allow valid hex colors or named colors
   */
  private sanitizeColor(color: string): string {
    // Allow hex colors (#RGB or #RRGGBB)
    if (/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(color)) {
      return color;
    }

    // Allow common named colors
    const namedColors = [
      'red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink',
      'cyan', 'magenta', 'brown', 'gray', 'black', 'white'
    ];
    if (namedColors.includes(color.toLowerCase())) {
      return color.toLowerCase();
    }

    // Default to gray if invalid
    return 'gray';
  }

  /**
   * Get active group ID from storage
   */
  async getActiveGroupId(): Promise<string | null> {
    try {
      const result = await chrome.storage.local.get('activeGroupId');
      return result['activeGroupId'] || null;
    } catch (error) {
      await logger.error('GroupManager', 'Error getting active group', {
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }

  /**
   * Set active group ID
   */
  async setActiveGroupId(groupId: string | null): Promise<void> {
    try {
      await chrome.storage.local.set({ activeGroupId: groupId });
      await logger.info('GroupManager', 'Active group set', { groupId });
    } catch (error) {
      await logger.error('GroupManager', 'Error setting active group', {
        error: error instanceof Error ? error.message : String(error),
        groupId
      });
      throw error;
    }
  }

  /**
   * Get group rotation mode from storage
   */
  async getGroupRotationMode(): Promise<GroupRotationMode> {
    try {
      const result = await chrome.storage.local.get('groupRotationMode');
      return (result['groupRotationMode'] as GroupRotationMode) || 'independent';
    } catch (error) {
      await logger.error('GroupManager', 'Error getting group rotation mode', {
        error: error instanceof Error ? error.message : String(error)
      });
      return 'independent';
    }
  }

  /**
   * Set group rotation mode
   */
  async setGroupRotationMode(mode: GroupRotationMode): Promise<void> {
    try {
      await chrome.storage.local.set({ groupRotationMode: mode });
      await logger.info('GroupManager', 'Group rotation mode set', { mode });
    } catch (error) {
      await logger.error('GroupManager', 'Error setting group rotation mode', {
        error: error instanceof Error ? error.message : String(error),
        mode
      });
      throw error;
    }
  }
}

// Singleton instance
export const groupManager = new GroupManager();
