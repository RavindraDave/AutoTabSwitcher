/**
 * Skip Rule Engine - Premium Feature
 *
 * Manages skip rules for tab rotation including:
 * - URL-based skip rules
 * - Domain-based skip rules
 * - Regex pattern matching
 * - Title-based skip rules
 * - Pinned tab handling
 * - Priority-based rule evaluation
 */

import type { SkipRule } from '../core/types.js';
import {
  getSkipRules,
  saveSkipRule,
  deleteSkipRule,
  getSkipPinnedTabs,
  setSkipPinnedTabs
} from '../core/storage.js';
import { requirePremiumLicense } from '../core/premium-access.js';
import { logger } from '../core/logger.js';
import { MAX_SKIP_RULES } from '../core/constants.js';
import {
  validateRegexPattern,
  safeCompileRegex
} from '../core/regex-validator.js';

/**
 * Skip Rule Engine class
 */
export class SkipRuleEngine {
  private ruleCache: SkipRule[] = [];
  private cacheTimestamp: number = 0;
  private readonly CACHE_TTL = 5000; // 5 seconds

  /**
   * Initialize skip rule engine
   */
  async initialize(): Promise<void> {
    await requirePremiumLicense();

    await this.loadRules();
    logger.info('SkipRuleEngine', 'Skip rule engine initialized', {
      ruleCount: this.ruleCache.length
    });
  }

  /**
   * Add or update skip rule
   */
  async addRule(rule: Omit<SkipRule, 'id'> | SkipRule): Promise<SkipRule> {
    await requirePremiumLicense();

    // Check rule limit
    const existingRules = await getSkipRules();
    const isUpdate = 'id' in rule && existingRules.some(r => r.id === rule.id);

    if (!isUpdate && existingRules.length >= MAX_SKIP_RULES) {
      throw new Error(`Maximum number of skip rules (${MAX_SKIP_RULES}) reached`);
    }

    const fullRule: SkipRule = {
      ...rule,
      id: 'id' in rule ? rule.id : this.generateRuleId(),
      enabled: rule.enabled !== false // Default to enabled
    };

    // Validate rule
    this.validateRule(fullRule);

    await saveSkipRule(fullRule);

    // Clear cache
    this.invalidateCache();

    logger.info('SkipRuleEngine', 'Skip rule saved', {
      ruleId: fullRule.id,
      type: fullRule.type
    });

    return fullRule;
  }

  /**
   * Remove skip rule
   */
  async removeRule(ruleId: string): Promise<void> {
    await requirePremiumLicense();

    await deleteSkipRule(ruleId);

    // Clear cache
    this.invalidateCache();

    logger.info('SkipRuleEngine', 'Skip rule deleted', { ruleId });
  }

  /**
   * Get all skip rules
   */
  async getRules(): Promise<SkipRule[]> {
    await requirePremiumLicense();

    return await getSkipRules();
  }

  /**
   * Enable/disable skip pinned tabs globally
   */
  async setSkipPinnedTabs(skip: boolean): Promise<void> {
    await requirePremiumLicense();

    await setSkipPinnedTabs(skip);

    logger.info('SkipRuleEngine', 'Skip pinned tabs setting updated', { skip });
  }

  /**
   * Get skip pinned tabs setting
   */
  async getSkipPinnedTabs(): Promise<boolean> {
    await requirePremiumLicense();

    return await getSkipPinnedTabs();
  }

  /**
   * Check if a tab should be skipped
   */
  async shouldSkipTab(tabId: number): Promise<boolean> {
    await requirePremiumLicense();

    try {
      const tab = await chrome.tabs.get(tabId);

      // Check if pinned tabs should be skipped
      if (tab.pinned && await getSkipPinnedTabs()) {
        logger.debug('SkipRuleEngine', 'Tab skipped (pinned)', { tabId });
        return true;
      }

      // Check skip rules
      const rules = await this.getEnabledRules();

      for (const rule of rules) {
        const matches = await this.ruleMatches(rule, tab);
        if (matches) {
          logger.debug('SkipRuleEngine', 'Tab skipped (rule matched)', {
            tabId,
            ruleId: rule.id,
            ruleType: rule.type
          });
          return true;
        }
      }

      return false;
    } catch (error) {
      logger.error('SkipRuleEngine', 'Error checking skip rules', { tabId, error });
      return false; // Don't skip on error
    }
  }

  /**
   * Filter tabs to exclude skipped ones
   */
  async filterTabs(tabs: chrome.tabs.Tab[]): Promise<chrome.tabs.Tab[]> {
    await requirePremiumLicense();

    const filtered: chrome.tabs.Tab[] = [];

    for (const tab of tabs) {
      if (tab.id && !(await this.shouldSkipTab(tab.id))) {
        filtered.push(tab);
      }
    }

    logger.debug('SkipRuleEngine', 'Tabs filtered', {
      original: tabs.length,
      filtered: filtered.length,
      skipped: tabs.length - filtered.length
    });

    return filtered;
  }

  /**
   * Get enabled rules (with caching)
   */
  private async getEnabledRules(): Promise<SkipRule[]> {
    // Check cache
    const now = Date.now();
    if (this.ruleCache.length > 0 && now - this.cacheTimestamp < this.CACHE_TTL) {
      return this.ruleCache.filter(r => r.enabled);
    }

    // Reload from storage
    await this.loadRules();

    return this.ruleCache.filter(r => r.enabled);
  }

  /**
   * Load rules from storage
   */
  private async loadRules(): Promise<void> {
    this.ruleCache = await getSkipRules();
    this.cacheTimestamp = Date.now();
  }

  /**
   * Invalidate rule cache
   */
  private invalidateCache(): void {
    this.cacheTimestamp = 0;
  }

  /**
   * Check if rule matches a tab
   */
  private async ruleMatches(rule: SkipRule, tab: chrome.tabs.Tab): Promise<boolean> {
    try {
      switch (rule.type) {
        case 'url':
          return tab.url ? tab.url.includes(rule.pattern) : false;

        case 'domain': {
          if (!tab.url) return false;
          try {
            const urlObj = new URL(tab.url);
            return urlObj.hostname === rule.pattern ||
                   urlObj.hostname.endsWith(`.${rule.pattern}`);
          } catch {
            return false;
          }
        }

        case 'regex': {
          if (!tab.url) return false;
          const regex = safeCompileRegex(rule.pattern, 'i');
          if (!regex) {
            logger.error('SkipRuleEngine', 'Failed to compile regex', { pattern: rule.pattern });
            return false;
          }
          return regex.test(tab.url);
        }

        case 'title':
          return tab.title ? tab.title.toLowerCase().includes(rule.pattern.toLowerCase()) : false;

        case 'pinned':
          return tab.pinned || false;

        default:
          return false;
      }
    } catch (error) {
      logger.error('SkipRuleEngine', 'Rule matching error', { rule, error });
      return false;
    }
  }

  /**
   * Validate skip rule
   */
  private validateRule(rule: SkipRule): void {
    if (rule.type !== 'pinned' && (!rule.pattern || rule.pattern.trim().length === 0)) {
      throw new Error('Rule pattern cannot be empty');
    }

    if (rule.type === 'regex') {
      const validation = validateRegexPattern(rule.pattern);
      if (!validation.valid) {
        throw new Error(validation.error || 'Invalid regex pattern');
      }

      if (validation.warning) {
        logger.warn('SkipRuleEngine', 'Regex pattern warning', {
          pattern: rule.pattern,
          warning: validation.warning
        });
      }
    }

    if (rule.type === 'domain') {
      // Basic domain validation
      const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?(\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?)*$/;
      if (!domainRegex.test(rule.pattern)) {
        throw new Error('Invalid domain pattern');
      }
    }
  }

  /**
   * Generate unique rule ID
   */
  private generateRuleId(): string {
    return `skip-rule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Bulk add rules from patterns
   */
  async addRulesFromPatterns(
    patterns: string[],
    type: 'url' | 'domain' | 'regex' | 'title',
    description?: string
  ): Promise<SkipRule[]> {
    await requirePremiumLicense();

    const rules: SkipRule[] = [];

    for (const pattern of patterns) {
      try {
        const rule = await this.addRule({
          type,
          pattern,
          description: description || `Auto-generated ${type} rule`,
          enabled: true,
          priority: 0
        });
        rules.push(rule);
      } catch (error) {
        logger.error('SkipRuleEngine', 'Failed to add rule', { pattern, error });
      }
    }

    logger.info('SkipRuleEngine', 'Bulk rules added', {
      total: patterns.length,
      successful: rules.length
    });

    return rules;
  }

  /**
   * Export rules as patterns
   */
  async exportRulesAsPatterns(): Promise<{
    urls: string[];
    domains: string[];
    titles: string[];
  }> {
    await requirePremiumLicense();

    const rules = await getSkipRules();

    return {
      urls: rules.filter(r => r.type === 'url').map(r => r.pattern),
      domains: rules.filter(r => r.type === 'domain').map(r => r.pattern),
      titles: rules.filter(r => r.type === 'title').map(r => r.pattern)
    };
  }

  /**
   * Get statistics about skip rules
   */
  async getStatistics(): Promise<{
    totalRules: number;
    enabledRules: number;
    rulesByType: { [key: string]: number };
    skipPinnedEnabled: boolean;
  }> {
    await requirePremiumLicense();

    const rules = await getSkipRules();
    const rulesByType: { [key: string]: number } = {};

    for (const rule of rules) {
      rulesByType[rule.type] = (rulesByType[rule.type] || 0) + 1;
    }

    return {
      totalRules: rules.length,
      enabledRules: rules.filter(r => r.enabled).length,
      rulesByType,
      skipPinnedEnabled: await getSkipPinnedTabs()
    };
  }

  /**
   * Test rule against URL
   */
  async testRule(ruleId: string, testUrl: string, testTitle?: string): Promise<boolean> {
    await requirePremiumLicense();

    const rules = await getSkipRules();
    const rule = rules.find(r => r.id === ruleId);

    if (!rule) {
      throw new Error(`Rule not found: ${ruleId}`);
    }

    // Create mock tab for testing
    const mockTab: chrome.tabs.Tab = {
      url: testUrl,
      title: testTitle,
      pinned: false,
      index: 0,
      highlighted: false,
      active: false,
      incognito: false,
      windowId: -1,
      id: -1,
      discarded: false,
      autoDiscardable: true,
      groupId: -1
    };

    return await this.ruleMatches(rule, mockTab);
  }

  /**
   * Clear all skip rules
   */
  async clearAllRules(): Promise<void> {
    await requirePremiumLicense();

    const rules = await getSkipRules();

    for (const rule of rules) {
      await deleteSkipRule(rule.id);
    }

    this.invalidateCache();

    logger.info('SkipRuleEngine', 'All skip rules cleared', {
      count: rules.length
    });
  }

  /**
   * Toggle rule enabled state
   */
  async toggleRule(ruleId: string): Promise<SkipRule> {
    await requirePremiumLicense();

    const rules = await getSkipRules();
    const rule = rules.find(r => r.id === ruleId);

    if (!rule) {
      throw new Error(`Rule not found: ${ruleId}`);
    }

    rule.enabled = !rule.enabled;
    await saveSkipRule(rule);

    this.invalidateCache();

    logger.info('SkipRuleEngine', 'Rule toggled', {
      ruleId,
      enabled: rule.enabled
    });

    return rule;
  }
}

// Export singleton instance
export const skipRuleEngine = new SkipRuleEngine();
