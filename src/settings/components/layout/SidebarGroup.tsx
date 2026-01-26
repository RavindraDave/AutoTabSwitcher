import React from 'react';
import styles from './SidebarGroup.module.css';

interface SidebarGroupProps {
  title: string;
  badge?: string;
  children: React.ReactNode;
}

const badgeIcons: Record<string, string> = {
  sparkles: '✨',
};

export function SidebarGroup({ title, badge, children }: SidebarGroupProps) {
  return (
    <div className={styles.group}>
      <div className={styles.header}>
        <span className={styles.title}>{title}</span>
        {badge && (
          <span className={styles.badge} aria-label={badge}>
            {badgeIcons[badge] || badge}
          </span>
        )}
      </div>
      <ul className={styles.items} role="list">
        {children}
      </ul>
    </div>
  );
}
