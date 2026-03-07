/**
 * Tests for Switch Notification system
 */

import { notifyTabSwitch, cleanupNotifier } from '../core/switch-notifier';

jest.mock('../core/storage', () => ({
  getSwitchNotification: jest.fn(),
}));

jest.mock('../core/badge-manager', () => ({
  updateBadge: jest.fn().mockResolvedValue(undefined),
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

const { getSwitchNotification } = require('../core/storage');

describe('Switch Notifier', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    cleanupNotifier();
    (chrome.action.setBadgeText as jest.Mock).mockResolvedValue(undefined);
    (chrome.action.setBadgeBackgroundColor as jest.Mock).mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should not show notification when disabled', async () => {
    getSwitchNotification.mockResolvedValue(false);

    await notifyTabSwitch('Tab 1', 'Tab 2', 1);

    expect(chrome.action.setBadgeText).not.toHaveBeenCalled();
  });

  it('should flash badge when enabled', async () => {
    getSwitchNotification.mockResolvedValue(true);

    await notifyTabSwitch('Tab 1', 'Tab 2', 1);

    expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: '>>' });
    expect(chrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({ color: '#4CAF50' });
  });

  it('should restore badge after timeout', async () => {
    getSwitchNotification.mockResolvedValue(true);
    const { updateBadge } = require('../core/badge-manager');

    await notifyTabSwitch('Tab 1', 'Tab 2', 1);

    // Fast forward past the notification display time
    jest.advanceTimersByTime(2500);

    // Badge should be restored (updateBadge called)
    expect(updateBadge).toHaveBeenCalledWith(true, false);
  });

  it('should clear previous timeout on rapid switches', async () => {
    getSwitchNotification.mockResolvedValue(true);

    await notifyTabSwitch('Tab 1', 'Tab 2', 1);
    await notifyTabSwitch('Tab 2', 'Tab 3', 1);

    // setBadgeText should have been called twice
    expect(chrome.action.setBadgeText).toHaveBeenCalledTimes(2);
  });

  describe('cleanupNotifier', () => {
    it('should clear pending timeout', async () => {
      getSwitchNotification.mockResolvedValue(true);

      await notifyTabSwitch('Tab 1', 'Tab 2', 1);
      cleanupNotifier();

      // Advance time - badge restore should NOT be called since we cleaned up
      jest.advanceTimersByTime(3000);

      const { updateBadge } = require('../core/badge-manager');
      expect(updateBadge).not.toHaveBeenCalled();
    });
  });
});
