import React from 'react';
import { Card } from '../../components/common/Card';
import { Toggle } from '../../components/common/Toggle';
import { Button } from '../../components/common/Button';
import { Icon } from '../../components/common/Icon';
import { usePremium } from '../../context/PremiumContext';
import styles from './PremiumStyles.module.css';

function SkipRules() {
  const { isPremium } = usePremium();

  if (!isPremium) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Skip Rules</h1>
          <p className={styles.description}>
            Define which tabs should be skipped during rotation
          </p>
        </div>

        <div className={styles.lockedOverlay}>
          <div className={styles.lockedContent}>
            <Icon name="lock" size={48} />
            <h2>Premium Feature</h2>
            <p>Control exactly which tabs are included in rotation</p>
            <ul className={styles.featureList}>
              <li>Skip tabs by URL pattern</li>
              <li>Skip by domain or regex</li>
              <li>Skip pinned tabs automatically</li>
              <li>Create whitelist or blacklist rules</li>
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
        <h1 className={styles.title}>Skip Rules</h1>
        <p className={styles.description}>
          Define which tabs should be skipped during rotation
        </p>
      </div>

      <Card
        title="Skip Pinned Tabs"
        icon={<Icon name="skip" size={20} />}
      >
        <Toggle
          checked={true}
          onChange={() => {}}
          label="Skip pinned tabs"
          description="Pinned tabs will not be included in automatic rotation"
        />
      </Card>

      <Card
        title="Custom Skip Rules"
        description="Define patterns for tabs to skip"
        icon={<Icon name="settings" size={20} />}
        headerAction={
          <Button variant="primary" size="sm" leftIcon={<Icon name="plus" size={16} />}>
            Add Rule
          </Button>
        }
      >
        <div className={styles.emptyState}>
          <Icon name="skip" size={48} />
          <p>No skip rules configured</p>
          <span>Add rules to skip specific tabs during rotation</span>
        </div>
      </Card>
    </div>
  );
}

export default SkipRules;
