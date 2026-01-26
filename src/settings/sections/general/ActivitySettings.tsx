import React, { useState, useCallback } from 'react';
import { Card } from '../../components/common/Card';
import { Toggle } from '../../components/common/Toggle';
import { Icon } from '../../components/common/Icon';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../../context/ToastContext';
import styles from './ActivitySettings.module.css';

function ActivitySettings() {
  const { settings, updateSetting, isLoading, getPauseDurationInSeconds, setPauseDurationInSeconds } = useSettings();
  const { showToast } = useToast();

  // Local state for slider (debounced save)
  const [sliderValue, setSliderValue] = useState(getPauseDurationInSeconds());
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);

  const handlePauseToggle = async (checked: boolean) => {
    try {
      await updateSetting('pauseOnActivity', checked);
      showToast(
        checked
          ? 'Pause on activity enabled - switching will pause during user activity'
          : 'Pause on activity disabled',
        'success'
      );
    } catch {
      showToast('Failed to update setting', 'error');
    }
  };

  const handleSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    setSliderValue(value);

    // Clear existing timeout
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }

    // Debounce the save
    const timeout = setTimeout(async () => {
      try {
        await setPauseDurationInSeconds(value);
        showToast(`Pause duration set to ${value} seconds`, 'success');
      } catch {
        showToast('Failed to update pause duration', 'error');
      }
    }, 500);

    setSaveTimeout(timeout);
  }, [saveTimeout, setPauseDurationInSeconds, showToast]);

  if (isLoading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  const pauseDurationSeconds = getPauseDurationInSeconds();

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
        description="Pause switching when user activity is detected"
        icon={<Icon name="pause" size={20} />}
      >
        <Toggle
          checked={settings.pauseOnActivity}
          onChange={handlePauseToggle}
          label="Enable pause on activity"
          description="Tab switching will pause when you move the mouse, scroll, or press keys"
        />
      </Card>

      {settings.pauseOnActivity && (
        <>
          <Card
            title="Pause Duration"
            description="How long to wait after activity before resuming tab switching"
            icon={<Icon name="settings" size={20} />}
          >
            <div className={styles.sliderContainer}>
              <div className={styles.sliderLabels}>
                <span>5s</span>
                <span>30s</span>
                <span>60s</span>
                <span>120s</span>
              </div>
              <input
                type="range"
                min="5"
                max="120"
                step="5"
                value={sliderValue}
                onChange={handleSliderChange}
                className={styles.slider}
                aria-label="Pause duration in seconds"
              />
              <div className={styles.sliderValueDisplay}>
                <span className={styles.sliderValue}>{sliderValue}</span>
                <span className={styles.sliderUnit}>seconds</span>
              </div>
            </div>
            <p className={styles.hint}>
              After {pauseDurationSeconds} seconds of inactivity, tab switching will automatically resume.
            </p>
          </Card>

          <Card
            title="How It Works"
            icon={<Icon name="info" size={20} />}
          >
            <div className={styles.infoContent}>
              <div className={styles.infoStep}>
                <div className={styles.stepNumber}>1</div>
                <div className={styles.stepContent}>
                  <strong>Activity Detected</strong>
                  <p>When you move the mouse, scroll, or press any key, we detect your activity.</p>
                </div>
              </div>
              <div className={styles.infoStep}>
                <div className={styles.stepNumber}>2</div>
                <div className={styles.stepContent}>
                  <strong>Switching Pauses</strong>
                  <p>Tab switching immediately pauses so you can focus on your current task.</p>
                </div>
              </div>
              <div className={styles.infoStep}>
                <div className={styles.stepNumber}>3</div>
                <div className={styles.stepContent}>
                  <strong>Timer Starts</strong>
                  <p>A countdown timer starts for the duration you've set above.</p>
                </div>
              </div>
              <div className={styles.infoStep}>
                <div className={styles.stepNumber}>4</div>
                <div className={styles.stepContent}>
                  <strong>Auto Resume</strong>
                  <p>After the pause duration with no activity, switching automatically resumes.</p>
                </div>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

export default ActivitySettings;
