import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../../components/common/Card';
import { Toggle } from '../../components/common/Toggle';
import { Icon } from '../../components/common/Icon';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { useToast } from '../../context/ToastContext';
import styles from './UrlListSettings.module.css';

interface UrlEntry {
  id: string;
  url: string;
  label?: string;
  delayMs?: number;
  enabled: boolean;
  createdAt: number;
}

const MAX_ENTRIES = 100;
const MAX_LABEL_LENGTH = 100;

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function UrlListSettings() {
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [entries, setEntries] = useState<UrlEntry[]>([]);
  const [urlInput, setUrlInput] = useState('');
  const [labelInput, setLabelInput] = useState('');
  const [delayInput, setDelayInput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [currentMode, setCurrentMode] = useState('global');

  useEffect(() => {
    const load = async () => {
      try {
        const data = await chrome.storage.local.get(['urlListConfig', 'switchingMode', 'enabled']);
        const config = data['urlListConfig'] as { entries?: UrlEntry[]; windowId?: number } | undefined;
        setEntries(config?.entries ?? []);
        setIsRunning(data['switchingMode'] === 'urlList' && data['enabled'] === true);
        setCurrentMode(data['switchingMode'] ?? 'global');
      } catch (error) {
        console.error('Failed to load URL list settings:', error);
      } finally {
        setIsLoading(false);
      }
    };
    load();

    const listener = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes['urlListConfig']) {
        const config = changes['urlListConfig'].newValue;
        if (config?.entries) setEntries(config.entries);
      }
      if (changes['switchingMode'] || changes['enabled']) {
        chrome.storage.local.get(['switchingMode', 'enabled']).then(d => {
          setIsRunning(d['switchingMode'] === 'urlList' && d['enabled'] === true);
          setCurrentMode(d['switchingMode'] ?? 'global');
        });
      }
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);

  const saveEntries = useCallback(async (newEntries: UrlEntry[]) => {
    const data = await chrome.storage.local.get('urlListConfig');
    const config = (data['urlListConfig'] as { entries?: UrlEntry[]; windowId?: number; lastActiveIndex?: number }) ?? { entries: [] };
    config.entries = newEntries;
    await chrome.storage.local.set({ urlListConfig: config });
    setEntries(newEntries);
  }, []);

  const handleAdd = useCallback(async () => {
    const url = urlInput.trim();
    if (!url) {
      showToast('Please enter a URL', 'error');
      return;
    }
    try {
      new URL(url);
    } catch {
      showToast('Invalid URL format', 'error');
      return;
    }
    if (entries.length >= MAX_ENTRIES) {
      showToast(`Maximum ${MAX_ENTRIES} entries reached`, 'error');
      return;
    }
    const newEntry: UrlEntry = {
      id: generateId(),
      url,
      label: labelInput.trim().slice(0, MAX_LABEL_LENGTH) || undefined,
      delayMs: delayInput ? Math.max(2, Math.min(3600, parseInt(delayInput, 10))) * 1000 : undefined,
      enabled: true,
      createdAt: Date.now(),
    };
    await saveEntries([...entries, newEntry]);
    setUrlInput('');
    setLabelInput('');
    setDelayInput('');
    showToast('URL added', 'success');
  }, [urlInput, labelInput, delayInput, entries, saveEntries, showToast]);

  const handleRemove = useCallback(async (id: string) => {
    await saveEntries(entries.filter(e => e.id !== id));
    showToast('URL removed', 'success');
  }, [entries, saveEntries, showToast]);

  const handleToggleEntry = useCallback(async (id: string) => {
    const updated = entries.map(e => e.id === id ? { ...e, enabled: !e.enabled } : e);
    await saveEntries(updated);
  }, [entries, saveEntries]);

  const handleStartRotation = useCallback(async () => {
    const enabledCount = entries.filter(e => e.enabled).length;
    if (enabledCount === 0) {
      showToast('Add at least one enabled URL first', 'error');
      return;
    }
    try {
      await chrome.storage.local.set({
        switchingMode: 'urlList',
        operatingMode: 'urlList',
        enabled: true,
      });
      showToast('URL list rotation started', 'success');
    } catch {
      showToast('Failed to start rotation', 'error');
    }
  }, [entries, showToast]);

  const handleStopRotation = useCallback(async () => {
    try {
      await chrome.storage.local.set({ enabled: false });
      showToast('Rotation stopped', 'success');
    } catch {
      showToast('Failed to stop rotation', 'error');
    }
  }, [showToast]);

  const handleMoveUp = useCallback(async (index: number) => {
    if (index === 0) return;
    const updated = [...entries];
    const prev = updated[index - 1];
    const curr = updated[index];
    if (prev && curr) {
      updated[index - 1] = curr;
      updated[index] = prev;
      await saveEntries(updated);
    }
  }, [entries, saveEntries]);

  const handleMoveDown = useCallback(async (index: number) => {
    if (index >= entries.length - 1) return;
    const updated = [...entries];
    const curr = updated[index];
    const next = updated[index + 1];
    if (curr && next) {
      updated[index] = next;
      updated[index + 1] = curr;
      await saveEntries(updated);
    }
  }, [entries, saveEntries]);

  if (isLoading) {
    return <div className={styles.loading}>Loading…</div>;
  }

  const enabledCount = entries.filter(e => e.enabled).length;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>URL List Rotation</h1>
        <p className={styles.description}>
          Define a set of URLs to rotate through in a dedicated window. The extension opens them and cycles automatically — perfect for dashboards, kiosks, and monitoring walls.
        </p>
      </div>

      <Card
        title="Rotation Control"
        description={isRunning ? `Rotating ${enabledCount} URLs` : `${enabledCount} URLs ready`}
        icon={<Icon name="play" size={20} />}
      >
        {isRunning ? (
          <Button onClick={handleStopRotation} leftIcon={<Icon name="pause" size={16} />}>
            Stop Rotation
          </Button>
        ) : (
          <Button onClick={handleStartRotation} leftIcon={<Icon name="play" size={16} />}>
            Start Rotation ({enabledCount} URLs)
          </Button>
        )}
        {currentMode !== 'urlList' && currentMode !== 'global' && (
          <p className={styles.modeWarning}>
            Currently in {currentMode} mode. Starting URL list rotation will switch the mode.
          </p>
        )}
      </Card>

      <Card
        title="Add URL"
        description="Add a URL to the rotation list"
        icon={<Icon name="plus" size={20} />}
      >
        <div className={styles.form}>
          <Input
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://grafana.local/dashboard"
            label="URL"
          />
          <Input
            value={labelInput}
            onChange={(e) => setLabelInput(e.target.value)}
            placeholder="Dashboard (optional)"
            label="Label"
          />
          <Input
            value={delayInput}
            onChange={(e) => setDelayInput(e.target.value)}
            placeholder="Use global interval"
            label="Display time (seconds, optional)"
            type="number"
          />
          <Button onClick={handleAdd} leftIcon={<Icon name="plus" size={16} />}>
            Add URL
          </Button>
        </div>
      </Card>

      {entries.length > 0 && (
        <Card
          title={`URL List (${entries.length})`}
          description="Drag to reorder. Toggle to skip individual URLs."
          icon={<Icon name="globe" size={20} />}
        >
          <div className={styles.list}>
            {entries.map((entry, index) => (
              <div key={entry.id} className={`${styles.entry} ${entry.enabled ? '' : styles.disabled}`}>
                <div className={styles.entryOrder}>
                  <button className={styles.orderBtn} onClick={() => handleMoveUp(index)} disabled={index === 0} aria-label="Move up">▲</button>
                  <span className={styles.orderNumber}>{index + 1}</span>
                  <button className={styles.orderBtn} onClick={() => handleMoveDown(index)} disabled={index === entries.length - 1} aria-label="Move down">▼</button>
                </div>
                <div className={styles.entryInfo}>
                  <div className={styles.entryLabel}>{entry.label || entry.url}</div>
                  {entry.label && <div className={styles.entryUrl}>{entry.url}</div>}
                  {entry.delayMs && (
                    <div className={styles.entryDelay}>{entry.delayMs / 1000}s</div>
                  )}
                </div>
                <div className={styles.entryActions}>
                  <Toggle
                    checked={entry.enabled}
                    onChange={() => handleToggleEntry(entry.id)}
                    label=""
                  />
                  <button className={styles.deleteBtn} onClick={() => handleRemove(entry.id)} aria-label="Remove URL">
                    <Icon name="trash" size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card title="Tips" icon={<Icon name="info" size={20} />}>
        <ul className={styles.tips}>
          <li>URLs are opened in a new dedicated window when rotation starts.</li>
          <li>Each URL can have its own display time; otherwise the global interval is used.</li>
          <li>Combine with <strong>Kiosk Mode</strong> for a fullscreen dashboard wall.</li>
          <li>Disabled entries stay in the list but are skipped during rotation.</li>
        </ul>
      </Card>
    </div>
  );
}

export default UrlListSettings;
