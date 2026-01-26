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
import styles from './SkipRules.module.css';

interface SkipRule {
  id: string;
  pattern: string;
  matchType: 'domain' | 'url' | 'regex';
  enabled: boolean;
}

function SkipRulesContent() {
  const { settings, updateSetting } = useSettings();
  const { showToast } = useToast();

  const [rules, setRules] = useState<SkipRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingRule, setEditingRule] = useState<SkipRule | null>(null);
  const [ruleToDelete, setRuleToDelete] = useState<SkipRule | null>(null);

  // Form state
  const [rulePattern, setRulePattern] = useState('');
  const [ruleMatchType, setRuleMatchType] = useState<'domain' | 'url' | 'regex'>('domain');
  const [patternError, setPatternError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Load rules from storage
  const loadRules = useCallback(async () => {
    try {
      const result = await chrome.storage.local.get('skipRules');
      setRules(result.skipRules || []);
    } catch (error) {
      console.error('Failed to load skip rules:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRules();
  }, [loadRules]);

  // Save rules to storage
  const saveRules = async (updatedRules: SkipRule[]) => {
    await chrome.storage.local.set({ skipRules: updatedRules });
    setRules(updatedRules);
  };

  // Handle skip pinned toggle
  const handleSkipPinnedToggle = async (checked: boolean) => {
    try {
      await updateSetting('skipPinnedTabs', checked);
      showToast(
        checked ? 'Pinned tabs will be skipped' : 'Pinned tabs will be included',
        'success'
      );
    } catch {
      showToast('Failed to update setting', 'error');
    }
  };

  // Handle add rule click
  const handleAddRule = () => {
    setRulePattern('');
    setRuleMatchType('domain');
    setPatternError(null);
    setEditingRule(null);
    setShowRuleModal(true);
  };

  // Handle edit rule click
  const handleEditRule = (rule: SkipRule) => {
    setRulePattern(rule.pattern);
    setRuleMatchType(rule.matchType);
    setPatternError(null);
    setEditingRule(rule);
    setShowRuleModal(true);
  };

  // Handle delete rule click
  const handleDeleteClick = (rule: SkipRule) => {
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
      let updatedRules: SkipRule[];

      if (editingRule) {
        updatedRules = rules.map((r) =>
          r.id === editingRule.id
            ? {
                ...r,
                pattern: rulePattern.trim(),
                matchType: ruleMatchType,
              }
            : r
        );
        showToast('Rule updated', 'success');
      } else {
        const newRule: SkipRule = {
          id: `skip_${Date.now()}`,
          pattern: rulePattern.trim(),
          matchType: ruleMatchType,
          enabled: true,
        };
        updatedRules = [...rules, newRule];
        showToast('Skip rule added', 'success');
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
  const handleToggleRule = async (rule: SkipRule) => {
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

  if (isLoading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Skip Rules</h1>
        <p className={styles.description}>
          Define which tabs should be skipped during rotation
        </p>
      </div>

      <Card
        title="Skip Pinned Tabs"
        icon={<Icon name="skip" size={20} />}
      >
        <Toggle
          checked={settings.skipPinnedTabs}
          onChange={handleSkipPinnedToggle}
          label="Skip pinned tabs"
          description="Pinned tabs will not be included in automatic rotation"
        />
      </Card>

      <Card
        title="Custom Skip Rules"
        description={`${rules.length} rule${rules.length !== 1 ? 's' : ''} configured`}
        icon={<Icon name="settings" size={20} />}
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
            <Icon name="skip" size={48} />
            <p>No skip rules configured</p>
            <span>Add rules to skip specific tabs during rotation</span>
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

      <Card title="How Skip Rules Work" icon={<Icon name="info" size={20} />}>
        <div className={styles.infoContent}>
          <div className={styles.infoItem}>
            <strong>Domain Match</strong>
            <span>Skips all tabs from a specific domain (e.g., "google.com")</span>
          </div>
          <div className={styles.infoItem}>
            <strong>URL Match</strong>
            <span>Skips tabs matching an exact URL pattern</span>
          </div>
          <div className={styles.infoItem}>
            <strong>Regex Match</strong>
            <span>Uses regular expressions for advanced pattern matching</span>
          </div>
        </div>
      </Card>

      {/* Add/Edit Rule Modal */}
      <Modal
        isOpen={showRuleModal}
        onClose={() => setShowRuleModal(false)}
        title={editingRule ? 'Edit Skip Rule' : 'Add Skip Rule'}
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

          <div className={styles.hint}>
            {ruleMatchType === 'domain' && (
              <p>Enter a domain name. All tabs from this domain will be skipped.</p>
            )}
            {ruleMatchType === 'url' && (
              <p>Enter a full URL. Tabs matching this exact URL will be skipped.</p>
            )}
            {ruleMatchType === 'regex' && (
              <p>Enter a regular expression. Tabs with URLs matching the pattern will be skipped.</p>
            )}
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
            Are you sure you want to delete the skip rule for "{ruleToDelete?.pattern}"?
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

function SkipRules() {
  return (
    <PremiumGate
      featureTitle="Skip Rules"
      featureDescription="Control exactly which tabs are included in rotation"
      features={[
        { text: 'Skip tabs by URL pattern' },
        { text: 'Skip by domain or regex' },
        { text: 'Skip pinned tabs automatically' },
        { text: 'Create custom skip rules' },
      ]}
    >
      <SkipRulesContent />
    </PremiumGate>
  );
}

export default SkipRules;
