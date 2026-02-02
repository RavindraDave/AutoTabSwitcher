import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../../components/common/Card';
import { Toggle } from '../../components/common/Toggle';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { Icon } from '../../components/common/Icon';
import { PremiumGate } from '../../components/common/PremiumGate';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../../context/ToastContext';
import styles from './RefreshSettings.module.css';

type RefreshStrategy = 'preemptive' | 'post-switch' | 'manual';

interface RefreshRule {
  id: string;
  pattern: string;
  matchType: 'domain' | 'url' | 'regex';
  interval: number; // in seconds
  enabled: boolean;
}

function RefreshSettingsContent() {
  const { settings, updateSetting } = useSettings();
  const { showToast } = useToast();

  const [rules, setRules] = useState<RefreshRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingRule, setEditingRule] = useState<RefreshRule | null>(null);
  const [ruleToDelete, setRuleToDelete] = useState<RefreshRule | null>(null);

  // Form state
  const [rulePattern, setRulePattern] = useState('');
  const [ruleMatchType, setRuleMatchType] = useState<'domain' | 'url' | 'regex'>('domain');
  const [ruleInterval, setRuleInterval] = useState(60);
  const [patternError, setPatternError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Load rules from storage
  const loadRules = useCallback(async () => {
    try {
      const result = await chrome.storage.local.get('refreshRules');
      setRules(result.refreshRules || []);
    } catch (error) {
      console.error('Failed to load refresh rules:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRules();
  }, [loadRules]);

  // Save rules to storage
  const saveRules = async (updatedRules: RefreshRule[]) => {
    await chrome.storage.local.set({ refreshRules: updatedRules });
    setRules(updatedRules);
  };

  // Handle refresh enabled toggle
  const handleRefreshToggle = async (checked: boolean) => {
    try {
      await updateSetting('refreshEnabled', checked);
      showToast(
        checked ? 'Smart refresh enabled' : 'Smart refresh disabled',
        'success'
      );
    } catch {
      showToast('Failed to update setting', 'error');
    }
  };

  // Handle strategy change
  const handleStrategyChange = async (strategy: RefreshStrategy) => {
    try {
      await updateSetting('refreshStrategy', strategy);
      showToast('Refresh strategy updated', 'success');
    } catch {
      showToast('Failed to update strategy', 'error');
    }
  };

  // Handle add rule click
  const handleAddRule = () => {
    setRulePattern('');
    setRuleMatchType('domain');
    setRuleInterval(60);
    setPatternError(null);
    setEditingRule(null);
    setShowRuleModal(true);
  };

  // Handle edit rule click
  const handleEditRule = (rule: RefreshRule) => {
    setRulePattern(rule.pattern);
    setRuleMatchType(rule.matchType);
    setRuleInterval(rule.interval);
    setPatternError(null);
    setEditingRule(rule);
    setShowRuleModal(true);
  };

  // Handle delete rule click
  const handleDeleteClick = (rule: RefreshRule) => {
    setRuleToDelete(rule);
    setShowDeleteModal(true);
  };

  // Validate pattern
  const validatePattern = (pattern: string, matchType: string): string | null => {
    if (!pattern.trim()) return 'Pattern is required';

    if (matchType === 'regex') {
      try {
        new RegExp(pattern);
      } catch {
        return 'Invalid regular expression';
      }
    }

    // Check for duplicates
    const isDuplicate = rules.some(
      (r) => r.pattern === pattern.trim() && r.id !== editingRule?.id
    );
    if (isDuplicate) return 'This pattern already exists';

    return null;
  };

  // Save rule
  const handleSaveRule = async () => {
    const error = validatePattern(rulePattern, ruleMatchType);
    if (error) {
      setPatternError(error);
      return;
    }

    setIsSaving(true);
    try {
      let updatedRules: RefreshRule[];

      if (editingRule) {
        updatedRules = rules.map((r) =>
          r.id === editingRule.id
            ? {
                ...r,
                pattern: rulePattern.trim(),
                matchType: ruleMatchType,
                interval: ruleInterval,
              }
            : r
        );
        showToast('Rule updated', 'success');
      } else {
        const newRule: RefreshRule = {
          id: `rule_${Date.now()}`,
          pattern: rulePattern.trim(),
          matchType: ruleMatchType,
          interval: ruleInterval,
          enabled: true,
        };
        updatedRules = [...rules, newRule];
        showToast('Rule added', 'success');
      }

      await saveRules(updatedRules);
      setShowRuleModal(false);
    } catch (error) {
      console.error('Failed to save rule:', error);
      showToast('Failed to save rule', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete rule
  const handleDeleteRule = async () => {
    if (!ruleToDelete) return;

    try {
      const updatedRules = rules.filter((r) => r.id !== ruleToDelete.id);
      await saveRules(updatedRules);
      showToast('Rule deleted', 'success');
      setShowDeleteModal(false);
      setRuleToDelete(null);
    } catch (error) {
      console.error('Failed to delete rule:', error);
      showToast('Failed to delete rule', 'error');
    }
  };

  // Toggle rule enabled
  const handleToggleRule = async (rule: RefreshRule) => {
    try {
      const updatedRules = rules.map((r) =>
        r.id === rule.id ? { ...r, enabled: !r.enabled } : r
      );
      await saveRules(updatedRules);
    } catch (error) {
      console.error('Failed to toggle rule:', error);
      showToast('Failed to update rule', 'error');
    }
  };

  // Format interval for display
  const formatInterval = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    return `${Math.floor(seconds / 3600)}h`;
  };

  if (isLoading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Smart Refresh</h1>
        <p className={styles.description}>
          Automatically refresh tabs based on rules and schedules
        </p>
      </div>

      <Card
        title="Enable Smart Refresh"
        icon={<Icon name="refresh" size={20} />}
      >
        <Toggle
          checked={settings.refreshEnabled}
          onChange={handleRefreshToggle}
          label="Enable automatic tab refresh"
          description="Refresh tabs automatically based on your configured rules"
        />
      </Card>

      {settings.refreshEnabled && (
        <>
          <Card
            title="Refresh Strategy"
            description="When should tabs be refreshed?"
            icon={<Icon name="settings" size={20} />}
          >
            <div className={styles.strategyGrid}>
              <button
                className={`${styles.strategyCard} ${settings.refreshStrategy === 'preemptive' ? styles.active : ''}`}
                onClick={() => handleStrategyChange('preemptive')}
              >
                <Icon name="play" size={24} />
                <strong>Preemptive</strong>
                <span>Refresh before switching to a tab</span>
              </button>
              <button
                className={`${styles.strategyCard} ${settings.refreshStrategy === 'post-switch' ? styles.active : ''}`}
                onClick={() => handleStrategyChange('post-switch')}
              >
                <Icon name="refresh" size={24} />
                <strong>Post-Switch</strong>
                <span>Refresh after switching to a tab</span>
              </button>
              <button
                className={`${styles.strategyCard} ${settings.refreshStrategy === 'manual' ? styles.active : ''}`}
                onClick={() => handleStrategyChange('manual')}
              >
                <Icon name="settings" size={24} />
                <strong>Rule-Based</strong>
                <span>Only refresh based on custom rules</span>
              </button>
            </div>
          </Card>

          {(settings.refreshStrategy === 'preemptive' || settings.refreshStrategy === 'post-switch') && (
            <Card
              title="Global Refresh Timing"
              description="Set the interval between automatic refreshes"
              icon={<Icon name="clock" size={20} />}
            >
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Refresh Interval: {' '}
                  <strong>
                    {(settings.globalRefreshInterval || 60) < 60
                      ? `${settings.globalRefreshInterval || 60} seconds`
                      : (settings.globalRefreshInterval || 60) < 3600
                        ? `${Math.floor((settings.globalRefreshInterval || 60) / 60)} minutes`
                        : `${Math.floor((settings.globalRefreshInterval || 60) / 3600)} hours`}
                  </strong>
                </label>
                <input
                  type="range"
                  min="10"
                  max="86400"
                  step="10"
                  value={settings.globalRefreshInterval || 60}
                  onChange={async (e) => {
                    try {
                      await updateSetting('globalRefreshInterval', parseInt(e.target.value, 10));
                    } catch {
                      showToast('Failed to update interval', 'error');
                    }
                  }}
                  className={styles.slider}
                />
                <div className={styles.intervalHint}>
                  <span>10s</span>
                  <span>24h</span>
                </div>
              </div>
            </Card>
          )}

          <Card
            title="Refresh Rules"
            description={`${rules.length} rule${rules.length !== 1 ? 's' : ''} configured`}
            icon={<Icon name="tool" size={20} />}
            headerAction={
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Icon name="plus" size={16} />}
                onClick={handleAddRule}
              >
                Add Rule
              </Button>
            }
          >
            {rules.length === 0 ? (
              <div className={styles.emptyState}>
                <Icon name="refresh" size={48} />
                <p>No refresh rules configured</p>
                <span>Add rules to automatically refresh specific tabs</span>
              </div>
            ) : (
              <div className={styles.ruleList}>
                {rules.map((rule) => (
                  <div
                    key={rule.id}
                    className={`${styles.ruleItem} ${!rule.enabled ? styles.disabled : ''}`}
                  >
                    <div className={styles.ruleInfo}>
                      <div className={styles.ruleHeader}>
                        <span className={styles.rulePattern}>{rule.pattern}</span>
                        <span className={styles.ruleBadge}>{rule.matchType}</span>
                        <span className={styles.intervalBadge}>
                          {formatInterval(rule.interval)}
                        </span>
                      </div>
                    </div>
                    <div className={styles.ruleActions}>
                      <Toggle
                        checked={rule.enabled}
                        onChange={() => handleToggleRule(rule)}
                        size="sm"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditRule(rule)}
                      >
                        <Icon name="settings" size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClick(rule)}
                      >
                        <Icon name="trash" size={16} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}

      {/* Add/Edit Rule Modal */}
      <Modal
        isOpen={showRuleModal}
        onClose={() => setShowRuleModal(false)}
        title={editingRule ? 'Edit Rule' : 'Add Refresh Rule'}
      >
        <div className={styles.modalContent}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Match Type</label>
            <div className={styles.matchTypeButtons}>
              {(['domain', 'url', 'regex'] as const).map((type) => (
                <button
                  key={type}
                  className={`${styles.matchTypeButton} ${ruleMatchType === type ? styles.active : ''}`}
                  onClick={() => setRuleMatchType(type)}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <Input
            label="Pattern"
            value={rulePattern}
            onChange={setRulePattern}
            placeholder={
              ruleMatchType === 'domain'
                ? 'e.g., example.com'
                : ruleMatchType === 'url'
                  ? 'e.g., https://example.com/page'
                  : 'e.g., .*\\.example\\.com'
            }
            error={patternError || undefined}
          />

          <div className={styles.formGroup}>
            <label className={styles.label}>Refresh Interval</label>
            <div className={styles.intervalInput}>
              <input
                type="range"
                min="10"
                max="86400"
                step="10"
                value={ruleInterval}
                onChange={(e) => setRuleInterval(parseInt(e.target.value, 10))}
                className={styles.slider}
              />
              <span className={styles.intervalValue}>
                {ruleInterval < 60
                  ? `${ruleInterval} seconds`
                  : ruleInterval < 3600
                    ? `${Math.floor(ruleInterval / 60)} minutes`
                    : `${Math.floor(ruleInterval / 3600)} hours`}
              </span>
            </div>
            <div className={styles.intervalHint}>
              <span>10 seconds</span>
              <span>24 hours</span>
            </div>
          </div>

          <div className={styles.modalActions}>
            <Button variant="ghost" onClick={() => setShowRuleModal(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSaveRule}
              isLoading={isSaving}
            >
              {editingRule ? 'Save' : 'Add Rule'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Rule"
      >
        <div className={styles.modalContent}>
          <p className={styles.deleteWarning}>
            Are you sure you want to delete the rule for "{ruleToDelete?.pattern}"?
          </p>
          <div className={styles.modalActions}>
            <Button variant="ghost" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDeleteRule}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function RefreshSettings() {
  return (
    <PremiumGate
      featureTitle="Smart Refresh"
      featureDescription="Keep your tabs fresh with automatic refresh"
      features={[
        { text: 'Preemptive refresh before tab switch' },
        { text: 'Post-switch refresh after activation' },
        { text: 'Custom refresh rules per URL/domain' },
        { text: 'Configurable refresh intervals' },
      ]}
    >
      <RefreshSettingsContent />
    </PremiumGate>
  );
}

export default RefreshSettings;
