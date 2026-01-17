/**
 * Config Manager - Premium Feature
 *
 * Manages configuration import/export including:
 * - Exporting all settings to JSON
 * - Importing settings from JSON
 * - Creating manual/automatic backups
 * - Validating configuration files
 * - Sanitizing sensitive data
 * - Merging or replacing configurations
 */

import type {
  ConfigExport,
  ImportResult,
  ExportOptions,
  ImportOptions,
  ConfigBackup
} from '../core/types.js';
import {
  getSettings,
  getSavedSessions,
  getRefreshSettings,
  getRefreshRules,
  getSkipRules,
  getSkipPinnedTabs,
  getConfigVersion,
  setConfigVersion,
  createConfigBackup
} from '../core/storage.js';
import { requirePremiumLicense } from '../core/premium-access.js';
import { logger } from '../core/logger.js';
import { MAX_AUTO_BACKUPS } from '../core/constants.js';

/**
 * Config Manager class
 */
export class ConfigManager {
  private backups: ConfigBackup[] = [];

  /**
   * Export configuration to JSON
   */
  async exportConfig(options: ExportOptions = {}): Promise<ConfigExport> {
    await requirePremiumLicense();

    const {
      includeSettings = true,
      includeSessions = true,
      includeRefreshSettings = true,
      includeRefreshRules = true,
      includeSkipRules = true,
      sanitize = false
    } = options;

    const config: ConfigExport = {
      version: await getConfigVersion(),
      exportDate: Date.now(),
      metadata: {
        extensionVersion: chrome.runtime.getManifest().version,
        browser: this.getBrowserName(),
        exportedBy: 'AutoTabSwitcher'
      }
    };

    // Export settings
    if (includeSettings) {
      const settings = await getSettings([
        'delayTime',
        'switchingMode',
        'pauseOnActivity',
        'pauseDuration',
        'enableOnStartup',
        'skipPinnedTabs'
      ]);

      config.settings = {
        delayTime: settings.delayTime,
        switchingMode: settings.switchingMode,
        pauseOnActivity: settings.pauseOnActivity,
        pauseDuration: settings.pauseDuration,
        enableOnStartup: settings.enableOnStartup,
        skipPinnedTabs: await getSkipPinnedTabs()
      };
    }

    // Export sessions
    if (includeSessions) {
      let sessions = await getSavedSessions();

      if (sanitize) {
        sessions = sessions.map(session => ({
          ...session,
          tabs: session.tabs.map(tab => ({
            ...tab,
            url: this.sanitizeUrl(tab.url),
            title: undefined,
            favIconUrl: undefined
          }))
        }));
      }

      config.savedSessions = sessions;
    }

    // Export refresh settings
    if (includeRefreshSettings) {
      config.refreshSettings = await getRefreshSettings() || undefined;
    }

    // Export refresh rules
    if (includeRefreshRules) {
      let rules = await getRefreshRules();

      if (sanitize) {
        rules = rules.map(rule => ({
          ...rule,
          pattern: rule.type === 'url' ? this.sanitizeUrl(rule.pattern) : rule.pattern
        }));
      }

      config.refreshRules = rules;
    }

    // Export skip rules
    if (includeSkipRules) {
      let rules = await getSkipRules();

      if (sanitize) {
        rules = rules.map(rule => ({
          ...rule,
          pattern: rule.type === 'url' ? this.sanitizeUrl(rule.pattern) : rule.pattern
        }));
      }

      config.skipRules = rules;
    }

    logger.info('ConfigManager', 'Configuration exported', {
      version: config.version,
      sanitized: sanitize
    });

    return config;
  }

  /**
   * Import configuration from JSON
   */
  async importConfig(config: ConfigExport, options: ImportOptions = {}): Promise<ImportResult> {
    await requirePremiumLicense();

    const {
      merge = false,
      validateOnly = false,
      createBackup: shouldBackup = true
    } = options;

    // Validate configuration
    const validation = this.validateConfig(config);
    if (!validation.valid) {
      return {
        success: false,
        errors: validation.errors.map(e => e.message),
        imported: {}
      };
    }

    // If validation only, return early
    if (validateOnly) {
      return {
        success: true,
        imported: {},
        warnings: validation.warnings?.map(w => w.message)
      };
    }

    // Create backup before importing
    if (shouldBackup) {
      try {
        await createConfigBackup('pre-import');
        logger.info('ConfigManager', 'Backup created before import');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('ConfigManager', 'Failed to create backup before import', {
          error: errorMessage,
          errorType: error instanceof Error ? error.constructor.name : typeof error
        });
        return {
          success: false,
          errors: [`Failed to create backup before import: ${errorMessage}`],
          imported: {}
        };
      }
    }

    const result: ImportResult = {
      success: true,
      imported: {},
      warnings: []
    };

    try {
      // Import settings
      if (config.settings) {
        await this.importSettings(config.settings, merge);
        result.imported.settings = true;
      }

      // Import sessions
      if (config.savedSessions) {
        const imported = await this.importSessions(config.savedSessions, merge);
        result.imported.sessions = imported;
      }

      // Import refresh settings
      if (config.refreshSettings) {
        await this.importRefreshSettings(config.refreshSettings, merge);
        result.imported.refreshSettings = true;
      }

      // Import refresh rules
      if (config.refreshRules) {
        const imported = await this.importRefreshRules(config.refreshRules, merge);
        result.imported.refreshRules = imported;
      }

      // Import skip rules
      if (config.skipRules) {
        const imported = await this.importSkipRules(config.skipRules, merge);
        result.imported.skipRules = imported;
      }

      // Update config version
      if (config.version) {
        await setConfigVersion(config.version);
      }

      logger.info('ConfigManager', 'Configuration imported successfully', {
        imported: result.imported
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('ConfigManager', 'Import failed', {
        error: errorMessage,
        errorType: error instanceof Error ? error.constructor.name : typeof error,
        partialImport: result.imported
      });
      result.success = false;
      result.errors = [`Configuration import failed: ${errorMessage}`];
    }

    return result;
  }

  /**
   * Export configuration as JSON string
   */
  async exportAsJSON(options: ExportOptions = {}): Promise<string> {
    const config = await this.exportConfig(options);
    return JSON.stringify(config, null, 2);
  }

  /**
   * Import configuration from JSON string
   */
  async importFromJSON(jsonString: string, options: ImportOptions = {}): Promise<ImportResult> {
    try {
      const config: ConfigExport = JSON.parse(jsonString);
      return await this.importConfig(config, options);
    } catch (error) {
      return {
        success: false,
        errors: ['Invalid JSON format'],
        imported: {}
      };
    }
  }

  /**
   * Download configuration as file
   */
  async downloadConfig(options: ExportOptions = {}): Promise<void> {
    await requirePremiumLicense();

    const config = await this.exportConfig(options);
    const jsonString = JSON.stringify(config, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });

    const filename = `autotabswitcher-config-${Date.now()}.json`;
    const url = URL.createObjectURL(blob);

    // Trigger download
    await chrome.downloads.download({
      url: url,
      filename: filename,
      saveAs: true
    });

    logger.info('ConfigManager', 'Configuration downloaded', { filename });
  }

  /**
   * Create manual backup
   */
  async createBackup(): Promise<ConfigBackup> {
    await requirePremiumLicense();

    const backup = await createConfigBackup('manual');

    // Add to backups list
    this.backups.push(backup);

    // Keep only last MAX_AUTO_BACKUPS backups
    if (this.backups.length > MAX_AUTO_BACKUPS) {
      this.backups = this.backups.slice(-MAX_AUTO_BACKUPS);
    }

    logger.info('ConfigManager', 'Manual backup created', {
      backupId: backup.id
    });

    return backup;
  }

  /**
   * Get all backups
   */
  async getBackups(): Promise<ConfigBackup[]> {
    await requirePremiumLicense();

    return [...this.backups];
  }

  /**
   * Restore from backup
   */
  async restoreBackup(backupId: string): Promise<ImportResult> {
    await requirePremiumLicense();

    const backup = this.backups.find(b => b.id === backupId);

    if (!backup) {
      return {
        success: false,
        errors: [`Backup not found: ${backupId}`],
        imported: {}
      };
    }

    logger.info('ConfigManager', 'Restoring from backup', { backupId });

    // Import configuration from backup (don't create another backup)
    return await this.importConfig(backup.config, {
      merge: false,
      createBackup: false
    });
  }

  /**
   * Validate configuration
   */
  private validateConfig(config: ConfigExport): {
    valid: boolean;
    errors: Array<{ field: string; message: string }>;
    warnings?: Array<{ field: string; message: string }>;
  } {
    const errors: Array<{ field: string; message: string }> = [];
    const warnings: Array<{ field: string; message: string }> = [];

    // Check version
    if (!config.version) {
      errors.push({ field: 'version', message: 'Config version is required' });
    }

    // Validate settings
    if (config.settings) {
      if (config.settings.delayTime !== undefined &&
          (config.settings.delayTime < 2000 || config.settings.delayTime > 3600000)) {
        errors.push({ field: 'settings.delayTime', message: 'Invalid delay time' });
      }
    }

    // Validate sessions
    if (config.savedSessions) {
      if (!Array.isArray(config.savedSessions)) {
        errors.push({ field: 'savedSessions', message: 'Sessions must be an array' });
      } else {
        config.savedSessions.forEach((session, index) => {
          if (!session.id || !session.name || !session.tabs) {
            errors.push({
              field: `savedSessions[${index}]`,
              message: 'Session must have id, name, and tabs'
            });
          }
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  /**
   * Import settings
   */
  private async importSettings(
    settings: NonNullable<ConfigExport['settings']>,
    merge: boolean
  ): Promise<void> {
    if (!merge) {
      // Replace all settings
      await chrome.storage.local.set({
        delayTime: settings.delayTime,
        switchingMode: settings.switchingMode,
        pauseOnActivity: settings.pauseOnActivity,
        pauseDuration: settings.pauseDuration,
        enableOnStartup: settings.enableOnStartup
      });
    } else {
      // Merge settings (only update provided values)
      const updates: any = {};
      if (settings.delayTime !== undefined) updates.delayTime = settings.delayTime;
      if (settings.switchingMode !== undefined) updates.switchingMode = settings.switchingMode;
      if (settings.pauseOnActivity !== undefined) updates.pauseOnActivity = settings.pauseOnActivity;
      if (settings.pauseDuration !== undefined) updates.pauseDuration = settings.pauseDuration;
      if (settings.enableOnStartup !== undefined) updates.enableOnStartup = settings.enableOnStartup;

      await chrome.storage.local.set(updates);
    }
  }

  /**
   * Import sessions
   */
  private async importSessions(
    sessions: NonNullable<ConfigExport['savedSessions']>,
    merge: boolean
  ): Promise<number> {
    const { saveSession } = await import('../core/storage.js');

    if (!merge) {
      // Replace all sessions
      await chrome.storage.local.set({ savedSessions: sessions });
      return sessions.length;
    } else {
      // Merge sessions (avoid duplicates by ID)
      const existingSessions = await getSavedSessions();
      const existingIds = new Set(existingSessions.map(s => s.id));

      let imported = 0;
      for (const session of sessions) {
        if (!existingIds.has(session.id)) {
          await saveSession(session);
          imported++;
        }
      }

      return imported;
    }
  }

  /**
   * Import refresh settings
   */
  private async importRefreshSettings(
    settings: NonNullable<ConfigExport['refreshSettings']>,
    merge: boolean
  ): Promise<void> {
    const { setRefreshSettings } = await import('../core/storage.js');

    if (!merge) {
      await setRefreshSettings(settings);
    } else {
      const existing = await getRefreshSettings();
      await setRefreshSettings({ ...existing, ...settings });
    }
  }

  /**
   * Import refresh rules
   */
  private async importRefreshRules(
    rules: NonNullable<ConfigExport['refreshRules']>,
    merge: boolean
  ): Promise<number> {
    const { saveRefreshRule } = await import('../core/storage.js');

    if (!merge) {
      await chrome.storage.local.set({ refreshRules: rules });
      return rules.length;
    } else {
      const existingRules = await getRefreshRules();
      const existingIds = new Set(existingRules.map(r => r.id));

      let imported = 0;
      for (const rule of rules) {
        if (!existingIds.has(rule.id)) {
          await saveRefreshRule(rule);
          imported++;
        }
      }

      return imported;
    }
  }

  /**
   * Import skip rules
   */
  private async importSkipRules(
    rules: NonNullable<ConfigExport['skipRules']>,
    merge: boolean
  ): Promise<number> {
    const { saveSkipRule } = await import('../core/storage.js');

    if (!merge) {
      await chrome.storage.local.set({ skipRules: rules });
      return rules.length;
    } else {
      const existingRules = await getSkipRules();
      const existingIds = new Set(existingRules.map(r => r.id));

      let imported = 0;
      for (const rule of rules) {
        if (!existingIds.has(rule.id)) {
          await saveSkipRule(rule);
          imported++;
        }
      }

      return imported;
    }
  }

  /**
   * Sanitize URL for export (remove sensitive parts)
   */
  private sanitizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      // Keep only protocol and hostname
      return `${urlObj.protocol}//${urlObj.hostname}`;
    } catch {
      return '[sanitized]';
    }
  }

  /**
   * Get browser name
   */
  private getBrowserName(): string {
    const userAgent = navigator.userAgent;

    if (userAgent.includes('Edg/')) return 'Microsoft Edge';
    if (userAgent.includes('Chrome/')) return 'Google Chrome';
    if (userAgent.includes('Firefox/')) return 'Mozilla Firefox';
    if (userAgent.includes('Safari/')) return 'Safari';

    return 'Unknown';
  }

  /**
   * Get export statistics
   */
  async getExportStats(): Promise<{
    sessions: number;
    refreshRules: number;
    skipRules: number;
    backups: number;
    lastBackup?: number;
  }> {
    await requirePremiumLicense();

    return {
      sessions: (await getSavedSessions()).length,
      refreshRules: (await getRefreshRules()).length,
      skipRules: (await getSkipRules()).length,
      backups: this.backups.length,
      lastBackup: this.backups.length > 0 ?
        this.backups[this.backups.length - 1].timestamp :
        undefined
    };
  }
}

// Export singleton instance
export const configManager = new ConfigManager();
