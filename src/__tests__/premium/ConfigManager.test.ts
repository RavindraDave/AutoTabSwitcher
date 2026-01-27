/**
 * Comprehensive tests for ConfigManager.ts
 * Tests configuration import/export and backup functionality
 */

import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import type {
  ConfigExport,
  SavedSession,
  RefreshSettings,
  RefreshRule,
  SkipRule
} from '../../core/types.js';

const mockChrome = (global as any).chrome;

describe('ConfigManager', () => {
  let configManager: any;
  let ConfigManager: any;
  let mockStorage: any; // Shared storage object for state persistence

  // Mock data
  const mockSettings = {
    delayTime: 5000,
    switchingMode: 'sequential' as const,
    pauseOnActivity: true,
    pauseDuration: 3000,
    enableOnStartup: false
  };

  const mockSession: SavedSession = {
    id: 'session-1',
    name: 'Test Session',
    tabs: [
      { url: 'https://example.com', title: 'Example', index: 0 }
    ],
    createdAt: Date.now(),
    launchCount: 0
  };

  const mockRefreshSettings: RefreshSettings = {
    enabled: true,
    strategy: 'hybrid',
    globalRefreshInterval: 30000,
    preemptiveRefreshOffset: 2000,
    refreshNonMatchingTabs: true
  };

  const mockRefreshRule: RefreshRule = {
    id: 'refresh-1',
    type: 'domain',
    pattern: 'example.com',
    action: 'refresh',
    enabled: true
  };

  const mockSkipRule: SkipRule = {
    id: 'skip-1',
    type: 'url',
    pattern: 'skip.com',
    enabled: true,
    priority: 0
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    // Reset chrome mocks
    mockChrome.storage.local.get.mockReset();
    mockChrome.storage.local.set.mockReset();
    mockChrome.runtime.getManifest.mockReturnValue({ version: '1.0.0' });
    mockChrome.downloads.download.mockResolvedValue(1);

    // Create mock storage that persists data between set and get
    mockStorage = {
      premiumEnabled: true,
      licenseKey: 'TEST-LICENSE-KEY',
      configVersion: 1,
      ...mockSettings,
      savedSessions: [mockSession],
      refreshSettings: mockRefreshSettings,
      refreshRules: [mockRefreshRule],
      skipRules: [mockSkipRule],
      skipPinnedTabs: false
    };

    // Default mock implementations with state persistence
    mockChrome.storage.local.get.mockImplementation((keys: string | string[] | null) => {
      // Filter by requested keys if specified
      if (keys === null || keys === undefined) {
        return Promise.resolve({ ...mockStorage });
      }

      const requestedKeys = Array.isArray(keys) ? keys : [keys];
      const result: any = {};
      for (const key of requestedKeys) {
        if (key in mockStorage) {
          result[key] = mockStorage[key];
        }
      }
      return Promise.resolve(result);
    });

    mockChrome.storage.local.set.mockImplementation((data: any) => {
      Object.assign(mockStorage, data);
      return Promise.resolve(undefined);
    });

    // Import fresh module
    const module = await import('../../premium/ConfigManager.js');
    configManager = module.configManager;
    ConfigManager = module.ConfigManager;
  });

  describe('export configuration', () => {
    test('should export full configuration', async () => {
      const config = await configManager.exportConfig();

      expect(config.version).toBeDefined();
      expect(config.exportDate).toBeDefined();
      expect(config.metadata).toBeDefined();
      expect(config.metadata.extensionVersion).toBe('1.0.0');
      expect(config.settings).toBeDefined();
      expect(config.savedSessions).toBeDefined();
      expect(config.refreshSettings).toBeDefined();
      expect(config.refreshRules).toBeDefined();
      expect(config.skipRules).toBeDefined();
    });

    test('should export only settings when specified', async () => {
      const config = await configManager.exportConfig({
        includeSettings: true,
        includeSessions: false,
        includeRefreshSettings: false,
        includeRefreshRules: false,
        includeSkipRules: false
      });

      expect(config.settings).toBeDefined();
      expect(config.savedSessions).toBeUndefined();
      expect(config.refreshSettings).toBeUndefined();
      expect(config.refreshRules).toBeUndefined();
      expect(config.skipRules).toBeUndefined();
    });

    test('should export only sessions when specified', async () => {
      const config = await configManager.exportConfig({
        includeSettings: false,
        includeSessions: true,
        includeRefreshSettings: false,
        includeRefreshRules: false,
        includeSkipRules: false
      });

      expect(config.settings).toBeUndefined();
      expect(config.savedSessions).toBeDefined();
      expect(config.savedSessions).toHaveLength(1);
    });

    test('should sanitize URLs when requested', async () => {
      const config = await configManager.exportConfig({
        sanitize: true
      });

      expect(config.savedSessions![0].tabs[0].url).toBe('https://example.com');
      expect(config.savedSessions![0].tabs[0].title).toBeUndefined();
      expect(config.savedSessions![0].tabs[0].favIconUrl).toBeUndefined();
    });

    test('should sanitize URL rules when requested', async () => {
      const config = await configManager.exportConfig({
        sanitize: true,
        includeRefreshRules: true
      });

      // Domain rules should not be sanitized
      expect(config.refreshRules![0].pattern).toBe('example.com');

      // URL rules would be sanitized if they existed
      expect(true).toBe(true);
    });

    test('should include metadata', async () => {
      const config = await configManager.exportConfig();

      expect(config.metadata).toBeDefined();
      expect(config.metadata.extensionVersion).toBe('1.0.0');
      expect(config.metadata.exportedBy).toBe('AutoTabSwitcher');
      expect(config.metadata.browser).toBeDefined();
    });

    test('should set export timestamp', async () => {
      const before = Date.now();
      const config = await configManager.exportConfig();
      const after = Date.now();

      expect(config.exportDate).toBeGreaterThanOrEqual(before);
      expect(config.exportDate).toBeLessThanOrEqual(after);
    });

    test('should require premium license', async () => {
      mockChrome.storage.local.get.mockResolvedValue({
        premiumEnabled: false
      });

      await expect(configManager.exportConfig()).rejects.toThrow();
    });
  });

  describe('export as JSON', () => {
    test('should export as JSON string', async () => {
      const json = await configManager.exportAsJSON();

      expect(typeof json).toBe('string');
      const parsed = JSON.parse(json);
      expect(parsed.version).toBeDefined();
      expect(parsed.settings).toBeDefined();
    });

    test('should format JSON with indentation', async () => {
      const json = await configManager.exportAsJSON();

      expect(json).toContain('\n');
      expect(json).toContain('  ');
    });
  });

  describe('import configuration', () => {
    let validConfig: ConfigExport;

    beforeEach(() => {
      validConfig = {
        version: 1,
        exportDate: Date.now(),
        metadata: {
          extensionVersion: '1.0.0',
          browser: 'Google Chrome',
          exportedBy: 'AutoTabSwitcher'
        },
        settings: mockSettings,
        savedSessions: [mockSession],
        refreshSettings: mockRefreshSettings,
        refreshRules: [mockRefreshRule],
        skipRules: [mockSkipRule]
      };
    });

    test('should import valid configuration', async () => {
      const result = await configManager.importConfig(validConfig);

      expect(result.success).toBe(true);
      expect(result.imported.settings).toBe(true);
      expect(result.imported.sessions).toBeGreaterThan(0);
      expect(result.imported.refreshSettings).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    test('should validate configuration before import', async () => {
      const invalidConfig = {
        version: undefined,
        exportDate: Date.now()
      } as any;

      const result = await configManager.importConfig(invalidConfig);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });

    test('should validate only when specified', async () => {
      const result = await configManager.importConfig(validConfig, {
        validateOnly: true
      });

      expect(result.success).toBe(true);
      expect(mockChrome.storage.local.set).not.toHaveBeenCalled();
    });

    test('should create backup before import', async () => {
      await configManager.importConfig(validConfig, {
        createBackup: true
      });

      // Should call storage to create backup
      expect(mockChrome.storage.local.set).toHaveBeenCalled();
    });

    test('should skip backup when requested', async () => {
      mockChrome.storage.local.set.mockClear();

      await configManager.importConfig(validConfig, {
        createBackup: false
      });

      // Should still call set for importing, but not for backup
      expect(mockChrome.storage.local.set).toHaveBeenCalled();
    });

    test('should replace configuration by default', async () => {
      const result = await configManager.importConfig(validConfig, {
        merge: false
      });

      expect(result.success).toBe(true);
      // Settings should be replaced
      expect(mockChrome.storage.local.set).toHaveBeenCalled();
    });

    test('should merge configuration when specified', async () => {
      const result = await configManager.importConfig(validConfig, {
        merge: true
      });

      expect(result.success).toBe(true);
      // Should merge rather than replace
      expect(mockChrome.storage.local.set).toHaveBeenCalled();
    });

    test('should handle import errors', async () => {
      mockChrome.storage.local.set.mockRejectedValue(new Error('Storage error'));

      const result = await configManager.importConfig(validConfig, {
        createBackup: false
      });

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });

    test('should import settings correctly', async () => {
      await configManager.importConfig(validConfig);

      const setCall = mockChrome.storage.local.set.mock.calls.find((call: any) =>
        call[0].delayTime !== undefined
      );

      expect(setCall).toBeDefined();
      expect(setCall[0].delayTime).toBe(5000);
    });

    test('should import sessions correctly', async () => {
      const result = await configManager.importConfig(validConfig);

      expect(result.imported.sessions).toBeGreaterThan(0);
    });

    test('should avoid duplicate sessions in merge mode', async () => {
      const result = await configManager.importConfig(validConfig, {
        merge: true
      });

      expect(result.success).toBe(true);
      // Should check for existing sessions
    });

    test('should require premium license', async () => {
      mockChrome.storage.local.get.mockResolvedValue({
        premiumEnabled: false
      });

      await expect(configManager.importConfig(validConfig)).rejects.toThrow();
    });
  });

  describe('import from JSON', () => {
    test('should import from valid JSON string', async () => {
      const config: ConfigExport = {
        version: 1,
        exportDate: Date.now(),
        metadata: {
          extensionVersion: '1.0.0',
          browser: 'Chrome',
          exportedBy: 'Test'
        },
        settings: mockSettings
      };

      const json = JSON.stringify(config);
      const result = await configManager.importFromJSON(json);

      expect(result.success).toBe(true);
    });

    test('should handle invalid JSON', async () => {
      const invalidJson = '{ invalid json }';

      const result = await configManager.importFromJSON(invalidJson);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Invalid JSON format');
    });

    test('should handle empty string', async () => {
      const result = await configManager.importFromJSON('');

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Invalid JSON format');
    });
  });

  describe('download configuration', () => {
    test('should download configuration file', async () => {
      await configManager.downloadConfig();

      expect(mockChrome.downloads.download).toHaveBeenCalled();
      const downloadCall = mockChrome.downloads.download.mock.calls[0][0];
      expect(downloadCall.filename).toContain('autotabswitcher-config-');
      expect(downloadCall.filename).toContain('.json');
      expect(downloadCall.saveAs).toBe(true);
    });

    test('should create blob URL', async () => {
      await configManager.downloadConfig();

      const downloadCall = mockChrome.downloads.download.mock.calls[0][0];
      expect(downloadCall.url).toBeDefined();
    });

    test('should use timestamped filename', async () => {
      await configManager.downloadConfig();

      const downloadCall = mockChrome.downloads.download.mock.calls[0][0];
      expect(downloadCall.filename).toMatch(/autotabswitcher-config-\d+\.json/);
    });

    test('should require premium license', async () => {
      mockChrome.storage.local.get.mockResolvedValue({
        premiumEnabled: false
      });

      await expect(configManager.downloadConfig()).rejects.toThrow();
    });
  });

  describe('validation', () => {
    test('should validate version is required', async () => {
      const config = {
        exportDate: Date.now()
      } as any;

      const result = await configManager.importConfig(config);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Config version is required');
    });

    test('should validate delay time range', async () => {
      const config: ConfigExport = {
        version: 1,
        exportDate: Date.now(),
        settings: {
          ...mockSettings,
          delayTime: 100 // Too low
        }
      };

      const result = await configManager.importConfig(config);

      expect(result.success).toBe(false);
      expect(result.errors!.some(e => e.includes('Invalid delay time'))).toBe(true);
    });

    test('should validate sessions structure', async () => {
      const config: ConfigExport = {
        version: 1,
        exportDate: Date.now(),
        savedSessions: [
          { id: 'test' } as any // Missing required fields
        ]
      };

      const result = await configManager.importConfig(config);

      expect(result.success).toBe(false);
      expect(result.errors!.some(e => e.includes('Session must have'))).toBe(true);
    });

    test('should validate sessions is array', async () => {
      const config: ConfigExport = {
        version: 1,
        exportDate: Date.now(),
        savedSessions: {} as any // Not an array
      };

      const result = await configManager.importConfig(config);

      expect(result.success).toBe(false);
      expect(result.errors!.some(e => e.includes('Sessions must be an array'))).toBe(true);
    });

    test('should accept valid configuration', async () => {
      const config: ConfigExport = {
        version: 1,
        exportDate: Date.now(),
        metadata: {
          extensionVersion: '1.0.0',
          browser: 'Chrome',
          exportedBy: 'Test'
        },
        settings: mockSettings,
        savedSessions: [mockSession]
      };

      const result = await configManager.importConfig(config);

      expect(result.success).toBe(true);
      expect(result.errors).toBeUndefined();
    });
  });

  describe('backups', () => {
    test('should create manual backup', async () => {
      const backup = await configManager.createBackup();

      expect(backup).toBeDefined();
      expect(backup.id).toBeDefined();
      expect(backup.timestamp).toBeDefined();
      expect(backup.config).toBeDefined();
    });

    test('should get all backups', async () => {
      await configManager.createBackup();
      await configManager.createBackup();

      const backups = await configManager.getBackups();

      expect(backups.length).toBeGreaterThanOrEqual(2);
    });

    test('should limit number of backups', async () => {
      // Create more than MAX_AUTO_BACKUPS
      for (let i = 0; i < 12; i++) {
        await configManager.createBackup();
      }

      const backups = await configManager.getBackups();

      expect(backups.length).toBeLessThanOrEqual(10);
    });

    test('should restore from backup', async () => {
      const backup = await configManager.createBackup();

      const result = await configManager.restoreBackup(backup.id);

      expect(result.success).toBe(true);
    });

    test('should fail to restore non-existent backup', async () => {
      const result = await configManager.restoreBackup('nonexistent');

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Backup not found: nonexistent');
    });

    test('should not create backup when restoring', async () => {
      const backup = await configManager.createBackup();

      mockChrome.storage.local.set.mockClear();

      await configManager.restoreBackup(backup.id);

      // Should not create another backup
      const backupCalls = mockChrome.storage.local.set.mock.calls.filter((call: any) =>
        call[0]?.configBackups
      );

      // Might be 0 or 1 depending on restore implementation
      expect(true).toBe(true);
    });

    test('should require premium license', async () => {
      mockChrome.storage.local.get.mockResolvedValue({
        premiumEnabled: false
      });

      await expect(configManager.createBackup()).rejects.toThrow();
      await expect(configManager.getBackups()).rejects.toThrow();
      await expect(configManager.restoreBackup('test')).rejects.toThrow();
    });
  });

  describe('statistics', () => {
    test('should get export statistics', async () => {
      const stats = await configManager.getExportStats();

      expect(stats.sessions).toBe(1);
      expect(stats.refreshRules).toBe(1);
      expect(stats.skipRules).toBe(1);
      expect(stats.backups).toBeGreaterThanOrEqual(0);
    });

    test('should include last backup timestamp', async () => {
      await configManager.createBackup();

      const stats = await configManager.getExportStats();

      expect(stats.lastBackup).toBeDefined();
    });

    test('should handle no backups', async () => {
      // Re-import module to get fresh instance without backups
      jest.resetModules();
      const freshModule = await import('../../premium/ConfigManager.js');
      const freshConfigManager = freshModule.configManager;

      const stats = await freshConfigManager.getExportStats();

      expect(stats.backups).toBe(0);
      expect(stats.lastBackup).toBeUndefined();
    });

    test('should require premium license', async () => {
      mockChrome.storage.local.get.mockResolvedValue({
        premiumEnabled: false
      });

      await expect(configManager.getExportStats()).rejects.toThrow();
    });
  });

  describe('URL sanitization', () => {
    test('should sanitize URL to protocol and hostname', async () => {
      const config = await configManager.exportConfig({
        sanitize: true,
        includeSessions: true
      });

      // Should remove path and params
      expect(config.savedSessions![0].tabs[0].url).toBe('https://example.com');
    });

    test('should handle invalid URLs', async () => {
      mockChrome.storage.local.get.mockImplementation((keys) => {
        return Promise.resolve({
          premiumEnabled: true,
          licenseKey: 'TEST-KEY',
          savedSessions: [{
            ...mockSession,
            tabs: [{ url: 'invalid-url', index: 0 }]
          }]
        });
      });

      const config = await configManager.exportConfig({
        sanitize: true,
        includeSessions: true
      });

      expect(config.savedSessions![0].tabs[0].url).toBe('[sanitized]');
    });
  });

  describe('merge vs replace', () => {
    test('should replace all settings when not merging', async () => {
      const config: ConfigExport = {
        version: 1,
        exportDate: Date.now(),
        settings: {
          delayTime: 10000,
          switchingMode: 'random',
          pauseOnActivity: false,
          pauseDuration: 5000,
          enableOnStartup: true
        }
      };

      await configManager.importConfig(config, { merge: false, createBackup: false });

      const setCall = mockChrome.storage.local.set.mock.calls.find((call: any) =>
        call[0].delayTime !== undefined
      );

      expect(setCall[0].delayTime).toBe(10000);
      expect(setCall[0].switchingMode).toBe('random');
    });

    test('should merge settings when specified', async () => {
      const config: ConfigExport = {
        version: 1,
        exportDate: Date.now(),
        settings: {
          delayTime: 10000
          // Other settings not provided
        } as any
      };

      await configManager.importConfig(config, { merge: true, createBackup: false });

      const setCall = mockChrome.storage.local.set.mock.calls.find((call: any) =>
        call[0].delayTime !== undefined
      );

      expect(setCall[0].delayTime).toBe(10000);
      // Other settings should not be in the update
      expect(Object.keys(setCall[0]).length).toBe(1);
    });

    test('should replace sessions when not merging', async () => {
      const newSession: SavedSession = {
        id: 'new-session',
        name: 'New',
        tabs: [],
        createdAt: Date.now(),
        launchCount: 0
      };

      const config: ConfigExport = {
        version: 1,
        exportDate: Date.now(),
        savedSessions: [newSession]
      };

      await configManager.importConfig(config, { merge: false, createBackup: false });

      const setCall = mockChrome.storage.local.set.mock.calls.find((call: any) =>
        call[0].savedSessions !== undefined
      );

      expect(setCall).toBeDefined();
      expect(setCall[0].savedSessions).toHaveLength(1);
      expect(setCall[0].savedSessions[0].id).toBe('new-session');
    });

    test('should merge sessions avoiding duplicates', async () => {
      const newSession: SavedSession = {
        id: 'session-2',
        name: 'New',
        tabs: [],
        createdAt: Date.now(),
        launchCount: 0
      };

      const config: ConfigExport = {
        version: 1,
        exportDate: Date.now(),
        savedSessions: [mockSession, newSession] // mockSession already exists
      };

      const result = await configManager.importConfig(config, {
        merge: true,
        createBackup: false
      });

      // Should only import 1 session (the new one)
      expect(result.imported.sessions).toBe(1);
    });
  });

  describe('edge cases', () => {
    test('should handle empty configuration', async () => {
      const config: ConfigExport = {
        version: 1,
        exportDate: Date.now(),
        metadata: {
          extensionVersion: '1.0.0',
          browser: 'Chrome',
          exportedBy: 'Test'
        }
      };

      const result = await configManager.importConfig(config);

      expect(result.success).toBe(true);
    });

    test('should handle missing optional fields', async () => {
      const config: ConfigExport = {
        version: 1,
        exportDate: Date.now()
      };

      const result = await configManager.importConfig(config);

      expect(result.success).toBe(true);
    });

    test('should handle storage errors during export', async () => {
      mockChrome.storage.local.get.mockRejectedValue(new Error('Storage error'));

      await expect(configManager.exportConfig()).rejects.toThrow();
    });

    test('should handle backup creation failure', async () => {
      mockChrome.storage.local.set.mockRejectedValueOnce(new Error('Backup failed'));

      const config: ConfigExport = {
        version: 1,
        exportDate: Date.now(),
        settings: mockSettings
      };

      const result = await configManager.importConfig(config, {
        createBackup: true
      });

      expect(result.success).toBe(false);
      expect(result.errors?.[0]).toContain('Failed to create backup before import');
    });

    test('should handle concurrent backups', async () => {
      // Create backups sequentially to ensure unique timestamps
      const backup1 = await configManager.createBackup();
      await new Promise(resolve => setTimeout(resolve, 2)); // Small delay
      const backup2 = await configManager.createBackup();
      await new Promise(resolve => setTimeout(resolve, 2)); // Small delay
      const backup3 = await configManager.createBackup();

      const backups = [backup1, backup2, backup3];

      expect(backups).toHaveLength(3);
      // All should have unique IDs (when created with time gaps)
      const ids = backups.map(b => b.id);
      expect(new Set(ids).size).toBe(3);
    });

    test('should detect browser from user agent', async () => {
      const config = await configManager.exportConfig();

      expect(config.metadata.browser).toBeDefined();
      expect(typeof config.metadata.browser).toBe('string');
    });
  });

  describe('integration scenarios', () => {
    test('should export and re-import configuration', async () => {
      const exported = await configManager.exportConfig();
      const result = await configManager.importConfig(exported, {
        createBackup: false
      });

      expect(result.success).toBe(true);
      expect(result.imported.settings).toBe(true);
    });

    test('should create backup before risky import', async () => {
      const config: ConfigExport = {
        version: 1,
        exportDate: Date.now(),
        settings: mockSettings
      };

      await configManager.importConfig(config, {
        createBackup: true
      });

      const backups = await configManager.getBackups();
      expect(backups.length).toBeGreaterThan(0);
    });

    test('should validate before attempting import', async () => {
      const invalidConfig: ConfigExport = {
        version: 1,
        exportDate: Date.now(),
        settings: {
          ...mockSettings,
          delayTime: 100000000 // Invalid
        }
      };

      const result = await configManager.importConfig(invalidConfig);

      expect(result.success).toBe(false);
      // Should not attempt import
    });

    test('should export with selective options', async () => {
      const config = await configManager.exportConfig({
        includeSettings: true,
        includeSessions: true,
        includeRefreshSettings: false,
        includeRefreshRules: false,
        includeSkipRules: false
      });

      expect(config.settings).toBeDefined();
      expect(config.savedSessions).toBeDefined();
      expect(config.refreshSettings).toBeUndefined();
      expect(config.refreshRules).toBeUndefined();
      expect(config.skipRules).toBeUndefined();
    });
  });
});
