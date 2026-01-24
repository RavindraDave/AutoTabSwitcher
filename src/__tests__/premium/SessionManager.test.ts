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

    // Default mock implementations
    mockChrome.storage.local.get.mockImplementation((keys: string | string[] | null) => {
      return Promise.resolve({
        premiumEnabled: true,
        licenseKey: 'TEST-LICENSE-KEY',
        sessions: [],
        autoLaunchSessionIds: []
      });
    });

    mockChrome.storage.local.set.mockResolvedValue(undefined);
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

      mockChrome.storage.local.get.mockImplementation((keys) => {
        if (keys === 'sessions' || (Array.isArray(keys) && keys.includes('sessions'))) {
          return Promise.resolve({ sessions: existingSessions });
        }
        return Promise.resolve({
          premiumEnabled: true,
          licenseKey: 'TEST-KEY'
        });
      });

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

      mockChrome.storage.local.get.mockImplementation((keys) => {
        if (keys === 'sessions' || (Array.isArray(keys) && keys.includes('sessions'))) {
          return Promise.resolve({ sessions: [mockSession] });
        }
        return Promise.resolve({
          premiumEnabled: true,
          licenseKey: 'TEST-KEY'
        });
      });

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
        sessions: [mockSession],
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
        call[0]?.sessions?.[0]?.id === 'test-session-123'
      )?.[0]?.sessions?.[0];

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
        sessions: [mockSession],
        autoLaunchSessionIds: [],
        premiumEnabled: true,
        licenseKey: 'TEST-KEY'
      });

      await sessionManager.deleteSession('session-to-delete');

      expect(mockChrome.storage.local.set).toHaveBeenCalled();
    });

    test('should remove from auto-launch list', async () => {
      mockChrome.storage.local.get.mockImplementation((keys) => {
        if (keys === 'autoLaunchSessionIds') {
          return Promise.resolve({ autoLaunchSessionIds: ['session-1', 'session-2'] });
        }
        return Promise.resolve({
          sessions: [{ id: 'session-1', name: 'S1', tabs: [], createdAt: 0, launchCount: 0 }],
          premiumEnabled: true,
          licenseKey: 'TEST-KEY'
        });
      });

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

      mockChrome.storage.local.get.mockImplementation((keys) => {
        if (keys === 'sessions') {
          return Promise.resolve({ sessions: mockSessions });
        }
        return Promise.resolve({
          premiumEnabled: true,
          licenseKey: 'TEST-KEY'
        });
      });

      const result = await sessionManager.getAllSessions();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('1');
      expect(result[1].id).toBe('2');
    });

    test('should return empty array when no sessions', async () => {
      mockChrome.storage.local.get.mockResolvedValue({
        sessions: [],
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

      mockChrome.storage.local.get.mockImplementation((keys) => {
        if (keys === 'sessions') {
          return Promise.resolve({ sessions: mockSessions });
        }
        return Promise.resolve({
          premiumEnabled: true,
          licenseKey: 'TEST-KEY'
        });
      });

      const result = await sessionManager.getSession('session-2');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('session-2');
      expect(result?.name).toBe('S2');
    });

    test('should return null if session not found', async () => {
      mockChrome.storage.local.get.mockResolvedValue({
        sessions: [],
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

      mockChrome.storage.local.get.mockImplementation((keys) => {
        if (keys === 'sessions') {
          return Promise.resolve({ sessions: [mockSession] });
        }
        return Promise.resolve({
          premiumEnabled: true,
          licenseKey: 'TEST-KEY'
        });
      });

      await sessionManager.updateSession('session-1', { name: 'New Name' });

      const setCall = mockChrome.storage.local.set.mock.calls[0][0];
      expect(setCall.sessions[0].name).toBe('New Name');
    });

    test('should update multiple fields', async () => {
      const mockSession: SavedSession = {
        id: 'session-1',
        name: 'Test',
        tabs: [],
        createdAt: Date.now(),
        launchCount: 0
      };

      mockChrome.storage.local.get.mockImplementation((keys) => {
        if (keys === 'sessions') {
          return Promise.resolve({ sessions: [mockSession] });
        }
        return Promise.resolve({
          premiumEnabled: true,
          licenseKey: 'TEST-KEY'
        });
      });

      await sessionManager.updateSession('session-1', {
        name: 'Updated',
        description: 'New desc',
        icon: '🔥'
      });

      const setCall = mockChrome.storage.local.set.mock.calls[0][0];
      expect(setCall.sessions[0].name).toBe('Updated');
      expect(setCall.sessions[0].description).toBe('New desc');
      expect(setCall.sessions[0].icon).toBe('🔥');
    });

    test('should set updatedAt timestamp', async () => {
      const mockSession: SavedSession = {
        id: 'session-1',
        name: 'Test',
        tabs: [],
        createdAt: Date.now(),
        launchCount: 0
      };

      mockChrome.storage.local.get.mockImplementation((keys) => {
        if (keys === 'sessions') {
          return Promise.resolve({ sessions: [mockSession] });
        }
        return Promise.resolve({
          premiumEnabled: true,
          licenseKey: 'TEST-KEY'
        });
      });

      const beforeUpdate = Date.now();
      await sessionManager.updateSession('session-1', { name: 'Updated' });
      const afterUpdate = Date.now();

      const setCall = mockChrome.storage.local.set.mock.calls[0][0];
      expect(setCall.sessions[0].updatedAt).toBeGreaterThanOrEqual(beforeUpdate);
      expect(setCall.sessions[0].updatedAt).toBeLessThanOrEqual(afterUpdate);
    });

    test('should throw error if session not found', async () => {
      mockChrome.storage.local.get.mockResolvedValue({
        sessions: [],
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
        if (keys === 'sessions') {
          return Promise.resolve({ sessions: mockSessions });
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
        if (keys === 'sessions') {
          return Promise.resolve({ sessions: [
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
        if (keys === 'sessions') {
          return Promise.resolve({ sessions: mockSessions });
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
        if (keys === 'sessions' || (Array.isArray(keys) && keys.includes('sessions'))) {
          return Promise.resolve({ sessions: mockSessions });
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
        if (keys === 'sessions' || (Array.isArray(keys) && keys.includes('sessions'))) {
          return Promise.resolve({ sessions: mockSessions });
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
          sessions: []
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
        if (keys === 'sessions') {
          return Promise.resolve({ sessions: [mockSession] });
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
        if (keys === 'sessions') {
          return Promise.resolve({ sessions: [mockSession] });
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
        sessions: [],
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
        { ...mockTabs[0], url: undefined }
      ];

      mockChrome.tabs.query.mockResolvedValue(tabsWithoutUrls);

      const result = await sessionManager.saveCurrentWindow('Test');

      expect(result.tabs[0].url).toBe('about:blank');
    });

    test('should handle chrome:// URLs', async () => {
      const chromeTabs = [
        { ...mockTabs[0], url: 'chrome://extensions' }
      ];

      mockChrome.tabs.query.mockResolvedValue(chromeTabs);

      const result = await sessionManager.saveCurrentWindow('Test');

      expect(result.tabs[0].url).toBe('chrome://extensions');
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
  });
});
