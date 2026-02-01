import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { Icon } from '../../components/common/Icon';
import { PremiumGate } from '../../components/common/PremiumGate';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../../context/ToastContext';
import styles from './RotationPatterns.module.css';

interface RotationPattern {
  id: string;
  name: string;
  type: 'sequential' | 'reverse' | 'random' | 'pinned-first' | 'custom';
  description?: string;
  customOrder?: Array<number | string>;
  options?: {
    shuffleDaily?: boolean;
    respectPinned?: boolean;
    loopMode?: 'circular' | 'bounce';
  };
  createdAt?: number;
  updatedAt?: number;
}

const PATTERN_TEMPLATES: Array<Omit<RotationPattern, 'id' | 'createdAt'>> = [
  {
    name: 'Sequential',
    type: 'sequential',
    description: 'Rotate tabs from left to right in order'
  },
  {
    name: 'Reverse',
    type: 'reverse',
    description: 'Rotate tabs from right to left'
  },
  {
    name: 'Random',
    type: 'random',
    description: 'Random rotation order (shuffles once)',
    options: { shuffleDaily: false }
  },
  {
    name: 'Daily Shuffle',
    type: 'random',
    description: 'Random rotation that changes daily',
    options: { shuffleDaily: true }
  },
  {
    name: 'Pinned First',
    type: 'pinned-first',
    description: 'Pinned tabs first, then unpinned tabs'
  },
];

const PATTERN_TYPE_INFO = {
  sequential: {
    icon: 'arrow-right',
    description: 'Tabs rotate in order from left to right',
    example: '1 → 2 → 3 → 4 → 1'
  },
  reverse: {
    icon: 'arrow-left',
    description: 'Tabs rotate in reverse order from right to left',
    example: '4 → 3 → 2 → 1 → 4'
  },
  random: {
    icon: 'shuffle',
    description: 'Tabs rotate in random order',
    example: '2 → 4 → 1 → 3 → 2'
  },
  'pinned-first': {
    icon: 'pin',
    description: 'Pinned tabs rotate first, then unpinned tabs',
    example: 'P1 → P2 → T1 → T2 → P1'
  },
  custom: {
    icon: 'settings',
    description: 'Define your own custom rotation order',
    example: 'T2 → T1 → T4 → T2'
  },
};

function RotationPatternsContent() {
  const { settings } = useSettings();
  const { showToast } = useToast();

  const [patterns, setPatterns] = useState<RotationPattern[]>([]);
  const [activePattern, setActivePattern] = useState<string>('sequential');
  const [isLoading, setIsLoading] = useState(true);
  const [showPatternModal, setShowPatternModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingPattern, setEditingPattern] = useState<RotationPattern | null>(null);
  const [patternToDelete, setPatternToDelete] = useState<RotationPattern | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewPattern, setPreviewPattern] = useState<RotationPattern | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<RotationPattern['type']>('sequential');
  const [formDescription, setFormDescription] = useState('');
  const [formCustomOrder, setFormCustomOrder] = useState('');
  const [formShuffleDaily, setFormShuffleDaily] = useState(false);
  const [formRespectPinned, setFormRespectPinned] = useState(false);
  const [formLoopMode, setFormLoopMode] = useState<'circular' | 'bounce'>('circular');

  // Load patterns and active pattern
  const loadPatterns = useCallback(async () => {
    try {
      const result = await chrome.storage.local.get(['rotationPatterns', 'activePattern']);
      setPatterns(Object.values(result.rotationPatterns || {}));
      setActivePattern(result.activePattern || 'sequential');
    } catch (error) {
      console.error('Failed to load patterns:', error);
      showToast('Failed to load patterns', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadPatterns();
  }, [loadPatterns]);

  // Reset form
  const resetForm = () => {
    setFormName('');
    setFormType('sequential');
    setFormDescription('');
    setFormCustomOrder('');
    setFormShuffleDaily(false);
    setFormRespectPinned(false);
    setFormLoopMode('circular');
  };

  // Open create modal
  const handleCreate = () => {
    resetForm();
    setEditingPattern(null);
    setShowPatternModal(true);
  };

  // Open edit modal
  const handleEdit = (pattern: RotationPattern) => {
    setFormName(pattern.name);
    setFormType(pattern.type);
    setFormDescription(pattern.description || '');
    setFormCustomOrder(
      pattern.customOrder ? pattern.customOrder.join(', ') : ''
    );
    setFormShuffleDaily(pattern.options?.shuffleDaily || false);
    setFormRespectPinned(pattern.options?.respectPinned || false);
    setFormLoopMode(pattern.options?.loopMode || 'circular');
    setEditingPattern(pattern);
    setShowPatternModal(true);
  };

  // Use template
  const handleUseTemplate = (template: typeof PATTERN_TEMPLATES[0]) => {
    setFormName(template.name);
    setFormType(template.type);
    setFormDescription(template.description || '');
    setFormShuffleDaily(template.options?.shuffleDaily || false);
    setFormRespectPinned(template.options?.respectPinned || false);
    setFormLoopMode(template.options?.loopMode || 'circular');
    setEditingPattern(null);
    setShowPatternModal(true);
  };

  // Save pattern
  const handleSave = async () => {
    if (!formName.trim()) {
      showToast('Pattern name is required', 'error');
      return;
    }

    const pattern: RotationPattern = {
      id: editingPattern?.id || `pattern-${Date.now()}`,
      name: formName.trim(),
      type: formType,
      description: formDescription.trim() || undefined,
      options: {
        shuffleDaily: formShuffleDaily,
        respectPinned: formRespectPinned,
        loopMode: formLoopMode,
      },
      createdAt: editingPattern?.createdAt || Date.now(),
      updatedAt: Date.now(),
    };

    // Parse custom order if custom type
    if (formType === 'custom') {
      if (!formCustomOrder.trim()) {
        showToast('Custom order is required for custom patterns', 'error');
        return;
      }

      try {
        const order = formCustomOrder.split(',').map(item => {
          const trimmed = item.trim();
          const num = parseInt(trimmed);
          return isNaN(num) ? trimmed : num;
        });
        pattern.customOrder = order;
      } catch (error) {
        showToast('Invalid custom order format', 'error');
        return;
      }
    }

    try {
      // Import RotationEngine dynamically
      const { rotationEngine } = await import('../../../premium/RotationEngine.js');
      await rotationEngine.savePattern(pattern);
      await loadPatterns();
      setShowPatternModal(false);
      showToast(
        editingPattern ? 'Pattern updated' : 'Pattern created',
        'success'
      );
    } catch (error) {
      console.error('Failed to save pattern:', error);
      showToast('Failed to save pattern', 'error');
    }
  };

  // Delete pattern
  const handleDeleteConfirm = async () => {
    if (!patternToDelete) return;

    try {
      const { rotationEngine } = await import('../../../premium/RotationEngine.js');
      await rotationEngine.deletePattern(patternToDelete.id);
      await loadPatterns();
      setShowDeleteModal(false);
      setPatternToDelete(null);
      showToast('Pattern deleted', 'success');
    } catch (error) {
      console.error('Failed to delete pattern:', error);
      showToast('Failed to delete pattern', 'error');
    }
  };

  // Activate pattern
  const handleActivate = async (patternId: string) => {
    try {
      await chrome.storage.local.set({ activePattern: patternId });
      setActivePattern(patternId);
      showToast('Pattern activated', 'success');
    } catch (error) {
      console.error('Failed to activate pattern:', error);
      showToast('Failed to activate pattern', 'error');
    }
  };

  // Preview pattern
  const handlePreview = (pattern: RotationPattern) => {
    setPreviewPattern(pattern);
    setShowPreview(true);
  };

  if (isLoading) {
    return <div className={styles.loading}>Loading patterns...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Rotation Patterns</h1>
          <p className={styles.description}>
            Customize how tabs rotate with predefined patterns or create your own
          </p>
        </div>
        <Button variant="primary" onClick={handleCreate}>
          <Icon name="plus" size={16} />
          Create Pattern
        </Button>
      </div>

      {/* Quick Templates */}
      <Card
        title="Quick Templates"
        icon={<Icon name="sparkles" size={20} />}
      >
        <div className={styles.templateGrid}>
          {PATTERN_TEMPLATES.map((template, index) => (
            <button
              key={index}
              className={styles.templateCard}
              onClick={() => handleUseTemplate(template)}
            >
              <div className={styles.templateIcon}>
                <Icon name={PATTERN_TYPE_INFO[template.type].icon} size={24} />
              </div>
              <div className={styles.templateContent}>
                <h4 className={styles.templateName}>{template.name}</h4>
                <p className={styles.templateDescription}>{template.description}</p>
              </div>
            </button>
          ))}
        </div>
      </Card>

      {/* Active Pattern */}
      <Card
        title="Active Pattern"
        icon={<Icon name="check" size={20} />}
      >
        <div className={styles.activePattern}>
          <div className={styles.activePatternInfo}>
            <Icon
              name={PATTERN_TYPE_INFO[patterns.find(p => p.id === activePattern)?.type || 'sequential'].icon}
              size={32}
            />
            <div>
              <h3 className={styles.activePatternName}>
                {patterns.find(p => p.id === activePattern)?.name || 'Sequential'}
              </h3>
              <p className={styles.activePatternDescription}>
                {patterns.find(p => p.id === activePattern)?.description || 'Default sequential rotation'}
              </p>
            </div>
          </div>
          {activePattern !== 'sequential' && (
            <Button
              variant="secondary"
              onClick={() => handleActivate('sequential')}
            >
              Reset to Sequential
            </Button>
          )}
        </div>
      </Card>

      {/* Pattern List */}
      <Card
        title={`Saved Patterns (${patterns.length})`}
        icon={<Icon name="folder" size={20} />}
      >
        {patterns.length === 0 ? (
          <div className={styles.emptyState}>
            <Icon name="folder" size={48} />
            <p>No custom patterns yet</p>
            <p className={styles.emptyHint}>
              Create a custom pattern or use a template to get started
            </p>
          </div>
        ) : (
          <div className={styles.patternList}>
            {patterns.map((pattern) => (
              <div
                key={pattern.id}
                className={`${styles.patternCard} ${activePattern === pattern.id ? styles.active : ''}`}
              >
                <div className={styles.patternHeader}>
                  <div className={styles.patternIcon}>
                    <Icon name={PATTERN_TYPE_INFO[pattern.type].icon} size={24} />
                  </div>
                  <div className={styles.patternInfo}>
                    <h4 className={styles.patternName}>{pattern.name}</h4>
                    <p className={styles.patternDescription}>
                      {pattern.description || PATTERN_TYPE_INFO[pattern.type].description}
                    </p>
                    <div className={styles.patternMeta}>
                      <span className={styles.patternType}>{pattern.type}</span>
                      {pattern.options?.shuffleDaily && (
                        <span className={styles.patternTag}>Daily Shuffle</span>
                      )}
                      {pattern.options?.respectPinned && (
                        <span className={styles.patternTag}>Respect Pinned</span>
                      )}
                    </div>
                  </div>
                  {activePattern === pattern.id && (
                    <div className={styles.activeBadge}>
                      <Icon name="check" size={16} />
                      Active
                    </div>
                  )}
                </div>

                <div className={styles.patternActions}>
                  {activePattern !== pattern.id && (
                    <Button
                      variant="primary"
                      size="small"
                      onClick={() => handleActivate(pattern.id)}
                    >
                      Activate
                    </Button>
                  )}
                  <Button
                    variant="secondary"
                    size="small"
                    onClick={() => handlePreview(pattern)}
                  >
                    <Icon name="eye" size={14} />
                    Preview
                  </Button>
                  <Button
                    variant="secondary"
                    size="small"
                    onClick={() => handleEdit(pattern)}
                  >
                    <Icon name="edit" size={14} />
                    Edit
                  </Button>
                  <Button
                    variant="secondary"
                    size="small"
                    onClick={() => {
                      setPatternToDelete(pattern);
                      setShowDeleteModal(true);
                    }}
                  >
                    <Icon name="trash" size={14} />
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Pattern Type Information */}
      <Card
        title="Pattern Types Explained"
        icon={<Icon name="info" size={20} />}
      >
        <div className={styles.typeInfoGrid}>
          {Object.entries(PATTERN_TYPE_INFO).map(([type, info]) => (
            <div key={type} className={styles.typeInfoCard}>
              <Icon name={info.icon} size={20} />
              <h4>{type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}</h4>
              <p>{info.description}</p>
              <code>{info.example}</code>
            </div>
          ))}
        </div>
      </Card>

      {/* Create/Edit Modal */}
      {showPatternModal && (
        <Modal
          isOpen={showPatternModal}
          onClose={() => setShowPatternModal(false)}
          title={editingPattern ? 'Edit Pattern' : 'Create Pattern'}
        >
          <div className={styles.modalContent}>
            <Input
              label="Pattern Name"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="My Custom Pattern"
              required
            />

            <div className={styles.formGroup}>
              <label className={styles.label}>Pattern Type</label>
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value as RotationPattern['type'])}
                className={styles.select}
              >
                <option value="sequential">Sequential</option>
                <option value="reverse">Reverse</option>
                <option value="random">Random</option>
                <option value="pinned-first">Pinned First</option>
                <option value="custom">Custom Order</option>
              </select>
            </div>

            <Input
              label="Description (optional)"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Describe this pattern..."
            />

            {formType === 'custom' && (
              <div className={styles.formGroup}>
                <label className={styles.label}>Custom Order</label>
                <Input
                  value={formCustomOrder}
                  onChange={(e) => setFormCustomOrder(e.target.value)}
                  placeholder="0, 2, 1, 3 or github, google, docs"
                  helpText="Comma-separated tab indices (0, 1, 2) or URL patterns (github, google)"
                />
              </div>
            )}

            {formType === 'random' && (
              <div className={styles.checkboxGroup}>
                <label className={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={formShuffleDaily}
                    onChange={(e) => setFormShuffleDaily(e.target.checked)}
                  />
                  Shuffle daily (rotation order changes each day)
                </label>
              </div>
            )}

            {(formType === 'sequential' || formType === 'reverse') && (
              <div className={styles.checkboxGroup}>
                <label className={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={formRespectPinned}
                    onChange={(e) => setFormRespectPinned(e.target.checked)}
                  />
                  Respect pinned tabs (keep pinned tabs in position)
                </label>
              </div>
            )}

            <div className={styles.modalActions}>
              <Button
                variant="secondary"
                onClick={() => setShowPatternModal(false)}
              >
                Cancel
              </Button>
              <Button variant="primary" onClick={handleSave}>
                {editingPattern ? 'Update' : 'Create'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && patternToDelete && (
        <Modal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          title="Delete Pattern"
        >
          <div className={styles.modalContent}>
            <p>
              Are you sure you want to delete the pattern "{patternToDelete.name}"?
              This action cannot be undone.
            </p>
            <div className={styles.modalActions}>
              <Button
                variant="secondary"
                onClick={() => setShowDeleteModal(false)}
              >
                Cancel
              </Button>
              <Button variant="primary" onClick={handleDeleteConfirm}>
                Delete
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Preview Modal */}
      {showPreview && previewPattern && (
        <Modal
          isOpen={showPreview}
          onClose={() => setShowPreview(false)}
          title={`Preview: ${previewPattern.name}`}
        >
          <div className={styles.modalContent}>
            <div className={styles.previewInfo}>
              <Icon name={PATTERN_TYPE_INFO[previewPattern.type].icon} size={32} />
              <div>
                <h3>{previewPattern.name}</h3>
                <p>{previewPattern.description || PATTERN_TYPE_INFO[previewPattern.type].description}</p>
              </div>
            </div>
            <div className={styles.previewExample}>
              <h4>Example Rotation:</h4>
              <code>{PATTERN_TYPE_INFO[previewPattern.type].example}</code>
            </div>
            {previewPattern.customOrder && (
              <div className={styles.previewOrder}>
                <h4>Custom Order:</h4>
                <code>{previewPattern.customOrder.join(' → ')}</code>
              </div>
            )}
            <div className={styles.modalActions}>
              <Button variant="primary" onClick={() => setShowPreview(false)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default function RotationPatterns() {
  return (
    <PremiumGate
      feature="rotation-patterns"
      title="Rotation Patterns"
      description="Customize how tabs rotate with sequential, reverse, random, or custom patterns."
    >
      <RotationPatternsContent />
    </PremiumGate>
  );
}
