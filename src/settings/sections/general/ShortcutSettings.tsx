import React from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Icon } from '../../components/common/Icon';
import styles from './ShortcutSettings.module.css';

interface ShortcutInfo {
  name: string;
  description: string;
  keys: string[];
}

const shortcuts: ShortcutInfo[] = [
  {
    name: 'Pause/Resume',
    description: 'Toggle pause state for automatic tab switching',
    keys: ['Ctrl', 'Shift', 'P'],
  },
];

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
        title="Available Shortcuts"
        description="Current keyboard shortcuts for the extension"
        icon={<Icon name="keyboard" size={20} />}
        headerAction={
          <Button variant="secondary" size="sm" onClick={handleCustomize}>
            Customize
          </Button>
        }
      >
        <div className={styles.shortcutList}>
          {shortcuts.map((shortcut) => (
            <div key={shortcut.name} className={styles.shortcutItem}>
              <div className={styles.shortcutLabel}>
                <span className={styles.shortcutName}>{shortcut.name}</span>
                <span className={styles.shortcutDesc}>{shortcut.description}</span>
              </div>
              <div className={styles.shortcutKeyCombo}>
                {shortcut.keys.map((key, index) => (
                  <React.Fragment key={key}>
                    <span className={styles.keyBadge}>{key}</span>
                    {index < shortcut.keys.length - 1 && (
                      <span className={styles.keySeparator}>+</span>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card
        title="How Shortcuts Work"
        icon={<Icon name="info" size={20} />}
      >
        <div className={styles.infoContent}>
          <div className={styles.infoStep}>
            <div className={styles.stepIcon}>
              <Icon name="keyboard" size={20} />
            </div>
            <div className={styles.stepContent}>
              <strong>Press the Shortcut</strong>
              <p>Use the keyboard combination to instantly control tab switching without opening the popup.</p>
            </div>
          </div>

          <div className={styles.infoStep}>
            <div className={styles.stepIcon}>
              <Icon name="pause" size={20} />
            </div>
            <div className={styles.stepContent}>
              <strong>Toggle Pause State</strong>
              <p>When paused, the extension icon shows a pause indicator. Press again to resume automatic switching.</p>
            </div>
          </div>

          <div className={styles.infoStep}>
            <div className={styles.stepIcon}>
              <Icon name="settings" size={20} />
            </div>
            <div className={styles.stepContent}>
              <strong>Customize in Chrome</strong>
              <p>Click "Customize" to change the shortcut key combination to your preference.</p>
            </div>
          </div>
        </div>
      </Card>

      <Card
        title="Tips"
        icon={<Icon name="alertCircle" size={20} />}
      >
        <div className={styles.noticeBox}>
          <Icon name="info" size={18} />
          <div className={styles.noticeText}>
            <p>
              <strong>Shortcut not working?</strong> Make sure no other extension or application
              is using the same keyboard combination. You can check and resolve conflicts in Chrome's
              extension shortcuts page.
            </p>
            <p>
              <strong>Chrome tab must be focused</strong> for shortcuts to work. They won't activate
              if you're in another application.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default ShortcutSettings;
