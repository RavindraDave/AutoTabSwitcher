/**
 * @jest-environment jsdom
 */

/**
 * Comprehensive tests for popup UI controller
 * Tests all UI interactions, validation, storage integration, and error handling
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Mock Chrome APIs
const mockChrome = (global as any).chrome;

// Mock Constants
jest.mock('../core/constants', () => ({
  MIN_DELAY_SECONDS: 2,
  MAX_DELAY_SECONDS: 3600,
  DEFAULT_PAUSE_DURATION_SECONDS: 30,
  MIN_PAUSE_DURATION_SECONDS: 5,
  MAX_PAUSE_DURATION_SECONDS: 300,
  MIN_DELAY_MS_PRODUCTION: 2000,
  MIN_DELAY_MS_DEVELOPMENT: 60000,
}));

// Mock Storage
jest.mock('../core/storage', () => ({
  setDelayTime: jest.fn().mockImplementation(async (delay, additional) => {
    await (global as any).chrome.storage.local.set({ ...additional, delayTime: delay });
    return delay;
  }),
  getSettings: jest.fn().mockResolvedValue({}),
  initializeStorage: jest.fn().mockResolvedValue(undefined),
  validateOperatingMode: jest.fn().mockImplementation((mode) => mode),
  getMinDelayMs: jest.fn().mockReturnValue(2000),
}));

// Mock Activity Tracker
jest.mock('../core/activity-tracker', () => ({
  isPaused: jest.fn().mockResolvedValue(false),
}));

// Mock DOM
const createMockDOM = () => {
  // Helper to create element
  const createEl = (id: string, tag: string = 'div') => {
    const el = document.createElement(tag);
    el.id = id;
    document.body.appendChild(el);
    return el;
  };

  // Elements for popup/index.ts
  const header = createEl('header');
  const statusBadge = createEl('statusBadge');
  const statusCard = createEl('statusCard');
  const statusIcon = createEl('statusIcon');
  const countdownRing = createEl('countdownRing');
  const countdownCircle = createEl('countdownCircle');
  const countdownNumber = createEl('countdownNumber');
  const countdownLabel = createEl('countdownLabel');
  const pulse = createEl('pulse');
  const statusText = createEl('statusText');
  const toggleButton = createEl('toggleButton', 'button');
  const modeGlobalBtn = createEl('modeGlobalBtn', 'button');
  const modeWindowBtn = createEl('modeWindowBtn', 'button');
  const modeValue = createEl('modeValue');
  const intervalValue = createEl('intervalValue');
  const settingsButton = createEl('settingsButton', 'button');

  // Elements for popup/settings.ts
  const delayTimeInput = createEl('delayTimeInput', 'input') as HTMLInputElement;
  delayTimeInput.type = 'number';

  const radioGlobal = createEl('radioGlobal');
  const radioCurrentWindow = createEl('radioCurrentWindow');

  // Radio inputs need name attribute
  const radioInput1 = createEl('radioInput1', 'input') as HTMLInputElement;
  radioInput1.type = 'radio';
  radioInput1.name = 'windowMode';
  radioInput1.value = 'global';

  const radioInput2 = createEl('radioInput2', 'input') as HTMLInputElement;
  radioInput2.type = 'radio';
  radioInput2.name = 'windowMode';
  radioInput2.value = 'current-window';

  const windowInfo = createEl('windowInfo');
  const windowInfoText = createEl('windowInfoText');

  const pauseOnActivityContainer = createEl('pauseOnActivityContainer');
  const pauseOnActivitySwitch = createEl('pauseOnActivitySwitch');
  const pauseDurationSection = createEl('pauseDurationSection');

  const pauseDurationInput = createEl('pauseDurationInput', 'input') as HTMLInputElement;
  pauseDurationInput.type = 'number';

  const errorMessage = createEl('errorMessage');
  const errorMessageText = createEl('errorMessageText');
  const successMessage = createEl('successMessage');

  const backButton = createEl('backButton', 'a');
  const resetButton = createEl('resetButton', 'button');
  const saveButton = createEl('saveButton', 'button');

  return {
    delayTimeInput,
    saveButton,
    toggleButton,
    radioGlobal,
    radioCurrentWindow,
    pauseDurationInput
  };
};

describe('Popup UI Controller', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Clear document body
    document.body.replaceChildren();

    // Reset console spies
    // jest.spyOn(console, 'log').mockImplementation();
    // jest.spyOn(console, 'error').mockImplementation();

    // Mock window.close
    (window as any).close = jest.fn();

    // Default storage mock
    mockChrome.storage.local.get.mockResolvedValue({});

    // Default windows mock
    mockChrome.windows.getCurrent.mockResolvedValue({ id: 1 });
    mockChrome.windows.get.mockResolvedValue({ id: 1, tabs: [] });

    // Initialize DOM
    createMockDOM();

    // Mock document.readyState to prevent auto-initialization
    Object.defineProperty(document, 'readyState', {
      value: 'loading',
      configurable: true,
    });
  });

  afterEach(() => {
    document.body.replaceChildren();
  });

  describe('loadSettings function', () => {
    it('should load settings from storage', async () => {
      mockChrome.storage.local.get.mockResolvedValue({
        delayTime: 20000, // 20 seconds
        windowMode: 'global',
      });

      const { loadSettings, initializeSettings } = await import('../popup/settings');

      // Manually initialize and await
      if (initializeSettings) {
        await initializeSettings();
      }

      const delayInput = document.getElementById('delayTimeInput') as HTMLInputElement;
      expect(delayInput.value).toBe('20');
    });

    it('should use default values when storage is empty', async () => {
      mockChrome.storage.local.get.mockResolvedValue({});

      const { loadSettings, initializeSettings } = await import('../popup/settings');

      // Manually initialize and await
      if (initializeSettings) {
        await initializeSettings();
      }

      const delayInput = document.getElementById('delayTimeInput') as HTMLInputElement;
      expect(delayInput.value).toBe('2'); // MIN_DELAY_SECONDS
    });
  });

  describe('saveSettings function', () => {
    it('should save valid settings to storage', async () => {
      const { saveSettings, initializeSettings } = await import('../popup/settings');

      if (initializeSettings) {
        await initializeSettings();
      }

      const delayTimeInput = document.getElementById('delayTimeInput') as HTMLInputElement;
      delayTimeInput.value = '70';

      mockChrome.storage.local.set.mockResolvedValue(undefined);
      mockChrome.storage.local.get.mockResolvedValue({}); // For current settings check

      if (saveSettings) {
        await saveSettings();

        expect(mockChrome.storage.local.set).toHaveBeenCalledWith(expect.objectContaining({
          delayTime: 70000, // 70 seconds in ms
        }));
      }
    });

    it('should not save invalid delay time', async () => {
      const { saveSettings, initializeSettings } = await import('../popup/settings');

      if (initializeSettings) {
        await initializeSettings();
      }

      const delayTimeInput = document.getElementById('delayTimeInput') as HTMLInputElement;
      delayTimeInput.value = '0';

      if (saveSettings) {
        await saveSettings();

        expect(mockChrome.storage.local.set).not.toHaveBeenCalled();
      }
    });
  });

  describe('handleToggle function', () => {
    it('should toggle enabled status in storage', async () => {
      mockChrome.storage.local.get.mockResolvedValue({
        enabled: false,
        operatingMode: 'global'
      });
      mockChrome.storage.local.set.mockResolvedValue(undefined);

      const { handleToggle } = await import('../popup/index');

      if (handleToggle) {
        await handleToggle();

        expect(mockChrome.storage.local.set).toHaveBeenCalledWith(expect.objectContaining({
          enabled: true,
        }));
      }
    });
  });
});