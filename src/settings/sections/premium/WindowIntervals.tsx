import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Icon } from '../../components/common/Icon';
import { PremiumGate } from '../../components/common/PremiumGate';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../../context/ToastContext';
import styles from './WindowIntervals.module.css';

interface WindowInfo {
  id: number;
  focused: boolean;
  customInterval?: number; // in milliseconds
  tabCount: number;
}

const PRESET_INTERVALS = [
  { label: 'Very Fast', value: 2000, description: '2 seconds' },
  { label: 'Fast', value: 5000, description: '5 seconds' },
  { label: 'Normal', value: 10000, description: '10 seconds' },
  { label: 'Slow', value: 30000, description: '30 seconds' },
  { label: 'Very Slow', value: 60000, description: '1 minute' },
];

function WindowIntervalsContent() {
  const { settings, updateSetting } = useSettings();
  const { showToast } = useToast();

  const [windows, setWindows] = useState<WindowInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [customValues, setCustomValues] = useState<{ [windowId: number]: string }>({});

  // Load windows and their custom intervals
  const loadWindows = useCallback(async () => {
    try {
      const chromeWindows = await chrome.windows.getAll({ windowTypes: ['normal'] });
      const result = await chrome.storage.local.get('windowStates');
      const windowStates = result.windowStates || {};

      const windowInfos: WindowInfo[] = chromeWindows.map(win => ({
        id: win.id!,
        focused: win.focused || false,
        customInterval: windowStates[win.id!]?.customDelayTime,
        tabCount: 0, // Will be populated below
      }));

      // Get tab counts for each window
      for (const win of windowInfos) {
        const tabs = await chrome.tabs.query({ windowId: win.id });
        win.tabCount = tabs.length;
      }

      setWindows(windowInfos);
    } catch (error) {
      console.error('Failed to load windows:', error);
      showToast('Failed to load windows', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadWindows();

    // Refresh when windows are created/removed
    const handleWindowChange = () => {
      loadWindows();
    };

    chrome.windows.onCreated.addListener(handleWindowChange);
    chrome.windows.onRemoved.addListener(handleWindowChange);

    return () => {
      chrome.windows.onCreated.removeListener(handleWindowChange);
      chrome.windows.onRemoved.removeListener(handleWindowChange);
    };
  }, [loadWindows]);

  // Set custom interval for a window
  const setWindowInterval = async (windowId: number, interval: number) => {
    try {
      const result = await chrome.storage.local.get('windowStates');
      const windowStates = result.windowStates || {};

      windowStates[windowId] = {
        ...windowStates[windowId],
        customDelayTime: interval,
      };

      await chrome.storage.local.set({ windowStates });
      await loadWindows();
      showToast(`Interval set to ${interval / 1000}s for window ${windowId}`, 'success');
    } catch (error) {
      console.error('Failed to set window interval:', error);
      showToast('Failed to set interval', 'error');
    }
  };

  // Clear custom interval (use global)
  const clearWindowInterval = async (windowId: number) => {
    try {
      const result = await chrome.storage.local.get('windowStates');
      const windowStates = result.windowStates || {};

      if (windowStates[windowId]) {
        delete windowStates[windowId].customDelayTime;
        await chrome.storage.local.set({ windowStates });
        await loadWindows();
        showToast(`Using global interval for window ${windowId}`, 'success');
      }
    } catch (error) {
      console.error('Failed to clear window interval:', error);
      showToast('Failed to clear interval', 'error');
    }
  };

  // Handle preset button click
  const handlePresetClick = (windowId: number, interval: number) => {
    setWindowInterval(windowId, interval);
  };

  // Handle custom interval input
  const handleCustomIntervalChange = (windowId: number, value: string) => {
    setCustomValues(prev => ({ ...prev, [windowId]: value }));
  };

  // Apply custom interval
  const applyCustomInterval = (windowId: number) => {
    const value = customValues[windowId];
    if (!value) return;

    const seconds = parseFloat(value);
    if (isNaN(seconds) || seconds < 1 || seconds > 300) {
      showToast('Please enter a valid interval between 1 and 300 seconds', 'error');
      return;
    }

    setWindowInterval(windowId, seconds * 1000);
    setCustomValues(prev => {
      const newValues = { ...prev };
      delete newValues[windowId];
      return newValues;
    });
  };

  if (isLoading) {
    return <div className={styles.loading}>Loading windows...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Per-Window Intervals</h1>
        <p className={styles.description}>
          Set different rotation speeds for different browser windows. Perfect for multi-monitor setups
          where you want dashboards on one monitor to refresh faster than content on another.
        </p>
      </div>

      <Card
        title="Global Interval"
        icon={<Icon name="clock" size={20} />}
      >
        <div className={styles.globalInterval}>
          <p className={styles.infoText}>
            <Icon name="info" size={16} />
            Default interval for all windows: <strong>{(settings.delayTime || 10000) / 1000}s</strong>
          </p>
          <p className={styles.helperText}>
            Windows without a custom interval will use this global default.
            Change the global interval in Basic Settings.
          </p>
        </div>
      </Card>

      {settings.switchingMode === 'window' ? (
        <Card
          title={`Open Windows (${windows.length})`}
          icon={<Icon name="window" size={20} />}
        >
          {windows.length === 0 ? (
            <div className={styles.emptyState}>
              <Icon name="window" size={48} />
              <p>No windows found</p>
            </div>
          ) : (
            <div className={styles.windowList}>
              {windows.map((win) => (
                <div key={win.id} className={styles.windowCard}>
                  <div className={styles.windowHeader}>
                    <div className={styles.windowTitle}>
                      <Icon name="window" size={20} />
                      <span>Window {win.id}</span>
                      {win.focused && (
                        <span className={styles.badge}>Current</span>
                      )}
                    </div>
                    <div className={styles.windowInfo}>
                      <span className={styles.tabCount}>
                        <Icon name="folder" size={14} />
                        {win.tabCount} tabs
                      </span>
                    </div>
                  </div>

                  <div className={styles.intervalSection}>
                    <div className={styles.currentInterval}>
                      <span className={styles.label}>Current Interval:</span>
                      <span className={styles.value}>
                        {win.customInterval ? (
                          <>
                            {win.customInterval / 1000}s
                            <span className={styles.customBadge}>Custom</span>
                          </>
                        ) : (
                          <>
                            {(settings.delayTime || 10000) / 1000}s
                            <span className={styles.globalBadge}>Global</span>
                          </>
                        )}
                      </span>
                    </div>

                    <div className={styles.presets}>
                      <label className={styles.presetsLabel}>Quick Presets:</label>
                      <div className={styles.presetButtons}>
                        {PRESET_INTERVALS.map((preset) => (
                          <button
                            key={preset.value}
                            className={`${styles.presetButton} ${win.customInterval === preset.value ? styles.active : ''}`}
                            onClick={() => handlePresetClick(win.id, preset.value)}
                            title={preset.description}
                          >
                            {preset.label}
                            <span className={styles.presetTime}>{preset.description}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className={styles.customInput}>
                      <label className={styles.customLabel}>Custom Interval (seconds):</label>
                      <div className={styles.customInputGroup}>
                        <input
                          type="number"
                          min="1"
                          max="300"
                          step="0.5"
                          placeholder="Enter seconds (1-300)"
                          value={customValues[win.id] || ''}
                          onChange={(e) => handleCustomIntervalChange(win.id, e.target.value)}
                          className={styles.customInputField}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              applyCustomInterval(win.id);
                            }
                          }}
                        />
                        <Button
                          variant="secondary"
                          onClick={() => applyCustomInterval(win.id)}
                          disabled={!customValues[win.id]}
                        >
                          Apply
                        </Button>
                      </div>
                    </div>

                    {win.customInterval && (
                      <div className={styles.resetSection}>
                        <Button
                          variant="secondary"
                          onClick={() => clearWindowInterval(win.id)}
                        >
                          <Icon name="refresh" size={16} />
                          Use Global Interval
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      ) : (
        <Card
          title="Window Mode Required"
          icon={<Icon name="info" size={20} />}
        >
          <div className={styles.modeWarning}>
            <Icon name="info" size={48} />
            <p className={styles.warningTitle}>Per-window intervals require Window Mode</p>
            <p className={styles.warningText}>
              Switch to Window Mode in Operating Mode settings to use per-window intervals.
              In Global Mode, all windows share the same rotation interval.
            </p>
            <Button
              variant="primary"
              onClick={() => {
                // Navigate to mode settings
                window.location.hash = '#/mode';
              }}
            >
              Go to Operating Mode
            </Button>
          </div>
        </Card>
      )}

      <Card
        title="Tips & Best Practices"
        icon={<Icon name="info" size={20} />}
      >
        <ul className={styles.tipsList}>
          <li>
            <Icon name="check" size={16} />
            <strong>Monitoring Dashboards:</strong> Use fast intervals (2-5s) for real-time monitoring windows
          </li>
          <li>
            <Icon name="check" size={16} />
            <strong>News/Content:</strong> Use slower intervals (30-60s) for reading-focused windows
          </li>
          <li>
            <Icon name="check" size={16} />
            <strong>Multi-Monitor:</strong> Set different speeds per monitor based on what you need to track
          </li>
          <li>
            <Icon name="check" size={16} />
            <strong>Performance:</strong> Faster intervals consume more system resources
          </li>
        </ul>
      </Card>
    </div>
  );
}

export default function WindowIntervals() {
  return (
    <PremiumGate
      feature="window-intervals"
      title="Per-Window Intervals"
      description="Set different rotation speeds for each browser window. Perfect for multi-monitor setups."
    >
      <WindowIntervalsContent />
    </PremiumGate>
  );
}
