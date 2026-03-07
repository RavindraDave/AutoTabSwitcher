/**
 * Comprehensive tests for onboarding.ts
 * Tests onboarding tour flow, DOM manipulation, and event handlers
 *
 * @jest-environment jsdom
 */

import { jest, describe, test, expect, beforeEach, afterEach } from '@jest/globals';

// Set up chrome mocks for jsdom environment
const mockChrome = {
  storage: {
    local: {
      set: jest.fn(),
      get: jest.fn(),
      remove: jest.fn(),
      clear: jest.fn()
    }
  },
  tabs: {
    getCurrent: jest.fn(),
    remove: jest.fn(),
    query: jest.fn(),
    update: jest.fn(),
    create: jest.fn()
  },
  windows: {
    getCurrent: jest.fn(),
    getAll: jest.fn(),
    create: jest.fn()
  }
};

(global as any).chrome = mockChrome;

// Mock logger
jest.mock('../core/logger.js', () => ({
  logger: {
    error: jest.fn().mockResolvedValue(undefined),
    info: jest.fn().mockResolvedValue(undefined),
    warn: jest.fn().mockResolvedValue(undefined),
    debug: jest.fn().mockResolvedValue(undefined)
  }
}));

describe('Onboarding', () => {
  let mockPrevButton: HTMLButtonElement;
  let mockNextButton: HTMLButtonElement;
  let mockFinishButton: HTMLButtonElement;
  let mockSkipButton: HTMLButtonElement;
  let mockSteps: HTMLElement[];
  let mockProgressSteps: HTMLElement[];

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules(); // Reset module cache for fresh initialization

    // Setup DOM
    document.body.innerHTML = '';

    // Create navigation buttons
    mockPrevButton = document.createElement('button');
    mockPrevButton.id = 'prevButton';
    document.body.appendChild(mockPrevButton);

    mockNextButton = document.createElement('button');
    mockNextButton.id = 'nextButton';
    document.body.appendChild(mockNextButton);

    mockFinishButton = document.createElement('button');
    mockFinishButton.id = 'finishButton';
    mockFinishButton.style.display = 'none';
    document.body.appendChild(mockFinishButton);

    mockSkipButton = document.createElement('button');
    mockSkipButton.id = 'skipButton';
    document.body.appendChild(mockSkipButton);

    // Create tour steps
    mockSteps = [];
    for (let i = 1; i <= 5; i++) {
      const step = document.createElement('div');
      step.id = `step${i}`;
      step.classList.add('tour-step');
      mockSteps.push(step);
      document.body.appendChild(step);
    }

    // Create progress steps
    mockProgressSteps = [];
    for (let i = 0; i < 5; i++) {
      const progressStep = document.createElement('div');
      progressStep.classList.add('progress-step');
      mockProgressSteps.push(progressStep);
      document.body.appendChild(progressStep);
    }

    // Reset chrome mocks
    mockChrome.storage.local.set.mockReset();
    mockChrome.storage.local.set.mockResolvedValue(undefined);
    mockChrome.tabs.getCurrent.mockReset();
    mockChrome.tabs.getCurrent.mockResolvedValue({ id: 123 });
    mockChrome.tabs.remove.mockReset();
    mockChrome.tabs.remove.mockResolvedValue(undefined);

    // Set document to ready state for immediate initialization
    Object.defineProperty(document, 'readyState', {
      writable: true,
      configurable: true,
      value: 'complete'
    });
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('initialization and navigation', () => {
    test('should initialize and allow navigation', async () => {
      // Import module to trigger initialization
      await import('../onboarding/onboarding.js');

      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check that first step is shown
      expect(mockSteps[0].classList.contains('active')).toBe(true);
      expect(mockPrevButton.disabled).toBe(true);

      // Navigate forward
      mockNextButton.click();
      expect(mockSteps[1].classList.contains('active')).toBe(true);
      expect(mockPrevButton.disabled).toBe(false);

      // Navigate backward
      mockPrevButton.click();
      expect(mockSteps[0].classList.contains('active')).toBe(true);
      expect(mockPrevButton.disabled).toBe(true);

      // Navigate to last step
      for (let i = 0; i < 3; i++) {
        mockNextButton.click();
      }
      expect(mockSteps[3].classList.contains('active')).toBe(true);
      expect(mockNextButton.style.display).toBe('none');
      expect(mockFinishButton.style.display).toBe('block');

      // Navigate back from last step
      mockPrevButton.click();
      expect(mockSteps[2].classList.contains('active')).toBe(true);
      expect(mockNextButton.style.display).toBe('block');
      expect(mockFinishButton.style.display).toBe('none');
    });

    test('should handle completion successfully', async () => {
      await import('../onboarding/onboarding.js');
      await new Promise(resolve => setTimeout(resolve, 50));

      mockFinishButton.click();
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
        hasSeenOnboarding: true
      });
      expect(mockChrome.tabs.remove).toHaveBeenCalledWith(123);
    });

    test('should handle skip button', async () => {
      await import('../onboarding/onboarding.js');
      await new Promise(resolve => setTimeout(resolve, 50));

      mockSkipButton.click();
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
        hasSeenOnboarding: true
      });
    });

    test('should handle storage error and call window.close', async () => {
      const { logger } = await import('../core/logger.js');
      mockChrome.storage.local.set.mockRejectedValue(new Error('Storage error'));

      const windowCloseSpy = jest.spyOn(window, 'close').mockImplementation(() => {});

      await import('../onboarding/onboarding.js');
      await new Promise(resolve => setTimeout(resolve, 50));

      mockFinishButton.click();
      await new Promise(resolve => setTimeout(resolve, 250));

      expect(logger.error).toHaveBeenCalled();
      expect(windowCloseSpy).toHaveBeenCalled();

      windowCloseSpy.mockRestore();
    });

    test('should handle missing tab ID', async () => {
      mockChrome.tabs.getCurrent.mockResolvedValue({});

      await import('../onboarding/onboarding.js');
      await new Promise(resolve => setTimeout(resolve, 50));

      mockFinishButton.click();
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should save but not remove tab
      expect(mockChrome.storage.local.set).toHaveBeenCalled();
      expect(mockChrome.tabs.remove).not.toHaveBeenCalled();
    });

    test('should update progress bar', async () => {
      await import('../onboarding/onboarding.js');
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(mockProgressSteps[0].classList.contains('active')).toBe(true);

      mockNextButton.click();
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(mockProgressSteps[0].classList.contains('completed')).toBe(true);
      expect(mockProgressSteps[1].classList.contains('active')).toBe(true);

      mockNextButton.click();
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(mockProgressSteps[0].classList.contains('completed')).toBe(true);
      expect(mockProgressSteps[1].classList.contains('completed')).toBe(true);
      expect(mockProgressSteps[2].classList.contains('active')).toBe(true);
    });
  });
});
