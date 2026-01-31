/**
 * Tab Groups - Premium Feature
 *
 * UI for managing tab groups and categorization
 */

import React, { useState, useEffect } from 'react';
import type { TabGroup, TabMatcher, MatcherType, RotationPattern } from '../../../core/types.js';
import PremiumGate from '../../components/PremiumGate.js';
import styles from './TabGroups.module.css';

interface TabGroupsProps {
  onSuccess?: () => void;
}

const TabGroups: React.FC<TabGroupsProps> = ({ onSuccess }) => {
  const [groups, setGroups] = useState<TabGroup[]>([]);
  const [rotationPatterns, setRotationPatterns] = useState<RotationPattern[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [editingGroup, setEditingGroup] = useState<TabGroup | null>(null);
  const [previewGroup, setPreviewGroup] = useState<TabGroup | null>(null);
  const [matchedTabs, setMatchedTabs] = useState<chrome.tabs.Tab[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Form state
  const [formData, setFormData] = useState<Partial<TabGroup>>({
    name: '',
    description: '',
    color: '#4A90E2',
    icon: '📁',
    tabs: [],
    settings: {
      enabled: true,
    },
    rotationMode: 'within',
  });

  // Matcher builder state
  const [newMatcher, setNewMatcher] = useState<Partial<TabMatcher>>({
    type: 'url',
    pattern: '',
    matchOptions: {
      caseSensitive: false,
      exactMatch: false,
    },
  });

  useEffect(() => {
    loadGroups();
    loadRotationPatterns();
  }, []);

  const loadGroups = async () => {
    try {
      setLoading(true);
      const { groupManager } = await import('../../../premium/GroupManager.js');
      const loadedGroups = await groupManager.getAllGroups();
      setGroups(loadedGroups);
    } catch (error) {
      showToast('Failed to load groups', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadRotationPatterns = async () => {
    try {
      const { rotationEngine } = await import('../../../premium/RotationEngine.js');
      const patterns = await rotationEngine.getAllPatterns();
      setRotationPatterns(patterns);
    } catch (error) {
      console.error('Failed to load rotation patterns:', error);
    }
  };

  const handleCreateGroup = () => {
    setEditingGroup(null);
    setFormData({
      name: '',
      description: '',
      color: '#4A90E2',
      icon: '📁',
      tabs: [],
      settings: {
        enabled: true,
      },
      rotationMode: 'within',
    });
    setShowModal(true);
  };

  const handleEditGroup = (group: TabGroup) => {
    setEditingGroup(group);
    setFormData(group);
    setShowModal(true);
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!confirm('Are you sure you want to delete this group?')) {
      return;
    }

    try {
      const { groupManager } = await import('../../../premium/GroupManager.js');
      await groupManager.deleteGroup(groupId);
      await loadGroups();
      showToast('Group deleted successfully', 'success');
    } catch (error) {
      showToast('Failed to delete group', 'error');
    }
  };

  const handleSaveGroup = async () => {
    if (!formData.name || formData.name.trim() === '') {
      showToast('Group name is required', 'error');
      return;
    }

    if (!formData.tabs || formData.tabs.length === 0) {
      showToast('Add at least one matcher to the group', 'error');
      return;
    }

    try {
      const { groupManager } = await import('../../../premium/GroupManager.js');

      const group: TabGroup = {
        id: editingGroup?.id || `group-${Date.now()}`,
        name: formData.name,
        description: formData.description,
        color: formData.color,
        icon: formData.icon,
        tabs: formData.tabs || [],
        settings: formData.settings || { enabled: true },
        rotationMode: formData.rotationMode || 'within',
        createdAt: editingGroup?.createdAt || Date.now(),
        updatedAt: Date.now(),
      };

      await groupManager.saveGroup(group);
      await loadGroups();
      setShowModal(false);
      showToast(editingGroup ? 'Group updated successfully' : 'Group created successfully', 'success');
      onSuccess?.();
    } catch (error) {
      showToast('Failed to save group', 'error');
    }
  };

  const handleAddMatcher = () => {
    if (!newMatcher.type) {
      showToast('Select a matcher type', 'error');
      return;
    }

    if (newMatcher.type !== 'manual' && (!newMatcher.pattern || newMatcher.pattern.trim() === '')) {
      showToast('Pattern is required', 'error');
      return;
    }

    const matcher: TabMatcher = {
      type: newMatcher.type as MatcherType,
      pattern: newMatcher.pattern,
      matchOptions: newMatcher.matchOptions,
    };

    setFormData({
      ...formData,
      tabs: [...(formData.tabs || []), matcher],
    });

    // Reset matcher form
    setNewMatcher({
      type: 'url',
      pattern: '',
      matchOptions: {
        caseSensitive: false,
        exactMatch: false,
      },
    });

    showToast('Matcher added', 'success');
  };

  const handleRemoveMatcher = (index: number) => {
    setFormData({
      ...formData,
      tabs: formData.tabs?.filter((_, i) => i !== index) || [],
    });
  };

  const handlePreviewGroup = async (group: TabGroup) => {
    try {
      setPreviewGroup(group);
      const { groupManager } = await import('../../../premium/GroupManager.js');
      const tabs = await chrome.tabs.query({ currentWindow: true });
      const matched = await groupManager.getGroupTabs(tabs, group.id);
      setMatchedTabs(matched);
      setShowPreview(true);
    } catch (error) {
      showToast('Failed to preview group', 'error');
    }
  };

  const handleToggleGroup = async (group: TabGroup) => {
    try {
      const { groupManager } = await import('../../../premium/GroupManager.js');
      const updatedGroup = {
        ...group,
        settings: {
          ...group.settings,
          enabled: !group.settings.enabled,
        },
        updatedAt: Date.now(),
      };
      await groupManager.saveGroup(updatedGroup);
      await loadGroups();
      showToast(`Group ${updatedGroup.settings.enabled ? 'enabled' : 'disabled'}`, 'success');
    } catch (error) {
      showToast('Failed to toggle group', 'error');
    }
  };

  const handleSetActiveGroup = async (groupId: string | null) => {
    try {
      const { groupManager } = await import('../../../premium/GroupManager.js');
      await groupManager.setActiveGroupId(groupId);
      showToast(groupId ? 'Active group set' : 'Active group cleared', 'success');
    } catch (error) {
      showToast('Failed to set active group', 'error');
    }
  };

  const showToastMessage = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const showToast = showToastMessage;

  const getMatcherTypeLabel = (type: MatcherType): string => {
    const labels: Record<MatcherType, string> = {
      url: 'URL Pattern',
      domain: 'Domain',
      regex: 'Regular Expression',
      title: 'Title Pattern',
      manual: 'Manual Selection',
    };
    return labels[type];
  };

  const colorOptions = [
    { value: '#4A90E2', label: 'Blue' },
    { value: '#E74C3C', label: 'Red' },
    { value: '#2ECC71', label: 'Green' },
    { value: '#F39C12', label: 'Orange' },
    { value: '#9B59B6', label: 'Purple' },
    { value: '#1ABC9C', label: 'Teal' },
    { value: '#E91E63', label: 'Pink' },
    { value: '#607D8B', label: 'Gray' },
  ];

  const iconOptions = ['📁', '🏠', '💼', '🎮', '📰', '🛒', '📧', '⭐', '🔧', '📊'];

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading groups...</div>
      </div>
    );
  }

  return (
    <PremiumGate>
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.headerText}>
            <h2>Tab Groups</h2>
            <p>Organize tabs into groups for smart rotation and management</p>
          </div>
          <button className={styles.createButton} onClick={handleCreateGroup}>
            ➕ Create Group
          </button>
        </div>

        {groups.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📁</div>
            <h3>No groups yet</h3>
            <p>Create your first group to organize tabs by URL, domain, title, or custom rules</p>
            <button className={styles.primaryButton} onClick={handleCreateGroup}>
              Create Your First Group
            </button>
          </div>
        ) : (
          <div className={styles.groupsList}>
            {groups.map((group) => (
              <div key={group.id} className={`${styles.groupCard} ${!group.settings.enabled ? styles.disabled : ''}`}>
                <div className={styles.groupHeader}>
                  <div className={styles.groupIcon} style={{ backgroundColor: group.color }}>
                    {group.icon || '📁'}
                  </div>
                  <div className={styles.groupInfo}>
                    <h3>{group.name}</h3>
                    {group.description && <p className={styles.description}>{group.description}</p>}
                    <div className={styles.groupMeta}>
                      <span>{group.tabs.length} matcher{group.tabs.length !== 1 ? 's' : ''}</span>
                      <span>•</span>
                      <span>Rotation: {group.rotationMode === 'within' ? 'Within Group' : 'Independent'}</span>
                      {group.settings.rotationPatternId && (
                        <>
                          <span>•</span>
                          <span>Pattern: {rotationPatterns.find(p => p.id === group.settings.rotationPatternId)?.name || 'Unknown'}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className={styles.groupActions}>
                    <button
                      className={`${styles.toggleButton} ${group.settings.enabled ? styles.active : ''}`}
                      onClick={() => handleToggleGroup(group)}
                      title={group.settings.enabled ? 'Disable group' : 'Enable group'}
                    >
                      {group.settings.enabled ? '✓' : '✗'}
                    </button>
                    <button
                      className={styles.actionButton}
                      onClick={() => handlePreviewGroup(group)}
                      title="Preview matching tabs"
                    >
                      👁️
                    </button>
                    <button
                      className={styles.actionButton}
                      onClick={() => handleEditGroup(group)}
                      title="Edit group"
                    >
                      ✏️
                    </button>
                    <button
                      className={styles.actionButton}
                      onClick={() => handleDeleteGroup(group.id)}
                      title="Delete group"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                <div className={styles.matchersList}>
                  {group.tabs.slice(0, 3).map((matcher, index) => (
                    <div key={index} className={styles.matcherChip}>
                      <span className={styles.matcherType}>{getMatcherTypeLabel(matcher.type)}</span>
                      {matcher.pattern && <span className={styles.matcherPattern}>{matcher.pattern}</span>}
                    </div>
                  ))}
                  {group.tabs.length > 3 && (
                    <div className={styles.matcherChip}>
                      <span className={styles.matcherType}>+{group.tabs.length - 3} more</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create/Edit Modal */}
        {showModal && (
          <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h2>{editingGroup ? 'Edit Group' : 'Create Group'}</h2>
                <button className={styles.closeButton} onClick={() => setShowModal(false)}>
                  ✕
                </button>
              </div>

              <div className={styles.modalBody}>
                {/* Basic Info */}
                <div className={styles.formSection}>
                  <h3>Basic Information</h3>
                  <div className={styles.formRow}>
                    <label>
                      Group Name *
                      <input
                        type="text"
                        value={formData.name || ''}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g., Work Tabs, Social Media"
                        maxLength={100}
                      />
                    </label>
                  </div>
                  <div className={styles.formRow}>
                    <label>
                      Description
                      <textarea
                        value={formData.description || ''}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Optional description"
                        maxLength={500}
                        rows={3}
                      />
                    </label>
                  </div>
                  <div className={styles.formRow}>
                    <label>
                      Color
                      <div className={styles.colorPicker}>
                        {colorOptions.map((color) => (
                          <button
                            key={color.value}
                            className={`${styles.colorOption} ${formData.color === color.value ? styles.selected : ''}`}
                            style={{ backgroundColor: color.value }}
                            onClick={() => setFormData({ ...formData, color: color.value })}
                            title={color.label}
                          />
                        ))}
                      </div>
                    </label>
                  </div>
                  <div className={styles.formRow}>
                    <label>
                      Icon
                      <div className={styles.iconPicker}>
                        {iconOptions.map((icon) => (
                          <button
                            key={icon}
                            className={`${styles.iconOption} ${formData.icon === icon ? styles.selected : ''}`}
                            onClick={() => setFormData({ ...formData, icon })}
                          >
                            {icon}
                          </button>
                        ))}
                      </div>
                    </label>
                  </div>
                </div>

                {/* Matchers */}
                <div className={styles.formSection}>
                  <h3>Tab Matchers</h3>
                  <p className={styles.sectionDescription}>
                    Define rules to automatically include tabs in this group
                  </p>

                  {/* Existing Matchers */}
                  {formData.tabs && formData.tabs.length > 0 && (
                    <div className={styles.existingMatchers}>
                      {formData.tabs.map((matcher, index) => (
                        <div key={index} className={styles.matcherItem}>
                          <div className={styles.matcherContent}>
                            <span className={styles.matcherType}>{getMatcherTypeLabel(matcher.type)}</span>
                            {matcher.pattern && <span className={styles.matcherPattern}>{matcher.pattern}</span>}
                            {matcher.matchOptions?.caseSensitive && (
                              <span className={styles.matcherOption}>Case Sensitive</span>
                            )}
                            {matcher.matchOptions?.exactMatch && (
                              <span className={styles.matcherOption}>Exact Match</span>
                            )}
                          </div>
                          <button
                            className={styles.removeButton}
                            onClick={() => handleRemoveMatcher(index)}
                            title="Remove matcher"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add New Matcher */}
                  <div className={styles.matcherBuilder}>
                    <div className={styles.formRow}>
                      <label>
                        Matcher Type
                        <select
                          value={newMatcher.type || 'url'}
                          onChange={(e) => setNewMatcher({ ...newMatcher, type: e.target.value as MatcherType })}
                        >
                          <option value="url">URL Pattern</option>
                          <option value="domain">Domain</option>
                          <option value="regex">Regular Expression</option>
                          <option value="title">Title Pattern</option>
                        </select>
                      </label>
                    </div>
                    {newMatcher.type !== 'manual' && (
                      <div className={styles.formRow}>
                        <label>
                          Pattern
                          <input
                            type="text"
                            value={newMatcher.pattern || ''}
                            onChange={(e) => setNewMatcher({ ...newMatcher, pattern: e.target.value })}
                            placeholder={
                              newMatcher.type === 'url' ? 'e.g., github.com' :
                              newMatcher.type === 'domain' ? 'e.g., example.com' :
                              newMatcher.type === 'regex' ? 'e.g., ^https://.*\\.com$' :
                              'e.g., Dashboard'
                            }
                            maxLength={500}
                          />
                        </label>
                      </div>
                    )}
                    <div className={styles.formRow}>
                      <label className={styles.checkbox}>
                        <input
                          type="checkbox"
                          checked={newMatcher.matchOptions?.caseSensitive || false}
                          onChange={(e) => setNewMatcher({
                            ...newMatcher,
                            matchOptions: { ...newMatcher.matchOptions, caseSensitive: e.target.checked }
                          })}
                        />
                        Case Sensitive
                      </label>
                      <label className={styles.checkbox}>
                        <input
                          type="checkbox"
                          checked={newMatcher.matchOptions?.exactMatch || false}
                          onChange={(e) => setNewMatcher({
                            ...newMatcher,
                            matchOptions: { ...newMatcher.matchOptions, exactMatch: e.target.checked }
                          })}
                        />
                        Exact Match
                      </label>
                    </div>
                    <button className={styles.addMatcherButton} onClick={handleAddMatcher}>
                      ➕ Add Matcher
                    </button>
                  </div>
                </div>

                {/* Settings */}
                <div className={styles.formSection}>
                  <h3>Group Settings</h3>
                  <div className={styles.formRow}>
                    <label>
                      Rotation Mode
                      <select
                        value={formData.rotationMode || 'within'}
                        onChange={(e) => setFormData({ ...formData, rotationMode: e.target.value as 'within' | 'independent' })}
                      >
                        <option value="within">Within Group (only rotate tabs in this group)</option>
                        <option value="independent">Independent (don't affect rotation)</option>
                      </select>
                    </label>
                  </div>
                  {rotationPatterns.length > 0 && (
                    <div className={styles.formRow}>
                      <label>
                        Rotation Pattern (optional)
                        <select
                          value={formData.settings?.rotationPatternId || ''}
                          onChange={(e) => setFormData({
                            ...formData,
                            settings: { ...formData.settings, rotationPatternId: e.target.value || undefined }
                          })}
                        >
                          <option value="">Default (Sequential)</option>
                          {rotationPatterns.map((pattern) => (
                            <option key={pattern.id} value={pattern.id}>
                              {pattern.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  )}
                  <div className={styles.formRow}>
                    <label>
                      Custom Delay Time (ms, optional)
                      <input
                        type="number"
                        value={formData.settings?.customDelayTime || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          settings: {
                            ...formData.settings,
                            customDelayTime: e.target.value ? parseInt(e.target.value) : undefined
                          }
                        })}
                        placeholder="Leave empty to use global delay"
                        min={2000}
                        max={3600000}
                      />
                    </label>
                  </div>
                  <div className={styles.formRow}>
                    <label className={styles.checkbox}>
                      <input
                        type="checkbox"
                        checked={formData.settings?.enabled ?? true}
                        onChange={(e) => setFormData({
                          ...formData,
                          settings: { ...formData.settings, enabled: e.target.checked }
                        })}
                      />
                      Enable this group
                    </label>
                  </div>
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button className={styles.secondaryButton} onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button className={styles.primaryButton} onClick={handleSaveGroup}>
                  {editingGroup ? 'Update Group' : 'Create Group'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Preview Modal */}
        {showPreview && previewGroup && (
          <div className={styles.modalOverlay} onClick={() => setShowPreview(false)}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h2>Preview: {previewGroup.name}</h2>
                <button className={styles.closeButton} onClick={() => setShowPreview(false)}>
                  ✕
                </button>
              </div>

              <div className={styles.modalBody}>
                <p className={styles.previewDescription}>
                  {matchedTabs.length} tab{matchedTabs.length !== 1 ? 's' : ''} match this group in the current window
                </p>

                {matchedTabs.length === 0 ? (
                  <div className={styles.emptyState}>
                    <p>No tabs match this group's matchers</p>
                  </div>
                ) : (
                  <div className={styles.tabsList}>
                    {matchedTabs.map((tab) => (
                      <div key={tab.id} className={styles.tabItem}>
                        {tab.favIconUrl && (
                          <img src={tab.favIconUrl} alt="" className={styles.favicon} />
                        )}
                        <div className={styles.tabInfo}>
                          <div className={styles.tabTitle}>{tab.title}</div>
                          <div className={styles.tabUrl}>{tab.url}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className={styles.modalFooter}>
                <button className={styles.primaryButton} onClick={() => setShowPreview(false)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Toast Notification */}
        {toast && (
          <div className={`${styles.toast} ${styles[toast.type]}`}>
            {toast.message}
          </div>
        )}
      </div>
    </PremiumGate>
  );
};

export default TabGroups;
