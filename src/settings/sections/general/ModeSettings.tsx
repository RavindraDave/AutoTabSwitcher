import React, { useEffect } from 'react';
import { Card } from '../../components/common/Card';
import { Icon } from '../../components/common/Icon';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../../context/ToastContext';
import styles from './ModeSettings.module.css';

function ModeSettings() {
  const { settings, updateSetting, isLoading } = useSettings();
  const { showToast } = useToast();

  // Apply theme class to body based on mode
  useEffect(() => {
    if (settings.switchingMode === 'window') {
      document.body.classList.add('window-mode');
    } else {
      document.body.classList.remove('window-mode');
    }
  }, [settings.switchingMode]);

  const handleModeChange = async (mode: 'global' | 'window') => {
    if (settings.switchingMode === mode) return;

    try {
      await updateSetting('switchingMode', mode);
      showToast(
        mode === 'global'
          ? 'Switched to Global Mode - all windows controlled together'
          : 'Switched to Window Mode - each window has its own timer',
        'success'
      );
    } catch {
      showToast('Failed to change mode', 'error');
    }
  };

  if (isLoading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Operating Mode</h1>
        <p className={styles.description}>
          Choose how tab switching behaves across your browser windows
        </p>
      </div>

      <div className={styles.modeGrid}>
        <button
          className={`${styles.modeCard} ${settings.switchingMode === 'global' ? styles.active : ''}`}
          onClick={() => handleModeChange('global')}
          aria-pressed={settings.switchingMode === 'global'}
        >
          <div className={styles.modeIcon}>
            <Icon name="globe" size={32} />
          </div>
          <div className={styles.modeContent}>
            <h3 className={styles.modeTitle}>Global Mode</h3>
            <p className={styles.modeDescription}>
              One timer controls all windows. Tab switching is synchronized across your entire browser.
            </p>
            <ul className={styles.modeFeatures}>
              <li>Single toggle enables/disables all windows</li>
              <li>Consistent timing across browser</li>
              <li>Simpler to manage</li>
            </ul>
          </div>
          {settings.switchingMode === 'global' && (
            <div className={styles.activeIndicator}>
              <Icon name="check" size={16} />
            </div>
          )}
        </button>

        <button
          className={`${styles.modeCard} ${styles.windowModeCard} ${settings.switchingMode === 'window' ? styles.active : ''}`}
          onClick={() => handleModeChange('window')}
          aria-pressed={settings.switchingMode === 'window'}
        >
          <div className={styles.modeIcon}>
            <Icon name="window" size={32} />
          </div>
          <div className={styles.modeContent}>
            <h3 className={styles.modeTitle}>Window Mode</h3>
            <p className={styles.modeDescription}>
              Each window has its own independent timer. Perfect for multi-window workflows.
            </p>
            <ul className={styles.modeFeatures}>
              <li>Enable/disable per window</li>
              <li>Independent timers per window</li>
              <li>Great for multi-monitor setups</li>
            </ul>
          </div>
          {settings.switchingMode === 'window' && (
            <div className={`${styles.activeIndicator} ${styles.windowModeIndicator}`}>
              <Icon name="check" size={16} />
            </div>
          )}
        </button>
      </div>

      <Card
        title="Mode Comparison"
        icon={<Icon name="info" size={20} />}
      >
        <table className={styles.comparisonTable}>
          <thead>
            <tr>
              <th>Feature</th>
              <th>Global Mode</th>
              <th>Window Mode</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Timer control</td>
              <td>Single timer for all windows</td>
              <td>Independent timer per window</td>
            </tr>
            <tr>
              <td>Enable/disable</td>
              <td>All windows at once</td>
              <td>Individual windows</td>
            </tr>
            <tr>
              <td>Pause behavior</td>
              <td>Pauses all windows</td>
              <td>Pauses only active window</td>
            </tr>
            <tr>
              <td>Best for</td>
              <td>Simple single-window use</td>
              <td>Multi-monitor workflows</td>
            </tr>
            <tr>
              <td>Theme color</td>
              <td className={styles.globalColor}>Purple</td>
              <td className={styles.windowColor}>Teal</td>
            </tr>
          </tbody>
        </table>
      </Card>

      <Card
        title="Current Status"
        icon={<Icon name="settings" size={20} />}
      >
        <div className={styles.statusInfo}>
          <div className={styles.statusItem}>
            <span className={styles.statusLabel}>Active Mode</span>
            <span className={`${styles.statusValue} ${settings.switchingMode === 'window' ? styles.windowModeText : ''}`}>
              {settings.switchingMode === 'global' ? 'Global Mode' : 'Window Mode'}
            </span>
          </div>
          <div className={styles.statusItem}>
            <span className={styles.statusLabel}>Extension Status</span>
            <span className={`${styles.statusValue} ${settings.enabled ? styles.enabledText : styles.disabledText}`}>
              {settings.enabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default ModeSettings;
