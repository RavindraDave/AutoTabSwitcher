/**
 * Kiosk / Fullscreen Mode (Phase 1.3)
 *
 * Provides:
 * - Per-window fullscreen toggling via chrome.windows.update
 * - Optional in-page overlay (shadow-DOM) showing the active tab name and a
 *   countdown to the next switch
 * - Mute graceful skip on restricted URLs (chrome://, web store)
 *
 * SECURITY: All overlay text is set via textContent only — never innerHTML.
 * The overlay lives inside a shadow root so host-page CSS cannot bleed in
 * and our styles cannot leak out.
 *
 * The overlay content script is injected on-demand via chrome.scripting.executeScript
 * with `func` (no inline strings) so the manifest's CSP is respected.
 */

import { logger } from './logger.js';
import { StorageData } from './types.js';
import { DEFAULT_KIOSK_OVERLAY_AUTO_HIDE_MS } from './constants.js';

/**
 * URL prefixes where Chrome refuses to inject scripts.
 * We skip overlay injection for these to avoid noisy errors.
 */
const RESTRICTED_URL_PREFIXES = [
  'chrome://',
  'chrome-extension://',
  'edge://',
  'about:',
  'view-source:',
  'devtools://',
  'https://chrome.google.com/webstore',
  'https://chromewebstore.google.com',
];

function isRestrictedUrl(url: string | undefined): boolean {
  if (!url) return true;
  return RESTRICTED_URL_PREFIXES.some(prefix => url.startsWith(prefix));
}

/**
 * Enter fullscreen for a window and mark it as kiosk-active in storage.
 *
 * @param windowId - The window to put into fullscreen
 */
export async function enterKioskMode(windowId: number): Promise<void> {
  try {
    await chrome.windows.update(windowId, { state: 'fullscreen' });
  } catch (error) {
    await logger.error('KioskManager', 'Failed to enter fullscreen', {
      windowId,
      error: error instanceof Error ? error.message : String(error),
    });
    return;
  }

  const data = await chrome.storage.local.get('kioskFullscreenWindowIds') as StorageData;
  const ids = new Set(data.kioskFullscreenWindowIds || []);
  ids.add(windowId);
  await chrome.storage.local.set({ kioskFullscreenWindowIds: Array.from(ids) });

  await logger.info('KioskManager', 'Entered kiosk mode', { windowId });
}

/**
 * Exit fullscreen for a window and unmark it.
 *
 * @param windowId - The window to take out of fullscreen
 */
export async function exitKioskMode(windowId: number): Promise<void> {
  try {
    await chrome.windows.update(windowId, { state: 'normal' });
  } catch (error) {
    await logger.warn('KioskManager', 'Failed to exit fullscreen', {
      windowId,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  const data = await chrome.storage.local.get('kioskFullscreenWindowIds') as StorageData;
  const ids = new Set(data.kioskFullscreenWindowIds || []);
  ids.delete(windowId);
  await chrome.storage.local.set({ kioskFullscreenWindowIds: Array.from(ids) });

  await logger.info('KioskManager', 'Exited kiosk mode', { windowId });
}

/**
 * Whether a given window is currently flagged as kiosk-active in storage.
 */
export async function isWindowInKioskMode(windowId: number): Promise<boolean> {
  const data = await chrome.storage.local.get('kioskFullscreenWindowIds') as StorageData;
  const ids = data.kioskFullscreenWindowIds || [];
  return ids.includes(windowId);
}

/**
 * Exit kiosk mode for every window we marked.
 */
export async function exitAllKioskWindows(): Promise<void> {
  const data = await chrome.storage.local.get('kioskFullscreenWindowIds') as StorageData;
  const ids = data.kioskFullscreenWindowIds || [];
  for (const windowId of ids) {
    try {
      await chrome.windows.update(windowId, { state: 'normal' });
    } catch {
      // Window may be closed; ignore
    }
  }
  await chrome.storage.local.set({ kioskFullscreenWindowIds: [] });
}

/**
 * Check all kiosk-tracked windows and remove any that are no longer in
 * fullscreen state. This handles the case where the user pressed ESC or F11
 * to manually exit fullscreen — we detect it and clean up our tracking list.
 *
 * Called from onFocusChanged and after each tab switch.
 */
export async function detectKioskExits(): Promise<void> {
  const data = await chrome.storage.local.get('kioskFullscreenWindowIds') as StorageData;
  const ids = data.kioskFullscreenWindowIds || [];
  if (ids.length === 0) return;

  const removed: number[] = [];

  for (const windowId of ids) {
    try {
      const win = await chrome.windows.get(windowId);
      if (win.state !== 'fullscreen') {
        removed.push(windowId);
      }
    } catch {
      removed.push(windowId);
    }
  }

  if (removed.length > 0) {
    const remaining = ids.filter(id => !removed.includes(id));
    await chrome.storage.local.set({ kioskFullscreenWindowIds: remaining });
    await logger.info('KioskManager', 'Detected manual fullscreen exit', {
      removed,
      remaining: remaining.length,
    });
  }
}

/**
 * Inject and render (or update) the kiosk overlay on the active tab of the
 * given window. Called from tab-switcher after every successful switch.
 *
 * No-op when:
 * - Kiosk mode master toggle is off
 * - Kiosk overlay is disabled
 * - The target tab is on a restricted URL (chrome://, web store, etc.)
 *
 * @param tabId - The tab to inject the overlay into
 * @param tabUrl - The URL of that tab (used to skip restricted pages)
 * @param tabTitle - Title to show in the overlay
 * @param nextSwitchInMs - Approximate ms until the next switch (used for countdown)
 */
export async function notifyKioskOverlayOfSwitch(
  tabId: number,
  tabUrl: string | undefined,
  tabTitle: string,
  nextSwitchInMs: number
): Promise<void> {
  const data = await chrome.storage.local.get([
    'kioskMode',
    'kioskOverlayEnabled',
    'kioskOverlayAutoHideMs',
  ]) as StorageData;

  if (!data.kioskMode || !data.kioskOverlayEnabled) {
    return;
  }

  if (isRestrictedUrl(tabUrl)) {
    return;
  }

  const autoHideMs = data.kioskOverlayAutoHideMs ?? DEFAULT_KIOSK_OVERLAY_AUTO_HIDE_MS;

  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: renderKioskOverlay,
      args: [tabTitle, nextSwitchInMs, autoHideMs],
    });
  } catch (error) {
    // Restricted URLs and frame issues are common and non-fatal.
    await logger.debug('KioskManager', 'Overlay injection skipped', {
      tabId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Function injected into the page via chrome.scripting.executeScript.
 *
 * SECURITY: This is serialized and run in the page context. It must NOT
 * reference any imports or closures from this module. All inputs are
 * passed via `args`. All DOM writes use textContent — never innerHTML.
 *
 * The overlay is mounted inside a shadow root so its CSS cannot bleed.
 */
function renderKioskOverlay(tabTitle: string, nextSwitchInMs: number, autoHideMs: number): void {
  const HOST_ID = 'auto-tab-switcher-kiosk-overlay-host';
  // Cap unbounded text length so a hostile page title can't blow up rendering.
  const safeTitle = String(tabTitle ?? '').slice(0, 200);
  const safeAutoHide = Math.max(500, Math.min(60000, Number(autoHideMs) || 3000));
  const safeNextSwitchMs = Math.max(0, Math.min(86400000, Number(nextSwitchInMs) || 0));

  let host = document.getElementById(HOST_ID) as HTMLDivElement | null;
  let shadow: ShadowRoot;
  let countdownEl: HTMLDivElement;
  let titleEl: HTMLDivElement;

  if (!host) {
    host = document.createElement('div');
    host.id = HOST_ID;
    host.style.position = 'fixed';
    host.style.top = '0';
    host.style.right = '0';
    host.style.zIndex = '2147483647'; // Max z-index
    host.style.pointerEvents = 'none';
    document.documentElement.appendChild(host);

    shadow = host.attachShadow({ mode: 'closed' });

    const style = document.createElement('style');
    style.textContent = `
      :host { all: initial; }
      .container {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: rgba(0, 0, 0, 0.78);
        color: #fff;
        padding: 12px 18px;
        border-bottom-left-radius: 12px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
        min-width: 200px;
        max-width: 360px;
        opacity: 0;
        transform: translateY(-8px);
        transition: opacity 200ms ease, transform 200ms ease;
        pointer-events: auto;
      }
      .container.visible {
        opacity: 1;
        transform: translateY(0);
      }
      .title {
        font-size: 13px;
        font-weight: 600;
        margin-bottom: 6px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .countdown {
        font-size: 11px;
        opacity: 0.8;
        font-variant-numeric: tabular-nums;
      }
      .hint {
        font-size: 10px;
        opacity: 0.6;
        margin-top: 4px;
      }
    `;
    shadow.appendChild(style);

    const container = document.createElement('div');
    container.className = 'container';
    titleEl = document.createElement('div');
    titleEl.className = 'title';
    countdownEl = document.createElement('div');
    countdownEl.className = 'countdown';
    const hintEl = document.createElement('div');
    hintEl.className = 'hint';
    hintEl.textContent = 'Press ESC to exit kiosk mode';

    container.appendChild(titleEl);
    container.appendChild(countdownEl);
    container.appendChild(hintEl);
    shadow.appendChild(container);

    // Stash references on the host node so subsequent calls can find them
    // without re-creating elements.
    (host as any).__atsContainer = container;
    (host as any).__atsTitle = titleEl;
    (host as any).__atsCountdown = countdownEl;
  } else {
    shadow = (host as any).__atsShadow || host.shadowRoot || null;
    titleEl = (host as any).__atsTitle;
    countdownEl = (host as any).__atsCountdown;
  }

  const stash = host as any;
  const container: HTMLDivElement = stash.__atsContainer;

  if (!container || !titleEl || !countdownEl) {
    return;
  }

  // Update content
  titleEl.textContent = safeTitle || 'Auto Tab Switcher';

  // Show, then schedule auto-hide and countdown updates.
  container.classList.add('visible');

  if (stash.__atsHideTimer) {
    clearTimeout(stash.__atsHideTimer);
  }
  if (stash.__atsCountdownInterval) {
    clearInterval(stash.__atsCountdownInterval);
  }

  let remaining = safeNextSwitchMs;
  const updateCountdown = () => {
    if (remaining <= 0) {
      countdownEl.textContent = 'Switching…';
      return;
    }
    const seconds = Math.ceil(remaining / 1000);
    countdownEl.textContent = `Next switch in ${seconds}s`;
    remaining -= 1000;
  };
  updateCountdown();
  stash.__atsCountdownInterval = setInterval(updateCountdown, 1000);

  stash.__atsHideTimer = setTimeout(() => {
    container.classList.remove('visible');
  }, safeAutoHide);

  // Reveal again on mouse motion
  if (!stash.__atsMouseHandlerInstalled) {
    stash.__atsMouseHandlerInstalled = true;
    document.addEventListener('mousemove', () => {
      container.classList.add('visible');
      if (stash.__atsHideTimer) clearTimeout(stash.__atsHideTimer);
      stash.__atsHideTimer = setTimeout(() => {
        container.classList.remove('visible');
      }, safeAutoHide);
    }, { passive: true });
  }
}
