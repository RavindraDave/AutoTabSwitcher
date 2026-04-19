import { startUrlListRotation, advanceUrlListRotation, stopUrlListRotation, getUrlListEntries, saveUrlListEntries } from '../core/url-list-manager';

jest.mock('../core/badge-manager.js', () => ({
  updateBadge: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../core/statistics-tracker.js', () => ({
  recordTabSwitch: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../core/kiosk-manager.js', () => ({
  notifyKioskOverlayOfSwitch: jest.fn().mockResolvedValue(undefined),
}));

const mockStorageData: Record<string, unknown> = {};

beforeEach(() => {
  jest.clearAllMocks();
  Object.keys(mockStorageData).forEach(k => delete mockStorageData[k]);

  (chrome.storage.local.get as jest.Mock).mockImplementation((keys: string | string[]) => {
    const result: Record<string, unknown> = {};
    const keyArr = Array.isArray(keys) ? keys : [keys];
    for (const k of keyArr) {
      if (k in mockStorageData) result[k] = mockStorageData[k];
    }
    return Promise.resolve(result);
  });

  (chrome.storage.local.set as jest.Mock).mockImplementation((data: Record<string, unknown>) => {
    Object.assign(mockStorageData, data);
    return Promise.resolve();
  });

  (chrome.alarms.create as jest.Mock).mockResolvedValue(undefined);
  (chrome.alarms.clear as jest.Mock).mockResolvedValue(true);
  (chrome.windows.create as jest.Mock).mockResolvedValue({ id: 100 });
  (chrome.windows.get as jest.Mock).mockResolvedValue({ id: 100, state: 'normal' });
  (chrome.windows.remove as jest.Mock).mockResolvedValue(undefined);
  (chrome.tabs.query as jest.Mock).mockResolvedValue([]);
  (chrome.tabs.update as jest.Mock).mockResolvedValue({});
});

function makeEntry(overrides: Partial<{ id: string; url: string; label: string; delayMs: number; enabled: boolean }> = {}) {
  return {
    id: overrides.id ?? 'e1',
    url: overrides.url ?? 'https://example.com',
    label: overrides.label,
    delayMs: overrides.delayMs,
    enabled: overrides.enabled ?? true,
    createdAt: Date.now(),
  };
}

describe('startUrlListRotation', () => {
  it('does nothing when no config exists', async () => {
    await startUrlListRotation();
    expect(chrome.windows.create).not.toHaveBeenCalled();
  });

  it('does nothing when entries list is empty', async () => {
    mockStorageData['urlListConfig'] = { entries: [] };
    await startUrlListRotation();
    expect(chrome.windows.create).not.toHaveBeenCalled();
  });

  it('does nothing when all entries are disabled', async () => {
    mockStorageData['urlListConfig'] = { entries: [makeEntry({ enabled: false })] };
    await startUrlListRotation();
    expect(chrome.windows.create).not.toHaveBeenCalled();
  });

  it('creates a window and starts alarm with enabled entries', async () => {
    mockStorageData['urlListConfig'] = {
      entries: [makeEntry({ url: 'https://a.com' }), makeEntry({ id: 'e2', url: 'https://b.com' })],
    };
    mockStorageData['delayTime'] = 10000;

    await startUrlListRotation();

    expect(chrome.windows.create).toHaveBeenCalledWith({
      url: ['https://a.com', 'https://b.com'],
      focused: true,
      state: 'normal',
    });
    expect(chrome.alarms.create).toHaveBeenCalledWith('urlListTimer', { delayInMinutes: 10000 / 60000 });
    expect(mockStorageData['urlListConfig']).toMatchObject({ windowId: 100, lastActiveIndex: 0 });
  });

  it('uses fullscreen state when kioskMode is enabled', async () => {
    mockStorageData['urlListConfig'] = { entries: [makeEntry()] };
    mockStorageData['kioskMode'] = true;

    await startUrlListRotation();

    expect(chrome.windows.create).toHaveBeenCalledWith(expect.objectContaining({ state: 'fullscreen' }));
  });

  it('reuses existing window if still open', async () => {
    mockStorageData['urlListConfig'] = { entries: [makeEntry()], windowId: 42 };
    (chrome.windows.get as jest.Mock).mockResolvedValue({ id: 42 });

    await startUrlListRotation();

    expect(chrome.windows.create).not.toHaveBeenCalled();
    expect(mockStorageData['urlListConfig']).toMatchObject({ windowId: 42 });
  });

  it('creates new window when existing window is gone', async () => {
    mockStorageData['urlListConfig'] = { entries: [makeEntry()], windowId: 42 };
    (chrome.windows.get as jest.Mock).mockImplementation((id: number) => {
      if (id === 42) return Promise.reject(new Error('No window'));
      return Promise.resolve({ id });
    });
    (chrome.windows.create as jest.Mock).mockResolvedValue({ id: 200 });

    await startUrlListRotation();

    expect(chrome.windows.create).toHaveBeenCalled();
    expect(mockStorageData['urlListConfig']).toMatchObject({ windowId: 200 });
  });

  it('uses first entry custom delay if set', async () => {
    mockStorageData['urlListConfig'] = {
      entries: [makeEntry({ delayMs: 15000 })],
    };
    mockStorageData['delayTime'] = 5000;

    await startUrlListRotation();

    expect(chrome.alarms.create).toHaveBeenCalledWith('urlListTimer', { delayInMinutes: 15000 / 60000 });
  });
});

describe('advanceUrlListRotation', () => {
  it('does nothing without config', async () => {
    await advanceUrlListRotation();
    expect(chrome.tabs.update).not.toHaveBeenCalled();
  });

  it('does nothing without windowId', async () => {
    mockStorageData['urlListConfig'] = { entries: [makeEntry()] };
    await advanceUrlListRotation();
    expect(chrome.tabs.update).not.toHaveBeenCalled();
  });

  it('stops rotation if window is closed', async () => {
    mockStorageData['urlListConfig'] = { entries: [makeEntry()], windowId: 100, lastActiveIndex: 0 };
    (chrome.windows.get as jest.Mock).mockRejectedValue(new Error('Window not found'));

    await advanceUrlListRotation();

    expect(chrome.alarms.clear).toHaveBeenCalledWith('urlListTimer');
  });

  it('advances to next tab and reschedules alarm', async () => {
    const entries = [
      makeEntry({ id: 'e1', url: 'https://a.com' }),
      makeEntry({ id: 'e2', url: 'https://b.com', delayMs: 20000 }),
    ];
    mockStorageData['urlListConfig'] = { entries, windowId: 100, lastActiveIndex: 0 };
    mockStorageData['delayTime'] = 5000;

    (chrome.tabs.query as jest.Mock).mockResolvedValue([
      { id: 1, url: 'https://a.com', active: true },
      { id: 2, url: 'https://b.com', active: false },
    ]);

    await advanceUrlListRotation();

    expect(chrome.tabs.update).toHaveBeenCalledWith(2, { active: true });
    expect(mockStorageData['urlListConfig']).toMatchObject({ lastActiveIndex: 1 });
    expect(chrome.alarms.create).toHaveBeenCalledWith('urlListTimer', { delayInMinutes: 20000 / 60000 });
  });

  it('wraps around to index 0 after last entry', async () => {
    const entries = [
      makeEntry({ id: 'e1', url: 'https://a.com', delayMs: 8000 }),
      makeEntry({ id: 'e2', url: 'https://b.com' }),
    ];
    mockStorageData['urlListConfig'] = { entries, windowId: 100, lastActiveIndex: 1 };
    mockStorageData['delayTime'] = 5000;

    (chrome.tabs.query as jest.Mock).mockResolvedValue([
      { id: 1, url: 'https://a.com', active: false },
      { id: 2, url: 'https://b.com', active: true },
    ]);

    await advanceUrlListRotation();

    expect(chrome.tabs.update).toHaveBeenCalledWith(1, { active: true });
    expect(mockStorageData['urlListConfig']).toMatchObject({ lastActiveIndex: 0 });
    expect(chrome.alarms.create).toHaveBeenCalledWith('urlListTimer', { delayInMinutes: 8000 / 60000 });
  });

  it('updates tab URL if it differs from entry', async () => {
    const entries = [makeEntry({ id: 'e1', url: 'https://a.com' }), makeEntry({ id: 'e2', url: 'https://b.com' })];
    mockStorageData['urlListConfig'] = { entries, windowId: 100, lastActiveIndex: 0 };

    (chrome.tabs.query as jest.Mock).mockResolvedValue([
      { id: 1, url: 'https://a.com' },
      { id: 2, url: 'https://old.com' },
    ]);

    await advanceUrlListRotation();

    expect(chrome.tabs.update).toHaveBeenCalledWith(2, { url: 'https://b.com' });
  });

  it('skips disabled entries', async () => {
    const entries = [
      makeEntry({ id: 'e1', url: 'https://a.com' }),
      makeEntry({ id: 'e2', url: 'https://b.com', enabled: false }),
      makeEntry({ id: 'e3', url: 'https://c.com' }),
    ];
    mockStorageData['urlListConfig'] = { entries, windowId: 100, lastActiveIndex: 0 };

    (chrome.tabs.query as jest.Mock).mockResolvedValue([
      { id: 1, url: 'https://a.com', active: true },
      { id: 2, url: 'https://c.com', active: false },
    ]);

    await advanceUrlListRotation();

    // enabledEntries = [e1, e3], nextIndex = 1 (e3), nextTab = tabs[1%2] = tabs[1]
    expect(chrome.tabs.update).toHaveBeenCalledWith(2, { active: true });
  });
});

describe('stopUrlListRotation', () => {
  it('clears alarm and resets windowId', async () => {
    mockStorageData['urlListConfig'] = { entries: [makeEntry()], windowId: 100 };

    await stopUrlListRotation();

    expect(chrome.alarms.clear).toHaveBeenCalledWith('urlListTimer');
    expect(chrome.windows.remove).not.toHaveBeenCalled();
    expect(mockStorageData['urlListConfig']).toMatchObject({ windowId: undefined });
  });

  it('closes window when closeWindow=true', async () => {
    mockStorageData['urlListConfig'] = { entries: [makeEntry()], windowId: 100 };

    await stopUrlListRotation(true);

    expect(chrome.windows.remove).toHaveBeenCalledWith(100);
  });

  it('handles already-closed window gracefully', async () => {
    mockStorageData['urlListConfig'] = { entries: [makeEntry()], windowId: 999 };
    (chrome.windows.remove as jest.Mock).mockRejectedValue(new Error('No window'));

    await expect(stopUrlListRotation(true)).resolves.not.toThrow();
  });
});

describe('getUrlListEntries', () => {
  it('returns empty array when no config', async () => {
    const result = await getUrlListEntries();
    expect(result).toEqual([]);
  });

  it('returns entries from storage', async () => {
    const entries = [makeEntry()];
    mockStorageData['urlListConfig'] = { entries };
    const result = await getUrlListEntries();
    expect(result).toEqual(entries);
  });
});

describe('saveUrlListEntries', () => {
  it('saves entries to storage', async () => {
    const entries = [makeEntry()];
    await saveUrlListEntries(entries);
    expect(mockStorageData['urlListConfig']).toMatchObject({ entries });
  });

  it('caps entries at MAX_URL_LIST_ENTRIES', async () => {
    const entries = Array.from({ length: 120 }, (_, i) => makeEntry({ id: `e${i}` }));
    await saveUrlListEntries(entries);
    expect((mockStorageData['urlListConfig'] as { entries: unknown[] }).entries).toHaveLength(100);
  });

  it('preserves existing config fields', async () => {
    mockStorageData['urlListConfig'] = { entries: [], windowId: 42, lastActiveIndex: 3 };
    await saveUrlListEntries([makeEntry()]);
    expect(mockStorageData['urlListConfig']).toMatchObject({ windowId: 42, lastActiveIndex: 3 });
  });
});
