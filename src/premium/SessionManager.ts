/**
 * Session Manager - Premium Feature
 *
 * Manages saved tab sessions including:
 * - Creating sessions from current tabs
 * - Restoring sessions (new window, current, or replace)
 * - Deleting sessions
 * - Auto-launching sessions on startup
 * - Session templates for quick setup
 */

import type {
  SavedSession,
  SavedTab,
  SessionTemplate,
  SaveSessionOptions
} from '../core/types.js';
import {
  getSavedSessions,
  saveSession as saveSessionToStorage,
  deleteSession as deleteSessionFromStorage,
  getAutoLaunchSessionIds,
  setAutoLaunchSessionIds
} from '../core/storage.js';
import { requirePremiumLicense } from '../core/premium-access.js';
import { logger } from '../core/logger.js';
import { MAX_SESSIONS, MAX_TABS_PER_SESSION, SESSION_TEMPLATE_IDS } from '../core/constants.js';

/**
 * Whitelist of allowed URL protocols for security
 */
const ALLOWED_PROTOCOLS = ['http:', 'https:', 'file:', 'ftp:'];

/**
 * Validate URL for security - only allow safe protocols
 * Prevents javascript:, data:, vbscript: and other malicious URLs
 *
 * @param url - URL to validate
 * @returns true if URL is safe to restore, false otherwise
 */
function isValidUrl(url: string): boolean {
  if (!url) return false;

  // Block chrome:// and extension URLs (can't be restored)
  if (url.startsWith('chrome://') || url.startsWith('chrome-extension://')) {
    return false;
  }

  try {
    const parsed = new URL(url);
    return ALLOWED_PROTOCOLS.includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Session Manager class
 */
export class SessionManager {
  /**
   * Retry an operation with exponential backoff
   * @param operation - The async operation to retry
   * @param maxRetries - Maximum number of retry attempts (default: 3)
   * @param initialDelay - Initial delay in ms (default: 100)
   */
  private async retryOperation<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    initialDelay: number = 100
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry on the last attempt
        if (attempt === maxRetries) {
          break;
        }

        // Check if error is retryable (network errors, temporary failures)
        const isRetryable = this.isRetryableError(lastError);
        if (!isRetryable) {
          // Don't retry non-retryable errors (e.g., invalid arguments)
          throw lastError;
        }

        // Exponential backoff: 100ms, 200ms, 400ms, etc.
        const delay = initialDelay * Math.pow(2, attempt);
        logger.debug('SessionManager', 'Retrying operation', {
          attempt: attempt + 1,
          maxRetries,
          delay,
          error: lastError.message
        });

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError || new Error('Operation failed after retries');
  }

  /**
   * Check if an error is retryable
   */
  private isRetryableError(error: Error): boolean {
    const retryableMessages = [
      'network',
      'timeout',
      'temporarily unavailable',
      'quota',
      'rate limit'
    ];

    const errorMessage = error.message.toLowerCase();
    return retryableMessages.some(msg => errorMessage.includes(msg));
  }

  /**
   * Save current window tabs as a session
   */
  async saveCurrentWindow(
    name: string,
    options: {
      description?: string;
      icon?: string;
      windowId?: number;
      saveOptions?: SaveSessionOptions;
    } = {}
  ): Promise<SavedSession> {
    await requirePremiumLicense();

    const { description, icon, windowId, saveOptions = {} } = options;

    // Get current window if not specified
    const targetWindowId = windowId ?? (await chrome.windows.getCurrent()).id;
    if (!targetWindowId) {
      throw new Error('No window ID available');
    }

    // Get all tabs in window
    const tabs = await chrome.tabs.query({ windowId: targetWindowId });

    if (tabs.length === 0) {
      throw new Error('No tabs found in window');
    }

    if (tabs.length > MAX_TABS_PER_SESSION) {
      throw new Error(`Too many tabs. Maximum ${MAX_TABS_PER_SESSION} tabs per session.`);
    }

    // Check session limit
    const existingSessions = await getSavedSessions();
    if (existingSessions.length >= MAX_SESSIONS) {
      throw new Error(`Maximum number of sessions (${MAX_SESSIONS}) reached. Please delete some sessions first.`);
    }

    // Convert tabs to SavedTab format, filtering out invalid tabs
    const savedTabs: SavedTab[] = [];
    for (let i = 0; i < tabs.length; i++) {
      const tab = tabs[i];
      if (!tab) continue; // Skip if undefined

      // Skip tabs with invalid URLs (security: only allow http/https/file/ftp)
      if (!isValidUrl(tab.url)) {
        logger.debug('SessionManager', 'Skipping invalid/unsafe tab URL', {
          url: tab.url,
          title: tab.title
        });
        continue;
      }

      savedTabs.push({
        url: tab.url,
        title: saveOptions.includeTitles !== false ? tab.title : undefined,
        favIconUrl: saveOptions.includeFavicons !== false ? tab.favIconUrl : undefined,
        pinned: saveOptions.includePinnedState !== false ? tab.pinned : undefined,
        index: savedTabs.length // Use actual index in saved array
      });
    }

    // Verify we have at least one valid tab after filtering
    if (savedTabs.length === 0) {
      throw new Error('No restorable tabs found in window (only chrome:// URLs or invalid tabs)');
    }

    // Create session object
    const session: SavedSession = {
      id: this.generateSessionId(),
      name: name,
      description: description,
      icon: icon,
      tabs: savedTabs,
      createdAt: Date.now(),
      launchCount: 0
    };

    // Save to storage
    await saveSessionToStorage(session);

    logger.info('SessionManager', 'Session saved', {
      sessionId: session.id,
      name: session.name,
      tabCount: savedTabs.length
    });

    return session;
  }

  /**
   * Save all tabs from all windows as separate sessions
   */
  async saveAllWindows(namePrefix: string = 'Window'): Promise<SavedSession[]> {
    await requirePremiumLicense();

    const windows = await chrome.windows.getAll({ populate: true });
    const sessions: SavedSession[] = [];

    for (let i = 0; i < windows.length; i++) {
      const window = windows[i];
      if (!window || !window.id || !window.tabs || window.tabs.length === 0) {
        continue;
      }

      try {
        const session = await this.saveCurrentWindow(
          `${namePrefix} ${i + 1}`,
          { windowId: window.id }
        );
        sessions.push(session);
      } catch (error) {
        logger.error('SessionManager', 'Failed to save window', { windowId: window.id, error });
      }
    }

    return sessions;
  }

  /**
   * Restore a session
   */
  async restoreSession(
    sessionId: string,
    mode: 'new-window' | 'current' | 'replace' = 'new-window'
  ): Promise<void> {
    await requirePremiumLicense();

    const sessions = await getSavedSessions();
    const session = sessions.find(s => s.id === sessionId);

    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    if (session.tabs.length === 0) {
      throw new Error('Session has no tabs to restore');
    }

    logger.info('SessionManager', 'Restoring session', {
      sessionId,
      mode,
      tabCount: session.tabs.length
    });

    try {
      switch (mode) {
        case 'new-window':
          await this.restoreInNewWindow(session);
          break;
        case 'current':
          await this.restoreInCurrentWindow(session);
          break;
        case 'replace':
          await this.replaceCurrentWindow(session);
          break;
      }

      // Update session stats
      session.lastLaunched = Date.now();
      session.launchCount = (session.launchCount || 0) + 1;
      await saveSessionToStorage(session);

      logger.info('SessionManager', 'Session restored successfully', { sessionId });
    } catch (error) {
      logger.error('SessionManager', 'Failed to restore session', { sessionId, error });
      throw error;
    }
  }

  /**
   * Restore session in a new window
   */
  private async restoreInNewWindow(session: SavedSession): Promise<void> {
    // Sort tabs by index to maintain order
    const sortedTabs = [...session.tabs].sort((a, b) => (a.index || 0) - (b.index || 0));

    // Create new window with first tab
    const firstTab = sortedTabs[0];
    if (!firstTab) {
      throw new Error('No tabs to restore');
    }

    const newWindow = await chrome.windows.create({
      url: firstTab.url,
      focused: true
    });

    if (!newWindow.id) {
      throw new Error('Failed to create new window');
    }

    // Add remaining tabs with error handling and retry logic
    let successCount = 1; // First tab already created
    for (let i = 1; i < sortedTabs.length; i++) {
      const tab = sortedTabs[i];
      if (!tab) continue; // Skip if undefined

      try {
        // Verify window still exists before creating tab
        await chrome.windows.get(newWindow.id);

        // Use retry logic for tab creation
        await this.retryOperation(async () => {
          return await chrome.tabs.create({
            windowId: newWindow.id,
            url: tab.url,
            pinned: tab.pinned || false,
            active: false
          });
        });
        successCount++;
      } catch (error) {
        logger.warn('SessionManager', 'Failed to create tab in new window', {
          tabIndex: i,
          url: tab.url,
          error
        });
        // Continue with remaining tabs
      }
    }

    // Pin the first tab if needed (with error handling)
    if (firstTab.pinned && newWindow.tabs?.[0]?.id) {
      try {
        await chrome.tabs.update(newWindow.tabs[0].id, { pinned: true });
      } catch (error) {
        logger.warn('SessionManager', 'Failed to pin first tab', { error });
        // Non-critical error, continue
      }
    }

    logger.info('SessionManager', 'Session restored in new window', {
      totalTabs: sortedTabs.length,
      successfulTabs: successCount
    });
  }

  /**
   * Restore session in current window (append tabs)
   */
  private async restoreInCurrentWindow(session: SavedSession): Promise<void> {
    const currentWindow = await chrome.windows.getCurrent();
    if (!currentWindow.id) {
      throw new Error('No current window');
    }

    // Sort tabs by index
    const sortedTabs = [...session.tabs].sort((a, b) => (a.index || 0) - (b.index || 0));

    // Add tabs to current window with error handling and retry logic
    let successCount = 0;
    for (const tab of sortedTabs) {
      try {
        // Verify window still exists before creating tab
        await chrome.windows.get(currentWindow.id);

        // Use retry logic for tab creation
        await this.retryOperation(async () => {
          return await chrome.tabs.create({
            windowId: currentWindow.id,
            url: tab.url,
            pinned: tab.pinned || false,
            active: false
          });
        });
        successCount++;
      } catch (error) {
        logger.warn('SessionManager', 'Failed to create tab in current window', {
          url: tab.url,
          error
        });
        // Continue with remaining tabs
      }
    }

    logger.info('SessionManager', 'Session restored in current window', {
      totalTabs: sortedTabs.length,
      successfulTabs: successCount
    });
  }

  /**
   * Replace current window tabs with session tabs
   */
  private async replaceCurrentWindow(session: SavedSession): Promise<void> {
    const currentWindow = await chrome.windows.getCurrent();
    if (!currentWindow.id) {
      throw new Error('No current window');
    }

    // Get current tabs and store their IDs for later removal
    const currentTabs = await chrome.tabs.query({ windowId: currentWindow.id });
    const tabIdsToRemove = currentTabs.map(tab => tab.id).filter((id): id is number => id !== undefined);

    // Create new tabs from session with error handling and retry logic
    const sortedTabs = [...session.tabs].sort((a, b) => (a.index || 0) - (b.index || 0));
    let successCount = 0;

    for (const tab of sortedTabs) {
      try {
        // Verify window still exists
        await chrome.windows.get(currentWindow.id);

        // Use retry logic for tab creation
        await this.retryOperation(async () => {
          return await chrome.tabs.create({
            windowId: currentWindow.id,
            url: tab.url,
            pinned: tab.pinned || false,
            active: false
          });
        });
        successCount++;
      } catch (error) {
        logger.warn('SessionManager', 'Failed to create replacement tab', {
          url: tab.url,
          error
        });
        // Continue with remaining tabs
      }
    }

    // Close old tabs with error handling (tabs might already be closed)
    // Process in reverse to handle potential index shifts
    let removedCount = 0;
    for (let i = tabIdsToRemove.length - 1; i >= 0; i--) {
      const tabId = tabIdsToRemove[i];
      if (tabId === undefined) continue; // Skip if undefined

      try {
        // Verify tab still exists before trying to remove
        await chrome.tabs.get(tabId);
        await chrome.tabs.remove(tabId);
        removedCount++;
      } catch (error) {
        // Tab might already be closed - this is not a critical error
        logger.debug('SessionManager', 'Tab already closed or unavailable', {
          tabId,
          error
        });
        // Continue with remaining tabs
      }
    }

    logger.info('SessionManager', 'Session replaced in current window', {
      totalNewTabs: sortedTabs.length,
      successfulNewTabs: successCount,
      totalOldTabs: tabIdsToRemove.length,
      removedOldTabs: removedCount
    });
  }

  /**
   * Delete a session
   */
  async deleteSession(sessionId: string): Promise<void> {
    await requirePremiumLicense();

    await deleteSessionFromStorage(sessionId);

    // Remove from auto-launch if present
    const autoLaunchIds = await getAutoLaunchSessionIds();
    if (autoLaunchIds.includes(sessionId)) {
      await setAutoLaunchSessionIds(autoLaunchIds.filter(id => id !== sessionId));
    }

    logger.info('SessionManager', 'Session deleted', { sessionId });
  }

  /**
   * Get all saved sessions
   */
  async getAllSessions(): Promise<SavedSession[]> {
    await requirePremiumLicense();

    return await getSavedSessions();
  }

  /**
   * Get a specific session
   */
  async getSession(sessionId: string): Promise<SavedSession | null> {
    await requirePremiumLicense();

    const sessions = await getSavedSessions();
    return sessions.find(s => s.id === sessionId) || null;
  }

  /**
   * Update session metadata
   */
  async updateSession(
    sessionId: string,
    updates: Partial<Pick<SavedSession, 'name' | 'description' | 'icon' | 'autoLaunchOnStartup' | 'launchMode'>>
  ): Promise<void> {
    await requirePremiumLicense();

    const sessions = await getSavedSessions();
    const session = sessions.find(s => s.id === sessionId);

    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    // Update fields
    if (updates.name !== undefined) session.name = updates.name;
    if (updates.description !== undefined) session.description = updates.description;
    if (updates.icon !== undefined) session.icon = updates.icon;
    if (updates.autoLaunchOnStartup !== undefined) session.autoLaunchOnStartup = updates.autoLaunchOnStartup;
    if (updates.launchMode !== undefined) session.launchMode = updates.launchMode;

    session.updatedAt = Date.now();

    await saveSessionToStorage(session);

    logger.info('SessionManager', 'Session updated', { sessionId, updates });
  }

  /**
   * Set sessions to auto-launch on startup
   */
  async setAutoLaunchSessions(sessionIds: string[]): Promise<void> {
    await requirePremiumLicense();

    // Verify all sessions exist
    const sessions = await getSavedSessions();
    const sessionIdSet = new Set(sessions.map(s => s.id));

    const invalidIds = sessionIds.filter(id => !sessionIdSet.has(id));
    if (invalidIds.length > 0) {
      throw new Error(`Invalid session IDs: ${invalidIds.join(', ')}`);
    }

    await setAutoLaunchSessionIds(sessionIds);

    logger.info('SessionManager', 'Auto-launch sessions updated', { sessionIds });
  }

  /**
   * Get sessions set to auto-launch
   */
  async getAutoLaunchSessions(): Promise<SavedSession[]> {
    await requirePremiumLicense();

    const sessionIds = await getAutoLaunchSessionIds();
    const allSessions = await getSavedSessions();

    return allSessions.filter(s => sessionIds.includes(s.id));
  }

  /**
   * Launch all auto-launch sessions
   * Called on extension startup
   */
  async launchAutoStartSessions(): Promise<void> {
    await requirePremiumLicense();

    const sessions = await this.getAutoLaunchSessions();

    if (sessions.length === 0) {
      logger.info('SessionManager', 'No auto-launch sessions configured');
      return;
    }

    logger.info('SessionManager', 'Launching auto-start sessions', {
      count: sessions.length
    });

    for (const session of sessions) {
      try {
        const mode = session.launchMode || 'new-window';
        await this.restoreSession(session.id, mode);

        // Small delay between launches to avoid overwhelming the browser
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        logger.error('SessionManager', 'Failed to launch auto-start session', {
          sessionId: session.id,
          error
        });
      }
    }
  }

  /**
   * Create session from template
   */
  async createFromTemplate(template: SessionTemplate, name?: string): Promise<SavedSession> {
    await requirePremiumLicense();

    const session: SavedSession = {
      id: this.generateSessionId(),
      name: name || template.name,
      description: template.description,
      icon: template.icon,
      tabs: template.tabs.map((tab, index) => ({
        url: tab.url,
        title: tab.title,
        index: index
      })),
      createdAt: Date.now(),
      launchCount: 0
    };

    await saveSessionToStorage(session);

    logger.info('SessionManager', 'Session created from template', {
      templateId: template.id,
      sessionId: session.id
    });

    return session;
  }

  /**
   * Get built-in session templates
   */
  getTemplates(): SessionTemplate[] {
    // Return built-in templates
    return [
      {
        id: SESSION_TEMPLATE_IDS.DEVELOPMENT,
        name: 'Development Workspace',
        description: 'Common developer tools and documentation',
        icon: '💻',
        category: 'developer',
        tabs: [
          { url: 'https://github.com', title: 'GitHub' },
          { url: 'https://stackoverflow.com', title: 'Stack Overflow' },
          { url: 'https://developer.mozilla.org', title: 'MDN Web Docs' },
          { url: 'https://www.typescriptlang.org/docs/', title: 'TypeScript Docs' }
        ]
      },
      {
        id: SESSION_TEMPLATE_IDS.RESEARCH,
        name: 'Research Session',
        description: 'Tools for research and learning',
        icon: '📚',
        category: 'research',
        tabs: [
          { url: 'https://scholar.google.com', title: 'Google Scholar' },
          { url: 'https://www.wikipedia.org', title: 'Wikipedia' },
          { url: 'https://arxiv.org', title: 'arXiv' }
        ]
      },
      {
        id: SESSION_TEMPLATE_IDS.SOCIAL_MEDIA,
        name: 'Social Media',
        description: 'Popular social media platforms',
        icon: '📱',
        category: 'social',
        tabs: [
          { url: 'https://twitter.com', title: 'Twitter' },
          { url: 'https://www.linkedin.com', title: 'LinkedIn' },
          { url: 'https://www.reddit.com', title: 'Reddit' }
        ]
      },
      {
        id: SESSION_TEMPLATE_IDS.SHOPPING,
        name: 'Shopping',
        description: 'Online shopping sites',
        icon: '🛒',
        category: 'productivity',
        tabs: [
          { url: 'https://www.amazon.com', title: 'Amazon' },
          { url: 'https://www.ebay.com', title: 'eBay' }
        ]
      }
    ];
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Duplicate a session
   */
  async duplicateSession(sessionId: string, newName?: string): Promise<SavedSession> {
    await requirePremiumLicense();

    const original = await this.getSession(sessionId);
    if (!original) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const duplicate: SavedSession = {
      ...original,
      id: this.generateSessionId(),
      name: newName || `${original.name} (Copy)`,
      createdAt: Date.now(),
      updatedAt: undefined,
      lastLaunched: undefined,
      launchCount: 0,
      autoLaunchOnStartup: false
    };

    await saveSessionToStorage(duplicate);

    logger.info('SessionManager', 'Session duplicated', {
      originalId: sessionId,
      duplicateId: duplicate.id
    });

    return duplicate;
  }
}

// Export singleton instance
export const sessionManager = new SessionManager();
