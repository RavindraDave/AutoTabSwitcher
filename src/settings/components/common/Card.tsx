import React from 'react';
import styles from './Card.module.css';

interface CardProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  headerAction?: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}

export function Card({
  children,
  title,
  description,
  icon,
  headerAction,
  className = '',
  noPadding = false,
}: CardProps) {
  return (
    <div className={`${styles.card} ${className}`}>
      {(title || headerAction) && (
        <div className={styles.header}>
          <div className={styles.headerContent}>
            {icon && <span className={styles.icon}>{icon}</span>}
            <div className={styles.headerText}>
              {title && <h2 className={styles.title}>{title}</h2>}
              {description && <p className={styles.description}>{description}</p>}
            </div>
          </div>
          {headerAction && (
            <div className={styles.headerAction}>{headerAction}</div>
          )}
        </div>
      )}
      <div className={`${styles.content} ${noPadding ? styles.noPadding : ''}`}>
        {children}
      </div>
    </div>
  );
}

// Sub-component for card sections
interface CardSectionProps {
  children: React.ReactNode;
  className?: string;
}

export function CardSection({ children, className = '' }: CardSectionProps) {
  return (
    <div className={`${styles.section} ${className}`}>
      {children}
    </div>
  );
}

// Sub-component for card divider
export function CardDivider() {
  return <hr className={styles.divider} />;
}
