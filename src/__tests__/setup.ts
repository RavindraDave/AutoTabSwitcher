/**
 * Jest setup file for Chrome Extension testing
 * Provides comprehensive mocks for Chrome APIs
 */

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
  WINDOW_ID_NONE: -1,
};

// Create global chrome mock
(global as any).chrome = {
  storage: storageMock,
  tabs: tabsMock,
  alarms: alarmsMock,
  action: actionMock,
  runtime: runtimeMock,
  windows: windowsMock,
};

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});