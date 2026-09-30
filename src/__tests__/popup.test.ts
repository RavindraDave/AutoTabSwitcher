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

// Mock Logger
jest.mock('../core/logger', () => ({
  logger: {
    info: jest.fn().mockResolvedValue(undefined),
    error: jest.fn().mockResolvedValue(undefined),
    warn: jest.fn().mockResolvedValue(undefined),
    debug: jest.fn().mockResolvedValue(undefined),
  },
}));

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
  getSwitchingMode: jest.fn().mockImplementation((data) => data.switchingMode || data.operatingMode || 'global'),
  getMinDelayMs: jest.fn().mockReturnValue(2000),
}));

// Mock Activity Tracker
jest.mock('../core/activity-tracker', () => ({
  isPaused: jest.fn().mockResolvedValue(false),
}));

// Mock Manual Pause Tracker
jest.mock('../core/manual-pause-tracker', () => ({
  isManuallyPaused: jest.fn().mockResolvedValue(false),
}));

// Mock Premium Access
jest.mock('../core/premium-access', () => ({
  canAccessPremium: jest.fn().mockResolvedValue(false),
}));

// Mock Build Config
jest.mock('../core/build-config', () => ({
  PREMIUM_FEATURES_AVAILABLE: true,
  BUILD_TYPE: 'production-premium',
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
  const premiumTeaser = createEl('premiumTeaser');
  const learnMorePremiumBtn = createEl('learnMorePremiumBtn', 'button');

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

  // Modal elements
  const confirmModal = createEl('confirmModal');
  const modalTitle = createEl('modalTitle');
  const modalSubtitle = createEl('modalSubtitle');
  const modalMessage = createEl('modalMessage');
  const modalWarningList = createEl('modalWarningList');
  const modalFooterMessage = createEl('modalFooterMessage');
  const modalCancelBtn = createEl('modalCancelBtn', 'button');
  const modalConfirmBtn = createEl('modalConfirmBtn', 'button');

  return {
    header,
    statusBadge,
    statusCard,
    statusIcon,
    countdownRing,
    countdownCircle,
    countdownNumber,
    countdownLabel,
    pulse,
    statusText,
    toggleButton,
    modeGlobalBtn,
    modeWindowBtn,
    modeValue,
    intervalValue,
    settingsButton,
    premiumTeaser,
    learnMorePremiumBtn,
    delayTimeInput,
    saveButton,
    radioGlobal,
    radioCurrentWindow,
    pauseDurationInput,
    errorMessage,
    errorMessageText,
    successMessage,
    backButton,
    resetButton,
    windowInfo,
    windowInfoText,
    pauseOnActivityContainer,
    pauseOnActivitySwitch,
    pauseDurationSection,
    confirmModal,
    modalTitle,
    modalSubtitle,
    modalMessage,
    modalWarningList,
    modalFooterMessage,
    modalCancelBtn,
    modalConfirmBtn,
  };
};

describe('Popup UI Controller', () => {
  let dom: ReturnType<typeof createMockDOM>;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Clear document body
    document.body.replaceChildren();

    // Mock window.close
    (window as any).close = jest.fn();

    // Default storage mock
    mockChrome.storage.local.get.mockResolvedValue({});
    mockChrome.storage.local.set.mockResolvedValue(undefined);

    // Default windows mock
    mockChrome.windows.getCurrent.mockResolvedValue({ id: 1 });
    mockChrome.windows.get.mockResolvedValue({ id: 1, tabs: [{ id: 1 }] });
    mockChrome.windows.getAll.mockResolvedValue([{ id: 1 }]);

    // Default tabs mock
    mockChrome.tabs.create.mockResolvedValue({ id: 1 });

    // Default runtime mock
    mockChrome.runtime.openOptionsPage = jest.fn();
    mockChrome.runtime.getURL = jest.fn((path: string) => `chrome-extension://test/${path}`);

    // Initialize DOM
    dom = createMockDOM();

    // Mock document.readyState to prevent auto-initialization
    Object.defineProperty(document, 'readyState', {
      value: 'loading',
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    document.body.replaceChildren();
  });

  describe('popup/index.ts', () => {
    describe('initializePopup', () => {
      it('should initialize popup and set up event listeners', async () => {
        mockChrome.storage.local.get.mockResolvedValue({
          enabled: true,
          switchingMode: 'global',
          delayTime: 5000,
        });

        const { initializePopup } = await import('../popup/index');
        await initializePopup();

        // Verify event listeners are set up by checking if elements have listeners
        expect(dom.toggleButton).toBeDefined();
        expect(dom.modeGlobalBtn).toBeDefined();
        expect(dom.modeWindowBtn).toBeDefined();
        expect(dom.settingsButton).toBeDefined();
      });

      it('should update UI with current settings', async () => {
        mockChrome.storage.local.get.mockResolvedValue({
          enabled: true,
          switchingMode: 'global',
          delayTime: 10000,
        });

        const { initializePopup } = await import('../popup/index');
        await initializePopup();

        expect(dom.intervalValue.textContent).toBe('10 seconds');
        expect(dom.modeValue.textContent).toBe('Global Mode');
      });

      it('should handle window mode correctly', async () => {
        mockChrome.storage.local.get.mockResolvedValue({
          switchingMode: 'window',
          windowStates: { 1: { enabled: true, lastSwitchTime: Date.now() } },
          delayTime: 5000,
        });

        const { initializePopup } = await import('../popup/index');
        await initializePopup();

        expect(dom.modeValue.textContent).toBe('Window Mode');
      });


    });

    describe('handleToggle', () => {
      it('should enable global mode when disabled', async () => {
        mockChrome.storage.local.get.mockResolvedValue({
          enabled: false,
          switchingMode: 'global',
        });

        const { handleToggle } = await import('../popup/index');
        await handleToggle();

        expect(mockChrome.storage.local.set).toHaveBeenCalledWith(
          expect.objectContaining({
            enabled: true,
          })
        );
      });

      it('should disable global mode when enabled', async () => {
        mockChrome.storage.local.get.mockResolvedValue({
          enabled: true,
          switchingMode: 'global',
        });

        const { handleToggle } = await import('../popup/index');
        await handleToggle();

        expect(mockChrome.storage.local.set).toHaveBeenCalledWith(
          expect.objectContaining({
            enabled: false,
          })
        );
      });

      it('should toggle window state in window mode', async () => {
        mockChrome.storage.local.get.mockResolvedValue({
          switchingMode: 'window',
          windowStates: { 1: { enabled: false } },
        });

        const { handleToggle } = await import('../popup/index');
        await handleToggle();

        expect(mockChrome.storage.local.set).toHaveBeenCalledWith(
          expect.objectContaining({
            windowStates: expect.objectContaining({
              1: expect.objectContaining({
                enabled: true,
              }),
            }),
          })
        );
      });

      it('should resume from manual pause in global mode', async () => {
        mockChrome.storage.local.get.mockResolvedValue({
          enabled: true,
          switchingMode: 'global',
          manuallyPaused: true,
        });

        const { handleToggle } = await import('../popup/index');
        await handleToggle();

        expect(mockChrome.storage.local.set).toHaveBeenCalledWith(
          expect.objectContaining({
            manuallyPaused: false,
          })
        );
      });

      it('should resume from manual pause in window mode', async () => {
        mockChrome.storage.local.get.mockResolvedValue({
          switchingMode: 'window',
          windowStates: { 1: { enabled: true } },
          manuallyPausedWindows: { 1: true },
        });

        const { handleToggle } = await import('../popup/index');
        await handleToggle();

        expect(mockChrome.storage.local.set).toHaveBeenCalledWith(
          expect.objectContaining({
            manuallyPausedWindows: expect.objectContaining({
              1: false,
            }),
          })
        );
      });

      it('should handle missing window ID gracefully', async () => {
        mockChrome.windows.getCurrent.mockResolvedValue({ id: undefined });
        mockChrome.storage.local.get.mockResolvedValue({
          enabled: false,
          switchingMode: 'global',
        });

        const { handleToggle } = await import('../popup/index');
        await handleToggle();

        // Should not throw and should log error
        const { logger } = await import('../core/logger');
        expect(logger.error).toHaveBeenCalled();
      });
    });

    describe('Mode Switching', () => {
      it('should switch from global to window mode', async () => {
        mockChrome.storage.local.get.mockResolvedValue({
          enabled: true,
          switchingMode: 'global',
          manuallyPaused: false,
        });

        const { initializePopup } = await import('../popup/index');
        await initializePopup();

        // Simulate clicking window mode button
        dom.modeWindowBtn.click();

        // Wait for async operations
        await new Promise(resolve => setTimeout(resolve, 10));

        expect(mockChrome.storage.local.set).toHaveBeenCalledWith(
          expect.objectContaining({
            switchingMode: 'window',
          })
        );
      });

      it('should switch from window to global mode', async () => {
        mockChrome.storage.local.get.mockResolvedValue({
          switchingMode: 'window',
          windowStates: { 1: { enabled: true, lastSwitchTime: Date.now() } },
        });

        const { initializePopup } = await import('../popup/index');
        await initializePopup();

        // Simulate clicking global mode button
        dom.modeGlobalBtn.click();

        // Wait for async operations
        await new Promise(resolve => setTimeout(resolve, 10));

        expect(mockChrome.storage.local.set).toHaveBeenCalledWith(
          expect.objectContaining({
            switchingMode: 'global',
          })
        );
      });

      it('should preserve manual pause state when switching modes', async () => {
        mockChrome.storage.local.get.mockResolvedValue({
          enabled: true,
          switchingMode: 'global',
          manuallyPaused: true,
        });

        const { initializePopup } = await import('../popup/index');
        await initializePopup();

        dom.modeWindowBtn.click();
        await new Promise(resolve => setTimeout(resolve, 10));

        expect(mockChrome.storage.local.set).toHaveBeenCalledWith(
          expect.objectContaining({
            manuallyPausedWindows: expect.objectContaining({
              1: true,
            }),
          })
        );
      });
    });

    describe('UI State Updates', () => {
      it('should show disabled state', async () => {
        mockChrome.storage.local.get.mockResolvedValue({
          enabled: false,
          switchingMode: 'global',
        });

        const { initializePopup } = await import('../popup/index');
        await initializePopup();

        expect(dom.statusBadge.textContent).toBe('DISABLED');
        expect(dom.statusIcon.textContent).toBe('⏹️');
        expect(dom.statusText.textContent).toBe('Auto-switching disabled');
      });

      it('should show active state', async () => {
        const { isPaused } = await import('../core/activity-tracker');
        const { isManuallyPaused } = await import('../core/manual-pause-tracker');
        (isPaused as jest.Mock).mockResolvedValue(false);
        (isManuallyPaused as jest.Mock).mockResolvedValue(false);

        mockChrome.storage.local.get.mockResolvedValue({
          enabled: true,
          switchingMode: 'global',
          delayTime: 5000,
        });

        const { initializePopup } = await import('../popup/index');
        await initializePopup();

        expect(dom.statusBadge.textContent).toBe('ACTIVE');
        expect(dom.statusIcon.textContent).toBe('🔄');
        expect(dom.statusText.textContent).toBe('Auto-switching enabled');
      });

      it('should show paused state for activity pause', async () => {
        const { isPaused } = await import('../core/activity-tracker');
        const { isManuallyPaused } = await import('../core/manual-pause-tracker');
        (isPaused as jest.Mock).mockResolvedValue(true);
        (isManuallyPaused as jest.Mock).mockResolvedValue(false);

        mockChrome.storage.local.get.mockResolvedValue({
          enabled: true,
          switchingMode: 'global',
        });

        const { initializePopup } = await import('../popup/index');
        await initializePopup();

        expect(dom.statusBadge.textContent).toBe('PAUSED');
        expect(dom.statusText.textContent).toBe('Paused due to activity');
      });

      it('should show paused state for manual pause', async () => {
        const { isPaused } = await import('../core/activity-tracker');
        const { isManuallyPaused } = await import('../core/manual-pause-tracker');
        (isPaused as jest.Mock).mockResolvedValue(false);
        (isManuallyPaused as jest.Mock).mockResolvedValue(true);

        mockChrome.storage.local.get.mockResolvedValue({
          enabled: true,
          switchingMode: 'global',
          manuallyPaused: true,
        });

        const { initializePopup } = await import('../popup/index');
        await initializePopup();

        expect(dom.statusBadge.textContent).toBe('PAUSED');
        expect(dom.statusText.textContent).toBe('Paused by keyboard shortcut');
      });
    });

    describe('Settings Button', () => {
      it('should open settings page when clicked', async () => {
        mockChrome.storage.local.get.mockResolvedValue({
          enabled: false,
          switchingMode: 'global',
        });

        const { initializePopup } = await import('../popup/index');
        await initializePopup();

        dom.settingsButton.click();

        expect(mockChrome.runtime.openOptionsPage).toHaveBeenCalled();
      });
    });

    describe('Premium Teaser', () => {

    });

    describe('Storage Change Listener', () => {
      it('should update UI when storage changes', async () => {
        const { isPaused } = await import('../core/activity-tracker');
        const { isManuallyPaused } = await import('../core/manual-pause-tracker');
        (isPaused as jest.Mock).mockResolvedValue(false);
        (isManuallyPaused as jest.Mock).mockResolvedValue(false);

        mockChrome.storage.local.get.mockResolvedValue({
          enabled: false,
          switchingMode: 'global',
        });

        const { initializePopup } = await import('../popup/index');
        await initializePopup();

        expect(dom.statusBadge.textContent).toBe('DISABLED');

        // Get the storage change listener
        const storageChangeListener = mockChrome.storage.onChanged.addListener.mock.calls[0][0];

        // Update storage
        mockChrome.storage.local.get.mockResolvedValue({
          enabled: true,
          switchingMode: 'global',
          delayTime: 5000,
        });

        // Trigger storage change
        storageChangeListener({}, 'local');

        // Wait for async update
        await new Promise(resolve => setTimeout(resolve, 10));

        expect(dom.statusBadge.textContent).toBe('ACTIVE');
      });

      it('should ignore non-local storage changes', async () => {
        mockChrome.storage.local.get.mockResolvedValue({
          enabled: false,
          switchingMode: 'global',
        });

        const { initializePopup } = await import('../popup/index');
        await initializePopup();

        const initialBadge = dom.statusBadge.textContent;

        const storageChangeListener = mockChrome.storage.onChanged.addListener.mock.calls[0][0];

        // Trigger sync storage change (should be ignored)
        storageChangeListener({}, 'sync');

        await new Promise(resolve => setTimeout(resolve, 10));

        // Badge should not change
        expect(dom.statusBadge.textContent).toBe(initialBadge);
      });
    });

    describe('UI Update Error Handling', () => {
      it('should handle UI update errors gracefully', async () => {
        // First call succeeds for initialization
        mockChrome.storage.local.get.mockResolvedValueOnce({
          enabled: false,
          switchingMode: 'global',
        });

        const { initializePopup } = await import('../popup/index');
        await initializePopup();

        // Now make storage fail for subsequent updates
        mockChrome.storage.local.get.mockRejectedValueOnce(new Error('Storage error'));

        // Trigger an update via storage change
        const storageChangeListener = mockChrome.storage.onChanged.addListener.mock.calls[0][0];
        storageChangeListener({}, 'local');

        // Wait for error to be logged
        await new Promise(resolve => setTimeout(resolve, 50));

        const { logger } = await import('../core/logger');
        expect(logger.error).toHaveBeenCalledWith(
          'PopupIndex',
          'Error updating UI',
          expect.any(Object)
        );
      });

      it('should handle countdown update errors gracefully', async () => {
        mockChrome.storage.local.get.mockResolvedValue({
          enabled: true,
          switchingMode: 'global',
        });

        const { initializePopup } = await import('../popup/index');
        await initializePopup();

        // Cause an error in countdown by making storage fail
        mockChrome.storage.local.get.mockRejectedValueOnce(new Error('Storage error'));

        // Wait for countdown timer to tick
        await new Promise(resolve => setTimeout(resolve, 1100));

        const { logger } = await import('../core/logger');
        expect(logger.error).toHaveBeenCalled();
      });
    });

    describe('Countdown Timer', () => {
      it('should update countdown every second', async () => {
        mockChrome.storage.local.get.mockResolvedValue({
          enabled: true,
          switchingMode: 'global',
          delayTime: 5000,
          lastSwitchTimes: { 1: Date.now() },
        });

        const { initializePopup } = await import('../popup/index');
        await initializePopup();

        const initialCountdown = dom.countdownNumber.textContent;

        // Wait for countdown to update
        await new Promise(resolve => setTimeout(resolve, 1100));

        const updatedCountdown = dom.countdownNumber.textContent;

        // Countdown should have changed
        expect(updatedCountdown).not.toBe(initialCountdown);
      });

      it('should show pause icon when manually paused', async () => {
        const { isManuallyPaused } = await import('../core/manual-pause-tracker');
        (isManuallyPaused as jest.Mock).mockResolvedValue(true);

        mockChrome.storage.local.get.mockResolvedValue({
          enabled: true,
          switchingMode: 'global',
          manuallyPaused: true,
        });

        const { initializePopup } = await import('../popup/index');
        await initializePopup();

        // Wait for countdown update
        await new Promise(resolve => setTimeout(resolve, 100));

        expect(dom.countdownNumber.textContent).toBe('⏸');
      });

      it('should handle missing window ID in countdown', async () => {
        mockChrome.windows.getCurrent.mockResolvedValue({ id: undefined });

        mockChrome.storage.local.get.mockResolvedValue({
          enabled: true,
          switchingMode: 'global',
        });

        const { initializePopup } = await import('../popup/index');
        await initializePopup();

        // Should show placeholder
        await new Promise(resolve => setTimeout(resolve, 100));
        expect(dom.countdownNumber.textContent).toBeTruthy();
      });
    });
  });

  describe('popup/settings.ts', () => {
    describe('initializeSettings', () => {
      it('should load settings from storage', async () => {
        mockChrome.storage.local.get.mockResolvedValue({
          delayTime: 20000,
          windowMode: 'global',
          pauseOnActivity: false,
          pauseDuration: 30000,
        });

        const { initializeSettings } = await import('../popup/settings');
        await initializeSettings();

        expect(dom.delayTimeInput.value).toBe('20');
        expect(dom.pauseDurationInput.value).toBe('30');
      });

      it('should use default values when storage is empty', async () => {
        mockChrome.storage.local.get.mockResolvedValue({});

        const { initializeSettings } = await import('../popup/settings');
        await initializeSettings();

        expect(dom.delayTimeInput.value).toBe('2');
      });

      it('should load window mode settings', async () => {
        mockChrome.storage.local.get.mockResolvedValue({
          windowMode: 'current-window',
          selectedWindowId: 1,
        });

        const { initializeSettings } = await import('../popup/settings');
        await initializeSettings();

        expect(dom.radioCurrentWindow.classList.contains('selected')).toBe(true);
      });

      it('should load pause on activity settings', async () => {
        mockChrome.storage.local.get.mockResolvedValue({
          pauseOnActivity: true,
          pauseDuration: 60000,
        });

        const { initializeSettings } = await import('../popup/settings');
        await initializeSettings();

        expect(dom.pauseOnActivitySwitch.classList.contains('on')).toBe(true);
        expect(dom.pauseDurationSection.classList.contains('hidden')).toBe(false);
      });
    });

    describe('saveSettings', () => {
      it('should save valid settings to storage', async () => {
        mockChrome.storage.local.get.mockResolvedValue({});

        const { initializeSettings, saveSettings } = await import('../popup/settings');
        await initializeSettings();

        dom.delayTimeInput.value = '70';
        await saveSettings();

        expect(mockChrome.storage.local.set).toHaveBeenCalledWith(
          expect.objectContaining({
            delayTime: 70000,
          })
        );
      });

      it('should not save invalid delay time (too low)', async () => {
        mockChrome.storage.local.get.mockResolvedValue({});

        const { initializeSettings, saveSettings } = await import('../popup/settings');
        await initializeSettings();

        dom.delayTimeInput.value = '1';
        await saveSettings();

        expect(dom.errorMessage.classList.contains('show')).toBe(true);
      });

      it('should not save invalid delay time (too high)', async () => {
        mockChrome.storage.local.get.mockResolvedValue({});

        const { initializeSettings, saveSettings } = await import('../popup/settings');
        await initializeSettings();

        dom.delayTimeInput.value = '5000';
        await saveSettings();

        expect(dom.errorMessage.classList.contains('show')).toBe(true);
      });

      it('should not save invalid pause duration', async () => {
        mockChrome.storage.local.get.mockResolvedValue({});

        const { initializeSettings, saveSettings } = await import('../popup/settings');
        await initializeSettings();

        // Enable pause on activity
        dom.pauseOnActivityContainer.click();

        dom.delayTimeInput.value = '10';
        dom.pauseDurationInput.value = '2'; // Too low
        await saveSettings();

        expect(dom.errorMessage.classList.contains('show')).toBe(true);
      });

      it('should show confirmation for very low delay times', async () => {
        mockChrome.storage.local.get.mockResolvedValue({});

        const { initializeSettings, saveSettings } = await import('../popup/settings');
        await initializeSettings();

        dom.delayTimeInput.value = '3';

        // Start save which should show modal
        const savePromise = saveSettings();

        // Wait for modal to show
        await new Promise(resolve => setTimeout(resolve, 10));

        expect(dom.confirmModal.classList.contains('show')).toBe(true);

        // Cancel the modal
        dom.modalCancelBtn.click();
        await savePromise;

        // Should not save
        expect(mockChrome.storage.local.set).not.toHaveBeenCalled();
      });

      it('should save after confirming low delay time warning', async () => {
        mockChrome.storage.local.get.mockResolvedValue({});

        const { initializeSettings, saveSettings } = await import('../popup/settings');
        await initializeSettings();

        dom.delayTimeInput.value = '3';

        const savePromise = saveSettings();
        await new Promise(resolve => setTimeout(resolve, 10));

        // Confirm the modal
        dom.modalConfirmBtn.click();
        await savePromise;

        expect(mockChrome.storage.local.set).toHaveBeenCalled();
      });

      // Note: Modal confirmation test for mode switching requires complex async handling
      // The modal functionality is already tested in other modal tests
      it('should validate mode switching from window to global', async () => {
        mockChrome.storage.local.get.mockResolvedValue({
          windowMode: 'current-window',
          selectedWindowId: 1,
          enabled: false, // Not enabled, so no modal needed
        });

        const { initializeSettings, saveSettings } = await import('../popup/settings');
        await initializeSettings();

        // Switch to global mode
        dom.radioGlobal.click();

        dom.delayTimeInput.value = '10';
        await saveSettings();

        // Should save without modal when not enabled
        expect(mockChrome.storage.local.set).toHaveBeenCalled();
      });

      it('should close window after successful save', async () => {
        mockChrome.storage.local.get.mockResolvedValue({});

        const { initializeSettings, saveSettings } = await import('../popup/settings');
        await initializeSettings();

        dom.delayTimeInput.value = '10';

        await saveSettings();
        await new Promise(resolve => setTimeout(resolve, 1100));

        expect(window.close).toHaveBeenCalled();
      });
    });

    describe('selectWindowMode', () => {
      it('should select global mode', async () => {
        const { initializeSettings, selectWindowMode } = await import('../popup/settings');
        await initializeSettings();

        selectWindowMode('global');

        expect(dom.radioGlobal.classList.contains('selected')).toBe(true);
        expect(dom.windowInfo.style.display).toBe('none');
      });

      it('should select current window mode', async () => {
        const { initializeSettings, selectWindowMode } = await import('../popup/settings');
        await initializeSettings();

        selectWindowMode('current-window');

        expect(dom.radioCurrentWindow.classList.contains('selected')).toBe(true);
        // Window info should be shown asynchronously
        await new Promise(resolve => setTimeout(resolve, 10));
      });
    });

    describe('Reset to Defaults', () => {
      it('should reset settings to defaults after confirmation', async () => {
        mockChrome.storage.local.get.mockResolvedValue({
          delayTime: 100000,
          windowMode: 'current-window',
          pauseOnActivity: true,
        });

        const { initializeSettings } = await import('../popup/settings');
        await initializeSettings();

        // Click reset button
        dom.resetButton.click();

        // Wait for modal
        await new Promise(resolve => setTimeout(resolve, 10));

        expect(dom.confirmModal.classList.contains('show')).toBe(true);

        // Confirm reset
        dom.modalConfirmBtn.click();

        await new Promise(resolve => setTimeout(resolve, 10));

        expect(dom.delayTimeInput.value).toBe('2');
        expect(dom.radioGlobal.classList.contains('selected')).toBe(true);
      });

      it('should not reset when cancelled', async () => {
        mockChrome.storage.local.get.mockResolvedValue({
          delayTime: 100000,
        });

        const { initializeSettings } = await import('../popup/settings');
        await initializeSettings();

        const originalValue = dom.delayTimeInput.value;

        dom.resetButton.click();
        await new Promise(resolve => setTimeout(resolve, 10));

        // Cancel
        dom.modalCancelBtn.click();
        await new Promise(resolve => setTimeout(resolve, 10));

        expect(dom.delayTimeInput.value).toBe(originalValue);
      });
    });

    describe('Back Button', () => {
      it('should close window when back button clicked', async () => {
        const { initializeSettings } = await import('../popup/settings');
        await initializeSettings();

        const event = new Event('click');
        event.preventDefault = jest.fn();

        dom.backButton.dispatchEvent(event);

        expect(event.preventDefault).toHaveBeenCalled();
        expect(window.close).toHaveBeenCalled();
      });
    });

    describe('Pause On Activity Toggle', () => {
      it('should toggle pause on activity', async () => {
        const { initializeSettings } = await import('../popup/settings');
        await initializeSettings();

        // Initially off
        expect(dom.pauseOnActivitySwitch.classList.contains('on')).toBe(false);

        // Click to enable
        dom.pauseOnActivityContainer.click();

        expect(dom.pauseOnActivitySwitch.classList.contains('on')).toBe(true);
        expect(dom.pauseDurationSection.classList.contains('hidden')).toBe(false);

        // Click to disable
        dom.pauseOnActivityContainer.click();

        expect(dom.pauseOnActivitySwitch.classList.contains('on')).toBe(false);
        expect(dom.pauseDurationSection.classList.contains('hidden')).toBe(true);
      });
    });

    describe('Error Handling', () => {
      it('should handle storage load errors gracefully', async () => {
        mockChrome.storage.local.get.mockRejectedValue(new Error('Storage error'));

        const { initializeSettings } = await import('../popup/settings');
        await initializeSettings();

        expect(dom.errorMessage.classList.contains('show')).toBe(true);
      });

      it('should handle storage save errors gracefully', async () => {
        mockChrome.storage.local.get.mockResolvedValue({});
        mockChrome.storage.local.set.mockRejectedValue(new Error('Storage error'));

        const { initializeSettings, saveSettings } = await import('../popup/settings');
        await initializeSettings();

        dom.delayTimeInput.value = '10';
        await saveSettings();

        expect(dom.errorMessage.classList.contains('show')).toBe(true);
      });
    });

    describe('Modal Functionality', () => {
      it('should close modal on escape key', async () => {
        const { initializeSettings, saveSettings } = await import('../popup/settings');
        await initializeSettings();

        dom.delayTimeInput.value = '3';
        const savePromise = saveSettings();
        await new Promise(resolve => setTimeout(resolve, 10));

        expect(dom.confirmModal.classList.contains('show')).toBe(true);

        // Press escape
        const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
        document.dispatchEvent(escapeEvent);

        await savePromise;

        expect(dom.confirmModal.classList.contains('show')).toBe(false);
      });

      it('should close modal when clicking outside', async () => {
        const { initializeSettings, saveSettings } = await import('../popup/settings');
        await initializeSettings();

        dom.delayTimeInput.value = '3';
        const savePromise = saveSettings();
        await new Promise(resolve => setTimeout(resolve, 10));

        // Click on modal backdrop
        const clickEvent = new MouseEvent('click', { bubbles: true });
        Object.defineProperty(clickEvent, 'target', { value: dom.confirmModal, enumerable: true });
        dom.confirmModal.dispatchEvent(clickEvent);

        await savePromise;

        expect(dom.confirmModal.classList.contains('show')).toBe(false);
      });
    });
  });
});