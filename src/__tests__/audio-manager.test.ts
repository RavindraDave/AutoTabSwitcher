jest.mock('../core/logger.js', () => ({
  logger: {
    debug: jest.fn().mockResolvedValue(undefined),
    info: jest.fn().mockResolvedValue(undefined),
    warn: jest.fn().mockResolvedValue(undefined),
    error: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../core/storage.js', () => ({
  getAudioManagementMode: jest.fn(),
}));

import { applyAudioManagementForSwitch, restoreAllOriginalMuteStates, forgetTabMuteSnapshot } from '../core/audio-manager';
import { getAudioManagementMode } from '../core/storage';

const mockChrome = (global as any).chrome;
const mockGetMode = getAudioManagementMode as jest.Mock;

describe('audio-manager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockChrome.storage.local.get.mockResolvedValue({});
    mockChrome.storage.local.set.mockResolvedValue(undefined);
    mockChrome.tabs.query.mockResolvedValue([]);
    mockChrome.tabs.update.mockResolvedValue({});
    mockGetMode.mockResolvedValue('off');
  });

  describe('applyAudioManagementForSwitch', () => {
    it('should be a no-op when mode is off', async () => {
      mockGetMode.mockResolvedValue('off');
      await applyAudioManagementForSwitch(1, 100);
      expect(mockChrome.tabs.query).not.toHaveBeenCalled();
    });

    it('should mute inactive tabs and unmute the active tab', async () => {
      mockGetMode.mockResolvedValue('mute-inactive');
      mockChrome.tabs.query.mockResolvedValue([
        { id: 100, mutedInfo: { muted: false } },
        { id: 200, mutedInfo: { muted: false } },
        { id: 300, mutedInfo: { muted: false } },
      ]);
      mockChrome.storage.local.get.mockResolvedValue({});

      await applyAudioManagementForSwitch(1, 200);

      expect(mockChrome.tabs.update).toHaveBeenCalledWith(100, { muted: true });
      expect(mockChrome.tabs.update).toHaveBeenCalledWith(300, { muted: true });
      expect(mockChrome.tabs.update).not.toHaveBeenCalledWith(200, expect.anything());
    });

    it('should snapshot original mute states on first touch', async () => {
      mockGetMode.mockResolvedValue('mute-inactive');
      mockChrome.tabs.query.mockResolvedValue([
        { id: 100, mutedInfo: { muted: true } },
        { id: 200, mutedInfo: { muted: false } },
      ]);
      mockChrome.storage.local.get.mockResolvedValue({});

      await applyAudioManagementForSwitch(1, 200);

      expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
        audioOriginalMuteStates: { 100: true, 200: false },
      });
    });

    it('should not overwrite existing snapshots', async () => {
      mockGetMode.mockResolvedValue('mute-inactive');
      mockChrome.tabs.query.mockResolvedValue([
        { id: 100, mutedInfo: { muted: false } },
        { id: 200, mutedInfo: { muted: false } },
      ]);
      mockChrome.storage.local.get.mockResolvedValue({
        audioOriginalMuteStates: { 100: true },
      });

      await applyAudioManagementForSwitch(1, 200);

      expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
        audioOriginalMuteStates: { 100: true, 200: false },
      });
    });

    it('should skip tabs already in the desired mute state', async () => {
      mockGetMode.mockResolvedValue('mute-inactive');
      mockChrome.tabs.query.mockResolvedValue([
        { id: 100, mutedInfo: { muted: true } },
        { id: 200, mutedInfo: { muted: false } },
      ]);
      mockChrome.storage.local.get.mockResolvedValue({
        audioOriginalMuteStates: { 100: true, 200: false },
      });

      await applyAudioManagementForSwitch(1, 200);

      expect(mockChrome.tabs.update).not.toHaveBeenCalled();
    });

    it('should handle tabs.query failure gracefully', async () => {
      mockGetMode.mockResolvedValue('mute-inactive');
      mockChrome.tabs.query.mockRejectedValue(new Error('Window not found'));

      await applyAudioManagementForSwitch(1, 100);
      // Should not throw
    });

    it('should handle tabs.update failure gracefully', async () => {
      mockGetMode.mockResolvedValue('mute-inactive');
      mockChrome.tabs.query.mockResolvedValue([
        { id: 100, mutedInfo: { muted: false } },
        { id: 200, mutedInfo: { muted: false } },
      ]);
      mockChrome.storage.local.get.mockResolvedValue({});
      mockChrome.tabs.update.mockRejectedValue(new Error('Tab closed'));

      await applyAudioManagementForSwitch(1, 200);
      // Should not throw
    });
  });

  describe('restoreAllOriginalMuteStates', () => {
    it('should restore every tab to its original mute state', async () => {
      mockChrome.storage.local.get.mockResolvedValue({
        audioOriginalMuteStates: { 100: true, 200: false, 300: false },
      });

      await restoreAllOriginalMuteStates();

      expect(mockChrome.tabs.update).toHaveBeenCalledWith(100, { muted: true });
      expect(mockChrome.tabs.update).toHaveBeenCalledWith(200, { muted: false });
      expect(mockChrome.tabs.update).toHaveBeenCalledWith(300, { muted: false });
      expect(mockChrome.storage.local.set).toHaveBeenCalledWith({ audioOriginalMuteStates: {} });
    });

    it('should be a no-op with empty snapshot', async () => {
      mockChrome.storage.local.get.mockResolvedValue({ audioOriginalMuteStates: {} });

      await restoreAllOriginalMuteStates();

      expect(mockChrome.tabs.update).not.toHaveBeenCalled();
    });

    it('should handle missing snapshot gracefully', async () => {
      mockChrome.storage.local.get.mockResolvedValue({});

      await restoreAllOriginalMuteStates();

      expect(mockChrome.tabs.update).not.toHaveBeenCalled();
    });

    it('should skip closed tabs without throwing', async () => {
      mockChrome.storage.local.get.mockResolvedValue({
        audioOriginalMuteStates: { 100: false, 200: true },
      });
      mockChrome.tabs.update
        .mockRejectedValueOnce(new Error('Tab not found'))
        .mockResolvedValueOnce({});

      await restoreAllOriginalMuteStates();

      expect(mockChrome.tabs.update).toHaveBeenCalledTimes(2);
      expect(mockChrome.storage.local.set).toHaveBeenCalledWith({ audioOriginalMuteStates: {} });
    });
  });

  describe('forgetTabMuteSnapshot', () => {
    it('should remove the tab from the snapshot', async () => {
      mockChrome.storage.local.get.mockResolvedValue({
        audioOriginalMuteStates: { 100: true, 200: false },
      });

      await forgetTabMuteSnapshot(100);

      expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
        audioOriginalMuteStates: { 200: false },
      });
    });

    it('should be a no-op if tab is not in snapshot', async () => {
      mockChrome.storage.local.get.mockResolvedValue({
        audioOriginalMuteStates: { 200: false },
      });

      await forgetTabMuteSnapshot(100);

      expect(mockChrome.storage.local.set).not.toHaveBeenCalled();
    });

    it('should be a no-op with empty snapshot', async () => {
      mockChrome.storage.local.get.mockResolvedValue({});

      await forgetTabMuteSnapshot(100);

      expect(mockChrome.storage.local.set).not.toHaveBeenCalled();
    });
  });
});
