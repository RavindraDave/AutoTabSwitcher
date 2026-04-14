import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../../components/common/Card';
import { Toggle } from '../../components/common/Toggle';
import { Icon } from '../../components/common/Icon';
import { Button } from '../../components/common/Button';
import { useToast } from '../../context/ToastContext';
import styles from './KioskSettings.module.css';

/**
 * Phase 1.3 — Fullscreen / Kiosk Mode
 *
 * Master toggle, overlay options, and a quick "enter fullscreen now"
 * action targeting the current window.
 */

const MIN_AUTO_HIDE_MS = 500;
const MAX_AUTO_HIDE_MS = 60000;

function KioskSettings() {
  const { showToast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [kioskMode, setKioskMode] = useState(false);
  const [overlayEnabled, setOverlayEnabled] = useState(true);
  const [autoHideMs, setAutoHideMs] = useState(3000);
  const [saveTimeout, setSaveTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const result = await chrome.storage.local.get([
          'kioskMode', 'kioskOverlayEnabled', 'kioskOverlayAutoHideMs'
        ]);
        setKioskMode(result.kioskMode ?? false);
        setOverlayEnabled(result.kioskOverlayEnabled ?? true);
        setAutoHideMs(result.kioskOverlayAutoHideMs ?? 3000);
      } catch (error) {
        console.error('Failed to load kiosk settings:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadSettings();
  }, []);

  const handleKioskToggle = useCallback(async (checked: boolean) => {
    try {
      await chrome.storage.local.set({ kioskMode: checked });
      setKioskMode(checked);
      showToast(
        checked
          ? 'Kiosk mode enabled — click "Enter Fullscreen Now" to start'
          : 'Kiosk mode disabled',
        'success'
      );
      // When disabling, ask the background to exit any active fullscreen windows.
      if (!checked) {
        try {
          await chrome.runtime.sendMessage({ type: 'kiosk-exit-all' });
        } catch {
          // Non-fatal — background may not respond
        }
      }
    } catch {
      showToast('Failed to update kiosk setting', 'error');
    }
  }, [showToast]);

  const handleOverlayToggle = useCallback(async (checked: boolean) => {
    try {
      await chrome.storage.local.set({ kioskOverlayEnabled: checked });
      setOverlayEnabled(checked);
      showToast(checked ? 'Overlay enabled' : 'Overlay disabled', 'success');
    } catch {
      showToast('Failed to update overlay setting', 'error');
    }
  }, [showToast]);

  const handleAutoHideChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!Number.isFinite(value)) return;
    const clamped = Math.max(MIN_AUTO_HIDE_MS, Math.min(MAX_AUTO_HIDE_MS, value));
    setAutoHideMs(clamped);

    if (saveTimeout) clearTimeout(saveTimeout);
    const timeout = setTimeout(async () => {
      try {
        await chrome.storage.local.set({ kioskOverlayAutoHideMs: clamped });
        showToast(`Overlay auto-hide set to ${clamped}ms`, 'success');
      } catch {
        showToast('Failed to update auto-hide', 'error');
      }
    }, 500);
    setSaveTimeout(timeout);
  }, [saveTimeout, showToast]);

  const handleEnterFullscreenNow = useCallback(async () => {
    try {
      const win = await chrome.windows.getLastFocused();
      if (win.id !== undefined) {
        await chrome.runtime.sendMessage({ type: 'kiosk-enter', windowId: win.id });
        showToast('Entered fullscreen — press ESC to exit', 'success');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      showToast(`Failed to enter fullscreen: ${message}`, 'error');
    }
  }, [showToast]);

  if (isLoading) {
    return <div className={styles.loading}>Loading…</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Kiosk / Fullscreen Mode</h1>
        <p className={styles.description}>
          Run AutoTabSwitcher as a dashboard kiosk — fullscreen windows with an
          on-screen overlay that shows the active tab and a countdown to the
          next switch. Perfect for unattended dashboards, signage, and operation centers.
        </p>
      </div>

      <Card
        title="Enable Kiosk Mode"
        description="Master toggle for fullscreen kiosk operation"
        icon={<Icon name="window" size={20} />}
      >
        <Toggle
          checked={kioskMode}
          onChange={handleKioskToggle}
          label="Kiosk mode"
          description="When enabled, you can put any window into fullscreen mode and AutoTabSwitcher will keep it cycling there."
        />
        {kioskMode && (
          <div className={styles.actionRow}>
            <Button onClick={handleEnterFullscreenNow} leftIcon={<Icon name="play" size={16} />}>
              Enter Fullscreen Now
            </Button>
          </div>
        )}
      </Card>

      {kioskMode && (
        <>
          <Card
            title="On-Screen Overlay"
            description="Show the active tab name and a countdown to the next switch"
            icon={<Icon name="info" size={20} />}
          >
            <Toggle
              checked={overlayEnabled}
              onChange={handleOverlayToggle}
              label="Show overlay"
              description="An unobtrusive panel in the top-right showing the current tab and time until next switch. Auto-hides after a few seconds and reappears on mouse motion."
            />
          </Card>

          {overlayEnabled && (
            <Card
              title="Overlay Auto-Hide"
              description="How long the overlay stays visible after a mouse movement"
              icon={<Icon name="clock" size={20} />}
            >
              <div className={styles.sliderContainer}>
                <div className={styles.sliderLabels}>
                  <span>0.5s</span>
                  <span>3s</span>
                  <span>10s</span>
                  <span>60s</span>
                </div>
                <input
                  type="range"
                  min={MIN_AUTO_HIDE_MS}
                  max={MAX_AUTO_HIDE_MS}
                  step={500}
                  value={autoHideMs}
                  onChange={handleAutoHideChange}
                  className={styles.slider}
                  aria-label="Overlay auto-hide milliseconds"
                />
                <div className={styles.sliderValueDisplay}>
                  <span className={styles.sliderValue}>{(autoHideMs / 1000).toFixed(1)}</span>
                  <span className={styles.sliderUnit}>seconds</span>
                </div>
              </div>
            </Card>
          )}

          <Card
            title="Tips"
            icon={<Icon name="info" size={20} />}
          >
            <ul className={styles.tips}>
              <li>The overlay does not appear on Chrome internal pages (chrome://, web store) — these tabs simply rotate without it.</li>
              <li>Press <kbd>F11</kbd> or <kbd>ESC</kbd> in the browser to manually exit fullscreen.</li>
              <li>Combine with <strong>Idle Auto-Start</strong> for unattended dashboards that begin cycling automatically.</li>
            </ul>
          </Card>
        </>
      )}
    </div>
  );
}

export default KioskSettings;
