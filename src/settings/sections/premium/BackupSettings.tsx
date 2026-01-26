import React from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Icon } from '../../components/common/Icon';
import { usePremium } from '../../context/PremiumContext';
import styles from './PremiumStyles.module.css';

function BackupSettings() {
  const { isPremium } = usePremium();

  if (!isPremium) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Backup & Sync</h1>
          <p className={styles.description}>
            Export and import your settings and configurations
          </p>
        </div>

        <div className={styles.lockedOverlay}>
          <div className={styles.lockedContent}>
            <Icon name="lock" size={48} />
            <h2>Premium Feature</h2>
            <p>Never lose your carefully configured settings</p>
            <ul className={styles.featureList}>
              <li>Export all settings to JSON</li>
              <li>Import settings from backup</li>
              <li>Automatic backup management</li>
              <li>Restore from previous backups</li>
            </ul>
            <Button variant="primary">Activate Premium</Button>
          </div>
        </div>
      </div>
    );
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
        <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
          <Button variant="primary" leftIcon={<Icon name="download" size={16} />}>
            Export to File
          </Button>
          <Button variant="secondary" leftIcon={<Icon name="copy" size={16} />}>
            Copy to Clipboard
          </Button>
        </div>
      </Card>

      <Card
        title="Import Settings"
        description="Restore settings from a backup file"
        icon={<Icon name="upload" size={20} />}
      >
        <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
          <Button variant="secondary" leftIcon={<Icon name="upload" size={16} />}>
            Import from File
          </Button>
        </div>
      </Card>

      <Card
        title="Backup History"
        description="View and restore from previous backups"
        icon={<Icon name="folder" size={20} />}
      >
        <div className={styles.emptyState}>
          <Icon name="folder" size={48} />
          <p>No backups available</p>
          <span>Backups are created automatically when importing settings</span>
        </div>
      </Card>
    </div>
  );
}

export default BackupSettings;
