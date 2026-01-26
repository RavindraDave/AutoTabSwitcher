/**
 * Jest setup file for React Settings tests
 * Provides comprehensive mocks for Chrome APIs and React Testing Library
 */

import '@testing-library/jest-dom';

// Track all timers to ensure cleanup
const activeTimers = new Set<NodeJS.Timeout>();
const activeIntervals = new Set<NodeJS.Timeout>();
const originalSetTimeout = global.setTimeout;
const originalClearTimeout = global.clearTimeout;
const originalSetInterval = global.setInterval;
const originalClearInterval = global.clearInterval;

// Override setTimeout to track timers
(global as any).setTimeout = function(callback: any, delay?: number, ...args: any[]) {
  const timer = originalSetTimeout(callback, delay, ...args);
  activeTimers.add(timer);
  return timer;
};

// Override clearTimeout to untrack timers
(global as any).clearTimeout = function(timer: NodeJS.Timeout) {
  activeTimers.delete(timer);
  return originalClearTimeout(timer);
};

// Override setInterval to track intervals
(global as any).setInterval = function(callback: any, delay?: number, ...args: any[]) {
  const interval = originalSetInterval(callback, delay, ...args);
  activeIntervals.add(interval);
  return interval;
};

// Override clearInterval to untrack intervals
(global as any).clearInterval = function(interval: NodeJS.Timeout) {
  activeIntervals.delete(interval);
  return originalClearInterval(interval);
};

// In-memory storage mock
let mockStorage: Record<string, any> = {};
const storageListeners: Array<(changes: Record<string, any>, areaName: string) => void> = [];

// Mock chrome.storage API
const storageMock = {
  local: {
    get: jest.fn().mockImplementation((keys: string | string[] | null) => {
      return Promise.resolve(
        keys === null
          ? { ...mockStorage }
          : Array.isArray(keys)
          ? keys.reduce((acc, key) => {
              if (mockStorage[key] !== undefined) {
                acc[key] = mockStorage[key];
              }
              return acc;
            }, {} as Record<string, any>)
          : typeof keys === 'string'
          ? { [keys]: mockStorage[keys] }
          : Object.keys(keys).reduce((acc, key) => {
              acc[key] = mockStorage[key] ?? (keys as Record<string, any>)[key];
              return acc;
            }, {} as Record<string, any>)
      );
    }),
    set: jest.fn().mockImplementation((items: Record<string, any>) => {
      const changes: Record<string, any> = {};
      for (const [key, value] of Object.entries(items)) {
        changes[key] = { oldValue: mockStorage[key], newValue: value };
        mockStorage[key] = value;
      }
      // Notify listeners
      storageListeners.forEach(listener => listener(changes, 'local'));
      return Promise.resolve();
    }),
    remove: jest.fn().mockImplementation((keys: string | string[]) => {
      const keysArray = Array.isArray(keys) ? keys : [keys];
      keysArray.forEach(key => delete mockStorage[key]);
      return Promise.resolve();
    }),
    clear: jest.fn().mockImplementation(() => {
      mockStorage = {};
      return Promise.resolve();
    }),
  },
  onChanged: {
    addListener: jest.fn().mockImplementation((listener) => {
      storageListeners.push(listener);
    }),
    removeListener: jest.fn().mockImplementation((listener) => {
      const index = storageListeners.indexOf(listener);
      if (index > -1) {
        storageListeners.splice(index, 1);
      }
    }),
  },
};

// Mock chrome.tabs API
const tabsMock = {
  query: jest.fn().mockResolvedValue([]),
  update: jest.fn().mockResolvedValue({}),
  create: jest.fn().mockResolvedValue({ id: 1 }),
  remove: jest.fn().mockResolvedValue(undefined),
  get: jest.fn().mockResolvedValue({ id: 1 }),
  reload: jest.fn().mockResolvedValue(undefined),
  onCreated: {
    addListener: jest.fn(),
    removeListener: jest.fn(),
  },
  onUpdated: {
    addListener: jest.fn(),
    removeListener: jest.fn(),
  },
  onAttached: {
    addListener: jest.fn(),
    removeListener: jest.fn(),
  },
  onActivated: {
    addListener: jest.fn(),
    removeListener: jest.fn(),
  },
};

// Mock chrome.alarms API
const alarmsMock = {
  create: jest.fn(),
  clear: jest.fn(),
  get: jest.fn(),
  getAll: jest.fn(),
  onAlarm: {
    addListener: jest.fn(),
    removeListener: jest.fn(),
  },
};

// Mock chrome.action API
const actionMock = {
  setBadgeText: jest.fn(),
  setBadgeBackgroundColor: jest.fn(),
  setIcon: jest.fn(),
};

// Mock chrome.runtime API
const runtimeMock = {
  onInstalled: {
    addListener: jest.fn(),
    removeListener: jest.fn(),
  },
  onStartup: {
    addListener: jest.fn(),
    removeListener: jest.fn(),
  },
  getManifest: jest.fn().mockReturnValue({
    update_url: undefined,
    version: '1.0.0',
    name: 'Auto Tab Switcher',
  }),
  getURL: jest.fn().mockImplementation((path: string) => `chrome-extension://test-id/${path}`),
  lastError: undefined,
};

// Mock chrome.windows API
const windowsMock = {
  onCreated: {
    addListener: jest.fn(),
    removeListener: jest.fn(),
  },
  onFocusChanged: {
    addListener: jest.fn(),
    removeListener: jest.fn(),
  },
  onRemoved: {
    addListener: jest.fn(),
    removeListener: jest.fn(),
  },
  getCurrent: jest.fn().mockResolvedValue({ id: 1 }),
  getLastFocused: jest.fn().mockResolvedValue({ id: 1 }),
  getAll: jest.fn().mockResolvedValue([{ id: 1 }]),
  get: jest.fn().mockResolvedValue({ id: 1 }),
  create: jest.fn().mockResolvedValue({ id: 2 }),
  WINDOW_ID_NONE: -1,
};

// Mock chrome.commands API
const commandsMock = {
  getAll: jest.fn().mockResolvedValue([
    { name: 'toggle-switching', shortcut: 'Ctrl+Shift+S' },
    { name: 'next-tab', shortcut: 'Ctrl+Shift+Right' },
    { name: 'previous-tab', shortcut: 'Ctrl+Shift+Left' },
  ]),
  onCommand: {
    addListener: jest.fn(),
    removeListener: jest.fn(),
  },
};

// Mock chrome.downloads API
const downloadsMock = {
  download: jest.fn().mockResolvedValue(1),
  search: jest.fn().mockResolvedValue([]),
  cancel: jest.fn(),
  erase: jest.fn(),
};

// Create global chrome mock
(global as any).chrome = {
  storage: storageMock,
  tabs: tabsMock,
  alarms: alarmsMock,
  action: actionMock,
  runtime: runtimeMock,
  windows: windowsMock,
  commands: commandsMock,
  downloads: downloadsMock,
};

// Helper to reset storage state
export function resetMockStorage(initialData: Record<string, any> = {}) {
  mockStorage = { ...initialData };
}

// Helper to get current storage state
export function getMockStorage() {
  return { ...mockStorage };
}

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  mockStorage = {};
  storageListeners.length = 0;
});

// Clean up after each test
afterEach(() => {
  // Clear all tracked timers
  activeTimers.forEach(timer => {
    originalClearTimeout(timer);
  });
  activeTimers.clear();

  // Clear all tracked intervals
  activeIntervals.forEach(interval => {
    originalClearInterval(interval);
  });
  activeIntervals.clear();
});

// Final cleanup after all tests to ensure Jest can exit
afterAll(async () => {
  // Clear any remaining timers
  activeTimers.forEach(timer => {
    originalClearTimeout(timer);
  });
  activeTimers.clear();

  // Clear any remaining intervals
  activeIntervals.forEach(interval => {
    originalClearInterval(interval);
  });
  activeIntervals.clear();

  // Give any pending promises time to resolve
  await new Promise(resolve => originalSetTimeout(resolve, 100));
});
