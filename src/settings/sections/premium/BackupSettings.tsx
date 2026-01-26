import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { Icon } from '../../components/common/Icon';
import { PremiumGate } from '../../components/common/PremiumGate';
import { useToast } from '../../context/ToastContext';
import styles from './BackupSettings.module.css';

interface BackupData {
  version: string;
  timestamp: number;
  settings: Record<string, unknown>;
}

interface BackupHistoryItem {
  id: string;
  timestamp: number;
  settingsCount: number;
}

const BACKUP_VERSION = '1.0';
const MAX_BACKUPS = 5;

function BackupSettingsContent() {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [backupHistory, setBackupHistory] = useState<BackupHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<BackupHistoryItem | null>(null);

  // Load backup history
  const loadBackupHistory = useCallback(async () => {
    try {
      const result = await chrome.storage.local.get('backupHistory');
      setBackupHistory(result.backupHistory || []);
    } catch (error) {
      console.error('Failed to load backup history:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBackupHistory();
  }, [loadBackupHistory]);

  // Get all exportable settings
  const getAllSettings = async (): Promise<Record<string, unknown>> => {
    const result = await chrome.storage.local.get(null);
    // Exclude non-setting keys
    const excludeKeys = ['backupHistory', 'diagnosticLogs'];
    const settings: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(result)) {
      if (!excludeKeys.includes(key)) {
        settings[key] = value;
      }
    }

    return settings;
  };

  // Create backup data
  const createBackupData = async (): Promise<BackupData> => {
    const settings = await getAllSettings();
    return {
      version: BACKUP_VERSION,
      timestamp: Date.now(),
      settings,
    };
  };

  // Save backup to history
  const saveToHistory = async (backup: BackupData) => {
    const historyItem: BackupHistoryItem = {
      id: `backup_${backup.timestamp}`,
      timestamp: backup.timestamp,
      settingsCount: Object.keys(backup.settings).length,
    };

    // Store the backup data
    await chrome.storage.local.set({
      [`backup_${backup.timestamp}`]: backup,
    });

    // Update history (keep only last MAX_BACKUPS)
    let newHistory = [historyItem, ...backupHistory];
    if (newHistory.length > MAX_BACKUPS) {
      // Remove old backups
      const toRemove = newHistory.slice(MAX_BACKUPS);
      for (const item of toRemove) {
        await chrome.storage.local.remove(item.id);
      }
      newHistory = newHistory.slice(0, MAX_BACKUPS);
    }

    await chrome.storage.local.set({ backupHistory: newHistory });
    setBackupHistory(newHistory);
  };

  // Export to file
  const handleExportToFile = async () => {
    setIsExporting(true);
    try {
      const backupData = await createBackupData();
      const jsonString = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const date = new Date().toISOString().split('T')[0];
      const a = document.createElement('a');
      a.href = url;
      a.download = `autotab-settings-${date}.json`;
      a.click();

      URL.revokeObjectURL(url);
      showToast('Settings exported successfully', 'success');
    } catch (error) {
      console.error('Export failed:', error);
      showToast('Failed to export settings', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // Copy to clipboard
  const handleCopyToClipboard = async () => {
    try {
      const backupData = await createBackupData();
      const jsonString = JSON.stringify(backupData, null, 2);
      await navigator.clipboard.writeText(jsonString);
      showToast('Settings copied to clipboard', 'success');
    } catch (error) {
      console.error('Copy failed:', error);
      showToast('Failed to copy settings', 'error');
    }
  };

  // Import from file
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const text = await file.text();
      const backupData = JSON.parse(text) as BackupData;

      // Validate backup format
      if (!backupData.version || !backupData.settings) {
        throw new Error('Invalid backup file format');
      }

      // Create a backup of current settings before importing
      const currentBackup = await createBackupData();
      await saveToHistory(currentBackup);

      // Import settings
      await chrome.storage.local.set(backupData.settings);

      showToast(`Imported ${Object.keys(backupData.settings).length} settings`, 'success');

      // Reload page to apply settings
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Import failed:', error);
      showToast('Failed to import settings. Invalid file format.', 'error');
    } finally {
      setIsImporting(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Restore from history
  const handleRestoreClick = (backup: BackupHistoryItem) => {
    setSelectedBackup(backup);
    setShowRestoreModal(true);
  };

  const handleRestoreConfirm = async () => {
    if (!selectedBackup) return;

    setIsImporting(true);
    try {
      const result = await chrome.storage.local.get(selectedBackup.id);
      const backupData = result[selectedBackup.id] as BackupData;

      if (!backupData) {
        throw new Error('Backup data not found');
      }

      // Create a backup of current settings before restoring
      const currentBackup = await createBackupData();
      await saveToHistory(currentBackup);

      // Restore settings
      await chrome.storage.local.set(backupData.settings);

      showToast('Settings restored successfully', 'success');
      setShowRestoreModal(false);

      // Reload page to apply settings
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Restore failed:', error);
      showToast('Failed to restore settings', 'error');
    } finally {
      setIsImporting(false);
    }
  };

  // Delete backup
  const handleDeleteClick = (backup: BackupHistoryItem) => {
    setSelectedBackup(backup);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedBackup) return;

    try {
      // Remove backup data
      await chrome.storage.local.remove(selectedBackup.id);

      // Update history
      const newHistory = backupHistory.filter((b) => b.id !== selectedBackup.id);
      await chrome.storage.local.set({ backupHistory: newHistory });
      setBackupHistory(newHistory);

      showToast('Backup deleted', 'success');
      setShowDeleteModal(false);
    } catch (error) {
      console.error('Delete failed:', error);
      showToast('Failed to delete backup', 'error');
    }
  };

  // Format date
  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Backup & Sync</h1>
        <p className={styles.description}>
          Export and import your settings and configurations
        </p>
      </div>

      <Card
        title="Export Settings"
        description="Download your settings as a JSON file"
        icon={<Icon name="download" size={20} />}
      >
        <div className={styles.buttonGroup}>
          <Button
            variant="primary"
            leftIcon={<Icon name="download" size={16} />}
            onClick={handleExportToFile}
            isLoading={isExporting}
          >
            Export to File
          </Button>
          <Button
            variant="secondary"
            leftIcon={<Icon name="copy" size={16} />}
            onClick={handleCopyToClipboard}
          >
            Copy to Clipboard
          </Button>
        </div>
      </Card>

      <Card
        title="Import Settings"
        description="Restore settings from a backup file"
        icon={<Icon name="upload" size={20} />}
      >
        <div className={styles.importSection}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className={styles.hiddenInput}
          />
          <Button
            variant="secondary"
            leftIcon={<Icon name="upload" size={16} />}
            onClick={handleImportClick}
            isLoading={isImporting}
          >
            Import from File
          </Button>
          <p className={styles.importHint}>
            A backup of your current settings will be created before importing.
          </p>
        </div>
      </Card>

      <Card
        title="Backup History"
        description={`${backupHistory.length} backup${backupHistory.length !== 1 ? 's' : ''} stored`}
        icon={<Icon name="folder" size={20} />}
      >
        {backupHistory.length === 0 ? (
          <div className={styles.emptyState}>
            <Icon name="folder" size={48} />
            <p>No backups available</p>
            <span>Backups are created automatically when importing settings</span>
          </div>
        ) : (
          <div className={styles.backupList}>
            {backupHistory.map((backup) => (
              <div key={backup.id} className={styles.backupItem}>
                <div className={styles.backupInfo}>
                  <span className={styles.backupDate}>{formatDate(backup.timestamp)}</span>
                  <span className={styles.backupMeta}>
                    {backup.settingsCount} settings
                  </span>
                </div>
                <div className={styles.backupActions}>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleRestoreClick(backup)}
                  >
                    Restore
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteClick(backup)}
                  >
                    <Icon name="trash" size={16} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="Tips" icon={<Icon name="info" size={20} />}>
        <div className={styles.tipsContent}>
          <div className={styles.tipItem}>
            <Icon name="check" size={16} />
            <span>Export your settings regularly to keep a backup</span>
          </div>
          <div className={styles.tipItem}>
            <Icon name="check" size={16} />
            <span>Up to {MAX_BACKUPS} automatic backups are kept in history</span>
          </div>
          <div className={styles.tipItem}>
            <Icon name="check" size={16} />
            <span>Importing will automatically backup your current settings first</span>
          </div>
        </div>
      </Card>

      {/* Restore Confirmation Modal */}
      <Modal
        isOpen={showRestoreModal}
        onClose={() => setShowRestoreModal(false)}
        title="Restore Backup"
      >
        <div className={styles.modalContent}>
          <p className={styles.modalWarning}>
            Are you sure you want to restore settings from{' '}
            {selectedBackup && formatDate(selectedBackup.timestamp)}?
          </p>
          <p className={styles.modalHint}>
            Your current settings will be backed up before restoring.
          </p>
          <div className={styles.modalActions}>
            <Button variant="ghost" onClick={() => setShowRestoreModal(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleRestoreConfirm}
              isLoading={isImporting}
            >
              Restore
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Backup"
      >
        <div className={styles.modalContent}>
          <p className={styles.deleteWarning}>
            Are you sure you want to delete the backup from{' '}
            {selectedBackup && formatDate(selectedBackup.timestamp)}?
            This action cannot be undone.
          </p>
          <div className={styles.modalActions}>
            <Button variant="ghost" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDeleteConfirm}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function BackupSettings() {
  return (
    <PremiumGate
      featureTitle="Backup & Sync"
      featureDescription="Never lose your carefully configured settings"
      features={[
        { text: 'Export all settings to JSON' },
        { text: 'Import settings from backup' },
        { text: 'Automatic backup history' },
        { text: 'Restore from previous backups' },
      ]}
    >
      <BackupSettingsContent />
    </PremiumGate>
  );
}

export default BackupSettings;
