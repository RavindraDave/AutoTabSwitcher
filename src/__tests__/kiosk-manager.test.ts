jest.mock('../core/logger.js', () => ({
  logger: {
    debug: jest.fn().mockResolvedValue(undefined),
    info: jest.fn().mockResolvedValue(undefined),
    warn: jest.fn().mockResolvedValue(undefined),
    error: jest.fn().mockResolvedValue(undefined),
  },
}));

const mockChrome = (global as any).chrome;

// Add windows.update mock (not in default setup)
mockChrome.windows.update = jest.fn().mockResolvedValue({});

// Add scripting mock (not in default setup)
mockChrome.scripting = {
  executeScript: jest.fn().mockResolvedValue([]),
};

import {
  enterKioskMode,
  exitKioskMode,
  isWindowInKioskMode,
  exitAllKioskWindows,
  detectKioskExits,
  notifyKioskOverlayOfSwitch,
} from '../core/kiosk-manager';

describe('kiosk-manager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockChrome.storage.local.get.mockResolvedValue({});
    mockChrome.storage.local.set.mockResolvedValue(undefined);
    mockChrome.windows.update.mockResolvedValue({});
    mockChrome.windows.get.mockResolvedValue({ id: 1, state: 'fullscreen' });
    mockChrome.scripting.executeScript.mockResolvedValue([]);
  });

  describe('enterKioskMode', () => {
    it('should set the window to fullscreen', async () => {
      await enterKioskMode(1);
      expect(mockChrome.windows.update).toHaveBeenCalledWith(1, { state: 'fullscreen' });
    });

    it('should add the window id to storage tracking list', async () => {
      mockChrome.storage.local.get.mockResolvedValue({ kioskFullscreenWindowIds: [] });
      await enterKioskMode(1);
      expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
        kioskFullscreenWindowIds: [1],
      });
    });

    it('should append to existing tracked windows', async () => {
      mockChrome.storage.local.get.mockResolvedValue({ kioskFullscreenWindowIds: [2] });
      await enterKioskMode(1);
      expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
        kioskFullscreenWindowIds: expect.arrayContaining([1, 2]),
      });
    });

    it('should not duplicate window ids', async () => {
      mockChrome.storage.local.get.mockResolvedValue({ kioskFullscreenWindowIds: [1] });
      await enterKioskMode(1);
      expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
        kioskFullscreenWindowIds: [1],
      });
    });

    it('should handle windows.update failure without throwing', async () => {
      mockChrome.windows.update.mockRejectedValue(new Error('Window not found'));
      await enterKioskMode(999);
      expect(mockChrome.storage.local.set).not.toHaveBeenCalled();
    });
  });

  describe('exitKioskMode', () => {
    it('should set the window state to normal', async () => {
      mockChrome.storage.local.get.mockResolvedValue({ kioskFullscreenWindowIds: [1] });
      await exitKioskMode(1);
      expect(mockChrome.windows.update).toHaveBeenCalledWith(1, { state: 'normal' });
    });

    it('should remove the window id from tracking list', async () => {
      mockChrome.storage.local.get.mockResolvedValue({ kioskFullscreenWindowIds: [1, 2] });
      await exitKioskMode(1);
      expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
        kioskFullscreenWindowIds: [2],
      });
    });

    it('should handle missing window gracefully', async () => {
      mockChrome.windows.update.mockRejectedValue(new Error('Window not found'));
      mockChrome.storage.local.get.mockResolvedValue({ kioskFullscreenWindowIds: [1] });
      await exitKioskMode(1);
      expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
        kioskFullscreenWindowIds: [],
      });
    });
  });

  describe('isWindowInKioskMode', () => {
    it('should return true for tracked windows', async () => {
      mockChrome.storage.local.get.mockResolvedValue({ kioskFullscreenWindowIds: [1, 2] });
      expect(await isWindowInKioskMode(1)).toBe(true);
    });

    it('should return false for untracked windows', async () => {
      mockChrome.storage.local.get.mockResolvedValue({ kioskFullscreenWindowIds: [2] });
      expect(await isWindowInKioskMode(1)).toBe(false);
    });

    it('should return false when no windows are tracked', async () => {
      mockChrome.storage.local.get.mockResolvedValue({});
      expect(await isWindowInKioskMode(1)).toBe(false);
    });
  });

  describe('exitAllKioskWindows', () => {
    it('should exit fullscreen for all tracked windows', async () => {
      mockChrome.storage.local.get.mockResolvedValue({ kioskFullscreenWindowIds: [1, 2, 3] });
      await exitAllKioskWindows();

      expect(mockChrome.windows.update).toHaveBeenCalledWith(1, { state: 'normal' });
      expect(mockChrome.windows.update).toHaveBeenCalledWith(2, { state: 'normal' });
      expect(mockChrome.windows.update).toHaveBeenCalledWith(3, { state: 'normal' });
      expect(mockChrome.storage.local.set).toHaveBeenCalledWith({ kioskFullscreenWindowIds: [] });
    });

    it('should handle closed windows gracefully', async () => {
      mockChrome.storage.local.get.mockResolvedValue({ kioskFullscreenWindowIds: [1, 2] });
      mockChrome.windows.update
        .mockRejectedValueOnce(new Error('Window closed'))
        .mockResolvedValueOnce({});

      await exitAllKioskWindows();
      expect(mockChrome.storage.local.set).toHaveBeenCalledWith({ kioskFullscreenWindowIds: [] });
    });
  });

  describe('detectKioskExits', () => {
    it('should be a no-op when no windows are tracked', async () => {
      mockChrome.storage.local.get.mockResolvedValue({ kioskFullscreenWindowIds: [] });
      await detectKioskExits();
      expect(mockChrome.windows.get).not.toHaveBeenCalled();
    });

    it('should remove windows that exited fullscreen', async () => {
      mockChrome.storage.local.get.mockResolvedValue({ kioskFullscreenWindowIds: [1, 2] });
      mockChrome.windows.get
        .mockResolvedValueOnce({ id: 1, state: 'normal' })
        .mockResolvedValueOnce({ id: 2, state: 'fullscreen' });

      await detectKioskExits();

      expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
        kioskFullscreenWindowIds: [2],
      });
    });

    it('should remove closed windows from tracking', async () => {
      mockChrome.storage.local.get.mockResolvedValue({ kioskFullscreenWindowIds: [1, 2] });
      mockChrome.windows.get
        .mockRejectedValueOnce(new Error('Window not found'))
        .mockResolvedValueOnce({ id: 2, state: 'fullscreen' });

      await detectKioskExits();

      expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
        kioskFullscreenWindowIds: [2],
      });
    });

    it('should not update storage when all windows are still in fullscreen', async () => {
      mockChrome.storage.local.get.mockResolvedValue({ kioskFullscreenWindowIds: [1] });
      mockChrome.windows.get.mockResolvedValue({ id: 1, state: 'fullscreen' });

      await detectKioskExits();

      expect(mockChrome.storage.local.set).not.toHaveBeenCalled();
    });
  });

  describe('notifyKioskOverlayOfSwitch', () => {
    it('should be a no-op when kiosk mode is off', async () => {
      mockChrome.storage.local.get.mockResolvedValue({ kioskMode: false });
      await notifyKioskOverlayOfSwitch(1, 'https://example.com', 'Test', 5000);
      expect(mockChrome.scripting.executeScript).not.toHaveBeenCalled();
    });

    it('should be a no-op when overlay is disabled', async () => {
      mockChrome.storage.local.get.mockResolvedValue({
        kioskMode: true,
        kioskOverlayEnabled: false,
      });
      await notifyKioskOverlayOfSwitch(1, 'https://example.com', 'Test', 5000);
      expect(mockChrome.scripting.executeScript).not.toHaveBeenCalled();
    });

    it('should skip restricted URLs', async () => {
      mockChrome.storage.local.get.mockResolvedValue({
        kioskMode: true,
        kioskOverlayEnabled: true,
      });
      await notifyKioskOverlayOfSwitch(1, 'chrome://extensions', 'Extensions', 5000);
      expect(mockChrome.scripting.executeScript).not.toHaveBeenCalled();
    });

    it('should skip chrome-extension:// URLs', async () => {
      mockChrome.storage.local.get.mockResolvedValue({
        kioskMode: true,
        kioskOverlayEnabled: true,
      });
      await notifyKioskOverlayOfSwitch(1, 'chrome-extension://abc/popup.html', 'Popup', 5000);
      expect(mockChrome.scripting.executeScript).not.toHaveBeenCalled();
    });

    it('should skip web store URLs', async () => {
      mockChrome.storage.local.get.mockResolvedValue({
        kioskMode: true,
        kioskOverlayEnabled: true,
      });
      await notifyKioskOverlayOfSwitch(1, 'https://chromewebstore.google.com/detail/test', 'Store', 5000);
      expect(mockChrome.scripting.executeScript).not.toHaveBeenCalled();
    });

    it('should skip undefined URLs', async () => {
      mockChrome.storage.local.get.mockResolvedValue({
        kioskMode: true,
        kioskOverlayEnabled: true,
      });
      await notifyKioskOverlayOfSwitch(1, undefined, 'Test', 5000);
      expect(mockChrome.scripting.executeScript).not.toHaveBeenCalled();
    });

    it('should inject overlay script for eligible URLs', async () => {
      mockChrome.storage.local.get.mockResolvedValue({
        kioskMode: true,
        kioskOverlayEnabled: true,
        kioskOverlayAutoHideMs: 3000,
      });
      await notifyKioskOverlayOfSwitch(1, 'https://grafana.local/dashboard', 'Dashboard', 5000);
      expect(mockChrome.scripting.executeScript).toHaveBeenCalledWith({
        target: { tabId: 1 },
        func: expect.any(Function),
        args: ['Dashboard', 5000, 3000],
      });
    });

    it('should use default auto-hide when not configured', async () => {
      mockChrome.storage.local.get.mockResolvedValue({
        kioskMode: true,
        kioskOverlayEnabled: true,
      });
      await notifyKioskOverlayOfSwitch(1, 'https://example.com', 'Test', 5000);
      expect(mockChrome.scripting.executeScript).toHaveBeenCalledWith(
        expect.objectContaining({
          args: ['Test', 5000, 3000],
        })
      );
    });

    it('should handle script injection failure gracefully', async () => {
      mockChrome.storage.local.get.mockResolvedValue({
        kioskMode: true,
        kioskOverlayEnabled: true,
      });
      mockChrome.scripting.executeScript.mockRejectedValue(new Error('Cannot inject'));
      await notifyKioskOverlayOfSwitch(1, 'https://example.com', 'Test', 5000);
      // Should not throw
    });
  });
});
