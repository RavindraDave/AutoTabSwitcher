import React, { useState, useEffect } from 'react';
import { Card } from '../../components/common/Card';
import { Icon } from '../../components/common/Icon';
import { usePremium } from '../../context/PremiumContext';
import styles from './SystemStyles.module.css';

function About() {
  const { isPremium } = usePremium();
  const [version, setVersion] = useState('1.0.0');

  useEffect(() => {
    // Get version from manifest
    const manifest = chrome.runtime.getManifest();
    if (manifest.version) {
      setVersion(manifest.version);
    }
  }, []);

  const iconUrl = chrome.runtime.getURL('icon.png');

  return (
    <div className={styles.container}>
      <div className={styles.aboutHeader}>
        <img
          src={iconUrl}
          alt="Auto Tab Switcher"
          className={styles.aboutLogo}
        />
        <div className={styles.aboutInfo}>
          <h1>Auto Tab Switcher</h1>
          <p>Automatically switch between browser tabs at your pace</p>
          <span className={styles.versionBadge}>
            Version {version} {isPremium ? '(Premium)' : '(Free)'}
          </span>
        </div>
      </div>

      <Card
        title="Links"
        icon={<Icon name="externalLink" size={20} />}
      >
        <div className={styles.linkList}>
          <a
            href="https://extensions.r2dsolutions.com"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.linkItem}
          >
            <Icon name="globe" size={18} />
            <span>Official Website</span>
          </a>
        </div>
      </Card>

      <Card
        title="Credits"
        icon={<Icon name="info" size={20} />}
      >
        <p style={{ margin: 0, color: 'var(--color-text-secondary)', lineHeight: 'var(--line-height-relaxed)' }}>
          Developed by R2D Solutions. Auto Tab Switcher is designed to help you
          stay productive by automatically rotating through your open tabs.
          Whether you're monitoring dashboards, reviewing documents, or just
          keeping an eye on multiple pages, this extension has you covered.
        </p>
      </Card>

      <Card
        title="Keyboard Shortcuts"
        icon={<Icon name="keyboard" size={20} />}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--color-text-secondary)' }}>Pause/Resume Switching</span>
            <code style={{
              padding: 'var(--space-xs) var(--space-sm)',
              background: 'var(--color-bg)',
              borderRadius: 'var(--radius-sm)',
              fontSize: 'var(--font-size-sm)'
            }}>
              Ctrl + Shift + P
            </code>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default About;
