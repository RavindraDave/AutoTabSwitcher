/**
 * UI helper functions for popup
 */

import { logger } from '../../core/logger.js';
import { createElement, setContent, createAlert } from '../../utils/dom-safe.js';

/**
 * Show error message to user
 *
 * @param message - Error message to display
 */
export function showError(message: string): void {
  // Create or update error message element
  let errorEl = document.getElementById('errorMessage');

  if (!errorEl) {
    errorEl = document.createElement('div');
    errorEl.id = 'errorMessage';
    errorEl.className = 'alert alert-danger mt-2';
    errorEl.setAttribute('role', 'alert');

    const formGroup = document.querySelector('.form-group');
    if (formGroup) {
      formGroup.appendChild(errorEl);
    }
  }

  errorEl.textContent = message;
  errorEl.style.display = 'block';

  // Auto-hide after 3 seconds
  setTimeout(() => {
    if (errorEl) {
      errorEl.style.display = 'none';
    }
  }, 3000);
}

/**
 * Update window information display
 *
 * @param windowId - Chrome window ID to display info for
 */
export async function updateWindowInfo(windowId: number): Promise<void> {
  try {
    const windowInfoEl = document.getElementById('windowInfo');
    if (!windowInfoEl) return;

    const window = await chrome.windows.get(windowId, { populate: true });
    const tabCount = window.tabs ? window.tabs.length : 0;

    // XSS-safe: Use DOM methods instead of innerHTML
    const small = createElement('small', { className: 'text-muted' });
    const strong = createElement('strong', { text: 'Selected Window:' });
    small.appendChild(strong);
    small.appendChild(document.createTextNode(` Window ${windowId} (${tabCount} tabs)`));

    setContent(windowInfoEl, small);
    windowInfoEl.style.display = 'block';
  } catch (error) {
    await logger.error('PopupUI', 'Error getting window info', {
      error: error instanceof Error ? error.message : String(error)
    });
    const windowInfoEl = document.getElementById('windowInfo');
    if (windowInfoEl) {
      windowInfoEl.style.display = 'none';
    }
  }
}

/**
 * Handle window mode change
 *
 * @param mode - Window mode ('global' or 'current-window')
 */
export async function handleWindowModeChange(mode: 'global' | 'current-window'): Promise<void> {
  const windowInfoEl = document.getElementById('windowInfo');
  if (!windowInfoEl) return;

  if (mode === 'current-window') {
    // Get current window and show info
    const currentWindow = await chrome.windows.getCurrent();
    if (currentWindow.id) {
      await updateWindowInfo(currentWindow.id);
    }
  } else {
    // Hide window info for global mode
    windowInfoEl.style.display = 'none';
  }
}

/**
 * Handle pause on activity checkbox change
 *
 * @param checked - Whether checkbox is checked
 */
export function handlePauseOnActivityChange(checked: boolean): void {
  const pauseDurationSection = document.getElementById('pauseDurationSection');
  if (pauseDurationSection) {
    pauseDurationSection.style.display = checked ? 'block' : 'none';
  }
}

/**
 * Show warning when viewing settings from non-selected window in current-window mode
 *
 * @param selectedWindowId - The window where auto-switching is active
 * @param currentWindowId - The current window ID (optional)
 */
export function showWindowModeWarning(selectedWindowId: number, currentWindowId?: number): void {
  const windowInfoEl = document.getElementById('windowInfo');
  if (!windowInfoEl) return;

  // Check if warning already exists
  if (windowInfoEl.querySelector('.alert-warning')) {
    return;
  }

  // XSS-safe: Use DOM methods instead of innerHTML
  const message = `Auto-switching is active in Window ${selectedWindowId}, not this window${currentWindowId ? ` (Window ${currentWindowId})` : ''}.`;
  const warning = createAlert(message, {
    type: 'warning',
    title: '⚠️ Note:',
    className: 'mt-2 mb-0'
  });
  warning.style.padding = '0.5rem';
  warning.style.fontSize = '0.875rem';

  // Append warning after existing content
  windowInfoEl.appendChild(warning);
}
