import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card } from '../../components/common/Card';
import { Icon } from '../../components/common/Icon';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { useToast } from '../../context/ToastContext';
import styles from './PerTabDelays.module.css';

/**
 * Phase 1.1 — Per-Tab Custom Display Time
 *
 * Lists, edits, and deletes per-tab delay entries. Reads optional
 * `addTab` and `label` URL hash parameters when opened from the
 * right-click context menu so the user lands on a pre-filled form.
 */

interface TabDelayEntry {
  url: string;
  delay: number;
  label?: string;
  createdAt: number;
  updatedAt?: number;
}

const MIN_DELAY_SECONDS = 2;
const MAX_DELAY_SECONDS = 3600;
const MAX_LABEL_LENGTH = 100;
const MAX_TAB_DELAY_ENTRIES = 500;
const ALLOWED_SCHEMES = new Set(['http:', 'https:', 'file:', 'ftp:']);

/**
 * Mirror of core/url-normalizer.ts. Duplicated here so the React bundle
 * does not need to import service-worker code.
 */
function normalizeUrlKey(url: string | undefined | null): string | null {
  if (!url || typeof url !== 'string') return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (!ALLOWED_SCHEMES.has(parsed.protocol)) return null;
  const pathname = parsed.pathname.replace(/\/+$/, '') || '/';
  return `${parsed.origin}${pathname}`;
}

function parseHashParams(): { addTab?: string; label?: string } {
  // Hash format: #/general/per-tab-delays?addTab=...&label=...
  const hash = window.location.hash;
  const queryStart = hash.indexOf('?');
  if (queryStart === -1) return {};
  const params = new URLSearchParams(hash.slice(queryStart + 1));
  const result: { addTab?: string; label?: string } = {};
  const addTab = params.get('addTab');
  const label = params.get('label');
  if (addTab) result.addTab = addTab;
  if (label) result.label = label;
  return result;
}

function clearHashParams(): void {
  // Strip the query portion but preserve the route
  const hash = window.location.hash;
  const queryStart = hash.indexOf('?');
  if (queryStart !== -1) {
    window.history.replaceState(null, '', hash.slice(0, queryStart));
  }
}

function formatSeconds(ms: number): string {
  return `${Math.round(ms / 1000)}s`;
}

function PerTabDelays() {
  const { showToast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [entries, setEntries] = useState<{ [key: string]: TabDelayEntry }>({});

  // Form state
  const [formUrl, setFormUrl] = useState('');
  const [formLabel, setFormLabel] = useState('');
  const [formSeconds, setFormSeconds] = useState<string>('30');
  const [formError, setFormError] = useState<string | null>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);

  const sortedEntries = useMemo(() => {
    return Object.entries(entries)
      .map(([key, entry]) => ({ key, entry }))
      .sort((a, b) => (b.entry.updatedAt ?? b.entry.createdAt) - (a.entry.updatedAt ?? a.entry.createdAt));
  }, [entries]);

  const refreshEntries = useCallback(async () => {
    try {
      const result = await chrome.storage.local.get('tabDelays');
      const loaded: { [key: string]: TabDelayEntry } = result['tabDelays'] || {};
      setEntries(loaded);
    } catch (error) {
      console.error('Failed to load per-tab delays:', error);
      showToast('Failed to load per-tab delays', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    refreshEntries();

    // If opened from the context menu, pre-fill the form
    const params = parseHashParams();
    if (params.addTab) {
      setFormUrl(params.addTab);
      if (params.label) {
        setFormLabel(params.label.slice(0, MAX_LABEL_LENGTH));
      }
      clearHashParams();
    }

    // Re-sync if storage is updated from another surface (popup, context menu, etc.)
    const listener = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string
    ) => {
      if (areaName === 'local' && changes['tabDelays']) {
        setEntries(changes['tabDelays'].newValue || {});
      }
    };
    chrome.storage.onChanged.addListener(listener);
    return () => {
      chrome.storage.onChanged.removeListener(listener);
    };
  }, [refreshEntries]);

  const validateForm = useCallback((): string | null => {
    if (!formUrl.trim()) {
      return 'URL is required';
    }
    let parsed: URL;
    try {
      parsed = new URL(formUrl.trim());
    } catch {
      return 'URL is not valid';
    }
    if (!['http:', 'https:', 'file:', 'ftp:'].includes(parsed.protocol)) {
      return 'Only http/https/file/ftp URLs are supported';
    }
    const seconds = parseInt(formSeconds, 10);
    if (!Number.isFinite(seconds)) {
      return 'Seconds must be a number';
    }
    if (seconds < MIN_DELAY_SECONDS || seconds > MAX_DELAY_SECONDS) {
      return `Seconds must be between ${MIN_DELAY_SECONDS} and ${MAX_DELAY_SECONDS}`;
    }
    return null;
  }, [formUrl, formSeconds]);

  const resetForm = useCallback(() => {
    setFormUrl('');
    setFormLabel('');
    setFormSeconds('30');
    setFormError(null);
    setEditingKey(null);
  }, []);

  const handleSave = useCallback(async () => {
    const error = validateForm();
    if (error) {
      setFormError(error);
      return;
    }
    setFormError(null);

    const key = normalizeUrlKey(formUrl.trim());
    if (!key) {
      setFormError('URL is not valid');
      return;
    }

    try {
      const result = await chrome.storage.local.get('tabDelays');
      const current: { [k: string]: TabDelayEntry } = result['tabDelays'] || {};

      // Enforce max-entry cap (matches core constants)
      if (!current[key] && Object.keys(current).length >= MAX_TAB_DELAY_ENTRIES) {
        setFormError(`Maximum of ${MAX_TAB_DELAY_ENTRIES} entries reached`);
        return;
      }

      const now = Date.now();
      const trimmedLabel = formLabel.trim().slice(0, MAX_LABEL_LENGTH);
      const existing = current[key];
      const updated: TabDelayEntry = {
        url: key,
        delay: parseInt(formSeconds, 10) * 1000,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
        ...(trimmedLabel ? { label: trimmedLabel } : existing?.label ? { label: existing.label } : {}),
      };
      current[key] = updated;
      await chrome.storage.local.set({ tabDelays: current });

      await refreshEntries();
      showToast(editingKey ? 'Per-tab delay updated' : 'Per-tab delay added', 'success');
      resetForm();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setFormError(message);
      showToast(`Failed to save per-tab delay: ${message}`, 'error');
    }
  }, [validateForm, formUrl, formSeconds, formLabel, editingKey, refreshEntries, resetForm, showToast]);

  const handleEdit = useCallback((key: string, entry: TabDelayEntry) => {
    setEditingKey(key);
    setFormUrl(entry.url);
    setFormLabel(entry.label ?? '');
    setFormSeconds(String(Math.round(entry.delay / 1000)));
    setFormError(null);
    // Scroll the form into view for the user
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleDelete = useCallback(async (key: string) => {
    try {
      const result = await chrome.storage.local.get('tabDelays');
      const current: { [k: string]: TabDelayEntry } = result['tabDelays'] || {};
      if (current[key]) {
        delete current[key];
        await chrome.storage.local.set({ tabDelays: current });
      }
      await refreshEntries();
      showToast('Per-tab delay deleted', 'success');
      if (editingKey === key) {
        resetForm();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      showToast(`Failed to delete: ${message}`, 'error');
    }
  }, [refreshEntries, showToast, editingKey, resetForm]);

  if (isLoading) {
    return <div className={styles.loading}>Loading…</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Per-Tab Display Time</h1>
        <p className={styles.description}>
          Override the rotation interval on a per-URL basis. Useful when some dashboards
          need a longer dwell time than others. Right-click any tab and choose
          <em> Set Custom Rotation Time for This Tab… </em>
          to add an entry quickly.
        </p>
      </div>

      <Card
        title={editingKey ? 'Edit per-tab delay' : 'Add per-tab delay'}
        icon={<Icon name="clock" size={20} />}
      >
        <div className={styles.form}>
          <Input
            label="URL"
            description="Query strings and fragments are ignored. Only http(s)/file/ftp URLs are supported."
            placeholder="https://example.com/dashboard"
            value={formUrl}
            onChange={(value) => setFormUrl(value)}
            disabled={editingKey !== null}
          />
          <Input
            label="Label (optional)"
            description="Friendly name shown in the list. Defaults to the hostname."
            placeholder="Sales Dashboard"
            value={formLabel}
            maxLength={MAX_LABEL_LENGTH}
            onChange={(value) => setFormLabel(value)}
          />
          <Input
            label="Display time (seconds)"
            description={`Between ${MIN_DELAY_SECONDS} and ${MAX_DELAY_SECONDS} seconds.`}
            type="number"
            min={MIN_DELAY_SECONDS}
            max={MAX_DELAY_SECONDS}
            value={formSeconds}
            onChange={(value) => setFormSeconds(value)}
            suffix="seconds"
            error={formError ?? undefined}
          />
          <div className={styles.formActions}>
            <Button onClick={handleSave}>{editingKey ? 'Save changes' : 'Add entry'}</Button>
            {editingKey && (
              <Button variant="secondary" onClick={resetForm}>
                Cancel
              </Button>
            )}
          </div>
        </div>
      </Card>

      <Card
        title={`Saved entries (${sortedEntries.length})`}
        description="Per-tab delays take precedence over group, window, and global rotation intervals."
        icon={<Icon name="folder" size={20} />}
      >
        {sortedEntries.length === 0 ? (
          <div className={styles.empty}>
            No per-tab delays yet. Add one above or right-click a tab to set its display time.
          </div>
        ) : (
          <ul className={styles.list}>
            {sortedEntries.map(({ key, entry }) => (
              <li key={key} className={styles.listItem}>
                <div className={styles.listItemMain}>
                  <div className={styles.listItemLabel}>{entry.label || entry.url}</div>
                  <div className={styles.listItemUrl} title={entry.url}>{entry.url}</div>
                </div>
                <div className={styles.listItemDelay}>{formatSeconds(entry.delay)}</div>
                <div className={styles.listItemActions}>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleEdit(key, entry)}
                    leftIcon={<Icon name="edit" size={14} />}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => handleDelete(key)}
                    leftIcon={<Icon name="trash" size={14} />}
                  >
                    Delete
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

export default PerTabDelays;
