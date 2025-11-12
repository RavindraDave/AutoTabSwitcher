/**
 * Comprehensive tests for logger.ts
 * Tests diagnostic logging, sanitization, export, and log management
 */

import { jest, describe, test, expect, beforeEach } from '@jest/globals';

const mockChrome = (global as any).chrome;

describe('Logger', () => {
  let log: any;
  let logger: any;
  let getLogs: any;
  let clearLogs: any;
  let exportLogsAsText: any;
  let exportLogsAsJSON: any;
  let getDiagnosticSummary: any;
  let logTabSwitch: any;
  let logModeChange: any;
  let logWindowToggle: any;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Reset chrome mocks
    mockChrome.storage.local.get.mockReset();
    mockChrome.storage.local.set.mockReset();
    mockChrome.storage.local.remove.mockReset();

    // Import fresh module
    const loggerModule = await import('../core/logger.js');
    log = loggerModule.log;
    logger = loggerModule.logger;
    getLogs = loggerModule.getLogs;
    clearLogs = loggerModule.clearLogs;
    exportLogsAsText = loggerModule.exportLogsAsText;
    exportLogsAsJSON = loggerModule.exportLogsAsJSON;
    getDiagnosticSummary = loggerModule.getDiagnosticSummary;
    logTabSwitch = loggerModule.logTabSwitch;
    logModeChange = loggerModule.logModeChange;
    logWindowToggle = loggerModule.logWindowToggle;
  });

  describe('log() function', () => {
    test('should create log entry with all fields', async () => {
      mockChrome.storage.local.get.mockResolvedValue({ diagnosticLogs: [] });
      mockChrome.storage.local.set.mockResolvedValue(undefined);

      await log('INFO', 'TestCategory', 'Test message', { key: 'value' });

      const setCall = mockChrome.storage.local.set.mock.calls[0][0];
      const savedLogs = setCall.diagnosticLogs;

      expect(savedLogs).toHaveLength(1);
      expect(savedLogs[0].level).toBe('INFO');
      expect(savedLogs[0].category).toBe('TestCategory');
      expect(savedLogs[0].message).toBe('Test message');
      expect(savedLogs[0].data).toBeDefined();
      expect(savedLogs[0].timestamp).toBeGreaterThan(0);
    });

    test('should work without data parameter', async () => {
      mockChrome.storage.local.get.mockResolvedValue({ diagnosticLogs: [] });
      mockChrome.storage.local.set.mockResolvedValue(undefined);

      await log('WARN', 'Test', 'Warning message');

      const setCall = mockChrome.storage.local.set.mock.calls[0][0];
      const savedLogs = setCall.diagnosticLogs;

      expect(savedLogs[0]).toMatchObject({
        level: 'WARN',
        category: 'Test',
        message: 'Warning message',
      });
      expect(savedLogs[0].data).toBeUndefined();
    });

    test('should append to existing logs', async () => {
      const existingLogs = [
        {
          timestamp: Date.now() - 1000,
          level: 'INFO',
          category: 'Old',
          message: 'Old log',
        },
      ];

      mockChrome.storage.local.get.mockResolvedValue({ diagnosticLogs: existingLogs });
      mockChrome.storage.local.set.mockResolvedValue(undefined);

      await log('ERROR', 'New', 'New log');

      const setCall = mockChrome.storage.local.set.mock.calls[0][0];
      const savedLogs = setCall.diagnosticLogs;

      expect(savedLogs).toHaveLength(2);
      expect(savedLogs[0].message).toBe('Old log');
      expect(savedLogs[1].message).toBe('New log');
    });

    test('should handle storage errors gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockChrome.storage.local.get.mockRejectedValue(new Error('Storage error'));

      await log('INFO', 'Test', 'Message');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to write log entry:',
        expect.any(Error)
      );
      consoleErrorSpy.mockRestore();
    });
  });

  describe('logger convenience methods', () => {
    test('logger.info() should create INFO log', async () => {
      mockChrome.storage.local.get.mockResolvedValue({ diagnosticLogs: [] });
      mockChrome.storage.local.set.mockResolvedValue(undefined);

      await logger.info('Category', 'Info message', { data: 'value' });

      const savedLogs = mockChrome.storage.local.set.mock.calls[0][0].diagnosticLogs;
      expect(savedLogs[0].level).toBe('INFO');
      expect(savedLogs[0].message).toBe('Info message');
    });

    test('logger.warn() should create WARN log', async () => {
      mockChrome.storage.local.get.mockResolvedValue({ diagnosticLogs: [] });
      mockChrome.storage.local.set.mockResolvedValue(undefined);

      await logger.warn('Category', 'Warning message');

      const savedLogs = mockChrome.storage.local.set.mock.calls[0][0].diagnosticLogs;
      expect(savedLogs[0].level).toBe('WARN');
    });

    test('logger.error() should create ERROR log', async () => {
      mockChrome.storage.local.get.mockResolvedValue({ diagnosticLogs: [] });
      mockChrome.storage.local.set.mockResolvedValue(undefined);

      await logger.error('Category', 'Error message');

      const savedLogs = mockChrome.storage.local.set.mock.calls[0][0].diagnosticLogs;
      expect(savedLogs[0].level).toBe('ERROR');
    });

    test('logger.debug() should create DEBUG log', async () => {
      mockChrome.storage.local.get.mockResolvedValue({ diagnosticLogs: [] });
      mockChrome.storage.local.set.mockResolvedValue(undefined);

      await logger.debug('Category', 'Debug message');

      const savedLogs = mockChrome.storage.local.set.mock.calls[0][0].diagnosticLogs;
      expect(savedLogs[0].level).toBe('DEBUG');
    });
  });

  describe('getLogs()', () => {
    test('should retrieve logs from storage', async () => {
      const mockLogs = [
        { timestamp: 1000, level: 'INFO', category: 'Test', message: 'Test' },
      ];
      mockChrome.storage.local.get.mockResolvedValue({ diagnosticLogs: mockLogs });

      const logs = await getLogs();

      expect(logs).toEqual(mockLogs);
      expect(mockChrome.storage.local.get).toHaveBeenCalledWith('diagnosticLogs');
    });

    test('should return empty array when no logs exist', async () => {
      mockChrome.storage.local.get.mockResolvedValue({});

      const logs = await getLogs();

      expect(logs).toEqual([]);
    });

    test('should handle storage errors', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockChrome.storage.local.get.mockRejectedValue(new Error('Storage error'));

      const logs = await getLogs();

      expect(logs).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('cleanLogs() - age and size limits', () => {
    test('should remove logs older than 30 minutes', async () => {
      const now = Date.now();
      const oldLogs = [
        { timestamp: now - (31 * 60 * 1000), level: 'INFO', category: 'Old', message: 'Too old' },
        { timestamp: now - (29 * 60 * 1000), level: 'INFO', category: 'Recent', message: 'Still valid' },
        { timestamp: now, level: 'INFO', category: 'New', message: 'Brand new' },
      ];

      mockChrome.storage.local.get.mockResolvedValue({ diagnosticLogs: oldLogs });
      mockChrome.storage.local.set.mockResolvedValue(undefined);

      await log('INFO', 'Test', 'New entry');

      const savedLogs = mockChrome.storage.local.set.mock.calls[0][0].diagnosticLogs;

      // Old log should be filtered out
      expect(savedLogs.every((l: any) => l.message !== 'Too old')).toBe(true);
      // Recent logs should remain
      expect(savedLogs.some((l: any) => l.message === 'Still valid')).toBe(true);
      expect(savedLogs.some((l: any) => l.message === 'Brand new')).toBe(true);
    });

    test('should enforce max 500 entries', async () => {
      const now = Date.now();
      // Create 510 entries (over the limit)
      const manyLogs = Array.from({ length: 510 }, (_, i) => ({
        timestamp: now - (i * 1000),
        level: 'INFO' as const,
        category: 'Test',
        message: `Log ${i}`,
      }));

      mockChrome.storage.local.get.mockResolvedValue({ diagnosticLogs: manyLogs });
      mockChrome.storage.local.set.mockResolvedValue(undefined);

      await log('INFO', 'Test', 'New entry');

      const savedLogs = mockChrome.storage.local.set.mock.calls[0][0].diagnosticLogs;

      // Should keep only 500 most recent
      expect(savedLogs.length).toBe(500);
    });
  });

  describe('sanitizeData() - privacy protection', () => {
    test('should redact URL fields', async () => {
      mockChrome.storage.local.get.mockResolvedValue({ diagnosticLogs: [] });
      mockChrome.storage.local.set.mockResolvedValue(undefined);

      await log('INFO', 'Test', 'Message', {
        url: 'https://secret.com',
        pageUrl: 'https://private.com',
        requestUrl: 'https://api.example.com',
      });

      const savedData = mockChrome.storage.local.set.mock.calls[0][0].diagnosticLogs[0].data;
      expect(savedData.url).toBe('[REDACTED]');
      expect(savedData.pageUrl).toBe('[REDACTED]');
      expect(savedData.requestUrl).toBe('[REDACTED]');
    });

    test('should redact title fields', async () => {
      mockChrome.storage.local.get.mockResolvedValue({ diagnosticLogs: [] });
      mockChrome.storage.local.set.mockResolvedValue(undefined);

      await log('INFO', 'Test', 'Message', {
        title: 'Secret Title',
        tabTitle: 'Private Tab',
        windowTitle: 'Confidential',
      });

      const savedData = mockChrome.storage.local.set.mock.calls[0][0].diagnosticLogs[0].data;
      expect(savedData.title).toBe('[REDACTED]');
      expect(savedData.tabTitle).toBe('[REDACTED]');
      expect(savedData.windowTitle).toBe('[REDACTED]');
    });

    test('should redact credential fields', async () => {
      mockChrome.storage.local.get.mockResolvedValue({ diagnosticLogs: [] });
      mockChrome.storage.local.set.mockResolvedValue(undefined);

      await log('INFO', 'Test', 'Message', {
        password: 'secret123',
        token: 'abc123',
        apiKey: 'key123',
        authToken: 'token456',
        secret: 'mysecret',
      });

      const savedData = mockChrome.storage.local.set.mock.calls[0][0].diagnosticLogs[0].data;
      expect(savedData.password).toBe('[REDACTED]');
      expect(savedData.token).toBe('[REDACTED]');
      expect(savedData.apiKey).toBe('[REDACTED]');
      expect(savedData.authToken).toBe('[REDACTED]');
      expect(savedData.secret).toBe('[REDACTED]');
    });

    test('should preserve non-sensitive fields', async () => {
      mockChrome.storage.local.get.mockResolvedValue({ diagnosticLogs: [] });
      mockChrome.storage.local.set.mockResolvedValue(undefined);

      await log('INFO', 'Test', 'Message', {
        windowId: 123,
        tabCount: 5,
        enabled: true,
        mode: 'global',
      });

      const savedData = mockChrome.storage.local.set.mock.calls[0][0].diagnosticLogs[0].data;
      expect(savedData.windowId).toBe(123);
      expect(savedData.tabCount).toBe(5);
      expect(savedData.enabled).toBe(true);
      expect(savedData.mode).toBe('global');
    });

    test('should handle nested objects recursively', async () => {
      mockChrome.storage.local.get.mockResolvedValue({ diagnosticLogs: [] });
      mockChrome.storage.local.set.mockResolvedValue(undefined);

      await log('INFO', 'Test', 'Message', {
        config: {
          url: 'https://secret.com',
          windowId: 100,
        },
      });

      const savedData = mockChrome.storage.local.set.mock.calls[0][0].diagnosticLogs[0].data;
      expect(savedData.config.url).toBe('[REDACTED]');
      expect(savedData.config.windowId).toBe(100);
    });

    test('should handle arrays', async () => {
      mockChrome.storage.local.get.mockResolvedValue({ diagnosticLogs: [] });
      mockChrome.storage.local.set.mockResolvedValue(undefined);

      await log('INFO', 'Test', 'Message', {
        items: [1, 2, 3, 4, 5],
      });

      const savedData = mockChrome.storage.local.set.mock.calls[0][0].diagnosticLogs[0].data;
      expect(savedData.items).toBe('[Array(5)]');
    });
  });

  describe('clearLogs()', () => {
    test('should remove logs from storage', async () => {
      mockChrome.storage.local.remove.mockResolvedValue(undefined);

      await clearLogs();

      expect(mockChrome.storage.local.remove).toHaveBeenCalledWith('diagnosticLogs');
    });

    test('should handle errors', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockChrome.storage.local.remove.mockRejectedValue(new Error('Storage error'));

      await clearLogs();

      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('exportLogsAsText()', () => {
    test('should format logs as text', async () => {
      const mockLogs = [
        {
          timestamp: new Date('2025-01-01T12:00:00Z').getTime(),
          level: 'INFO' as const,
          category: 'Test',
          message: 'Test message',
          data: { key: 'value' },
        },
      ];

      mockChrome.storage.local.get.mockResolvedValue({ diagnosticLogs: mockLogs });

      const text = await exportLogsAsText();

      expect(text).toContain('Auto Tab Switcher - Diagnostic Logs');
      expect(text).toContain('Extension Version:');
      expect(text).toContain('Total Entries: 1');
      expect(text).toContain('[2025-01-01T12:00:00.000Z] [INFO] [Test]');
      expect(text).toContain('Test message');
      expect(text).toContain('"key": "value"');
    });

    test('should handle logs without data', async () => {
      const mockLogs = [
        {
          timestamp: Date.now(),
          level: 'WARN' as const,
          category: 'Test',
          message: 'Warning',
        },
      ];

      mockChrome.storage.local.get.mockResolvedValue({ diagnosticLogs: mockLogs });

      const text = await exportLogsAsText();

      expect(text).toContain('Warning');
      expect(text).not.toContain('Data:');
    });
  });

  describe('exportLogsAsJSON()', () => {
    test('should format logs as JSON', async () => {
      const mockLogs = [
        {
          timestamp: 1000,
          level: 'INFO' as const,
          category: 'Test',
          message: 'Test message',
        },
      ];

      mockChrome.storage.local.get.mockResolvedValue({ diagnosticLogs: mockLogs });

      const json = await exportLogsAsJSON();
      const parsed = JSON.parse(json);

      expect(parsed.metadata.extensionVersion).toBeDefined();
      expect(parsed.metadata.totalEntries).toBe(1);
      expect(parsed.logs).toEqual(mockLogs);
    });
  });

  describe('getDiagnosticSummary()', () => {
    test('should generate summary statistics', async () => {
      const mockLogs = [
        { timestamp: 1000, level: 'INFO' as const, category: 'Cat1', message: 'Msg1' },
        { timestamp: 2000, level: 'ERROR' as const, category: 'Cat2', message: 'Msg2' },
        { timestamp: 3000, level: 'ERROR' as const, category: 'Cat1', message: 'Msg3' },
        { timestamp: 4000, level: 'WARN' as const, category: 'Cat3', message: 'Msg4' },
      ];

      mockChrome.storage.local.get.mockResolvedValue({ diagnosticLogs: mockLogs });

      const summary = await getDiagnosticSummary();

      expect(summary.totalEntries).toBe(4);
      expect(summary.oldestEntry).toBe(1000);
      expect(summary.newestEntry).toBe(4000);
      expect(summary.errorCount).toBe(2);
      expect(summary.warningCount).toBe(1);
      expect(summary.categories).toEqual(['Cat1', 'Cat2', 'Cat3']);
    });

    test('should handle empty logs', async () => {
      mockChrome.storage.local.get.mockResolvedValue({ diagnosticLogs: [] });

      const summary = await getDiagnosticSummary();

      expect(summary.totalEntries).toBe(0);
      expect(summary.oldestEntry).toBeNull();
      expect(summary.newestEntry).toBeNull();
      expect(summary.errorCount).toBe(0);
      expect(summary.warningCount).toBe(0);
      expect(summary.categories).toEqual([]);
    });
  });

  describe('logTabSwitch()', () => {
    test('should log tab switch with all details', async () => {
      mockChrome.storage.local.get.mockResolvedValue({ diagnosticLogs: [] });
      mockChrome.storage.local.set.mockResolvedValue(undefined);

      await logTabSwitch({
        windowId: 100,
        mode: 'window',
        previousTabId: 1,
        newTabId: 2,
        previousTabTitle: 'Old Tab',
        newTabTitle: 'New Tab',
      });

      const savedLogs = mockChrome.storage.local.set.mock.calls[0][0].diagnosticLogs;
      expect(savedLogs[0]).toMatchObject({
        level: 'INFO',
        category: 'TabSwitch',
        message: 'Tab switched',
      });
      expect(savedLogs[0].data.windowId).toBe(100);
      expect(savedLogs[0].data.mode).toBe('window');
      expect(savedLogs[0].data.tabInfo).toBe('Old Tab → New Tab');
    });

    test('should handle missing tab titles', async () => {
      mockChrome.storage.local.get.mockResolvedValue({ diagnosticLogs: [] });
      mockChrome.storage.local.set.mockResolvedValue(undefined);

      await logTabSwitch({
        windowId: 100,
        mode: 'global',
      });

      const savedLogs = mockChrome.storage.local.set.mock.calls[0][0].diagnosticLogs;
      expect(savedLogs[0].data.tabInfo).toBe('Unknown → Unknown');
    });
  });

  describe('logModeChange()', () => {
    test('should log mode change', async () => {
      mockChrome.storage.local.get.mockResolvedValue({ diagnosticLogs: [] });
      mockChrome.storage.local.set.mockResolvedValue(undefined);

      await logModeChange({
        previousMode: 'global',
        newMode: 'window',
      });

      const savedLogs = mockChrome.storage.local.set.mock.calls[0][0].diagnosticLogs;
      expect(savedLogs[0]).toMatchObject({
        level: 'INFO',
        category: 'ModeChange',
        message: 'Operating mode changed from global to window',
      });
      expect(savedLogs[0].data).toMatchObject({
        previousMode: 'global',
        newMode: 'window',
      });
    });
  });

  describe('logWindowToggle()', () => {
    test('should log enable in global mode', async () => {
      mockChrome.storage.local.get.mockResolvedValue({ diagnosticLogs: [] });
      mockChrome.storage.local.set.mockResolvedValue(undefined);

      await logWindowToggle({
        windowId: 100,
        enabled: true,
        mode: 'global',
      });

      const savedLogs = mockChrome.storage.local.set.mock.calls[0][0].diagnosticLogs;
      expect(savedLogs[0]).toMatchObject({
        level: 'INFO',
        category: 'WindowToggle',
        message: 'Auto-switching enabled for all windows',
      });
    });

    test('should log disable in window mode', async () => {
      mockChrome.storage.local.get.mockResolvedValue({ diagnosticLogs: [] });
      mockChrome.storage.local.set.mockResolvedValue(undefined);

      await logWindowToggle({
        windowId: 200,
        enabled: false,
        mode: 'window',
      });

      const savedLogs = mockChrome.storage.local.set.mock.calls[0][0].diagnosticLogs;
      expect(savedLogs[0].message).toBe('Auto-switching disabled for window 200');
    });
  });
});
