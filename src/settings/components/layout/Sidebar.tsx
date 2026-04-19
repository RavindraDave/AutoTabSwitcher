import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { SidebarGroup } from './SidebarGroup';
import { SidebarItem } from './SidebarItem';
import { usePremium } from '../../context/PremiumContext';
import { useSettings } from '../../context/SettingsContext';
import styles from './Sidebar.module.css';

interface NavigationItem {
  id: string;
  label: string;
  icon: string;
  path: string;
  premium?: boolean;
}

interface NavigationGroup {
  group: string;
  badge?: string;
  items: NavigationItem[];
}

const navigation: NavigationGroup[] = [
  {
    group: 'General',
    items: [
      { id: 'basic', label: 'Basic Settings', icon: 'settings', path: '/basic' },
      { id: 'mode', label: 'Operating Mode', icon: 'globe', path: '/mode' },
      { id: 'activity', label: 'Pause on Activity', icon: 'pause', path: '/activity' },
      { id: 'shortcuts', label: 'Keyboard Shortcuts', icon: 'keyboard', path: '/shortcuts' },
      { id: 'idle', label: 'Idle Auto-Start', icon: 'clock', path: '/idle' },
      { id: 'per-tab-delays', label: 'Per-Tab Display Time', icon: 'clock', path: '/per-tab-delays' },
      { id: 'kiosk', label: 'Kiosk / Fullscreen', icon: 'window', path: '/kiosk' },
      { id: 'url-list', label: 'URL List Rotation', icon: 'globe', path: '/url-list' },
      { id: 'notifications', label: 'Notifications', icon: 'info', path: '/notifications' },
      { id: 'statistics', label: 'Statistics', icon: 'tool', path: '/statistics' },
    ],
  },
  {
    group: 'Premium',
    badge: 'sparkles',
    items: [
      { id: 'activate', label: 'Activate Premium', icon: 'sparkles', path: '/premium/activate' },
      { id: 'sessions', label: 'Session Management', icon: 'folder', path: '/sessions', premium: true },
      { id: 'refresh', label: 'Smart Refresh', icon: 'refresh', path: '/refresh', premium: true },
      { id: 'skip', label: 'Skip Rules', icon: 'skip', path: '/skip', premium: true },
      { id: 'intervals', label: 'Window Intervals', icon: 'clock', path: '/intervals', premium: true },
      { id: 'patterns', label: 'Rotation Patterns', icon: 'shuffle', path: '/patterns', premium: true },
      { id: 'backup', label: 'Backup & Sync', icon: 'download', path: '/backup', premium: true },
    ],
  },
  {
    group: 'System',
    items: [
      { id: 'diagnostics', label: 'Diagnostics', icon: 'tool', path: '/diagnostics' },
      { id: 'about', label: 'About', icon: 'info', path: '/about' },
    ],
  },
];

export function Sidebar() {
  const location = useLocation();
  const { isPremium } = usePremium();
  const { settings } = useSettings();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const isWindowMode = settings.switchingMode === 'window';

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        className={styles.mobileToggle}
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        aria-label="Toggle navigation"
        aria-expanded={isMobileOpen}
      >
        <span className={styles.hamburger} />
      </button>

      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className={styles.overlay}
          onClick={() => setIsMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`${styles.sidebar} ${isMobileOpen ? styles.open : ''} ${isWindowMode ? styles.windowMode : ''}`}
        role="navigation"
        aria-label="Settings navigation"
      >
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.logo}>
            <img src="../icon.png" alt="" width="32" height="32" />
            <div className={styles.logoText}>
              <span className={styles.title}>Auto Tab Switcher</span>
              <span className={styles.subtitle}>Settings</span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className={styles.nav}>
          {navigation.map((group) => (
            <SidebarGroup
              key={group.group}
              title={group.group}
              badge={group.badge}
            >
              {group.items.map((item) => (
                <SidebarItem
                  key={item.id}
                  label={item.label}
                  icon={item.icon}
                  path={item.path}
                  isActive={location.pathname === item.path}
                  isLocked={item.premium && !isPremium}
                  onClick={() => setIsMobileOpen(false)}
                />
              ))}
            </SidebarGroup>
          ))}
        </nav>

        {/* Brand section */}
        <div className={styles.brand}>
          <a
            href="https://www.r2dsolutions.com"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.brandLink}
          >
            <img
              src="../assets/r2d-logo.png"
              alt="R2DSolutions"
              className={styles.brandLogo}
            />
            <span className={styles.brandText}>by R2DSolutions</span>
          </a>
        </div>

        {/* Footer with version */}
        <div className={styles.footer}>
          <span className={styles.version}>v1.0.0</span>
          {isPremium && <span className={styles.premiumBadge}>Premium</span>}
        </div>
      </aside>
    </>
  );
}
