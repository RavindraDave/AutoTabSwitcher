/**
 * Jest setup file for Chrome Extension testing
 * Provides comprehensive mocks for Chrome APIs
 */

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

// Mock chrome.storage API
const storageMock = {
  local: {
    get: jest.fn(),
    set: jest.fn(),
    remove: jest.fn(),
    clear: jest.fn(),
  },
  onChanged: {
    addListener: jest.fn(),
    removeListener: jest.fn(),
  },
};

// Mock chrome.tabs API
const tabsMock = {
  query: jest.fn(),
  update: jest.fn(),
  create: jest.fn(),
  remove: jest.fn(),
  get: jest.fn(),
  reload: jest.fn(),
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
    update_url: undefined, // Simulates unpacked extension
    version: '1.0.0', // Mock version for tests
  }),
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
  getCurrent: jest.fn(),
  getLastFocused: jest.fn(),
  getAll: jest.fn(),
  get: jest.fn(),
  create: jest.fn(),
  WINDOW_ID_NONE: -1,
};

// Mock chrome.commands API
const commandsMock = {
  getAll: jest.fn().mockResolvedValue([]),
  onCommand: {
    addListener: jest.fn(),
    removeListener: jest.fn(),
  },
};

// Mock chrome.downloads API
const downloadsMock = {
  download: jest.fn(),
  search: jest.fn(),
  cancel: jest.fn(),
  erase: jest.fn(),
};

// Mock chrome.idle API
const idleMock = {
  setDetectionInterval: jest.fn(),
  queryState: jest.fn(),
  onStateChanged: {
    addListener: jest.fn(),
    removeListener: jest.fn(),
  },
};

// Mock chrome.contextMenus API
const contextMenusMock = {
  create: jest.fn(),
  remove: jest.fn(),
  removeAll: jest.fn(),
  update: jest.fn(),
  onClicked: {
    addListener: jest.fn(),
    removeListener: jest.fn(),
  },
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
  idle: idleMock,
  contextMenus: contextMenusMock,
};

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
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