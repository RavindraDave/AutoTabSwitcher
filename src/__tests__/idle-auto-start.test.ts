/**
 * Tests for Idle Auto-Start feature
 */

import { initializeIdleAutoStart, setupIdleDetection, teardownIdleDetection, reconfigureIdleDetection } from '../core/idle-auto-start';

// Mock the storage module
jest.mock('../core/storage', () => ({
  getIdleSettings: jest.fn(),
  getSettings: jest.fn(),
  getSwitchingMode: jest.fn(),
}));

jest.mock('../core/logger', () => ({
  logger: {
    info: jest.fn().mockResolvedValue(undefined),
    warn: jest.fn().mockResolvedValue(undefined),
    error: jest.fn().mockResolvedValue(undefined),
    debug: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../core/build-config', () => ({
  PREMIUM_FEATURES_AVAILABLE: false,
  BUILD_TYPE: 'test',
  BUILD_TIMESTAMP: Date.now(),
}));

const { getIdleSettings, getSettings, getSwitchingMode } = require('../core/storage');

describe('Idle Auto-Start', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    teardownIdleDetection(); // Clean state between tests
    (chrome.storage.local.set as jest.Mock).mockResolvedValue(undefined);
    (chrome.storage.local.get as jest.Mock).mockResolvedValue({});
  });

  describe('initializeIdleAutoStart', () => {
    it('should not set up detection when disabled', async () => {
      getIdleSettings.mockResolvedValue({
        idleAutoStart: false,
        idleThresholdSeconds: 60,
        idleStopOnActive: true,
      });

      await initializeIdleAutoStart();

      expect(chrome.idle.setDetectionInterval).not.toHaveBeenCalled();
      expect(chrome.idle.onStateChanged.addListener).not.toHaveBeenCalled();
    });

    it('should set up detection when enabled', async () => {
      getIdleSettings.mockResolvedValue({
        idleAutoStart: true,
        idleThresholdSeconds: 120,
        idleStopOnActive: true,
      });

      await initializeIdleAutoStart();

      expect(chrome.idle.setDetectionInterval).toHaveBeenCalledWith(120);
      expect(chrome.idle.onStateChanged.addListener).toHaveBeenCalled();
    });
  });

  describe('setupIdleDetection', () => {
    it('should clamp threshold to minimum of 15 seconds', async () => {
      await setupIdleDetection(5);
      expect(chrome.idle.setDetectionInterval).toHaveBeenCalledWith(15);
    });

    it('should clamp threshold to maximum of 3600 seconds', async () => {
      await setupIdleDetection(5000);
      expect(chrome.idle.setDetectionInterval).toHaveBeenCalledWith(3600);
    });

    it('should only add listener once', async () => {
      await setupIdleDetection(60);
      await setupIdleDetection(90);

      expect(chrome.idle.onStateChanged.addListener).toHaveBeenCalledTimes(1);
      expect(chrome.idle.setDetectionInterval).toHaveBeenCalledTimes(2);
    });
  });

  describe('teardownIdleDetection', () => {
    it('should remove listener when active', async () => {
      await setupIdleDetection(60);
      teardownIdleDetection();

      expect(chrome.idle.onStateChanged.removeListener).toHaveBeenCalled();
    });

    it('should do nothing when not active', () => {
      teardownIdleDetection();
      expect(chrome.idle.onStateChanged.removeListener).not.toHaveBeenCalled();
    });
  });

  describe('reconfigureIdleDetection', () => {
    it('should set up detection when enabled', async () => {
      getIdleSettings.mockResolvedValue({
        idleAutoStart: true,
        idleThresholdSeconds: 90,
        idleStopOnActive: true,
      });

      await reconfigureIdleDetection();

      expect(chrome.idle.setDetectionInterval).toHaveBeenCalledWith(90);
    });

    it('should tear down detection when disabled', async () => {
      // First enable
      await setupIdleDetection(60);

      getIdleSettings.mockResolvedValue({
        idleAutoStart: false,
        idleThresholdSeconds: 60,
        idleStopOnActive: true,
      });

      await reconfigureIdleDetection();

      expect(chrome.idle.onStateChanged.removeListener).toHaveBeenCalled();
    });
  });

  describe('idle state change handling', () => {
    it('should start cycling in global mode when idle', async () => {
      getIdleSettings.mockResolvedValue({
        idleAutoStart: true,
        idleThresholdSeconds: 60,
        idleStopOnActive: true,
      });

      await setupIdleDetection(60);

      // Get the listener that was registered
      const listener = (chrome.idle.onStateChanged.addListener as jest.Mock).mock.calls[0][0];

      // Mock storage for the idle handler
      getSettings.mockResolvedValue({ enabled: false, switchingMode: 'global' });
      getSwitchingMode.mockReturnValue('global');

      await listener('idle');

      expect(chrome.storage.local.set).toHaveBeenCalledWith({ enabled: true });
    });

    it('should stop cycling when active and stopOnActive is true', async () => {
      getIdleSettings.mockResolvedValue({
        idleAutoStart: true,
        idleThresholdSeconds: 60,
        idleStopOnActive: true,
      });

      await setupIdleDetection(60);
      const listener = (chrome.idle.onStateChanged.addListener as jest.Mock).mock.calls[0][0];

      // First go idle to trigger start
      getSettings.mockResolvedValue({ enabled: false, switchingMode: 'global' });
      getSwitchingMode.mockReturnValue('global');
      await listener('idle');

      // Then go active
      getIdleSettings.mockResolvedValue({
        idleAutoStart: true,
        idleThresholdSeconds: 60,
        idleStopOnActive: true,
      });
      getSettings.mockResolvedValue({ switchingMode: 'global' });
      getSwitchingMode.mockReturnValue('global');
      await listener('active');

      expect(chrome.storage.local.set).toHaveBeenCalledWith({ enabled: false });
    });

    it('should not stop cycling when active and stopOnActive is false', async () => {
      getIdleSettings.mockResolvedValue({
        idleAutoStart: true,
        idleThresholdSeconds: 60,
        idleStopOnActive: false,
      });

      await setupIdleDetection(60);
      const listener = (chrome.idle.onStateChanged.addListener as jest.Mock).mock.calls[0][0];

      // First go idle to trigger start
      getSettings.mockResolvedValue({ enabled: false, switchingMode: 'global' });
      getSwitchingMode.mockReturnValue('global');
      await listener('idle');

      jest.clearAllMocks();

      // Then go active with stopOnActive=false
      getIdleSettings.mockResolvedValue({
        idleAutoStart: true,
        idleThresholdSeconds: 60,
        idleStopOnActive: false,
      });

      await listener('active');

      // Should NOT have called set to disable
      expect(chrome.storage.local.set).not.toHaveBeenCalledWith({ enabled: false });
    });
  });
});
