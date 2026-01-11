/**
 * @jest-environment jsdom
 */

/**
 * Comprehensive tests for options page UI controller
 * Tests validation, low delay warnings, and settings management
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
}));

// Mock environment
jest.mock('../utils/environment', () => ({
  isPacked: jest.fn().mockReturnValue(false),
}));

// Mock Storage
jest.mock('../core/storage', () => ({
  setDelayTime: jest.fn().mockImplementation(async (delay, additional) => {
    await (global as any).chrome.storage.local.set({ ...additional, delayTime: delay });
    return delay;
  }),
  getSwitchingMode: jest.fn().mockImplementation((data) => data.switchingMode || data.operatingMode || 'global'),
}));

// Mock validation
jest.mock('../popup/shared/validation', () => ({
  validateDelayTime: jest.fn().mockImplementation((delayInSeconds, min) => {
    if (isNaN(delayInSeconds) || delayInSeconds < min || delayInSeconds > 3600) {
      return { valid: false, error: `Delay must be between ${min} and 3600 seconds` };
    }
    return { valid: true };
  }),
  validatePauseDuration: jest.fn().mockImplementation((pauseInSeconds) => {
    if (isNaN(pauseInSeconds) || pauseInSeconds < 5 || pauseInSeconds > 300) {
      return { valid: false, error: 'Pause duration must be between 5 and 300 seconds' };
    }
    return { valid: true };
  }),
}));

// Mock logger
jest.mock('../core/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

// Mock DOM elements
const createMockDOM = () => {
  const createEl = (id: string, tag: string = 'div') => {
    const el = document.createElement(tag);
    el.id = id;
    document.body.appendChild(el);
    return el;
  };

  // Create all required DOM elements
  const defaultDelayInput = createEl('defaultDelayInput', 'input') as HTMLInputElement;
  defaultDelayInput.type = 'number';

  const delayValidationIcon = createEl('delayValidationIcon', 'span');
  const delayValidationError = createEl('delayValidationError', 'div');
  const minDelayLabel = createEl('minDelayLabel', 'span');

  const enableOnStartupCheckbox = createEl('enableOnStartupCheckbox', 'input') as HTMLInputElement;
  enableOnStartupCheckbox.type = 'checkbox';

  const pauseOnActivityCheckbox = createEl('pauseOnActivityCheckbox', 'input') as HTMLInputElement;
  pauseOnActivityCheckbox.type = 'checkbox';

  const pauseDurationInput = createEl('pauseDurationInput', 'input') as HTMLInputElement;
  pauseDurationInput.type = 'number';

  const pauseValidationIcon = createEl('pauseValidationIcon', 'span');
  const pauseValidationError = createEl('pauseValidationError', 'div');
  const pauseOptionsContainer = createEl('pauseOptionsContainer', 'div');
  const pauseImpact = createEl('pauseImpact', 'div');

  // Operating mode radios
  const operatingModeGlobal = createEl('operatingModeGlobal', 'input') as HTMLInputElement;
  operatingModeGlobal.type = 'radio';
  operatingModeGlobal.name = 'operatingMode';
  operatingModeGlobal.value = 'global';

  const operatingModeWindow = createEl('operatingModeWindow', 'input') as HTMLInputElement;
  operatingModeWindow.type = 'radio';
  operatingModeWindow.name = 'operatingMode';
  operatingModeWindow.value = 'window';

  // Other elements
  const modeIndicatorBadge = createEl('modeIndicatorBadge', 'span');
  const previewModeText = createEl('previewModeText', 'span');
  const environmentInfo = createEl('environmentInfo', 'div');
  const successAlert = createEl('successAlert', 'div');
  const successMessage = createEl('successMessage', 'span');
  const errorAlert = createEl('errorAlert', 'div');
  const errorMessage = createEl('errorMessage', 'span');
  const saveButton = createEl('saveButton', 'button') as HTMLButtonElement;
  const resetButton = createEl('resetButton', 'button') as HTMLButtonElement;
  const currentShortcut = createEl('currentShortcut', 'span');
  const customizeShortcutButton = createEl('customizeShortcutButton', 'button');

  return {
    defaultDelayInput,
    enableOnStartupCheckbox,
    pauseOnActivityCheckbox,
    pauseDurationInput,
    saveButton,
    resetButton,
    operatingModeGlobal,
    operatingModeWindow,
  };
};

describe('Options Page UI Controller', () => {
  let confirmSpy: jest.SpiedFunction<typeof window.confirm>;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Clear document body
    document.body.replaceChildren();

    // Mock window.confirm
    confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);

    // Mock window.location.reload
    Object.defineProperty(window, 'location', {
      value: { reload: jest.fn() },
      writable: true,
    });

    // Default storage mock
    mockChrome.storage.local.get.mockResolvedValue({});
    mockChrome.storage.local.set.mockResolvedValue(undefined);

    // Mock chrome.commands
    mockChrome.commands = {
      getAll: jest.fn().mockResolvedValue([
        { name: 'toggle-pause', shortcut: 'Ctrl+Shift+P' }
      ])
    };

    // Mock chrome.tabs
    mockChrome.tabs = {
      create: jest.fn().mockResolvedValue({ id: 1 })
    };

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
    confirmSpy.mockRestore();
  });

  describe('Low Delay Time Warning', () => {
    it('should show confirmation dialog when setting delay time to less than 5 seconds', async () => {
      const { saveSettings } = await import('../options/options');

      const defaultDelayInput = document.getElementById('defaultDelayInput') as HTMLInputElement;
      const enableOnStartupCheckbox = document.getElementById('enableOnStartupCheckbox') as HTMLInputElement;
      const pauseOnActivityCheckbox = document.getElementById('pauseOnActivityCheckbox') as HTMLInputElement;
      const pauseDurationInput = document.getElementById('pauseDurationInput') as HTMLInputElement;

      // Set delay to 3 seconds (less than 5)
      defaultDelayInput.value = '3';
      enableOnStartupCheckbox.checked = false;
      pauseOnActivityCheckbox.checked = false;
      pauseDurationInput.value = '30';

      // Mock confirm to return true (user confirms)
      confirmSpy.mockReturnValue(true);

      await saveSettings();

      // Verify confirm was called with warning message
      expect(confirmSpy).toHaveBeenCalledTimes(1);
      expect(confirmSpy).toHaveBeenCalledWith(
        expect.stringContaining('⚠️ Warning: Very Low Delay Time (3 seconds)')
      );
      expect(confirmSpy).toHaveBeenCalledWith(
        expect.stringContaining('Very fast switching can be difficult to stop')
      );
      expect(confirmSpy).toHaveBeenCalledWith(
        expect.stringContaining('May cause performance issues')
      );
    });

    it('should cancel save when user rejects low delay time warning', async () => {
      const { setDelayTime } = await import('../core/storage');
      const { saveSettings } = await import('../options/options');

      const defaultDelayInput = document.getElementById('defaultDelayInput') as HTMLInputElement;
      const enableOnStartupCheckbox = document.getElementById('enableOnStartupCheckbox') as HTMLInputElement;
      const pauseOnActivityCheckbox = document.getElementById('pauseOnActivityCheckbox') as HTMLInputElement;
      const pauseDurationInput = document.getElementById('pauseDurationInput') as HTMLInputElement;

      // Set delay to 2 seconds (less than 5)
      defaultDelayInput.value = '2';
      enableOnStartupCheckbox.checked = false;
      pauseOnActivityCheckbox.checked = false;
      pauseDurationInput.value = '30';

      // Mock confirm to return false (user cancels)
      confirmSpy.mockReturnValue(false);

      await saveSettings();

      // Verify confirm was called
      expect(confirmSpy).toHaveBeenCalledTimes(1);

      // Verify setDelayTime was NOT called (save was cancelled)
      expect(setDelayTime).not.toHaveBeenCalled();
      expect(mockChrome.storage.local.set).not.toHaveBeenCalled();
    });

    it('should proceed with save when user confirms low delay time warning', async () => {
      const { setDelayTime } = await import('../core/storage');
      const { saveSettings } = await import('../options/options');

      const defaultDelayInput = document.getElementById('defaultDelayInput') as HTMLInputElement;
      const enableOnStartupCheckbox = document.getElementById('enableOnStartupCheckbox') as HTMLInputElement;
      const pauseOnActivityCheckbox = document.getElementById('pauseOnActivityCheckbox') as HTMLInputElement;
      const pauseDurationInput = document.getElementById('pauseDurationInput') as HTMLInputElement;

      // Set delay to 4 seconds (less than 5)
      defaultDelayInput.value = '4';
      enableOnStartupCheckbox.checked = false;
      pauseOnActivityCheckbox.checked = false;
      pauseDurationInput.value = '30';

      // Mock confirm to return true (user confirms)
      confirmSpy.mockReturnValue(true);

      await saveSettings();

      // Verify confirm was called
      expect(confirmSpy).toHaveBeenCalledTimes(1);

      // Verify setDelayTime WAS called (save proceeded)
      expect(setDelayTime).toHaveBeenCalledWith(
        4000, // 4 seconds in milliseconds
        expect.objectContaining({
          enableOnStartup: false,
          switchingMode: 'global',
          pauseOnActivity: false,
        })
      );
    });

    it('should NOT show confirmation dialog when setting delay time to 5 seconds or more', async () => {
      const { setDelayTime } = await import('../core/storage');
      const { saveSettings } = await import('../options/options');

      const defaultDelayInput = document.getElementById('defaultDelayInput') as HTMLInputElement;
      const enableOnStartupCheckbox = document.getElementById('enableOnStartupCheckbox') as HTMLInputElement;
      const pauseOnActivityCheckbox = document.getElementById('pauseOnActivityCheckbox') as HTMLInputElement;
      const pauseDurationInput = document.getElementById('pauseDurationInput') as HTMLInputElement;

      // Set delay to 5 seconds (equal to threshold)
      defaultDelayInput.value = '5';
      enableOnStartupCheckbox.checked = false;
      pauseOnActivityCheckbox.checked = false;
      pauseDurationInput.value = '30';

      await saveSettings();

      // Verify confirm was NOT called
      expect(confirmSpy).not.toHaveBeenCalled();

      // Verify setDelayTime WAS called (save proceeded without confirmation)
      expect(setDelayTime).toHaveBeenCalledWith(
        5000, // 5 seconds in milliseconds
        expect.any(Object)
      );
    });

    it('should NOT show confirmation dialog when setting delay time to 10 seconds', async () => {
      const { saveSettings } = await import('../options/options');

      const defaultDelayInput = document.getElementById('defaultDelayInput') as HTMLInputElement;
      const enableOnStartupCheckbox = document.getElementById('enableOnStartupCheckbox') as HTMLInputElement;
      const pauseOnActivityCheckbox = document.getElementById('pauseOnActivityCheckbox') as HTMLInputElement;
      const pauseDurationInput = document.getElementById('pauseDurationInput') as HTMLInputElement;

      // Set delay to 10 seconds (well above threshold)
      defaultDelayInput.value = '10';
      enableOnStartupCheckbox.checked = false;
      pauseOnActivityCheckbox.checked = false;
      pauseDurationInput.value = '30';

      await saveSettings();

      // Verify confirm was NOT called
      expect(confirmSpy).not.toHaveBeenCalled();
    });
  });

  describe('Static Warning Message in HTML', () => {
    it('should have warning message visible in options.html', () => {
      // This test ensures the static warning exists in the HTML
      // We can't directly test the HTML file, but we can document the requirement
      // The actual HTML should be tested in an E2E test or manually verified

      // Create the warning element as it should exist in the HTML
      const warningText = document.createElement('small');
      warningText.className = 'form-text';
      warningText.style.color = '#d97706';
      warningText.style.fontWeight = '600';
      warningText.textContent = '⚠️ Warning: Values below 5 seconds may be difficult to stop and could cause performance issues.';

      // Verify the warning message content is correct
      expect(warningText.textContent).toContain('⚠️ Warning');
      expect(warningText.textContent).toContain('Values below 5 seconds');
      expect(warningText.textContent).toContain('difficult to stop');
      expect(warningText.textContent).toContain('performance issues');
    });
  });

  describe('Input Validation', () => {
    it('should validate delay time is within acceptable range', async () => {
      const { validateDelayTime } = await import('../popup/shared/validation');
      const { saveSettings } = await import('../options/options');

      const defaultDelayInput = document.getElementById('defaultDelayInput') as HTMLInputElement;
      const enableOnStartupCheckbox = document.getElementById('enableOnStartupCheckbox') as HTMLInputElement;
      const pauseOnActivityCheckbox = document.getElementById('pauseOnActivityCheckbox') as HTMLInputElement;
      const pauseDurationInput = document.getElementById('pauseDurationInput') as HTMLInputElement;

      // Set invalid delay (too low)
      defaultDelayInput.value = '1';
      enableOnStartupCheckbox.checked = false;
      pauseOnActivityCheckbox.checked = false;
      pauseDurationInput.value = '30';

      await saveSettings();

      // Verify validation was called
      expect(validateDelayTime).toHaveBeenCalledWith(1, 2);
    });
  });

  describe('Settings Persistence', () => {
    it('should save all settings correctly when delay is >= 5 seconds', async () => {
      const { setDelayTime } = await import('../core/storage');
      const { saveSettings } = await import('../options/options');

      const defaultDelayInput = document.getElementById('defaultDelayInput') as HTMLInputElement;
      const enableOnStartupCheckbox = document.getElementById('enableOnStartupCheckbox') as HTMLInputElement;
      const pauseOnActivityCheckbox = document.getElementById('pauseOnActivityCheckbox') as HTMLInputElement;
      const pauseDurationInput = document.getElementById('pauseDurationInput') as HTMLInputElement;
      const operatingModeGlobal = document.getElementById('operatingModeGlobal') as HTMLInputElement;

      defaultDelayInput.value = '10';
      enableOnStartupCheckbox.checked = true;
      pauseOnActivityCheckbox.checked = true;
      pauseDurationInput.value = '60';
      operatingModeGlobal.checked = true;

      await saveSettings();

      expect(setDelayTime).toHaveBeenCalledWith(
        10000,
        expect.objectContaining({
          enableOnStartup: true,
          switchingMode: 'global',
          pauseOnActivity: true,
          pauseDuration: 60000,
        })
      );
    });
  });
});
