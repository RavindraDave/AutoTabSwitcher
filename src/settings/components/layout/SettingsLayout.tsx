import React from 'react';
import { Sidebar } from './Sidebar';
import { ContentArea } from './ContentArea';
import { ToastContainer } from '../common/Toast';
import styles from './SettingsLayout.module.css';

interface SettingsLayoutProps {
  children: React.ReactNode;
}

export function SettingsLayout({ children }: SettingsLayoutProps) {
  return (
    <div className={styles.layout}>
      <Sidebar />
      <ContentArea>{children}</ContentArea>
      <ToastContainer />
    </div>
  );
}
