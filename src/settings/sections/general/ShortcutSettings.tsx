import React from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Icon } from '../../components/common/Icon';
import styles from './SectionStyles.module.css';

function ShortcutSettings() {
  const handleCustomize = () => {
    // Open Chrome's keyboard shortcuts page
    chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Keyboard Shortcuts</h1>
        <p className={styles.description}>
          Quickly control tab switching with keyboard shortcuts
        </p>
      </div>

      <Card
        title="Pause/Resume Shortcut"
        description="Temporarily pause or resume tab switching"
        icon={<Icon name="keyboard" size={20} />}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-lg)', flexWrap: 'wrap' }}>
          <span className={styles.shortcutBadge}>Ctrl + Shift + P</span>
          <Button variant="secondary" size="sm" onClick={handleCustomize}>
            Customize in Chrome
          </Button>
        </div>
      </Card>

      <Card
        title="How Shortcuts Work"
        icon={<Icon name="info" size={20} />}
      >
        <div className={styles.infoBox}>
          <p style={{ margin: 0 }}>
            <strong>Pause/Resume:</strong> Press the shortcut to toggle pause state.
            When paused, the extension icon shows a pause indicator.
            Press again to resume automatic tab switching.
          </p>
        </div>
      </Card>
    </div>
  );
}

export default ShortcutSettings;
