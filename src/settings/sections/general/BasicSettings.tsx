import React, { useState, useEffect } from 'react';
import { Card } from '../../components/common/Card';
import { Input } from '../../components/common/Input';
import { Toggle } from '../../components/common/Toggle';
import { Button } from '../../components/common/Button';
import { Icon } from '../../components/common/Icon';
import { Modal } from '../../components/common/Modal';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../../context/ToastContext';
import { MIN_DELAY_SECONDS, MAX_DELAY_SECONDS } from '../../../core/constants';
import styles from './BasicSettings.module.css';

function BasicSettings() {
  const { settings, updateSetting, isLoading, getDelayInSeconds, setDelayInSeconds } = useSettings();
  const { showToast } = useToast();

  // Local state for delay in seconds (UI displays seconds, storage uses ms)
  const [delaySeconds, setDelaySeconds] = useState(getDelayInSeconds());
  const [delayError, setDelayError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [pendingDelayValue, setPendingDelayValue] = useState<number | null>(null);

  // Sync local state when settings load
  useEffect(() => {
    setDelaySeconds(getDelayInSeconds());
  }, [getDelayInSeconds]);

  const savedDelaySeconds = getDelayInSeconds();
  const isDirty = delaySeconds !== savedDelaySeconds;

  const validateDelay = (value: number): string | null => {
    if (isNaN(value)) return 'Please enter a valid number';
    if (value < MIN_DELAY_SECONDS) return `Minimum delay is ${MIN_DELAY_SECONDS} seconds`;
    if (value > MAX_DELAY_SECONDS) return `Maximum delay is ${MAX_DELAY_SECONDS} seconds (1 hour)`;
    return null;
  };

  const handleDelayChange = (value: string) => {
    const numValue = parseInt(value, 10);
    setDelaySeconds(isNaN(numValue) ? 0 : numValue);
    setDelayError(validateDelay(numValue));
  };

  const handleSaveDelay = async () => {
    const error = validateDelay(delaySeconds);
    if (error) {
      setDelayError(error);
      return;
    }

    // Show warning for very low delay times (under 5 seconds)
    if (delaySeconds < 5) {
      setPendingDelayValue(delaySeconds);
      setShowWarningModal(true);
      return;
    }

    await performSaveDelay(delaySeconds);
  };

  const performSaveDelay = async (value: number) => {
    setIsSaving(true);
    try {
      await setDelayInSeconds(value);
      showToast('Delay time saved', 'success');
    } catch {
      showToast('Failed to save delay time', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleWarningConfirm = async () => {
    setShowWarningModal(false);
    if (pendingDelayValue !== null) {
      await performSaveDelay(pendingDelayValue);
      setPendingDelayValue(null);
    }
  };

  const handleWarningCancel = () => {
    setShowWarningModal(false);
    setPendingDelayValue(null);
  };

  const handleResetDelay = () => {
    setDelaySeconds(savedDelaySeconds);
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
              value={delaySeconds.toString()}
              onChange={handleDelayChange}
              suffix="seconds"
              error={delayError || undefined}
              min={MIN_DELAY_SECONDS}
              max={MAX_DELAY_SECONDS}
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
          Valid range: {MIN_DELAY_SECONDS} to {MAX_DELAY_SECONDS} seconds (1 hour). Values under 5 seconds will show a warning.
        </p>
      </Card>

      {/* Warning modal for very low delay times */}
      <Modal
        isOpen={showWarningModal}
        onClose={handleWarningCancel}
        title={`Very Low Delay Time (${pendingDelayValue} seconds)`}
        size="sm"
      >
        <div className={styles.warningContent}>
          <p className={styles.warningMessage}>
            <strong>This setting may cause issues:</strong>
          </p>
          <ul className={styles.warningList}>
            <li>May be difficult to stop once started (tabs switch before you can click stop)</li>
            <li>Can cause browser performance issues with rapid switching</li>
            <li>May interfere with normal browsing activities</li>
            <li>Not recommended for general use - primarily for specific use cases like slideshows</li>
          </ul>
          <p className={styles.warningQuestion}>
            Are you absolutely sure you want to continue?
          </p>
          <div className={styles.warningActions}>
            <Button variant="ghost" onClick={handleWarningCancel}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleWarningConfirm}>
              Yes, I understand the risks
            </Button>
          </div>
        </div>
      </Modal>

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
