import React from 'react';
import styles from './ContentArea.module.css';

interface ContentAreaProps {
  children: React.ReactNode;
}

export function ContentArea({ children }: ContentAreaProps) {
  return (
    <main className={styles.content} role="main">
      <div className={styles.inner}>
        {children}
      </div>
    </main>
  );
}
