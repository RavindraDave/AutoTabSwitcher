/**
 * Refresh Manager - Premium Feature
 *
 * Manages smart auto-refresh functionality including:
 * - Preemptive refresh (before switching to a tab)
 * - Post-switch refresh (after switching to a tab)
 * - Manual refresh on demand
 * - Hybrid strategy (intelligent combination)
 * - Per-tab custom intervals
 * - URL/domain-based refresh rules
 */

import type {
  RefreshSettings,
  RefreshRule,
  TabRefreshState
} from '../core/types.js';
import {
  getRefreshSettings,
  setRefreshSettings,
  getRefreshRules,
  saveRefreshRule,
  deleteRefreshRule,
  getTabRefreshState,
  setTabRefreshState
} from '../core/storage.js';
import { requirePremiumLicense } from '../core/premium-access.js';
import { logger } from '../core/logger.js';
import {
  MIN_REFRESH_INTERVAL,
  MAX_REFRESH_INTERVAL,
  DEFAULT_REFRESH_INTERVAL,
  MAX_REFRESH_RULES
} from '../core/constants.js';
import {
  validateRegexPattern,
  safeCompileRegex
} from '../core/regex-validator.js';

/**
 * Refresh Manager class
 */
export class RefreshManager {
  private refreshTimers: Map<number, NodeJS.Timeout> = new Map();
  private preemptiveRefreshQueue: Set<number> = new Set();

  /**
   * Initialize refresh manager
   */
  async initialize(): Promise<void> {
    await requirePremiumLicense();

    const settings = await getRefreshSettings();
    if (settings?.enabled) {
      await this.startRefreshSystem();
      logger.info('RefreshManager', 'Refresh system initialized');
    }
  }

  /**
   * Enable refresh system
   */
  async enable(settings?: Partial<RefreshSettings>): Promise<void> {
    await requirePremiumLicense();

    const currentSettings = await getRefreshSettings() || this.getDefaultSettings();

    const newSettings: RefreshSettings = {
      ...currentSettings,
      ...settings,
      enabled: true
    };

    // Validate settings
    this.validateSettings(newSettings);

    await setRefreshSettings(newSettings);
    await this.startRefreshSystem();

    logger.info('RefreshManager', 'Refresh system enabled', { settings: newSettings });
  }

  /**
   * Disable refresh system
   */
  async disable(): Promise<void> {
    await requirePremiumLicense();

    const settings = await getRefreshSettings();
    if (settings) {
      settings.enabled = false;
      await setRefreshSettings(settings);
    }

    this.stopAllRefreshTimers();

    logger.info('RefreshManager', 'Refresh system disabled');
  }

  /**
   * Update refresh settings
   */
  async updateSettings(updates: Partial<RefreshSettings>): Promise<void> {
    await requirePremiumLicense();

    const currentSettings = await getRefreshSettings() || this.getDefaultSettings();
    const newSettings: RefreshSettings = {
      ...currentSettings,
      ...updates
    };

    this.validateSettings(newSettings);

    await setRefreshSettings(newSettings);

    // Restart if enabled
    if (newSettings.enabled) {
      await this.startRefreshSystem();
    }

    logger.info('RefreshManager', 'Refresh settings updated', { updates });
  }

  /**
   * Get current refresh settings
   */
  async getSettings(): Promise<RefreshSettings> {
    await requirePremiumLicense();

    return await getRefreshSettings() || this.getDefaultSettings();
  }

  /**
   * Add or update refresh rule
   */
  async addRule(rule: Omit<RefreshRule, 'id'> | RefreshRule): Promise<RefreshRule> {
    await requirePremiumLicense();

    // Check rule limit
    const existingRules = await getRefreshRules();
    const isUpdate = 'id' in rule && existingRules.some(r => r.id === rule.id);

    if (!isUpdate && existingRules.length >= MAX_REFRESH_RULES) {
      throw new Error(`Maximum number of refresh rules (${MAX_REFRESH_RULES}) reached`);
    }

    const fullRule: RefreshRule = {
      ...rule,
      id: 'id' in rule ? rule.id : this.generateRuleId()
    };

    // Validate rule
    this.validateRule(fullRule);

    await saveRefreshRule(fullRule);

    logger.info('RefreshManager', 'Refresh rule saved', {
      ruleId: fullRule.id,
      type: fullRule.type
    });

    return fullRule;
  }

  /**
   * Remove refresh rule
   */
  async removeRule(ruleId: string): Promise<void> {
    await requirePremiumLicense();

    await deleteRefreshRule(ruleId);

    logger.info('RefreshManager', 'Refresh rule deleted', { ruleId });
  }

  /**
   * Get all refresh rules
   */
  async getRules(): Promise<RefreshRule[]> {
    await requirePremiumLicense();

    return await getRefreshRules();
  }

  /**
   * Check if tab should be refreshed based on rules
   */
  async shouldRefreshTab(tabId: number): Promise<boolean> {
    await requirePremiumLicense();

    try {
      const tab = await chrome.tabs.get(tabId);
      if (!tab.url) return false;

      const rules = await getRefreshRules();
      const enabledRules = rules.filter(r => r.enabled);

      if (enabledRules.length === 0) {
        return true; // No rules = refresh all
      }

      // Check each rule
      for (const rule of enabledRules) {
        const matches = await this.ruleMatches(rule, tab.url, tab.title);
        if (matches) {
          // Rule matched - follow its action
          return rule.action === 'refresh';
        }
      }

      // No rule matched - default behavior
      const settings = await getRefreshSettings();
      return settings?.refreshNonMatchingTabs !== false;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('RefreshManager', 'Error checking refresh rules', {
        tabId,
        error: errorMessage,
        errorType: error instanceof Error ? error.constructor.name : typeof error
      });
      return false; // Don't refresh on error
    }
  }

  /**
   * Refresh a tab
   */
  async refreshTab(tabId: number, strategy?: 'preemptive' | 'post-switch' | 'manual'): Promise<void> {
    await requirePremiumLicense();

    const shouldRefresh = await this.shouldRefreshTab(tabId);
    if (!shouldRefresh) {
      logger.debug('RefreshManager', 'Tab skipped by rules', { tabId });
      return;
    }

    const startTime = Date.now();

    try {
      await chrome.tabs.reload(tabId, { bypassCache: false });

      const duration = Date.now() - startTime;

      // Update tab refresh state
      const state = await getTabRefreshState(tabId) || {
        lastRefreshTime: 0,
        refreshCount: 0
      };

      state.lastRefreshTime = Date.now();
      state.refreshCount = (state.refreshCount || 0) + 1;
      state.lastRefreshDuration = duration;
      if (strategy) {
        state.strategy = strategy;
      }

      await setTabRefreshState(tabId, state);

      logger.info('RefreshManager', 'Tab refreshed', {
        tabId,
        strategy: strategy || 'default',
        duration
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorDetails = {
        tabId,
        strategy: strategy || 'default',
        error: errorMessage,
        errorType: error instanceof Error ? error.constructor.name : typeof error,
        duration: Date.now() - startTime
      };

      logger.error('RefreshManager', 'Failed to refresh tab', errorDetails);

      // Re-throw with enhanced error message
      throw new Error(
        `Failed to refresh tab ${tabId}: ${errorMessage}`
      );
    }
  }

  /**
   * Preemptively refresh tab before switching to it
   */
  async preemptiveRefresh(tabId: number): Promise<void> {
    await requirePremiumLicense();

    const settings = await getRefreshSettings();
    if (!settings?.enabled || settings.strategy !== 'preemptive' && settings.strategy !== 'hybrid') {
      return;
    }

    // Add to preemptive queue
    this.preemptiveRefreshQueue.add(tabId);

    // Refresh the tab
    await this.refreshTab(tabId, 'preemptive');

    // Remove from queue after refresh completes
    setTimeout(() => {
      this.preemptiveRefreshQueue.delete(tabId);
    }, 1000);
  }

  /**
   * Post-switch refresh (after tab is activated)
   */
  async postSwitchRefresh(tabId: number): Promise<void> {
    await requirePremiumLicense();

    const settings = await getRefreshSettings();
    if (!settings?.enabled || settings.strategy !== 'post-switch' && settings.strategy !== 'hybrid') {
      return;
    }

    // Don't refresh if already preemptively refreshed
    if (this.preemptiveRefreshQueue.has(tabId)) {
      logger.debug('RefreshManager', 'Skipping post-switch (already preemptive)', { tabId });
      return;
    }

    await this.refreshTab(tabId, 'post-switch');
  }

  /**
   * Set custom refresh interval for a tab
   */
  async setTabRefreshInterval(tabId: number, intervalMs: number | null): Promise<void> {
    await requirePremiumLicense();

    if (intervalMs !== null) {
      if (intervalMs < MIN_REFRESH_INTERVAL || intervalMs > MAX_REFRESH_INTERVAL) {
        throw new Error(
          `Refresh interval must be between ${MIN_REFRESH_INTERVAL}ms and ${MAX_REFRESH_INTERVAL}ms`
        );
      }
    }

    const state = await getTabRefreshState(tabId) || {
      lastRefreshTime: 0,
      refreshCount: 0
    };

    state.customInterval = intervalMs || undefined;

    await setTabRefreshState(tabId, state);

    // Restart timer for this tab
    await this.setupTabRefreshTimer(tabId);

    logger.info('RefreshManager', 'Tab refresh interval updated', {
      tabId,
      intervalMs
    });
  }

  /**
   * Get tab refresh state
   */
  async getTabState(tabId: number): Promise<TabRefreshState | null> {
    await requirePremiumLicense();

    return await getTabRefreshState(tabId);
  }

  /**
   * Start refresh system for all tabs
   */
  private async startRefreshSystem(): Promise<void> {
    // Stop existing timers
    this.stopAllRefreshTimers();

    const settings = await getRefreshSettings();
    if (!settings?.enabled) return;

    // Set up timers based on strategy
    if (settings.strategy === 'preemptive' || settings.strategy === 'hybrid') {
      // Preemptive refresh is handled in tab switching logic
      logger.info('RefreshManager', 'Preemptive refresh mode active');
    }

    if (settings.strategy === 'post-switch' || settings.strategy === 'hybrid') {
      // Post-switch refresh is handled in tab activation listener
      logger.info('RefreshManager', 'Post-switch refresh mode active');
    }

    // Set up interval-based refresh if configured
    if (settings.globalRefreshInterval && settings.globalRefreshInterval > 0) {
      await this.setupIntervalBasedRefresh();
    }
  }

  /**
   * Set up interval-based refresh for all tabs
   */
  private async setupIntervalBasedRefresh(): Promise<void> {
    const tabs = await chrome.tabs.query({});

    for (const tab of tabs) {
      if (tab.id) {
        await this.setupTabRefreshTimer(tab.id);
      }
    }
  }

  /**
   * Set up refresh timer for a specific tab
   */
  private async setupTabRefreshTimer(tabId: number): Promise<void> {
    // Clear existing timer
    const existingTimer = this.refreshTimers.get(tabId);
    if (existingTimer) {
      clearInterval(existingTimer);
    }

    const settings = await getRefreshSettings();
    if (!settings?.enabled) return;

    // Get tab-specific interval or use global
    const state = await getTabRefreshState(tabId);
    const interval = state?.customInterval || settings.globalRefreshInterval;

    if (!interval || interval <= 0) return;

    // Set up new timer
    const timer = setInterval(async () => {
      try {
        await this.refreshTab(tabId, 'manual');
      } catch (error) {
        // Tab might be closed
        clearInterval(timer);
        this.refreshTimers.delete(tabId);
      }
    }, interval);

    this.refreshTimers.set(tabId, timer);
  }

  /**
   * Stop all refresh timers
   */
  private stopAllRefreshTimers(): void {
    for (const timer of this.refreshTimers.values()) {
      clearInterval(timer);
    }
    this.refreshTimers.clear();
  }

  /**
   * Check if rule matches URL/title
   */
  private async ruleMatches(rule: RefreshRule, url: string, title?: string): Promise<boolean> {
    try {
      switch (rule.type) {
        case 'url':
          return url.includes(rule.pattern);

        case 'domain': {
          const urlObj = new URL(url);
          return urlObj.hostname === rule.pattern || urlObj.hostname.endsWith(`.${rule.pattern}`);
        }

        case 'regex': {
          const regex = safeCompileRegex(rule.pattern, 'i');
          if (!regex) {
            logger.error('RefreshManager', 'Failed to compile regex', { pattern: rule.pattern });
            return false;
          }
          return regex.test(url);
        }

        case 'title':
          return title ? title.toLowerCase().includes(rule.pattern.toLowerCase()) : false;

        default:
          return false;
      }
    } catch (error) {
      logger.error('RefreshManager', 'Rule matching error', { rule, error });
      return false;
    }
  }

  /**
   * Validate refresh settings
   */
  private validateSettings(settings: RefreshSettings): void {
    if (settings.globalRefreshInterval !== undefined) {
      if (settings.globalRefreshInterval < MIN_REFRESH_INTERVAL ||
          settings.globalRefreshInterval > MAX_REFRESH_INTERVAL) {
        throw new Error(
          `Global refresh interval must be between ${MIN_REFRESH_INTERVAL}ms and ${MAX_REFRESH_INTERVAL}ms`
        );
      }
    }

    if (settings.preemptiveRefreshOffset !== undefined) {
      if (settings.preemptiveRefreshOffset < 0 || settings.preemptiveRefreshOffset > 60000) {
        throw new Error('Preemptive refresh offset must be between 0 and 60000ms');
      }
    }
  }

  /**
   * Validate refresh rule
   */
  private validateRule(rule: RefreshRule): void {
    if (!rule.pattern || rule.pattern.trim().length === 0) {
      throw new Error('Rule pattern cannot be empty');
    }

    if (rule.type === 'regex') {
      const validation = validateRegexPattern(rule.pattern);
      if (!validation.valid) {
        throw new Error(validation.error || 'Invalid regex pattern');
      }

      if (validation.warning) {
        logger.warn('RefreshManager', 'Regex pattern warning', {
          pattern: rule.pattern,
          warning: validation.warning
        });
      }
    }
  }

  /**
   * Get default refresh settings
   */
  private getDefaultSettings(): RefreshSettings {
    return {
      enabled: false,
      strategy: 'hybrid',
      globalRefreshInterval: DEFAULT_REFRESH_INTERVAL,
      preemptiveRefreshOffset: 2000,
      refreshNonMatchingTabs: true
    };
  }

  /**
   * Generate unique rule ID
   */
  private generateRuleId(): string {
    return `refresh-rule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clean up - called when extension unloads
   */
  cleanup(): void {
    this.stopAllRefreshTimers();
    this.preemptiveRefreshQueue.clear();
  }
}

// Export singleton instance
export const refreshManager = new RefreshManager();
