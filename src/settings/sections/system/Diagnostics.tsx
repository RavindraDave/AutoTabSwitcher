import React, { useState, useEffect } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Icon } from '../../components/common/Icon';
import { useSettings } from '../../context/SettingsContext';
import { usePremium } from '../../context/PremiumContext';
import styles from './SystemStyles.module.css';

interface SystemStatus {
  extensionEnabled: boolean;
  currentMode: string;
  delayTime: number;
  pauseOnActivity: boolean;
  isPremium: boolean;
}

function Diagnostics() {
  const { settings, getDelayInSeconds } = useSettings();
  const { isPremium } = usePremium();
  const [logs, setLogs] = useState<string[]>([]);

  const status: SystemStatus = {
    extensionEnabled: settings.enabled,
    currentMode: settings.switchingMode,
    delayTime: getDelayInSeconds(), // Convert from ms to seconds
    pauseOnActivity: settings.pauseOnActivity,
    isPremium,
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
          <div className={styles.statusItem}>
            <span className={styles.statusLabel}>Premium Status</span>
            <span className={`${styles.statusValue} ${status.isPremium ? styles.premium : ''}`}>
              {status.isPremium ? 'Active' : 'Free'}
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
            logs.map((log, index) => (
              <div key={index} className={styles.logEntry}>
                {log}
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}

export default Diagnostics;
