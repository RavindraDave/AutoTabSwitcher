/**
 * Tests for Context Menu Manager
 */

import { initializeContextMenus, handleContextMenuClick, reconfigureContextMenus } from '../core/context-menu-manager';

jest.mock('../core/storage', () => ({
  getContextMenuEnabled: jest.fn(),
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

const { getContextMenuEnabled, getSettings, getSwitchingMode } = require('../core/storage');

describe('Context Menu Manager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (chrome.contextMenus.removeAll as jest.Mock).mockImplementation((cb) => cb && cb());
    (chrome.storage.local.set as jest.Mock).mockResolvedValue(undefined);
    (chrome.storage.local.get as jest.Mock).mockResolvedValue({});
  });

  describe('initializeContextMenus', () => {
    it('should create menus when enabled', async () => {
      getContextMenuEnabled.mockResolvedValue(true);

      await initializeContextMenus();

      expect(chrome.contextMenus.removeAll).toHaveBeenCalled();
      expect(chrome.contextMenus.create).toHaveBeenCalledTimes(5); // parent + 4 items (toggle, exclude, set-delay, separator)
    });

    it('should remove menus when disabled', async () => {
      getContextMenuEnabled.mockResolvedValue(false);

      await initializeContextMenus();

      expect(chrome.contextMenus.removeAll).toHaveBeenCalled();
      expect(chrome.contextMenus.create).not.toHaveBeenCalled();
    });
  });

  describe('handleContextMenuClick', () => {
    it('should toggle cycling in global mode', async () => {
      getSettings.mockResolvedValue({ enabled: false, switchingMode: 'global' });
      getSwitchingMode.mockReturnValue('global');

      await handleContextMenuClick(
        { menuItemId: 'ats-toggle-cycling' } as chrome.contextMenus.OnClickData,
        undefined
      );

      expect(chrome.storage.local.set).toHaveBeenCalledWith({ enabled: true });
    });

    it('should exclude tab by adding skip rule', async () => {
      (chrome.storage.local.get as jest.Mock).mockResolvedValue({ skipRules: [] });

      const tab = { id: 1, url: 'https://example.com', title: 'Example' } as chrome.tabs.Tab;

      await handleContextMenuClick(
        { menuItemId: 'ats-exclude-tab' } as chrome.contextMenus.OnClickData,
        tab
      );

      expect(chrome.storage.local.set).toHaveBeenCalledWith(
        expect.objectContaining({
          skipRules: expect.arrayContaining([
            expect.objectContaining({
              type: 'url',
              pattern: 'https://example.com',
              enabled: true,
            }),
          ]),
        })
      );
    });

    it('should not duplicate exclude rules', async () => {
      (chrome.storage.local.get as jest.Mock).mockResolvedValue({
        skipRules: [{
          id: 'existing',
          type: 'url',
          pattern: 'https://example.com',
          enabled: true,
        }],
      });

      const tab = { id: 1, url: 'https://example.com', title: 'Example' } as chrome.tabs.Tab;

      await handleContextMenuClick(
        { menuItemId: 'ats-exclude-tab' } as chrome.contextMenus.OnClickData,
        tab
      );

      // Should NOT add a duplicate rule
      expect(chrome.storage.local.set).not.toHaveBeenCalled();
    });
  });

  describe('reconfigureContextMenus', () => {
    it('should create menus when enabled', async () => {
      getContextMenuEnabled.mockResolvedValue(true);

      await reconfigureContextMenus();

      expect(chrome.contextMenus.create).toHaveBeenCalled();
    });

    it('should remove menus when disabled', async () => {
      getContextMenuEnabled.mockResolvedValue(false);

      await reconfigureContextMenus();

      expect(chrome.contextMenus.removeAll).toHaveBeenCalled();
      expect(chrome.contextMenus.create).not.toHaveBeenCalled();
    });
  });
});
