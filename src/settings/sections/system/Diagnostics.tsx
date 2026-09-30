import React, { useState, useEffect } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Icon } from '../../components/common/Icon';
import { useSettings } from '../../context/SettingsContext';
import type { LogEntry } from '../../../core/logger';
import styles from './SystemStyles.module.css';

interface SystemStatus {
  extensionEnabled: boolean;
  currentMode: string;
  delayTime: number;
  pauseOnActivity: boolean;
}

function Diagnostics() {
  const { settings, getDelayInSeconds } = useSettings();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc'); // Default: newest first

  const status: SystemStatus = {
    extensionEnabled: settings.enabled,
    currentMode: settings.switchingMode,
    delayTime: getDelayInSeconds(), // Convert from ms to seconds
    pauseOnActivity: settings.pauseOnActivity,
  };

  useEffect(() => {
    // Load logs from storage
    chrome.storage.local.get('diagnosticLogs').then((result) => {
      if (result.diagnosticLogs) {
        setLogs(result.diagnosticLogs.slice(-50)); // Last 50 logs
      }
    });
  }, []);

  const handleExportLogs = () => {
    const logData = JSON.stringify(logs, null, 2);
    const blob = new Blob([logData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `autotab-logs-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClearLogs = async () => {
    await chrome.storage.local.remove('diagnosticLogs');
    setLogs([]);
  };

  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
  };

  // Sort logs based on current sort order
  const sortedLogs = [...logs].sort((a, b) => {
    return sortOrder === 'desc'
      ? b.timestamp - a.timestamp  // Newest first
      : a.timestamp - b.timestamp; // Oldest first
  });

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  const getLevelClass = (level: string) => {
    switch (level) {
      case 'ERROR': return styles.logError;
      case 'WARN': return styles.logWarn;
      case 'INFO': return styles.logInfo;
      case 'DEBUG': return styles.logDebug;
      default: return '';
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Diagnostics</h1>
        <p className={styles.description}>
          View system status and troubleshoot issues
        </p>
      </div>

      <Card
        title="System Status"
        icon={<Icon name="info" size={20} />}
      >
        <div className={styles.statusGrid}>
          <div className={styles.statusItem}>
            <span className={styles.statusLabel}>Extension Status</span>
            <span className={`${styles.statusValue} ${status.extensionEnabled ? styles.active : ''}`}>
              {status.extensionEnabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>
          <div className={styles.statusItem}>
            <span className={styles.statusLabel}>Operating Mode</span>
            <span className={styles.statusValue}>{status.currentMode}</span>
          </div>
          <div className={styles.statusItem}>
            <span className={styles.statusLabel}>Delay Time</span>
            <span className={styles.statusValue}>{status.delayTime}s</span>
          </div>
          <div className={styles.statusItem}>
            <span className={styles.statusLabel}>Pause on Activity</span>
            <span className={styles.statusValue}>
              {status.pauseOnActivity ? 'Enabled' : 'Disabled'}
            </span>
          </div>
        </div>
      </Card>

      <Card
        title="Activity Logs"
        description="Recent extension activity"
        icon={<Icon name="tool" size={20} />}
        headerAction={
          <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleSortOrder}
              aria-label={`Sort ${sortOrder === 'desc' ? 'oldest first' : 'newest first'}`}
            >
              <Icon name={sortOrder === 'desc' ? 'chevronDown' : 'chevronDown'} size={16} />
              {sortOrder === 'desc' ? 'Newest' : 'Oldest'}
            </Button>
            <Button variant="secondary" size="sm" onClick={handleExportLogs}>
              Export
            </Button>
            <Button variant="ghost" size="sm" onClick={handleClearLogs}>
              Clear
            </Button>
          </div>
        }
      >
        <div className={styles.logContainer}>
          {logs.length === 0 ? (
            <p className={styles.noLogs}>No logs available</p>
          ) : (
            sortedLogs.map((log, index) => (
              <div key={index} className={`${styles.logEntry} ${getLevelClass(log.level)}`}>
                <div className={styles.logHeader}>
                  <span className={styles.logTime}>{formatTimestamp(log.timestamp)}</span>
                  <span className={styles.logLevel}>{log.level}</span>
                  <span className={styles.logCategory}>{log.category}</span>
                </div>
                <div className={styles.logMessage}>{log.message}</div>
                {log.data && (
                  <div className={styles.logData}>
                    {JSON.stringify(log.data, null, 2)}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}

export default Diagnostics;
