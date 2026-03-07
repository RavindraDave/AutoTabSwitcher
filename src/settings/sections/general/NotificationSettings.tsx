import React, { useState, useEffect } from 'react';
import { Card } from '../../components/common/Card';
import { Toggle } from '../../components/common/Toggle';
import { Icon } from '../../components/common/Icon';
import { useToast } from '../../context/ToastContext';
import styles from './NotificationSettings.module.css';

function NotificationSettings() {
  const { showToast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [switchNotification, setSwitchNotification] = useState(false);
  const [contextMenuEnabled, setContextMenuEnabled] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const result = await chrome.storage.local.get([
          'switchNotification', 'contextMenuEnabled'
        ]);
        setSwitchNotification(result.switchNotification ?? false);
        setContextMenuEnabled(result.contextMenuEnabled ?? true);
      } catch (error) {
        console.error('Failed to load notification settings:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadSettings();
  }, []);

  const handleNotificationToggle = async (checked: boolean) => {
    try {
      await chrome.storage.local.set({ switchNotification: checked });
      setSwitchNotification(checked);
      showToast(
        checked
          ? 'Switch notifications enabled — badge will flash on tab switch'
          : 'Switch notifications disabled',
        'success'
      );
    } catch {
      showToast('Failed to update setting', 'error');
    }
  };

  const handleContextMenuToggle = async (checked: boolean) => {
    try {
      await chrome.storage.local.set({ contextMenuEnabled: checked });
      setContextMenuEnabled(checked);
      showToast(
        checked
          ? 'Context menu enabled — right-click for quick actions'
          : 'Context menu disabled',
        'success'
      );
    } catch {
      showToast('Failed to update setting', 'error');
    }
  };

  if (isLoading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Notifications & Menus</h1>
        <p className={styles.description}>
          Configure visual feedback and quick-action context menus
        </p>
      </div>

      <Card
        title="Switch Notification"
        description="Visual badge flash when tabs are switched"
        icon={<Icon name="info" size={20} />}
      >
        <Toggle
          checked={switchNotification}
          onChange={handleNotificationToggle}
          label="Enable switch notification"
          description="The extension badge briefly flashes green when a tab switch occurs"
        />
        {switchNotification && (
          <div className={styles.preview}>
            <div className={styles.previewBadge}>{'>>'}</div>
            <span className={styles.previewText}>Badge flashes briefly on each switch</span>
          </div>
        )}
      </Card>

      <Card
        title="Context Menu"
        description="Right-click quick actions on any page"
        icon={<Icon name="settings" size={20} />}
      >
        <Toggle
          checked={contextMenuEnabled}
          onChange={handleContextMenuToggle}
          label="Enable context menu"
          description="Adds 'Auto Tab Switcher' to the right-click menu with quick actions: pause/resume, toggle window, and exclude tab"
        />
      </Card>
    </div>
  );
}

export default NotificationSettings;
