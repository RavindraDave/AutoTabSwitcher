/**
 * Comprehensive tests for SessionManager.ts
 * Tests session saving, restoration, deletion, and management
 */

import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import type {
  SavedSession,
  SavedTab,
  SessionTemplate
} from '../../core/types.js';

const mockChrome = (global as any).chrome;

describe('SessionManager', () => {
  let sessionManager: any;
  let SessionManager: any;
  let mockStorage: any; // Shared storage object for state persistence

  // Mock data
  const mockTabs: chrome.tabs.Tab[] = [
    {
      id: 1,
      windowId: 100,
      index: 0,
      url: 'https://example.com',
      title: 'Example',
      favIconUrl: 'https://example.com/favicon.ico',
      pinned: false,
      active: true,
      highlighted: true,
      discarded: false,
      autoDiscardable: true,
      incognito: false,
      selected: false
    },
    {
      id: 2,
      windowId: 100,
      index: 1,
      url: 'https://google.com',
      title: 'Google',
      favIconUrl: 'https://google.com/favicon.ico',
      pinned: true,
      active: false,
      highlighted: false,
      discarded: false,
      autoDiscardable: true,
      incognito: false,
      selected: false
    },
    {
      id: 3,
      windowId: 100,
      index: 2,
      url: 'https://github.com',
      title: 'GitHub',
      favIconUrl: 'https://github.com/favicon.ico',
      pinned: false,
      active: false,
      highlighted: false,
      discarded: false,
      autoDiscardable: true,
      incognito: false,
      selected: false
    }
  ];

  const mockWindow: chrome.windows.Window = {
    id: 100,
    focused: true,
    top: 0,
    left: 0,
    width: 1024,
    height: 768,
    incognito: false,
    type: 'normal',
    state: 'normal',
    alwaysOnTop: false,
    tabs: mockTabs
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    // Reset chrome mocks
    mockChrome.storage.local.get.mockReset();
    mockChrome.storage.local.set.mockReset();
    mockChrome.tabs.query.mockReset();
    mockChrome.tabs.create.mockReset();
    mockChrome.tabs.update.mockReset();
    mockChrome.tabs.remove.mockReset();
    mockChrome.windows.getCurrent.mockReset();
    mockChrome.windows.create.mockReset();
    mockChrome.windows.getAll.mockReset();

    // Create mock storage that persists data between set and get
    mockStorage = {
      premiumEnabled: true,
      licenseKey: 'TEST-LICENSE-KEY',
      savedSessions: [], // Note: storage key is 'savedSessions' not 'sessions'
      autoLaunchSessionIds: []
    };

    // Default mock implementations with state persistence
    mockChrome.storage.local.get.mockImplementation((keys: string | string[] | null) => {
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

    mockChrome.windows.getCurrent.mockResolvedValue(mockWindow);
    mockChrome.tabs.query.mockResolvedValue(mockTabs);

    // Import fresh module
    const module = await import('../../premium/SessionManager.js');
    sessionManager = module.sessionManager;
    SessionManager = module.SessionManager;
  });

  describe('saveCurrentWindow', () => {
    test('should save current window tabs as session', async () => {
      const result = await sessionManager.saveCurrentWindow('Test Session', {
        description: 'Test description',
        icon: '📝'
      });

      expect(result.name).toBe('Test Session');
      expect(result.description).toBe('Test description');
      expect(result.icon).toBe('📝');
      expect(result.tabs).toHaveLength(3);
      expect(result.tabs[0].url).toBe('https://example.com');
      expect(result.tabs[1].url).toBe('https://google.com');
      expect(result.tabs[2].url).toBe('https://github.com');
      expect(mockChrome.storage.local.set).toHaveBeenCalled();
    });

    test('should generate unique session ID', async () => {
      const session1 = await sessionManager.saveCurrentWindow('Session 1');
      const session2 = await sessionManager.saveCurrentWindow('Session 2');

      expect(session1.id).toBeDefined();
      expect(session2.id).toBeDefined();
      expect(session1.id).not.toBe(session2.id);
    });

    test('should include tab metadata by default', async () => {
      const result = await sessionManager.saveCurrentWindow('Test');

      expect(result.tabs[0].title).toBe('Example');
      expect(result.tabs[0].favIconUrl).toBe('https://example.com/favicon.ico');
      expect(result.tabs[1].pinned).toBe(true);
    });

    test('should exclude metadata when saveOptions specified', async () => {
      const result = await sessionManager.saveCurrentWindow('Test', {
        saveOptions: {
          includeTitles: false,
          includeFavicons: false,
          includePinnedState: false
        }
      });

      expect(result.tabs[0].title).toBeUndefined();
      expect(result.tabs[0].favIconUrl).toBeUndefined();
      expect(result.tabs[0].pinned).toBeUndefined();
    });

    test('should save with specific window ID', async () => {
      const specificWindowId = 200;
      mockChrome.tabs.query.mockResolvedValue(mockTabs);

      await sessionManager.saveCurrentWindow('Test', {
        windowId: specificWindowId
      });

      expect(mockChrome.tabs.query).toHaveBeenCalledWith({
        windowId: specificWindowId
      });
    });

    test('should throw error when no tabs in window', async () => {
      mockChrome.tabs.query.mockResolvedValue([]);

      await expect(
        sessionManager.saveCurrentWindow('Empty')
      ).rejects.toThrow('No tabs found in window');
    });

    test('should throw error when too many tabs', async () => {
      const tooManyTabs = Array.from({ length: 201 }, (_, i) => ({
        ...mockTabs[0],
        id: i,
        index: i
      }));
      mockChrome.tabs.query.mockResolvedValue(tooManyTabs);

      await expect(
        sessionManager.saveCurrentWindow('Too Many')
      ).rejects.toThrow('Too many tabs');
    });

    test('should throw error when max sessions reached', async () => {
      const existingSessions = Array.from({ length: 50 }, (_, i) => ({
        id: `session-${i}`,
        name: `Session ${i}`,
        tabs: [],
        createdAt: Date.now(),
        launchCount: 0
      }));

      // Modify shared mockStorage to have 50 sessions
      mockStorage.savedSessions = existingSessions;

      await expect(
        sessionManager.saveCurrentWindow('Overflow')
      ).rejects.toThrow('Maximum number of sessions');
    });

    test('should set createdAt timestamp', async () => {
      const beforeTime = Date.now();
      const result = await sessionManager.saveCurrentWindow('Test');
      const afterTime = Date.now();

      expect(result.createdAt).toBeGreaterThanOrEqual(beforeTime);
      expect(result.createdAt).toBeLessThanOrEqual(afterTime);
    });

    test('should initialize launchCount to 0', async () => {
      const result = await sessionManager.saveCurrentWindow('Test');

      expect(result.launchCount).toBe(0);
    });

    test('should require premium license', async () => {
      mockChrome.storage.local.get.mockResolvedValue({
        premiumEnabled: false
      });

      await expect(
        sessionManager.saveCurrentWindow('Test')
      ).rejects.toThrow();
    });
  });

  describe('saveAllWindows', () => {
    test('should save all windows as separate sessions', async () => {
      const windows = [
        { ...mockWindow, id: 100, tabs: mockTabs.slice(0, 2) },
        { ...mockWindow, id: 101, tabs: mockTabs.slice(2, 3) }
      ];

      mockChrome.windows.getAll.mockResolvedValue(windows);
      mockChrome.tabs.query
        .mockResolvedValueOnce(windows[0].tabs)
        .mockResolvedValueOnce(windows[1].tabs);

      const results = await sessionManager.saveAllWindows('Window');

      expect(results).toHaveLength(2);
      expect(results[0].name).toBe('Window 1');
      expect(results[1].name).toBe('Window 2');
    });

    test('should skip windows without tabs', async () => {
      const windows = [
        { ...mockWindow, id: 100, tabs: mockTabs },
        { ...mockWindow, id: 101, tabs: [] }
      ];

      mockChrome.windows.getAll.mockResolvedValue(windows);
      mockChrome.tabs.query.mockResolvedValue(mockTabs);

      const results = await sessionManager.saveAllWindows();

      expect(results).toHaveLength(1);
    });

    test('should use custom name prefix', async () => {
      mockChrome.windows.getAll.mockResolvedValue([mockWindow]);
      mockChrome.tabs.query.mockResolvedValue(mockTabs);

      const results = await sessionManager.saveAllWindows('MyWindow');

      expect(results[0].name).toBe('MyWindow 1');
    });
  });

  describe('restoreSession', () => {
    let mockSession: SavedSession;

    beforeEach(() => {
      mockSession = {
        id: 'test-session-123',
        name: 'Test Session',
        tabs: [
          { url: 'https://example.com', title: 'Example', index: 0 },
          { url: 'https://google.com', title: 'Google', index: 1, pinned: true },
          { url: 'https://github.com', title: 'GitHub', index: 2 }
        ],
        createdAt: Date.now(),
        launchCount: 0
      };

      // Add mockSession to shared mockStorage
      mockStorage.savedSessions = [mockSession];

      mockChrome.windows.create.mockResolvedValue({
        id: 200,
        tabs: [{ id: 10 }]
      });

      mockChrome.tabs.create.mockImplementation((options) => {
        return Promise.resolve({ id: Math.floor(Math.random() * 1000) });
      });
    });

    test('should restore session in new window', async () => {
      await sessionManager.restoreSession('test-session-123', 'new-window');

      expect(mockChrome.windows.create).toHaveBeenCalledWith({
        url: 'https://example.com',
        focused: true
      });

      expect(mockChrome.tabs.create).toHaveBeenCalledTimes(2); // Remaining tabs
    });

    test('should restore session in current window', async () => {
      await sessionManager.restoreSession('test-session-123', 'current');

      expect(mockChrome.windows.create).not.toHaveBeenCalled();
      expect(mockChrome.tabs.create).toHaveBeenCalledTimes(3);
    });

    test('should replace current window tabs', async () => {
      mockChrome.tabs.query.mockResolvedValue([
        { id: 1, windowId: 100 },
        { id: 2, windowId: 100 }
      ]);

      await sessionManager.restoreSession('test-session-123', 'replace');

      expect(mockChrome.tabs.remove).toHaveBeenCalledTimes(2);
      expect(mockChrome.tabs.create).toHaveBeenCalledTimes(3);
    });

    test('should throw error if session not found', async () => {
      await expect(
        sessionManager.restoreSession('nonexistent', 'new-window')
      ).rejects.toThrow('Session not found');
    });

    test('should throw error if session has no tabs', async () => {
      mockSession.tabs = [];
      mockChrome.storage.local.get.mockResolvedValue({
        savedSessions: [mockSession],
        premiumEnabled: true,
        licenseKey: 'TEST-KEY'
      });

      await expect(
        sessionManager.restoreSession('test-session-123', 'new-window')
      ).rejects.toThrow('Session has no tabs to restore');
    });

    test('should update session statistics', async () => {
      const beforeLaunch = Date.now();
      await sessionManager.restoreSession('test-session-123', 'new-window');
      const afterLaunch = Date.now();

      const savedSession = mockChrome.storage.local.set.mock.calls.find((call: any) =>
        call[0]?.savedSessions?.[0]?.id === 'test-session-123'
      )?.[0]?.savedSessions?.[0];

      expect(savedSession.launchCount).toBe(1);
      expect(savedSession.lastLaunched).toBeGreaterThanOrEqual(beforeLaunch);
      expect(savedSession.lastLaunched).toBeLessThanOrEqual(afterLaunch);
    });

    test('should pin tabs correctly in new window', async () => {
      await sessionManager.restoreSession('test-session-123', 'new-window');

      // First tab pinning (if needed)
      const updateCalls = mockChrome.tabs.update.mock.calls;
      const createCalls = mockChrome.tabs.create.mock.calls;

      // Second tab should be created with pinned: true
      expect(createCalls.some((call: any) =>
        call[0].url === 'https://google.com' && call[0].pinned === true
      )).toBe(true);
    });

    test('should maintain tab order', async () => {
      await sessionManager.restoreSession('test-session-123', 'new-window');

      const createCalls = mockChrome.tabs.create.mock.calls;

      // Tabs should be created in order
      expect(createCalls[0][0].url).toBe('https://google.com');
      expect(createCalls[1][0].url).toBe('https://github.com');
    });

    test('should default to new-window mode', async () => {
      await sessionManager.restoreSession('test-session-123');

      expect(mockChrome.windows.create).toHaveBeenCalled();
    });

    test('should require premium license', async () => {
      mockChrome.storage.local.get.mockResolvedValue({
        premiumEnabled: false
      });

      await expect(
        sessionManager.restoreSession('test-session-123')
      ).rejects.toThrow();
    });
  });

  describe('deleteSession', () => {
    test('should delete session from storage', async () => {
      const mockSession: SavedSession = {
        id: 'session-to-delete',
        name: 'Delete Me',
        tabs: [],
        createdAt: Date.now(),
        launchCount: 0
      };

      mockChrome.storage.local.get.mockResolvedValue({
        savedSessions: [mockSession],
        autoLaunchSessionIds: [],
        premiumEnabled: true,
        licenseKey: 'TEST-KEY'
      });

      await sessionManager.deleteSession('session-to-delete');

      expect(mockChrome.storage.local.set).toHaveBeenCalled();
    });

    test('should remove from auto-launch list', async () => {
      mockStorage.autoLaunchSessionIds = ['session-1', 'session-2'];
      mockStorage.savedSessions = [{ id: 'session-1', name: 'S1', tabs: [], createdAt: 0, launchCount: 0 }];

      await sessionManager.deleteSession('session-1');

      const autoLaunchCall = mockChrome.storage.local.set.mock.calls.find((call: any) =>
        call[0].hasOwnProperty('autoLaunchSessionIds')
      );

      expect(autoLaunchCall).toBeDefined();
      expect(autoLaunchCall[0].autoLaunchSessionIds).toEqual(['session-2']);
    });

    test('should require premium license', async () => {
      mockChrome.storage.local.get.mockResolvedValue({
        premiumEnabled: false
      });

      await expect(
        sessionManager.deleteSession('test-id')
      ).rejects.toThrow();
    });
  });

  describe('getAllSessions', () => {
    test('should return all saved sessions', async () => {
      const mockSessions: SavedSession[] = [
        { id: '1', name: 'S1', tabs: [], createdAt: 1, launchCount: 0 },
        { id: '2', name: 'S2', tabs: [], createdAt: 2, launchCount: 0 }
      ];

      // Set sessions in shared mockStorage
      mockStorage.savedSessions = mockSessions;

      const result = await sessionManager.getAllSessions();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('1');
      expect(result[1].id).toBe('2');
    });

    test('should return empty array when no sessions', async () => {
      mockChrome.storage.local.get.mockResolvedValue({
        savedSessions: [],
        premiumEnabled: true,
        licenseKey: 'TEST-KEY'
      });

      const result = await sessionManager.getAllSessions();

      expect(result).toEqual([]);
    });
  });

  describe('getSession', () => {
    test('should return specific session by ID', async () => {
      const mockSessions: SavedSession[] = [
        { id: 'session-1', name: 'S1', tabs: [], createdAt: 1, launchCount: 0 },
        { id: 'session-2', name: 'S2', tabs: [], createdAt: 2, launchCount: 0 }
      ];

      // Set sessions in shared mockStorage
      mockStorage.savedSessions = mockSessions;

      const result = await sessionManager.getSession('session-2');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('session-2');
      expect(result?.name).toBe('S2');
    });

    test('should return null if session not found', async () => {
      mockChrome.storage.local.get.mockResolvedValue({
        savedSessions: [],
        premiumEnabled: true,
        licenseKey: 'TEST-KEY'
      });

      const result = await sessionManager.getSession('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('updateSession', () => {
    test('should update session name', async () => {
      const mockSession: SavedSession = {
        id: 'session-1',
        name: 'Old Name',
        tabs: [],
        createdAt: Date.now(),
        launchCount: 0
      };

      mockStorage.savedSessions = [mockSession];

      await sessionManager.updateSession('session-1', { name: 'New Name' });

      const setCall = mockChrome.storage.local.set.mock.calls[0][0];
      expect(setCall.savedSessions[0].name).toBe('New Name');
    });

    test('should update multiple fields', async () => {
      const mockSession: SavedSession = {
        id: 'session-1',
        name: 'Test',
        tabs: [],
        createdAt: Date.now(),
        launchCount: 0
      };

      mockStorage.savedSessions = [mockSession];

      await sessionManager.updateSession('session-1', {
        name: 'Updated',
        description: 'New desc',
        icon: '🔥'
      });

      const setCall = mockChrome.storage.local.set.mock.calls[0][0];
      expect(setCall.savedSessions[0].name).toBe('Updated');
      expect(setCall.savedSessions[0].description).toBe('New desc');
      expect(setCall.savedSessions[0].icon).toBe('🔥');
    });

    test('should set updatedAt timestamp', async () => {
      const mockSession: SavedSession = {
        id: 'session-1',
        name: 'Test',
        tabs: [],
        createdAt: Date.now(),
        launchCount: 0
      };

      mockStorage.savedSessions = [mockSession];

      const beforeUpdate = Date.now();
      await sessionManager.updateSession('session-1', { name: 'Updated' });
      const afterUpdate = Date.now();

      const setCall = mockChrome.storage.local.set.mock.calls[0][0];
      expect(setCall.savedSessions[0].updatedAt).toBeGreaterThanOrEqual(beforeUpdate);
      expect(setCall.savedSessions[0].updatedAt).toBeLessThanOrEqual(afterUpdate);
    });

    test('should throw error if session not found', async () => {
      mockChrome.storage.local.get.mockResolvedValue({
        savedSessions: [],
        premiumEnabled: true,
        licenseKey: 'TEST-KEY'
      });

      await expect(
        sessionManager.updateSession('nonexistent', { name: 'Test' })
      ).rejects.toThrow('Session not found');
    });
  });

  describe('auto-launch sessions', () => {
    test('should set auto-launch sessions', async () => {
      const mockSessions: SavedSession[] = [
        { id: 'session-1', name: 'S1', tabs: [], createdAt: 1, launchCount: 0 },
        { id: 'session-2', name: 'S2', tabs: [], createdAt: 2, launchCount: 0 }
      ];

      mockChrome.storage.local.get.mockImplementation((keys) => {
        if (keys === 'savedSessions') {
          return Promise.resolve({ savedSessions: mockSessions });
        }
        return Promise.resolve({
          premiumEnabled: true,
          licenseKey: 'TEST-KEY'
        });
      });

      await sessionManager.setAutoLaunchSessions(['session-1', 'session-2']);

      expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
        autoLaunchSessionIds: ['session-1', 'session-2']
      });
    });

    test('should throw error for invalid session IDs', async () => {
      mockChrome.storage.local.get.mockImplementation((keys) => {
        if (keys === 'savedSessions') {
          return Promise.resolve({ savedSessions: [
            { id: 'session-1', name: 'S1', tabs: [], createdAt: 1, launchCount: 0 }
          ]});
        }
        return Promise.resolve({
          premiumEnabled: true,
          licenseKey: 'TEST-KEY'
        });
      });

      await expect(
        sessionManager.setAutoLaunchSessions(['session-1', 'invalid-id'])
      ).rejects.toThrow('Invalid session IDs');
    });

    test('should get auto-launch sessions', async () => {
      const mockSessions: SavedSession[] = [
        { id: 'session-1', name: 'S1', tabs: [], createdAt: 1, launchCount: 0 },
        { id: 'session-2', name: 'S2', tabs: [], createdAt: 2, launchCount: 0 },
        { id: 'session-3', name: 'S3', tabs: [], createdAt: 3, launchCount: 0 }
      ];

      mockChrome.storage.local.get.mockImplementation((keys) => {
        if (keys === 'autoLaunchSessionIds') {
          return Promise.resolve({ autoLaunchSessionIds: ['session-1', 'session-3'] });
        }
        if (keys === 'savedSessions') {
          return Promise.resolve({ savedSessions: mockSessions });
        }
        return Promise.resolve({
          premiumEnabled: true,
          licenseKey: 'TEST-KEY'
        });
      });

      const result = await sessionManager.getAutoLaunchSessions();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('session-1');
      expect(result[1].id).toBe('session-3');
    });

    test('should launch auto-start sessions', async () => {
      const mockSessions: SavedSession[] = [
        {
          id: 'session-1',
          name: 'S1',
          tabs: [{ url: 'https://example.com', index: 0 }],
          createdAt: 1,
          launchCount: 0
        }
      ];

      mockChrome.storage.local.get.mockImplementation((keys) => {
        if (keys === 'autoLaunchSessionIds') {
          return Promise.resolve({ autoLaunchSessionIds: ['session-1'] });
        }
        if (keys === 'savedSessions' || (Array.isArray(keys) && keys.includes('savedSessions'))) {
          return Promise.resolve({ savedSessions: mockSessions });
        }
        return Promise.resolve({
          premiumEnabled: true,
          licenseKey: 'TEST-KEY'
        });
      });

      mockChrome.windows.create.mockResolvedValue({ id: 200, tabs: [{ id: 10 }] });

      await sessionManager.launchAutoStartSessions();

      expect(mockChrome.windows.create).toHaveBeenCalled();
    });

    test('should use custom launch mode', async () => {
      const mockSessions: SavedSession[] = [
        {
          id: 'session-1',
          name: 'S1',
          tabs: [{ url: 'https://example.com', index: 0 }],
          createdAt: 1,
          launchCount: 0,
          launchMode: 'current'
        }
      ];

      mockChrome.storage.local.get.mockImplementation((keys) => {
        if (keys === 'autoLaunchSessionIds') {
          return Promise.resolve({ autoLaunchSessionIds: ['session-1'] });
        }
        if (keys === 'savedSessions' || (Array.isArray(keys) && keys.includes('savedSessions'))) {
          return Promise.resolve({ savedSessions: mockSessions });
        }
        return Promise.resolve({
          premiumEnabled: true,
          licenseKey: 'TEST-KEY'
        });
      });

      await sessionManager.launchAutoStartSessions();

      // Should use current window mode, not create new window
      expect(mockChrome.windows.create).not.toHaveBeenCalled();
      expect(mockChrome.tabs.create).toHaveBeenCalled();
    });

    test('should handle no auto-launch sessions', async () => {
      mockChrome.storage.local.get.mockImplementation((keys) => {
        if (keys === 'autoLaunchSessionIds') {
          return Promise.resolve({ autoLaunchSessionIds: [] });
        }
        return Promise.resolve({
          premiumEnabled: true,
          licenseKey: 'TEST-KEY',
          savedSessions: []
        });
      });

      await sessionManager.launchAutoStartSessions();

      expect(mockChrome.windows.create).not.toHaveBeenCalled();
      expect(mockChrome.tabs.create).not.toHaveBeenCalled();
    });
  });

  describe('templates', () => {
    test('should return built-in templates', () => {
      const templates = sessionManager.getTemplates();

      expect(templates.length).toBeGreaterThan(0);
      expect(templates[0]).toHaveProperty('id');
      expect(templates[0]).toHaveProperty('name');
      expect(templates[0]).toHaveProperty('tabs');
    });

    test('should have development template', () => {
      const templates = sessionManager.getTemplates();
      const devTemplate = templates.find((t: SessionTemplate) =>
        t.category === 'developer'
      );

      expect(devTemplate).toBeDefined();
      expect(devTemplate.tabs.length).toBeGreaterThan(0);
    });

    test('should create session from template', async () => {
      const templates = sessionManager.getTemplates();
      const template = templates[0];

      const result = await sessionManager.createFromTemplate(template);

      expect(result.name).toBe(template.name);
      expect(result.description).toBe(template.description);
      expect(result.icon).toBe(template.icon);
      expect(result.tabs).toHaveLength(template.tabs.length);
    });

    test('should create session from template with custom name', async () => {
      const templates = sessionManager.getTemplates();
      const template = templates[0];

      const result = await sessionManager.createFromTemplate(template, 'Custom Name');

      expect(result.name).toBe('Custom Name');
    });
  });

  describe('duplicateSession', () => {
    test('should duplicate session', async () => {
      const mockSession: SavedSession = {
        id: 'original',
        name: 'Original',
        description: 'Original desc',
        icon: '📝',
        tabs: [{ url: 'https://example.com', index: 0 }],
        createdAt: 1000,
        launchCount: 5,
        lastLaunched: 2000,
        autoLaunchOnStartup: true
      };

      mockChrome.storage.local.get.mockImplementation((keys) => {
        if (keys === 'savedSessions') {
          return Promise.resolve({ savedSessions: [mockSession] });
        }
        return Promise.resolve({
          premiumEnabled: true,
          licenseKey: 'TEST-KEY'
        });
      });

      const result = await sessionManager.duplicateSession('original');

      expect(result.id).not.toBe('original');
      expect(result.name).toBe('Original (Copy)');
      expect(result.description).toBe('Original desc');
      expect(result.icon).toBe('📝');
      expect(result.tabs).toEqual(mockSession.tabs);
      expect(result.launchCount).toBe(0);
      expect(result.lastLaunched).toBeUndefined();
      expect(result.autoLaunchOnStartup).toBe(false);
    });

    test('should duplicate with custom name', async () => {
      const mockSession: SavedSession = {
        id: 'original',
        name: 'Original',
        tabs: [],
        createdAt: 1000,
        launchCount: 0
      };

      mockChrome.storage.local.get.mockImplementation((keys) => {
        if (keys === 'savedSessions') {
          return Promise.resolve({ savedSessions: [mockSession] });
        }
        return Promise.resolve({
          premiumEnabled: true,
          licenseKey: 'TEST-KEY'
        });
      });

      const result = await sessionManager.duplicateSession('original', 'My Copy');

      expect(result.name).toBe('My Copy');
    });

    test('should throw error if original not found', async () => {
      mockChrome.storage.local.get.mockResolvedValue({
        savedSessions: [],
        premiumEnabled: true,
        licenseKey: 'TEST-KEY'
      });

      await expect(
        sessionManager.duplicateSession('nonexistent')
      ).rejects.toThrow('Session not found');
    });
  });

  describe('edge cases', () => {
    test('should handle tabs without URLs', async () => {
      const tabsWithoutUrls = [
        { ...mockTabs[0], url: undefined },
        { ...mockTabs[1], url: 'https://example.com' } // Add valid tab
      ];

      mockChrome.tabs.query.mockResolvedValue(tabsWithoutUrls);

      const result = await sessionManager.saveCurrentWindow('Test');

      // Tabs without URLs are skipped, should only save the valid tab
      expect(result.tabs).toHaveLength(1);
      expect(result.tabs[0].url).toBe('https://example.com');
    });

    test('should handle chrome:// URLs', async () => {
      const chromeTabs = [
        { ...mockTabs[0], url: 'chrome://extensions' },
        { ...mockTabs[1], url: 'https://example.com' } // Add valid tab
      ];

      mockChrome.tabs.query.mockResolvedValue(chromeTabs);

      const result = await sessionManager.saveCurrentWindow('Test');

      // chrome:// URLs are skipped, should only save the valid tab
      expect(result.tabs).toHaveLength(1);
      expect(result.tabs[0].url).toBe('https://example.com');
    });

    test('should handle concurrent session saves', async () => {
      const promises = [
        sessionManager.saveCurrentWindow('Session 1'),
        sessionManager.saveCurrentWindow('Session 2'),
        sessionManager.saveCurrentWindow('Session 3')
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      expect(new Set(results.map(r => r.id)).size).toBe(3); // All unique IDs
    });

    test('should handle storage errors gracefully', async () => {
      mockChrome.storage.local.set.mockRejectedValue(new Error('Storage full'));

      await expect(
        sessionManager.saveCurrentWindow('Test')
      ).rejects.toThrow('Storage full');
    });

    test('should skip chrome:// URLs when saving', async () => {
      const chromeTabs = [
        { ...mockTabs[0], url: 'https://example.com' },
        { ...mockTabs[1], url: 'chrome://extensions' },
        { ...mockTabs[2], url: 'https://github.com' }
      ];

      mockChrome.tabs.query.mockResolvedValue(chromeTabs);

      const result = await sessionManager.saveCurrentWindow('Test');

      expect(result.tabs).toHaveLength(2); // Should skip chrome:// URL
      expect(result.tabs[0].url).toBe('https://example.com');
      expect(result.tabs[1].url).toBe('https://github.com');
    });

    test('should skip chrome-extension:// URLs when saving', async () => {
      const extensionTabs = [
        { ...mockTabs[0], url: 'https://example.com' },
        { ...mockTabs[1], url: 'chrome-extension://abcdef/popup.html' },
        { ...mockTabs[2], url: 'https://github.com' }
      ];

      mockChrome.tabs.query.mockResolvedValue(extensionTabs);

      const result = await sessionManager.saveCurrentWindow('Test');

      expect(result.tabs).toHaveLength(2);
      expect(result.tabs.every(tab => !tab.url.startsWith('chrome-extension://'))).toBe(true);
    });

    test('should throw error when all tabs are non-restorable', async () => {
      const chromeTabs = [
        { ...mockTabs[0], url: 'chrome://extensions' },
        { ...mockTabs[1], url: 'chrome://settings' }
      ];

      mockChrome.tabs.query.mockResolvedValue(chromeTabs);

      await expect(
        sessionManager.saveCurrentWindow('Test')
      ).rejects.toThrow('No restorable tabs found in window');
    });

    test('should throw error when window ID is undefined', async () => {
      mockChrome.windows.getCurrent.mockResolvedValue({ id: undefined });

      await expect(
        sessionManager.saveCurrentWindow('Test')
      ).rejects.toThrow('No window ID available');
    });
  });

  describe('retry logic', () => {
    test('should retry failed operations', async () => {
      const mockSession: SavedSession = {
        id: 'test-session',
        name: 'Test',
        tabs: [
          { url: 'https://example.com', index: 0 },
          { url: 'https://test.com', index: 1 } // Need at least 2 tabs for tabs.create to be called
        ],
        createdAt: Date.now(),
        launchCount: 0
      };

      mockChrome.storage.local.get.mockImplementation((keys) => {
        if (keys === 'savedSessions' || (Array.isArray(keys) && keys.includes('savedSessions'))) {
          return Promise.resolve({ savedSessions: [mockSession] });
        }
        return Promise.resolve({
          premiumEnabled: true,
          licenseKey: 'TEST-KEY'
        });
      });

      mockChrome.windows.create.mockResolvedValue({ id: 200, tabs: [{ id: 10 }] });
      mockChrome.windows.get.mockResolvedValue({ id: 200 });

      // First call fails with retryable error, second succeeds
      let callCount = 0;
      mockChrome.tabs.create.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new Error('Network error - temporarily unavailable'));
        }
        return Promise.resolve({ id: Math.floor(Math.random() * 1000) });
      });

      await sessionManager.restoreSession('test-session', 'new-window');

      // Should have retried (called twice for the second tab)
      expect(mockChrome.tabs.create).toHaveBeenCalledTimes(2);
    });

    test('should not retry non-retryable errors', async () => {
      const mockSession: SavedSession = {
        id: 'test-session',
        name: 'Test',
        tabs: [
          { url: 'https://example.com', index: 0 },
          { url: 'https://test.com', index: 1 } // Need at least 2 tabs for tabs.create to be called
        ],
        createdAt: Date.now(),
        launchCount: 0
      };

      mockChrome.storage.local.get.mockImplementation((keys) => {
        if (keys === 'savedSessions' || (Array.isArray(keys) && keys.includes('savedSessions'))) {
          return Promise.resolve({ savedSessions: [mockSession] });
        }
        return Promise.resolve({
          premiumEnabled: true,
          licenseKey: 'TEST-KEY'
        });
      });

      mockChrome.windows.create.mockResolvedValue({ id: 200, tabs: [{ id: 10 }] });
      mockChrome.windows.get.mockResolvedValue({ id: 200 });

      // Fail with non-retryable error
      mockChrome.tabs.create.mockRejectedValue(new Error('Invalid argument'));

      await sessionManager.restoreSession('test-session', 'new-window');

      // Should be called once for the second tab (non-retryable errors don't retry)
      expect(mockChrome.tabs.create).toHaveBeenCalledTimes(1);
    });

    test('should identify retryable errors', async () => {
      const sessionMgr = new SessionManager();
      const retryableErrors = [
        new Error('Network error occurred'),
        new Error('Operation timeout'),
        new Error('Temporarily unavailable'),
        new Error('Quota exceeded'),
        new Error('Rate limit reached')
      ];

      for (const error of retryableErrors) {
        const isRetryable = (sessionMgr as any).isRetryableError(error);
        expect(isRetryable).toBe(true);
      }
    });

    test('should identify non-retryable errors', async () => {
      const sessionMgr = new SessionManager();
      const nonRetryableErrors = [
        new Error('Invalid argument'),
        new Error('Permission denied'),
        new Error('Not found')
      ];

      for (const error of nonRetryableErrors) {
        const isRetryable = (sessionMgr as any).isRetryableError(error);
        expect(isRetryable).toBe(false);
      }
    });

    test('should use exponential backoff for retries', async () => {
      const sessionMgr = new SessionManager();
      const delays: number[] = [];
      const originalSetTimeout = global.setTimeout;

      // Mock setTimeout to capture delay values
      (global as any).setTimeout = jest.fn((callback: any, delay: number) => {
        delays.push(delay);
        return originalSetTimeout(callback, 0); // Execute immediately for test
      });

      let attempt = 0;
      const operation = async () => {
        attempt++;
        if (attempt < 3) {
          throw new Error('Network error');
        }
        return 'success';
      };

      await (sessionMgr as any).retryOperation(operation, 3, 100);

      // Should have delays: 100ms, 200ms
      expect(delays.length).toBeGreaterThanOrEqual(2);
      expect(delays[0]).toBe(100);
      expect(delays[1]).toBe(200);

      // Restore original setTimeout
      (global as any).setTimeout = originalSetTimeout;
    });
  });

  describe('restore error handling', () => {
    let mockSession: SavedSession;

    beforeEach(() => {
      mockSession = {
        id: 'test-session',
        name: 'Test',
        tabs: [
          { url: 'https://example.com', index: 0 },
          { url: 'https://google.com', index: 1 }
        ],
        createdAt: Date.now(),
        launchCount: 0
      };

      mockChrome.storage.local.get.mockImplementation((keys) => {
        if (keys === 'savedSessions' || (Array.isArray(keys) && keys.includes('savedSessions'))) {
          return Promise.resolve({ savedSessions: [mockSession] });
        }
        return Promise.resolve({
          premiumEnabled: true,
          licenseKey: 'TEST-KEY'
        });
      });
    });

    test('should handle window.get failure during restore', async () => {
      mockChrome.windows.create.mockResolvedValue({ id: 200, tabs: [{ id: 10 }] });

      // Simulate window being closed
      mockChrome.windows.get.mockRejectedValue(new Error('Window not found'));

      await sessionManager.restoreSession('test-session', 'new-window');

      // Should still update session stats despite error
      expect(mockChrome.storage.local.set).toHaveBeenCalled();
    });

    test('should handle window.get failure in current window mode', async () => {
      mockChrome.windows.getCurrent.mockResolvedValue({ id: 100 });

      // First call succeeds, subsequent calls fail
      let callCount = 0;
      mockChrome.windows.get.mockImplementation(() => {
        callCount++;
        if (callCount > 1) {
          return Promise.reject(new Error('Window closed'));
        }
        return Promise.resolve({ id: 100 });
      });

      await sessionManager.restoreSession('test-session', 'current');

      // Should have attempted to verify window
      expect(mockChrome.windows.get).toHaveBeenCalled();
    });

    test('should handle tab.get failure during replace', async () => {
      mockChrome.windows.getCurrent.mockResolvedValue({ id: 100 });
      mockChrome.tabs.query.mockResolvedValue([
        { id: 1, windowId: 100 },
        { id: 2, windowId: 100 }
      ]);
      mockChrome.windows.get.mockResolvedValue({ id: 100 });
      mockChrome.tabs.create.mockResolvedValue({ id: 3 });

      // First tab.get succeeds, second fails (tab already closed)
      let getCallCount = 0;
      mockChrome.tabs.get.mockImplementation(() => {
        getCallCount++;
        if (getCallCount > 1) {
          return Promise.reject(new Error('Tab not found'));
        }
        return Promise.resolve({ id: 1 });
      });

      await sessionManager.restoreSession('test-session', 'replace');

      // Should have attempted to verify tabs before removing
      expect(mockChrome.tabs.get).toHaveBeenCalled();
      expect(mockChrome.tabs.remove).toHaveBeenCalled();
    });

    test('should handle missing first tab during new window restore', async () => {
      mockSession.tabs = [];

      mockChrome.windows.create.mockResolvedValue({ id: 200, tabs: [{ id: 10 }] });

      await expect(
        sessionManager.restoreSession('test-session', 'new-window')
      ).rejects.toThrow('Session has no tabs to restore');
    });

    test('should handle window.create failure', async () => {
      mockChrome.windows.create.mockRejectedValue(new Error('Failed to create window'));

      await expect(
        sessionManager.restoreSession('test-session', 'new-window')
      ).rejects.toThrow();
    });

    test('should handle no current window in current mode', async () => {
      mockChrome.windows.getCurrent.mockResolvedValue({ id: undefined });

      await expect(
        sessionManager.restoreSession('test-session', 'current')
      ).rejects.toThrow('No current window');
    });

    test('should handle no current window in replace mode', async () => {
      mockChrome.windows.getCurrent.mockResolvedValue({ id: undefined });

      await expect(
        sessionManager.restoreSession('test-session', 'replace')
      ).rejects.toThrow('No current window');
    });

    test('should handle pin tab failure gracefully', async () => {
      mockSession.tabs[0].pinned = true;

      mockChrome.windows.create.mockResolvedValue({
        id: 200,
        tabs: [{ id: 10 }]
      });
      mockChrome.windows.get.mockResolvedValue({ id: 200 });
      mockChrome.tabs.create.mockResolvedValue({ id: 11 });
      mockChrome.tabs.update.mockRejectedValue(new Error('Cannot pin tab'));

      // Should not throw error
      await expect(
        sessionManager.restoreSession('test-session', 'new-window')
      ).resolves.not.toThrow();
    });
  });

  describe('saveAllWindows error handling', () => {
    test('should continue with other windows when one fails', async () => {
      const windows = [
        { ...mockWindow, id: 100, tabs: mockTabs.slice(0, 2) },
        { ...mockWindow, id: 101, tabs: mockTabs.slice(2, 3) },
        { ...mockWindow, id: 102, tabs: [mockTabs[0]] }
      ];

      mockChrome.windows.getAll.mockResolvedValue(windows);

      // Make second window fail
      mockChrome.tabs.query
        .mockResolvedValueOnce(windows[0].tabs)
        .mockRejectedValueOnce(new Error('Failed to query tabs'))
        .mockResolvedValueOnce(windows[2].tabs);

      const results = await sessionManager.saveAllWindows('Window');

      // Should have saved 2 out of 3 windows
      expect(results).toHaveLength(2);
      expect(results[0].name).toBe('Window 1');
      expect(results[1].name).toBe('Window 3');
    });

    test('should skip windows without ID', async () => {
      const windows = [
        { ...mockWindow, id: 100, tabs: mockTabs },
        { ...mockWindow, id: undefined, tabs: mockTabs }
      ];

      mockChrome.windows.getAll.mockResolvedValue(windows);
      mockChrome.tabs.query.mockResolvedValue(mockTabs);

      const results = await sessionManager.saveAllWindows();

      expect(results).toHaveLength(1);
    });

    test('should skip windows without tabs property', async () => {
      const windows = [
        { ...mockWindow, id: 100, tabs: mockTabs },
        { ...mockWindow, id: 101, tabs: undefined }
      ];

      mockChrome.windows.getAll.mockResolvedValue(windows);
      mockChrome.tabs.query.mockResolvedValue(mockTabs);

      const results = await sessionManager.saveAllWindows();

      expect(results).toHaveLength(1);
    });
  });
});
