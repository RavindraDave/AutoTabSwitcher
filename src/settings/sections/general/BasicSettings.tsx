import React, { useState, useEffect } from 'react';
import { Card } from '../../components/common/Card';
import { Input } from '../../components/common/Input';
import { Toggle } from '../../components/common/Toggle';
import { Button } from '../../components/common/Button';
import { Icon } from '../../components/common/Icon';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../../context/ToastContext';
import styles from './BasicSettings.module.css';

function BasicSettings() {
  const { settings, updateSetting, isLoading } = useSettings();
  const { showToast } = useToast();

  // Local state for delay (explicit save)
  const [delayTime, setDelayTime] = useState(settings.delayTime);
  const [delayError, setDelayError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Sync local state when settings load
  useEffect(() => {
    setDelayTime(settings.delayTime);
  }, [settings.delayTime]);

  const isDirty = delayTime !== settings.delayTime;

  const validateDelay = (value: number): string | null => {
    if (isNaN(value)) return 'Please enter a valid number';
    if (value < 5) return 'Minimum delay is 5 seconds';
    if (value > 3600) return 'Maximum delay is 3600 seconds (1 hour)';
    return null;
  };

  const handleDelayChange = (value: string) => {
    const numValue = parseInt(value, 10);
    setDelayTime(isNaN(numValue) ? 0 : numValue);
    setDelayError(validateDelay(numValue));
  };

  const handleSaveDelay = async () => {
    const error = validateDelay(delayTime);
    if (error) {
      setDelayError(error);
      return;
    }

    setIsSaving(true);
    try {
      await updateSetting('delayTime', delayTime);
      showToast('Delay time saved', 'success');
    } catch {
      showToast('Failed to save delay time', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDelay = () => {
    setDelayTime(settings.delayTime);
    setDelayError(null);
  };

  const handleStartupToggle = async (checked: boolean) => {
    try {
      await updateSetting('enableOnStartup', checked);
      showToast(checked ? 'Auto-start enabled' : 'Auto-start disabled', 'success');
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
        <h1 className={styles.title}>Basic Settings</h1>
        <p className={styles.description}>
          Configure the core behavior of Auto Tab Switcher
        </p>
      </div>

      <Card
        title="Delay Time"
        description="Time between automatic tab switches"
        icon={<Icon name="settings" size={20} />}
      >
        <div className={styles.settingRow}>
          <div className={styles.inputGroup}>
            <Input
              type="number"
              value={delayTime.toString()}
              onChange={handleDelayChange}
              suffix="seconds"
              error={delayError || undefined}
              min={5}
              max={3600}
              aria-label="Delay time in seconds"
            />
          </div>
          {isDirty && (
            <div className={styles.actions}>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetDelay}
                disabled={isSaving}
              >
                Reset
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveDelay}
                isLoading={isSaving}
                disabled={!!delayError}
              >
                Save Changes
              </Button>
            </div>
          )}
        </div>
        <p className={styles.hint}>
          Valid range: 5 to 3600 seconds (1 hour)
        </p>
      </Card>

      <Card
        title="Startup Behavior"
        description="Control how the extension behaves when Chrome starts"
        icon={<Icon name="play" size={20} />}
      >
        <Toggle
          checked={settings.enableOnStartup}
          onChange={handleStartupToggle}
          label="Enable on browser startup"
          description="Automatically start tab switching when you open Chrome"
        />
      </Card>
    </div>
  );
}

export default BasicSettings;
