import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../../components/common/Card';
import { Toggle } from '../../components/common/Toggle';
import { Icon } from '../../components/common/Icon';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { PremiumGate } from '../../components/common/PremiumGate';
import { useToast } from '../../context/ToastContext';
import styles from './RemoteConfigSettings.module.css';

interface RemoteConfigSyncSettings {
  enabled: boolean;
  url: string;
  intervalMinutes: number;
  lastFetchTime?: number;
  lastFetchStatus?: 'success' | 'error';
  lastFetchError?: string;
  lastAppliedHash?: string;
  applyMode: 'replace' | 'merge';
  autoApply: boolean;
  pendingConfig?: unknown;
}

const DEFAULT_SETTINGS: RemoteConfigSyncSettings = {
  enabled: false,
  url: '',
  intervalMinutes: 15,
  applyMode: 'replace',
  autoApply: true,
};

function RemoteConfigSettings() {
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [settings, setSettings] = useState<RemoteConfigSyncSettings>(DEFAULT_SETTINGS);
  const [urlInput, setUrlInput] = useState('');
  const [intervalInput, setIntervalInput] = useState('15');
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await chrome.storage.local.get('remoteConfigSync');
        const saved = data['remoteConfigSync'] as RemoteConfigSyncSettings | undefined;
        if (saved) {
          setSettings(saved);
          setUrlInput(saved.url);
          setIntervalInput(String(saved.intervalMinutes));
        }
      } catch (error) {
        console.error('Failed to load remote config settings:', error);
      } finally {
        setIsLoading(false);
      }
    };
    load();

    const listener = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes['remoteConfigSync']) {
        const newVal = changes['remoteConfigSync'].newValue as RemoteConfigSyncSettings | undefined;
        if (newVal) setSettings(newVal);
      }
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);

  const handleSave = useCallback(async () => {
    const url = urlInput.trim();
    if (!url) {
      showToast('Please enter a config URL', 'error');
      return;
    }
    try {
      new URL(url);
    } catch {
      showToast('Invalid URL format', 'error');
      return;
    }

    const interval = Math.max(1, Math.min(1440, parseInt(intervalInput, 10) || 15));

    try {
      const updated: RemoteConfigSyncSettings = {
        ...settings,
        url,
        intervalMinutes: interval,
      };
      await chrome.storage.local.set({ remoteConfigSync: updated });

      if (updated.enabled) {
        await chrome.runtime.sendMessage({ type: 'remote-config-enable', url, intervalMinutes: interval });
      }

      showToast('Settings saved', 'success');
    } catch {
      showToast('Failed to save settings', 'error');
    }
  }, [urlInput, intervalInput, settings, showToast]);

  const handleToggleEnabled = useCallback(async (enabled: boolean) => {
    try {
      if (enabled) {
        const url = urlInput.trim();
        if (!url) {
          showToast('Set a config URL first', 'error');
          return;
        }
        const interval = Math.max(1, Math.min(1440, parseInt(intervalInput, 10) || 15));
        await chrome.runtime.sendMessage({
          type: 'remote-config-enable',
          url,
          intervalMinutes: interval,
          applyMode: settings.applyMode,
          autoApply: settings.autoApply,
        });
      } else {
        await chrome.runtime.sendMessage({ type: 'remote-config-disable' });
      }
      showToast(enabled ? 'Sync enabled' : 'Sync disabled', 'success');
    } catch {
      showToast('Failed to toggle sync', 'error');
    }
  }, [urlInput, intervalInput, settings, showToast]);

  const handleFetchNow = useCallback(async () => {
    setIsFetching(true);
    try {
      await chrome.runtime.sendMessage({ type: 'remote-config-fetch-now' });
      showToast('Config fetched', 'success');
    } catch {
      showToast('Fetch failed', 'error');
    } finally {
      setIsFetching(false);
    }
  }, [showToast]);

  const handleApplyPending = useCallback(async () => {
    try {
      await chrome.runtime.sendMessage({ type: 'remote-config-apply-pending' });
      showToast('Pending config applied', 'success');
    } catch {
      showToast('Apply failed', 'error');
    }
  }, [showToast]);

  const handleApplyModeChange = useCallback(async (mode: 'replace' | 'merge') => {
    const updated = { ...settings, applyMode: mode };
    await chrome.storage.local.set({ remoteConfigSync: updated });
  }, [settings]);

  const handleAutoApplyToggle = useCallback(async (autoApply: boolean) => {
    const updated = { ...settings, autoApply };
    await chrome.storage.local.set({ remoteConfigSync: updated });
  }, [settings]);

  if (isLoading) {
    return <div className={styles.loading}>Loading…</div>;
  }

  const hasPending = !!settings.pendingConfig;

  return (
    <PremiumGate
      featureTitle="Remote Config Sync"
      featureDescription="Fetch and apply configuration from a remote URL on a schedule — perfect for managing kiosk fleets."
    >
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Remote Config Sync</h1>
          <p className={styles.description}>
            Automatically fetch and apply extension settings from a remote JSON file.
            Ideal for managing multiple kiosks or dashboard displays from a single config.
          </p>
        </div>

        <Card
          title="Sync Settings"
          description="Configure the remote config endpoint"
          icon={<Icon name="download" size={20} />}
        >
          <div className={styles.form}>
            <Input
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://example.com/config.json"
              label="Config URL"
            />
            <Input
              value={intervalInput}
              onChange={(e) => setIntervalInput(e.target.value)}
              placeholder="15"
              label="Sync interval (minutes)"
              type="number"
            />
            <div className={styles.row}>
              <label className={styles.label}>Apply mode</label>
              <select
                className={styles.select}
                value={settings.applyMode}
                onChange={(e) => handleApplyModeChange(e.target.value as 'replace' | 'merge')}
              >
                <option value="replace">Replace — overwrite local settings</option>
                <option value="merge">Merge — keep local, add remote-only items</option>
              </select>
            </div>
            <Toggle
              checked={settings.autoApply}
              onChange={handleAutoApplyToggle}
              label="Auto-apply on fetch"
            />
            <Button onClick={handleSave} leftIcon={<Icon name="download" size={16} />}>
              Save Settings
            </Button>
          </div>
        </Card>

        <Card
          title="Sync Control"
          description={settings.enabled ? 'Sync is active' : 'Sync is paused'}
          icon={<Icon name="refresh" size={20} />}
        >
          <Toggle
            checked={settings.enabled}
            onChange={handleToggleEnabled}
            label="Enable remote config sync"
          />

          <div className={styles.actions}>
            <Button
              onClick={handleFetchNow}
              leftIcon={<Icon name="refresh" size={16} />}
              disabled={!settings.url || isFetching}
            >
              {isFetching ? 'Fetching…' : 'Fetch Now'}
            </Button>

            {hasPending && (
              <Button
                onClick={handleApplyPending}
                leftIcon={<Icon name="download" size={16} />}
              >
                Apply Pending Config
              </Button>
            )}
          </div>

          {settings.lastFetchTime && (
            <div className={styles.status}>
              <div className={styles.statusRow}>
                <span className={styles.statusLabel}>Last fetch:</span>
                <span>{new Date(settings.lastFetchTime).toLocaleString()}</span>
              </div>
              <div className={styles.statusRow}>
                <span className={styles.statusLabel}>Status:</span>
                <span className={settings.lastFetchStatus === 'success' ? styles.statusSuccess : styles.statusError}>
                  {settings.lastFetchStatus === 'success' ? 'Success' : 'Error'}
                </span>
              </div>
              {settings.lastFetchError && (
                <div className={styles.statusRow}>
                  <span className={styles.statusLabel}>Error:</span>
                  <span className={styles.statusError}>{settings.lastFetchError}</span>
                </div>
              )}
            </div>
          )}
        </Card>

        <Card title="Config Format" icon={<Icon name="info" size={20} />}>
          <ul className={styles.tips}>
            <li>The remote file must be a valid JSON matching the extension's export format.</li>
            <li>Use <strong>Replace</strong> mode for fleet-managed kiosks where admin controls all settings.</li>
            <li>Use <strong>Merge</strong> mode to push new rules without overwriting local customizations.</li>
            <li>Export your current config from <strong>Backup & Sync</strong> as a starting template.</li>
            <li>The URL must be HTTPS (or localhost for testing).</li>
          </ul>
        </Card>
      </div>
    </PremiumGate>
  );
}

export default RemoteConfigSettings;
