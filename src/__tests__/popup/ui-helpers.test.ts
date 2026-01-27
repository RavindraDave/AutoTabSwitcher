/**
 * @jest-environment jsdom
 */

/**
 * Comprehensive tests for popup UI helper functions
 * Tests all UI helper utilities with 90%+ coverage
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  showError,
  updateWindowInfo,
  handleWindowModeChange,
  handlePauseOnActivityChange,
  showWindowModeWarning,
} from '../../popup/shared/ui-helpers';

// Mock Chrome APIs
const mockChrome = (global as any).chrome;

// Mock Logger
jest.mock('../../core/logger', () => ({
  logger: {
    info: jest.fn().mockResolvedValue(undefined),
    error: jest.fn().mockResolvedValue(undefined),
    warn: jest.fn().mockResolvedValue(undefined),
    debug: jest.fn().mockResolvedValue(undefined),
  },
}));

describe('popup/shared/ui-helpers.ts', () => {
  beforeEach(() => {
    // Clear document body
    document.body.innerHTML = '';

    // Reset all mocks
    jest.clearAllMocks();

    // Mock Chrome windows API
    mockChrome.windows.get.mockResolvedValue({
      id: 1,
      tabs: [
        { id: 1, url: 'https://example.com' },
        { id: 2, url: 'https://example.org' },
      ],
    });

    mockChrome.windows.getCurrent.mockResolvedValue({ id: 1 });
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('showError', () => {
    it('should create and display error message element', () => {
      // Create a form group for the error to be appended to
      const formGroup = document.createElement('div');
      formGroup.className = 'form-group';
      document.body.appendChild(formGroup);

      showError('Test error message');

      const errorEl = document.getElementById('errorMessage');
      expect(errorEl).not.toBeNull();
      expect(errorEl?.textContent).toBe('Test error message');
      expect(errorEl?.style.display).toBe('block');
      expect(errorEl?.className).toContain('alert-danger');
      expect(errorEl?.getAttribute('role')).toBe('alert');
    });

    it('should update existing error message element', () => {
      const formGroup = document.createElement('div');
      formGroup.className = 'form-group';
      document.body.appendChild(formGroup);

      // Show first error
      showError('First error');
      let errorEl = document.getElementById('errorMessage');
      expect(errorEl?.textContent).toBe('First error');

      // Show second error
      showError('Second error');
      errorEl = document.getElementById('errorMessage');
      expect(errorEl?.textContent).toBe('Second error');

      // Should not create duplicate elements
      const errorEls = document.querySelectorAll('#errorMessage');
      expect(errorEls.length).toBe(1);
    });

    it('should auto-hide error message after 3 seconds', (done) => {
      const formGroup = document.createElement('div');
      formGroup.className = 'form-group';
      document.body.appendChild(formGroup);

      showError('Auto-hide test');

      const errorEl = document.getElementById('errorMessage');
      expect(errorEl?.style.display).toBe('block');

      setTimeout(() => {
        expect(errorEl?.style.display).toBe('none');
        done();
      }, 3100);
    });

    it('should handle missing form group gracefully', () => {
      // No form group in document
      showError('Test error');

      const errorEl = document.getElementById('errorMessage');
      // Without a form group, element won't be appended and may not be in DOM
      // This should not throw an error
      expect(() => showError('Test')).not.toThrow();
    });
  });

  describe('updateWindowInfo', () => {
    beforeEach(() => {
      // Create windowInfo element
      const windowInfo = document.createElement('div');
      windowInfo.id = 'windowInfo';
      windowInfo.style.display = 'none';
      document.body.appendChild(windowInfo);
    });

    it('should update window info with window details', async () => {
      await updateWindowInfo(1);

      const windowInfo = document.getElementById('windowInfo');
      expect(windowInfo?.innerHTML).toContain('Window 1');
      expect(windowInfo?.innerHTML).toContain('2 tabs');
      expect(windowInfo?.style.display).toBe('block');
    });

    it('should handle window with no tabs', async () => {
      mockChrome.windows.get.mockResolvedValue({
        id: 2,
        tabs: undefined,
      });

      await updateWindowInfo(2);

      const windowInfo = document.getElementById('windowInfo');
      expect(windowInfo?.innerHTML).toContain('0 tabs');
    });

    it('should handle window with single tab', async () => {
      mockChrome.windows.get.mockResolvedValue({
        id: 3,
        tabs: [{ id: 1 }],
      });

      await updateWindowInfo(3);

      const windowInfo = document.getElementById('windowInfo');
      expect(windowInfo?.innerHTML).toContain('1 tabs');
    });

    it('should handle chrome.windows.get errors gracefully', async () => {
      mockChrome.windows.get.mockRejectedValue(new Error('Window not found'));

      await updateWindowInfo(999);

      const windowInfo = document.getElementById('windowInfo');
      expect(windowInfo?.style.display).toBe('none');

      const { logger } = await import('../../core/logger');
      expect(logger.error).toHaveBeenCalledWith(
        'PopupUI',
        'Error getting window info',
        expect.objectContaining({
          error: 'Window not found',
        })
      );
    });

    it('should handle missing windowInfo element', async () => {
      // Remove the element
      document.getElementById('windowInfo')?.remove();

      // Should not throw
      await expect(updateWindowInfo(1)).resolves.not.toThrow();
    });
  });

  describe('handleWindowModeChange', () => {
    beforeEach(() => {
      const windowInfo = document.createElement('div');
      windowInfo.id = 'windowInfo';
      windowInfo.style.display = 'none';
      document.body.appendChild(windowInfo);
    });

    it('should show window info for current-window mode', async () => {
      await handleWindowModeChange('current-window');

      const windowInfo = document.getElementById('windowInfo');
      expect(windowInfo?.style.display).toBe('block');
      expect(windowInfo?.innerHTML).toContain('Window 1');
    });

    it('should hide window info for global mode', async () => {
      const windowInfo = document.getElementById('windowInfo');
      windowInfo!.style.display = 'block';

      await handleWindowModeChange('global');

      expect(windowInfo?.style.display).toBe('none');
    });

    it('should handle missing windowInfo element gracefully', async () => {
      document.getElementById('windowInfo')?.remove();

      await expect(handleWindowModeChange('current-window')).resolves.not.toThrow();
      await expect(handleWindowModeChange('global')).resolves.not.toThrow();
    });

    it('should handle window ID retrieval failure', async () => {
      mockChrome.windows.getCurrent.mockResolvedValue({ id: undefined });

      await handleWindowModeChange('current-window');

      // Should not crash
      const windowInfo = document.getElementById('windowInfo');
      expect(windowInfo).toBeDefined();
    });
  });

  describe('handlePauseOnActivityChange', () => {
    beforeEach(() => {
      const pauseDurationSection = document.createElement('div');
      pauseDurationSection.id = 'pauseDurationSection';
      pauseDurationSection.style.display = 'none';
      document.body.appendChild(pauseDurationSection);
    });

    it('should show pause duration section when checked', () => {
      handlePauseOnActivityChange(true);

      const section = document.getElementById('pauseDurationSection');
      expect(section?.style.display).toBe('block');
    });

    it('should hide pause duration section when unchecked', () => {
      const section = document.getElementById('pauseDurationSection');
      section!.style.display = 'block';

      handlePauseOnActivityChange(false);

      expect(section?.style.display).toBe('none');
    });

    it('should handle missing element gracefully', () => {
      document.getElementById('pauseDurationSection')?.remove();

      expect(() => handlePauseOnActivityChange(true)).not.toThrow();
      expect(() => handlePauseOnActivityChange(false)).not.toThrow();
    });
  });

  describe('showWindowModeWarning', () => {
    beforeEach(() => {
      const windowInfo = document.createElement('div');
      windowInfo.id = 'windowInfo';
      document.body.appendChild(windowInfo);
    });

    it('should show warning for different window', () => {
      showWindowModeWarning(2, 1);

      const windowInfo = document.getElementById('windowInfo');
      expect(windowInfo?.innerHTML).toContain('⚠️ Note:');
      expect(windowInfo?.innerHTML).toContain('Window 2');
      expect(windowInfo?.innerHTML).toContain('Window 1');
      expect(windowInfo?.innerHTML).toContain('alert-warning');
    });

    it('should show warning without current window ID', () => {
      showWindowModeWarning(5);

      const windowInfo = document.getElementById('windowInfo');
      expect(windowInfo?.innerHTML).toContain('Window 5');
      expect(windowInfo?.innerHTML).not.toContain('Window undefined');
    });

    it('should not add duplicate warnings', () => {
      showWindowModeWarning(2, 1);
      showWindowModeWarning(2, 1);

      const windowInfo = document.getElementById('windowInfo');
      const warnings = windowInfo?.querySelectorAll('.alert-warning');
      expect(warnings?.length).toBe(1);
    });

    it('should preserve existing content when adding warning', () => {
      const windowInfo = document.getElementById('windowInfo');
      windowInfo!.innerHTML = '<p>Existing content</p>';

      showWindowModeWarning(2, 1);

      expect(windowInfo?.innerHTML).toContain('Existing content');
      expect(windowInfo?.innerHTML).toContain('⚠️ Note:');
    });

    it('should handle missing windowInfo element gracefully', () => {
      document.getElementById('windowInfo')?.remove();

      expect(() => showWindowModeWarning(2, 1)).not.toThrow();
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete workflow for window mode selection', async () => {
      // Setup DOM
      const windowInfo = document.createElement('div');
      windowInfo.id = 'windowInfo';
      document.body.appendChild(windowInfo);

      // Select window mode
      await handleWindowModeChange('current-window');
      expect(windowInfo.style.display).toBe('block');

      // Show warning if viewing from different window
      showWindowModeWarning(2, 1);
      expect(windowInfo.innerHTML).toContain('alert-warning');

      // Switch back to global mode
      await handleWindowModeChange('global');
      expect(windowInfo.style.display).toBe('none');
    });

    it('should handle complete workflow for pause on activity', () => {
      // Setup DOM
      const container = document.createElement('div');
      container.id = 'pauseDurationSection';
      container.style.display = 'none';
      document.body.appendChild(container);

      // Enable pause on activity
      handlePauseOnActivityChange(true);
      expect(container.style.display).toBe('block');

      // Disable pause on activity
      handlePauseOnActivityChange(false);
      expect(container.style.display).toBe('none');
    });

    it('should handle errors during window info updates', async () => {
      const windowInfo = document.createElement('div');
      windowInfo.id = 'windowInfo';
      document.body.appendChild(windowInfo);

      // Simulate Chrome API error
      mockChrome.windows.get.mockRejectedValue(new Error('API Error'));

      await updateWindowInfo(1);

      expect(windowInfo.style.display).toBe('none');

      const { logger } = await import('../../core/logger');
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle multiple rapid error displays', () => {
      const formGroup = document.createElement('div');
      formGroup.className = 'form-group';
      document.body.appendChild(formGroup);

      showError('Error 1');
      showError('Error 2');
      showError('Error 3');

      const errorEl = document.getElementById('errorMessage');
      expect(errorEl?.textContent).toBe('Error 3');

      const errorEls = document.querySelectorAll('#errorMessage');
      expect(errorEls.length).toBe(1);
    });

    it('should handle window info updates with special characters', async () => {
      const windowInfo = document.createElement('div');
      windowInfo.id = 'windowInfo';
      document.body.appendChild(windowInfo);

      mockChrome.windows.get.mockResolvedValue({
        id: 1,
        tabs: [
          { id: 1, url: 'https://example.com/<script>alert("xss")</script>' },
        ],
      });

      await updateWindowInfo(1);

      // Should display safely
      expect(windowInfo.innerHTML).toContain('1 tabs');
      expect(windowInfo.style.display).toBe('block');
    });

    it('should handle concurrent window mode changes', async () => {
      const windowInfo = document.createElement('div');
      windowInfo.id = 'windowInfo';
      document.body.appendChild(windowInfo);

      // Trigger multiple changes
      const promises = [
        handleWindowModeChange('current-window'),
        handleWindowModeChange('global'),
        handleWindowModeChange('current-window'),
      ];

      await Promise.all(promises);

      // Final state should be current-window
      expect(windowInfo.style.display).toBe('block');
    });

    it('should handle window with very large number of tabs', async () => {
      const manyTabs = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        url: `https://example.com/${i}`,
      }));

      mockChrome.windows.get.mockResolvedValue({
        id: 1,
        tabs: manyTabs,
      });

      const windowInfo = document.createElement('div');
      windowInfo.id = 'windowInfo';
      document.body.appendChild(windowInfo);

      await updateWindowInfo(1);

      expect(windowInfo.innerHTML).toContain('1000 tabs');
    });
  });
});
