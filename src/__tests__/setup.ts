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
  lastError: undefined,
};

// Mock chrome.windows API
const windowsMock = {
  onCreated: {
    addListener: jest.fn(),
    removeListener: jest.fn(),
  },
  getCurrent: jest.fn(),
  getAll: jest.fn(),
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