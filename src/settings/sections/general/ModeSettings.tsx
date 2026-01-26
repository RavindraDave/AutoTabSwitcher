import React from 'react';
import { Card } from '../../components/common/Card';
import { Icon } from '../../components/common/Icon';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../../context/ToastContext';
import styles from './ModeSettings.module.css';

function ModeSettings() {
  const { settings, updateSetting, isLoading } = useSettings();
  const { showToast } = useToast();

  const handleModeChange = async (mode: 'global' | 'window') => {
    try {
      await updateSetting('switchingMode', mode);
      showToast(`Switched to ${mode} mode`, 'success');
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
          </div>
          {settings.switchingMode === 'global' && (
            <div className={styles.activeIndicator}>
              <Icon name="check" size={16} />
            </div>
          )}
        </button>

        <button
          className={`${styles.modeCard} ${settings.switchingMode === 'window' ? styles.active : ''}`}
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
          </div>
          {settings.switchingMode === 'window' && (
            <div className={styles.activeIndicator}>
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
              <td>Single timer for all</td>
              <td>Per-window timers</td>
            </tr>
            <tr>
              <td>Enable/disable</td>
              <td>All windows at once</td>
              <td>Individual windows</td>
            </tr>
            <tr>
              <td>Best for</td>
              <td>Simple setups</td>
              <td>Multi-monitor workflows</td>
            </tr>
          </tbody>
        </table>
      </Card>
    </div>
  );
}

export default ModeSettings;
