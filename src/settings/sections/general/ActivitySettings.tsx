import React from 'react';
import { Card } from '../../components/common/Card';
import { Toggle } from '../../components/common/Toggle';
import { Icon } from '../../components/common/Icon';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../../context/ToastContext';
import styles from './SectionStyles.module.css';

function ActivitySettings() {
  const { settings, updateSetting, isLoading } = useSettings();
  const { showToast } = useToast();

  const handlePauseToggle = async (checked: boolean) => {
    try {
      await updateSetting('pauseOnActivity', checked);
      showToast(checked ? 'Pause on activity enabled' : 'Pause on activity disabled', 'success');
    } catch {
      showToast('Failed to update setting', 'error');
    }
  };

  if (isLoading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Pause on Activity</h1>
        <p className={styles.description}>
          Automatically pause tab switching when you're actively using the browser
        </p>
      </div>

      <Card
        title="Activity Detection"
        description="Pause switching when mouse or keyboard activity is detected"
        icon={<Icon name="pause" size={20} />}
      >
        <Toggle
          checked={settings.pauseOnActivity}
          onChange={handlePauseToggle}
          label="Enable pause on activity"
          description="Tab switching will pause when you move the mouse or press keys"
        />
      </Card>

      {settings.pauseOnActivity && (
        <Card
          title="Pause Duration"
          description="How long to wait after activity before resuming"
          icon={<Icon name="settings" size={20} />}
        >
          <div className={styles.sliderContainer}>
            <input
              type="range"
              min="5"
              max="120"
              value={settings.pauseDuration}
              onChange={(e) => updateSetting('pauseDuration', parseInt(e.target.value, 10))}
              className={styles.slider}
            />
            <span className={styles.sliderValue}>{settings.pauseDuration} seconds</span>
          </div>
        </Card>
      )}
    </div>
  );
}

export default ActivitySettings;
