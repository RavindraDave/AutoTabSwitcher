import React from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Icon } from '../../components/common/Icon';
import { usePremium } from '../../context/PremiumContext';
import styles from './PremiumStyles.module.css';

function SessionManagement() {
  const { isPremium } = usePremium();

  if (!isPremium) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Session Management</h1>
          <p className={styles.description}>
            Save and restore your browser sessions instantly
          </p>
        </div>

        <div className={styles.lockedOverlay}>
          <div className={styles.lockedContent}>
            <Icon name="lock" size={48} />
            <h2>Premium Feature</h2>
            <p>Save and restore your tab sessions with one click</p>
            <ul className={styles.featureList}>
              <li>Save current window as a session</li>
              <li>Restore sessions instantly</li>
              <li>Auto-launch favorite sessions on startup</li>
              <li>Organize with session templates</li>
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
        <h1 className={styles.title}>Session Management</h1>
        <p className={styles.description}>
          Save and restore your browser sessions instantly
        </p>
      </div>

      <Card
        title="Saved Sessions"
        description="Your saved browser sessions"
        icon={<Icon name="folder" size={20} />}
        headerAction={
          <Button variant="primary" size="sm" leftIcon={<Icon name="plus" size={16} />}>
            Save Current
          </Button>
        }
      >
        <div className={styles.emptyState}>
          <Icon name="folder" size={48} />
          <p>No saved sessions yet</p>
          <span>Click "Save Current" to save your first session</span>
        </div>
      </Card>
    </div>
  );
}

export default SessionManagement;
