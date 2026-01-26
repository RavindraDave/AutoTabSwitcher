import React from 'react';
import { Card } from '../../components/common/Card';
import { Toggle } from '../../components/common/Toggle';
import { Button } from '../../components/common/Button';
import { Icon } from '../../components/common/Icon';
import { usePremium } from '../../context/PremiumContext';
import styles from './PremiumStyles.module.css';

function RefreshSettings() {
  const { isPremium } = usePremium();

  if (!isPremium) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Smart Refresh</h1>
          <p className={styles.description}>
            Automatically refresh tabs based on rules and schedules
          </p>
        </div>

        <div className={styles.lockedOverlay}>
          <div className={styles.lockedContent}>
            <Icon name="lock" size={48} />
            <h2>Premium Feature</h2>
            <p>Keep your tabs fresh with smart auto-refresh</p>
            <ul className={styles.featureList}>
              <li>Preemptive refresh before tab switch</li>
              <li>Post-switch refresh after activation</li>
              <li>Custom refresh rules per URL/domain</li>
              <li>Configurable refresh intervals</li>
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
        <h1 className={styles.title}>Smart Refresh</h1>
        <p className={styles.description}>
          Automatically refresh tabs based on rules and schedules
        </p>
      </div>

      <Card
        title="Enable Smart Refresh"
        icon={<Icon name="refresh" size={20} />}
      >
        <Toggle
          checked={false}
          onChange={() => {}}
          label="Enable automatic tab refresh"
          description="Refresh tabs automatically based on your configured rules"
        />
      </Card>

      <Card
        title="Refresh Rules"
        description="Define when and which tabs should be refreshed"
        icon={<Icon name="settings" size={20} />}
        headerAction={
          <Button variant="primary" size="sm" leftIcon={<Icon name="plus" size={16} />}>
            Add Rule
          </Button>
        }
      >
        <div className={styles.emptyState}>
          <Icon name="refresh" size={48} />
          <p>No refresh rules configured</p>
          <span>Add rules to automatically refresh specific tabs</span>
        </div>
      </Card>
    </div>
  );
}

export default RefreshSettings;
