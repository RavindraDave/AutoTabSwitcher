import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../../components/common/Card';
import { Icon } from '../../components/common/Icon';
import { useToast } from '../../context/ToastContext';
import styles from './StatisticsSettings.module.css';

interface StatsSummary {
  totalSwitches: number;
  totalCycles: number;
  sessionDuration: string;
  topTabs: Array<{ title: string; visits: number; viewTime: string }>;
}

function StatisticsSettings() {
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<StatsSummary>({
    totalSwitches: 0,
    totalCycles: 0,
    sessionDuration: '0s',
    topTabs: [],
  });

  const loadStats = useCallback(async () => {
    try {
      const result = await chrome.storage.local.get('tabStatistics');
      const tabStats = result.tabStatistics || {
        totalSwitches: 0,
        totalCycles: 0,
        sessionStartTime: Date.now(),
        lastResetTime: Date.now(),
        perTabVisits: {},
      };

      const now = Date.now();
      const durationMs = now - tabStats.sessionStartTime;
      const sessionDuration = formatDuration(durationMs);

      const entries = Object.entries(tabStats.perTabVisits || {}) as [string, any][];
      const sorted = entries.sort(([, a], [, b]) => b.visitCount - a.visitCount);
      const topTabs = sorted.slice(0, 5).map(([, info]) => ({
        title: info.tabTitle || 'Unknown Tab',
        visits: info.visitCount,
        viewTime: formatDuration(info.totalViewTime || 0),
      }));

      setStats({
        totalSwitches: tabStats.totalSwitches,
        totalCycles: tabStats.totalCycles,
        sessionDuration,
        topTabs,
      });
    } catch (error) {
      console.error('Failed to load statistics:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 5000);
    return () => clearInterval(interval);
  }, [loadStats]);

  const handleReset = async () => {
    try {
      const now = Date.now();
      await chrome.storage.local.set({
        tabStatistics: {
          totalSwitches: 0,
          totalCycles: 0,
          sessionStartTime: now,
          lastResetTime: now,
          perTabVisits: {},
        },
      });
      setStats({
        totalSwitches: 0,
        totalCycles: 0,
        sessionDuration: '0s',
        topTabs: [],
      });
      showToast('Statistics reset successfully', 'success');
    } catch {
      showToast('Failed to reset statistics', 'error');
    }
  };

  if (isLoading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Statistics</h1>
        <p className={styles.description}>
          Track your tab rotation metrics and see which dashboards get the most viewing time
        </p>
      </div>

      <Card
        title="Overview"
        description="Current session rotation metrics"
        icon={<Icon name="tool" size={20} />}
      >
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{stats.totalSwitches}</span>
            <span className={styles.statLabel}>Switches</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{stats.totalCycles}</span>
            <span className={styles.statLabel}>Cycles</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{stats.sessionDuration}</span>
            <span className={styles.statLabel}>Session</span>
          </div>
        </div>
      </Card>

      <Card
        title="Most Viewed Tabs"
        description="Tabs with the highest visit count"
        icon={<Icon name="globe" size={20} />}
      >
        {stats.topTabs.length > 0 ? (
          <ul className={styles.topTabsList}>
            {stats.topTabs.map((tab, index) => (
              <li key={index} className={styles.topTabItem}>
                <span className={styles.tabName}>{tab.title}</span>
                <span className={styles.tabStats}>
                  {tab.visits} visits &middot; {tab.viewTime}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <div className={styles.emptyState}>
            No tab visits recorded yet. Statistics will appear once tab cycling begins.
          </div>
        )}
      </Card>

      <Card
        title="Reset"
        description="Clear all statistics and start fresh"
        icon={<Icon name="settings" size={20} />}
      >
        <button className={styles.resetButton} onClick={handleReset}>
          Reset All Statistics
        </button>
      </Card>
    </div>
  );
}

function formatDuration(ms: number): string {
  if (ms < 1000) return '0s';
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

export default StatisticsSettings;
