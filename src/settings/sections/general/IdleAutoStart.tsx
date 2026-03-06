import React, { useState, useCallback, useEffect } from 'react';
import { Card } from '../../components/common/Card';
import { Toggle } from '../../components/common/Toggle';
import { Icon } from '../../components/common/Icon';
import { useToast } from '../../context/ToastContext';
import styles from './IdleAutoStart.module.css';

function IdleAutoStart() {
  const { showToast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [idleAutoStart, setIdleAutoStart] = useState(false);
  const [idleThreshold, setIdleThreshold] = useState(60);
  const [idleStopOnActive, setIdleStopOnActive] = useState(true);
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const result = await chrome.storage.local.get([
          'idleAutoStart', 'idleThresholdSeconds', 'idleStopOnActive'
        ]);
        setIdleAutoStart(result.idleAutoStart ?? false);
        setIdleThreshold(result.idleThresholdSeconds ?? 60);
        setIdleStopOnActive(result.idleStopOnActive ?? true);
      } catch (error) {
        console.error('Failed to load idle settings:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadSettings();
  }, []);

  const handleToggle = async (checked: boolean) => {
    try {
      await chrome.storage.local.set({ idleAutoStart: checked });
      setIdleAutoStart(checked);
      showToast(
        checked
          ? 'Idle auto-start enabled — cycling will begin when your system goes idle'
          : 'Idle auto-start disabled',
        'success'
      );
    } catch {
      showToast('Failed to update setting', 'error');
    }
  };

  const handleStopOnActiveToggle = async (checked: boolean) => {
    try {
      await chrome.storage.local.set({ idleStopOnActive: checked });
      setIdleStopOnActive(checked);
      showToast(
        checked
          ? 'Cycling will stop when you return'
          : 'Cycling will continue after you return',
        'success'
      );
    } catch {
      showToast('Failed to update setting', 'error');
    }
  };

  const handleThresholdChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    setIdleThreshold(value);

    if (saveTimeout) clearTimeout(saveTimeout);

    const timeout = setTimeout(async () => {
      try {
        await chrome.storage.local.set({ idleThresholdSeconds: value });
        showToast(`Idle threshold set to ${value} seconds`, 'success');
      } catch {
        showToast('Failed to update idle threshold', 'error');
      }
    }, 500);

    setSaveTimeout(timeout);
  }, [saveTimeout, showToast]);

  if (isLoading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Idle Auto-Start</h1>
        <p className={styles.description}>
          Automatically start tab cycling when your system goes idle — perfect for unattended dashboard displays
        </p>
      </div>

      <Card
        title="Enable Idle Auto-Start"
        description="Start cycling when no user activity is detected"
        icon={<Icon name="clock" size={20} />}
      >
        <Toggle
          checked={idleAutoStart}
          onChange={handleToggle}
          label="Auto-start on idle"
          description="Tab cycling will begin automatically when the system becomes idle"
        />
      </Card>

      {idleAutoStart && (
        <>
          <Card
            title="Idle Threshold"
            description="How long to wait before considering the system idle"
            icon={<Icon name="settings" size={20} />}
          >
            <div className={styles.sliderContainer}>
              <div className={styles.sliderLabels}>
                <span>15s</span>
                <span>60s</span>
                <span>5m</span>
                <span>15m</span>
              </div>
              <input
                type="range"
                min="15"
                max="900"
                step="15"
                value={idleThreshold}
                onChange={handleThresholdChange}
                className={styles.slider}
                aria-label="Idle threshold in seconds"
              />
              <div className={styles.sliderValueDisplay}>
                <span className={styles.sliderValue}>{idleThreshold}</span>
                <span className={styles.sliderUnit}>seconds</span>
              </div>
            </div>
            <p className={styles.hint}>
              After {idleThreshold} seconds of inactivity, tab cycling will automatically start.
            </p>
          </Card>

          <Card
            title="Stop on Return"
            description="What happens when you come back"
            icon={<Icon name="pause" size={20} />}
          >
            <Toggle
              checked={idleStopOnActive}
              onChange={handleStopOnActiveToggle}
              label="Stop cycling when active"
              description="Tab cycling will stop automatically when you start using the computer again"
            />
          </Card>

          <Card
            title="How It Works"
            icon={<Icon name="info" size={20} />}
          >
            <div className={styles.infoContent}>
              <div className={styles.infoStep}>
                <div className={styles.stepNumber}>1</div>
                <div className={styles.stepContent}>
                  <strong>System Goes Idle</strong>
                  <p>When no keyboard or mouse activity is detected for the threshold period.</p>
                </div>
              </div>
              <div className={styles.infoStep}>
                <div className={styles.stepNumber}>2</div>
                <div className={styles.stepContent}>
                  <strong>Cycling Begins</strong>
                  <p>Tab cycling automatically starts using your configured interval and mode.</p>
                </div>
              </div>
              <div className={styles.infoStep}>
                <div className={styles.stepNumber}>3</div>
                <div className={styles.stepContent}>
                  <strong>You Return</strong>
                  <p>{idleStopOnActive ? 'Cycling automatically stops so you can work undisturbed.' : 'Cycling continues — use the toggle or shortcut to stop.'}</p>
                </div>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

export default IdleAutoStart;
