import React from 'react';
import styles from './LoadingSpinner.module.css';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
  return (
    <div className={`${styles.container} ${className}`} role="status" aria-label="Loading">
      <div className={`${styles.spinner} ${styles[size]}`} />
      <span className="sr-only">Loading...</span>
    </div>
  );
}
