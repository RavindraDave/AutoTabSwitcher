import React from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../common/Icon';
import styles from './SidebarItem.module.css';

interface SidebarItemProps {
  label: string;
  icon: string;
  path: string;
  isActive: boolean;
  isLocked?: boolean;
  onClick?: () => void;
}

export function SidebarItem({
  label,
  icon,
  path,
  isActive,
  isLocked = false,
  onClick,
}: SidebarItemProps) {
  const className = `${styles.item} ${isActive ? styles.active : ''} ${isLocked ? styles.locked : ''}`;

  return (
    <li role="listitem">
      <Link
        to={path}
        className={className}
        onClick={onClick}
        aria-current={isActive ? 'page' : undefined}
      >
        <Icon name={icon} className={styles.icon} />
        <span className={styles.label}>{label}</span>
        {isLocked && (
          <Icon name="lock" className={styles.lockIcon} aria-label="Premium feature" />
        )}
      </Link>
    </li>
  );
}
