/**
 * Premium Features UI Controller
 * Handles all premium feature interactions and UI updates
 */

import { sessionManager } from '../premium/SessionManager.js';
import { refreshManager } from '../premium/RefreshManager.js';
import { skipRuleEngine } from '../premium/SkipRuleEngine.js';
import { configManager } from '../premium/ConfigManager.js';
import {
  canAccessPremium,
  activateLicense,
  deactivateLicense,
  getPremiumTier,
  canAccessPremiumFeature,
  PremiumFeature
} from '../core/premium-access.js';
import { logger } from '../core/logger.js';

// UI State
let currentRuleType = 'skip'; // 'skip' or 'refresh'
let sessions = [];
let refreshRules = [];
let skipRules = [];

// ===== Vanilla JS Modal Functions =====

/**
 * Show a modal dialog
 * @param {string} modalId - The ID of the modal element
 */
function showModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;

  // Create backdrop if it doesn't exist
  let backdrop = document.querySelector('.modal-backdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop fade';
    document.body.appendChild(backdrop);
  }

  // Show modal and backdrop
  modal.style.display = 'block';
  modal.classList.add('show');
  backdrop.classList.add('show');
  document.body.classList.add('modal-open');

  // Force reflow for animation
  modal.offsetHeight;

  // Add fade-in class
  modal.classList.add('fade-in');
}

/**
 * Hide a modal dialog
 * @param {string} modalId - The ID of the modal element
 */
function hideModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;

  const backdrop = document.querySelector('.modal-backdrop');

  // Remove show classes
  modal.classList.remove('show', 'fade-in');
  if (backdrop) {
    backdrop.classList.remove('show');
  }

  // Wait for animation to complete before hiding
  setTimeout(() => {
    modal.style.display = 'none';
    if (backdrop) {
      backdrop.remove();
    }
    document.body.classList.remove('modal-open');
  }, 150); // Bootstrap's default transition time
}

/**
 * Setup modal event listeners for close buttons and backdrop clicks
 */
function setupModalHandlers() {
  // Close button handlers
  document.querySelectorAll('.modal .close, .modal [data-dismiss="modal"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const modal = e.target.closest('.modal');
      if (modal) {
        hideModal(modal.id);
      }
    });
  });

  // Backdrop click handlers
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        hideModal(modal.id);
      }
    });
  });

  // ESC key handler
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const openModal = document.querySelector('.modal.show');
      if (openModal) {
        hideModal(openModal.id);
      }
    }
  });
}

// Initialize UI
document.addEventListener('DOMContentLoaded', async () => {
  try {
    setupModalHandlers(); // Setup modal handlers first
    await initializePremiumStatus();
    await loadAllData();
    setupEventListeners();
    logger.info('PremiumUI', 'Premium UI initialized');
  } catch (error) {
    logger.error('PremiumUI', 'Failed to initialize', { error });
    showError('Failed to initialize premium features');
  }
});

/**
 * Initialize premium status and show/hide sections
 */
async function initializePremiumStatus() {
  const hasPremium = await canAccessPremium();

  // Update premium badge
  const premiumBadge = document.getElementById('premiumBadge');
  if (hasPremium) {
    premiumBadge.textContent = '✅ Premium Active';
    premiumBadge.classList.add('active');

    // Show activation status, hide form
    document.querySelector('.activation-form').style.display = 'none';
    document.getElementById('activationStatus').style.display = 'flex';

    // Load tier info
    const tier = await getPremiumTier();
    document.getElementById('tierInfo').textContent =
      tier.charAt(0).toUpperCase() + tier.slice(1);

    // Remove premium overlays
    document.querySelectorAll('.premium-overlay').forEach(overlay => {
      overlay.classList.add('hidden');
    });

    // Remove locked class from premium features
    document.querySelectorAll('.premium-feature').forEach(feature => {
      feature.classList.remove('locked');
    });
  } else {
    // Show activation form, hide status
    document.querySelector('.activation-form').style.display = 'block';
    document.getElementById('activationStatus').style.display = 'none';

    // Keep premium overlays visible
    document.querySelectorAll('.premium-feature').forEach(feature => {
      feature.classList.add('locked');
    });
  }
}

/**
 * Load all premium data
 */
async function loadAllData() {
  const hasPremium = await canAccessPremium();
  if (!hasPremium) return;

  try {
    // Load sessions
    if (await canAccessPremiumFeature(PremiumFeature.SESSION_MANAGEMENT)) {
      await loadSessions();
      await loadTemplates();
    }

    // Load refresh settings
    if (await canAccessPremiumFeature(PremiumFeature.SMART_AUTO_REFRESH)) {
      await loadRefreshSettings();
      await loadRefreshRules();
    }

    // Load skip rules
    if (await canAccessPremiumFeature(PremiumFeature.SKIP_RULES)) {
      await loadSkipRules();
      await loadSkipStatistics();
    }

    // Load export stats
    if (await canAccessPremiumFeature(PremiumFeature.IMPORT_EXPORT)) {
      await loadExportStatistics();
    }
  } catch (error) {
    logger.error('PremiumUI', 'Failed to load data', { error });
  }
}

/**
 * Setup all event listeners
 */
function setupEventListeners() {
  // License activation
  document.getElementById('activateButton')?.addEventListener('click', handleActivateLicense);
  document.getElementById('deactivateButton')?.addEventListener('click', handleDeactivateLicense);

  // Session management
  document.getElementById('saveCurrentSessionBtn')?.addEventListener('click', () => {
    showModal('saveSessionModal');
  });
  document.getElementById('confirmSaveSessionBtn')?.addEventListener('click', handleSaveSession);

  // Refresh settings
  document.getElementById('refreshEnabledCheckbox')?.addEventListener('change', handleRefreshEnabledChange);
  document.getElementById('refreshStrategySelect')?.addEventListener('change', handleRefreshStrategyChange);
  document.getElementById('addRefreshRuleBtn')?.addEventListener('click', () => {
    currentRuleType = 'refresh';
    showAddRuleModal('refresh');
  });

  // Skip rules
  document.getElementById('skipPinnedTabsCheckbox')?.addEventListener('change', handleSkipPinnedChange);
  document.getElementById('addSkipRuleBtn')?.addEventListener('click', () => {
    currentRuleType = 'skip';
    showAddRuleModal('skip');
  });
  document.getElementById('confirmAddRuleBtn')?.addEventListener('click', handleAddRule);

  // Import/Export
  document.getElementById('exportConfigBtn')?.addEventListener('click', handleExportConfig);
  document.getElementById('copyConfigBtn')?.addEventListener('click', handleCopyConfig);
  document.getElementById('importFromFileBtn')?.addEventListener('click', () => {
    document.getElementById('importFileInput').click();
  });
  document.getElementById('importFromTextBtn')?.addEventListener('click', () => {
    showModal('importTextModal');
  });
  document.getElementById('importFileInput')?.addEventListener('change', handleImportFile);
  document.getElementById('confirmImportTextBtn')?.addEventListener('click', handleImportText);
  document.getElementById('createBackupBtn')?.addEventListener('click', handleCreateBackup);

  // Event delegation for session actions
  document.addEventListener('click', handleDelegatedClick);
}

/**
 * Handle delegated click events for dynamically created elements
 * This prevents XSS by avoiding inline event handlers
 */
function handleDelegatedClick(e) {
  const target = e.target.closest('button, .template-card');
  if (!target) return;

  // Restore session
  if (target.classList.contains('restore-session')) {
    const sessionId = target.dataset.sessionId;
    const mode = target.dataset.mode || 'new-window';
    if (sessionId) handleRestoreSession(sessionId, mode);
    return;
  }

  // Edit session
  if (target.classList.contains('edit-session')) {
    const sessionId = target.dataset.sessionId;
    if (sessionId) handleEditSession(sessionId);
    return;
  }

  // Delete session
  if (target.classList.contains('delete-session')) {
    const sessionId = target.dataset.sessionId;
    if (sessionId) handleDeleteSession(sessionId);
    return;
  }

  // Create from template
  if (target.classList.contains('create-from-template')) {
    const templateId = target.dataset.templateId;
    if (templateId) handleCreateFromTemplate(templateId);
    return;
  }

  // Toggle refresh rule
  if (target.classList.contains('toggle-refresh-rule')) {
    const ruleId = target.dataset.ruleId;
    if (ruleId) handleToggleRefreshRule(ruleId);
    return;
  }

  // Delete refresh rule
  if (target.classList.contains('delete-refresh-rule')) {
    const ruleId = target.dataset.ruleId;
    if (ruleId) handleDeleteRefreshRule(ruleId);
    return;
  }

  // Toggle skip rule
  if (target.classList.contains('toggle-skip-rule')) {
    const ruleId = target.dataset.ruleId;
    if (ruleId) handleToggleSkipRule(ruleId);
    return;
  }

  // Delete skip rule
  if (target.classList.contains('delete-skip-rule')) {
    const ruleId = target.dataset.ruleId;
    if (ruleId) handleDeleteSkipRule(ruleId);
    return;
  }
}

// ===== License Management =====

async function handleActivateLicense() {
  const licenseKey = document.getElementById('licenseKeyInput').value.trim();

  if (!licenseKey) {
    showError('Please enter a license key');
    return;
  }

  try {
    const result = await activateLicense(licenseKey);

    if (result.success) {
      showSuccess('Premium activated successfully!');
      await initializePremiumStatus();
      await loadAllData();
    } else {
      showError(result.error || 'Failed to activate license');
    }
  } catch (error) {
    logger.error('PremiumUI', 'Activation failed', { error });
    showError('Failed to activate license');
  }
}

async function handleDeactivateLicense() {
  if (!confirm('Are you sure you want to deactivate your premium license?')) {
    return;
  }

  try {
    await deactivateLicense();
    showSuccess('Premium license deactivated');
    await initializePremiumStatus();
  } catch (error) {
    logger.error('PremiumUI', 'Deactivation failed', { error });
    showError('Failed to deactivate license');
  }
}

// ===== Session Management =====

async function loadSessions() {
  try {
    sessions = await sessionManager.getAllSessions();
    renderSessionList();
  } catch (error) {
    logger.error('PremiumUI', 'Failed to load sessions', { error });
  }
}

function renderSessionList() {
  const sessionList = document.getElementById('sessionList');

  if (sessions.length === 0) {
    sessionList.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📋</div>
        <p>No saved sessions yet</p>
        <small>Click "Save Current Window" to create your first session</small>
      </div>
    `;
    return;
  }

  sessionList.innerHTML = sessions.map(session => `
    <div class="session-item" data-session-id="${escapeHtml(session.id)}">
      <div class="session-icon">${escapeHtml(session.icon || '📋')}</div>
      <div class="session-info">
        <div class="session-name">${escapeHtml(session.name)}</div>
        <div class="session-meta">
          ${session.tabs.length} tabs ·
          Created ${formatDate(session.createdAt)} ·
          Launched ${session.launchCount || 0} times
        </div>
      </div>
      <div class="session-actions">
        <button class="btn btn-sm btn-primary restore-session" data-session-id="${escapeHtml(session.id)}" data-mode="new-window">
          🚀 Restore
        </button>
        <button class="btn btn-sm btn-outline-secondary edit-session" data-session-id="${escapeHtml(session.id)}">
          ✏️
        </button>
        <button class="btn btn-sm btn-outline-danger delete-session" data-session-id="${escapeHtml(session.id)}">
          🗑️
        </button>
      </div>
    </div>
  `).join('');
}

async function loadTemplates() {
  const templates = sessionManager.getTemplates();
  const templateGrid = document.getElementById('templateGrid');

  templateGrid.innerHTML = templates.map(template => `
    <div class="template-card create-from-template" data-template-id="${escapeHtml(template.id)}">
      <div class="template-header">
        <div class="template-icon">${escapeHtml(template.icon)}</div>
        <div class="template-name">${escapeHtml(template.name)}</div>
      </div>
      <div class="template-description">${escapeHtml(template.description)}</div>
      <div class="template-tabs">${template.tabs.length} tabs</div>
    </div>
  `).join('');
}

async function handleSaveSession() {
  const name = document.getElementById('sessionNameInput').value.trim();
  const description = document.getElementById('sessionDescriptionInput').value.trim();
  const icon = document.getElementById('sessionIconInput').value.trim();

  if (!name) {
    showError('Please enter a session name');
    return;
  }

  try {
    await sessionManager.saveCurrentWindow(name, {
      description: description || undefined,
      icon: icon || undefined
    });

    hideModal('saveSessionModal');
    showSuccess('Session saved successfully!');
    await loadSessions();

    // Clear form
    document.getElementById('sessionNameInput').value = '';
    document.getElementById('sessionDescriptionInput').value = '';
    document.getElementById('sessionIconInput').value = '';
  } catch (error) {
    logger.error('PremiumUI', 'Failed to save session', { error });
    showError(error.message || 'Failed to save session');
  }
}

/**
 * Handle session restoration (called via event delegation)
 */
async function handleRestoreSession(sessionId, mode) {
  try {
    await sessionManager.restoreSession(sessionId, mode);
    showSuccess('Session restored successfully!');
  } catch (error) {
    logger.error('PremiumUI', 'Failed to restore session', { error });
    showError(`Failed to restore session: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Handle session editing (called via event delegation)
 */
async function handleEditSession(sessionId) {
  // TODO: Implement session editing modal
  showError('Session editing not yet implemented');
}

/**
 * Handle session deletion (called via event delegation)
 */
async function handleDeleteSession(sessionId) {
  if (!confirm('Are you sure you want to delete this session?')) {
    return;
  }

  try {
    await sessionManager.deleteSession(sessionId);
    showSuccess('Session deleted successfully');
    await loadSessions();
  } catch (error) {
    logger.error('PremiumUI', 'Failed to delete session', { error });
    showError(`Failed to delete session: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Handle template instantiation (called via event delegation)
 */
async function handleCreateFromTemplate(templateId) {
  const templates = sessionManager.getTemplates();
  const template = templates.find(t => t.id === templateId);

  if (!template) {
    showError('Template not found');
    return;
  }

  try {
    await sessionManager.createFromTemplate(template);
    showSuccess(`Session created from ${template.name} template!`);
    await loadSessions();
  } catch (error) {
    logger.error('PremiumUI', 'Failed to create from template', { error });
    showError(`Failed to create session: ${error.message || 'Unknown error'}`);
  }
}

// ===== Refresh Settings =====

async function loadRefreshSettings() {
  try {
    const settings = await refreshManager.getSettings();

    // Update UI
    document.getElementById('refreshEnabledCheckbox').checked = settings.enabled;
    document.getElementById('refreshStrategySelect').value = settings.strategy;
    document.getElementById('refreshIntervalInput').value =
      settings.globalRefreshInterval ? settings.globalRefreshInterval / 1000 : '';
    document.getElementById('preemptiveOffsetInput').value =
      settings.preemptiveRefreshOffset || 2000;

    // Show/hide settings
    document.getElementById('refreshSettings').style.display =
      settings.enabled ? 'block' : 'none';

    // Show/hide preemptive offset
    const showOffset = settings.strategy === 'preemptive' || settings.strategy === 'hybrid';
    document.getElementById('preemptiveOffsetSetting').style.display =
      showOffset ? 'block' : 'none';

    updateStrategyExplanation(settings.strategy);
  } catch (error) {
    logger.error('PremiumUI', 'Failed to load refresh settings', { error });
  }
}

function updateStrategyExplanation(strategy) {
  const explanations = {
    preemptive: '🚀 Preemptive Strategy: Tabs are refreshed automatically before you switch to them, ensuring the content is always fresh when you view it. This is the most innovative approach!',
    'post-switch': '🔄 Post-Switch Strategy: Tabs are refreshed immediately after you switch to them. Good for ensuring you always see fresh content.',
    hybrid: '⚡ Hybrid Strategy: Intelligently combines preemptive and post-switch refresh based on tab activity and timing. Best of both worlds!',
    manual: '✋ Manual Strategy: Tabs are only refreshed when you explicitly request it. No automatic refreshing.'
  };

  document.getElementById('strategyExplanation').innerHTML =
    explanations[strategy] || '';
}

async function handleRefreshEnabledChange(e) {
  const enabled = e.target.checked;

  try {
    if (enabled) {
      await refreshManager.enable();
      document.getElementById('refreshSettings').style.display = 'block';
    } else {
      await refreshManager.disable();
      document.getElementById('refreshSettings').style.display = 'none';
    }
    showSuccess(`Auto-refresh ${enabled ? 'enabled' : 'disabled'}`);
  } catch (error) {
    logger.error('PremiumUI', 'Failed to toggle refresh', { error });
    showError('Failed to update refresh settings');
    e.target.checked = !enabled; // Revert
  }
}

async function handleRefreshStrategyChange(e) {
  const strategy = e.target.value;

  try {
    await refreshManager.updateSettings({ strategy });
    updateStrategyExplanation(strategy);

    // Show/hide preemptive offset
    const showOffset = strategy === 'preemptive' || strategy === 'hybrid';
    document.getElementById('preemptiveOffsetSetting').style.display =
      showOffset ? 'block' : 'none';

    showSuccess('Refresh strategy updated');
  } catch (error) {
    logger.error('PremiumUI', 'Failed to update strategy', { error });
    showError('Failed to update refresh strategy');
  }
}

async function loadRefreshRules() {
  try {
    refreshRules = await refreshManager.getRules();
    renderRefreshRules();
  } catch (error) {
    logger.error('PremiumUI', 'Failed to load refresh rules', { error });
  }
}

function renderRefreshRules() {
  const ruleList = document.getElementById('refreshRuleList');

  if (refreshRules.length === 0) {
    ruleList.innerHTML = `
      <div class="empty-state small">
        <p>No refresh rules configured</p>
        <small>All tabs will be refreshed by default</small>
      </div>
    `;
    return;
  }

  ruleList.innerHTML = refreshRules.map(rule => `
    <div class="rule-item ${rule.enabled ? 'enabled' : 'disabled'}" data-rule-id="${escapeHtml(rule.id)}">
      <span class="rule-type-badge">${escapeHtml(rule.type)}</span>
      <div class="rule-info">
        <div class="rule-pattern">${escapeHtml(rule.pattern)}</div>
        ${rule.description ? `<div class="rule-description">${escapeHtml(rule.description)}</div>` : ''}
      </div>
      <div class="rule-actions">
        <button class="btn btn-sm btn-outline-primary toggle-refresh-rule" data-rule-id="${escapeHtml(rule.id)}">
          ${rule.enabled ? '⏸️ Disable' : '▶️ Enable'}
        </button>
        <button class="btn btn-sm btn-outline-danger delete-refresh-rule" data-rule-id="${escapeHtml(rule.id)}">
          🗑️
        </button>
      </div>
    </div>
  `).join('');
}

// ===== Skip Rules =====

async function loadSkipRules() {
  try {
    skipRules = await skipRuleEngine.getRules();
    const skipPinned = await skipRuleEngine.getSkipPinnedTabs();

    document.getElementById('skipPinnedTabsCheckbox').checked = skipPinned;
    renderSkipRules();
  } catch (error) {
    logger.error('PremiumUI', 'Failed to load skip rules', { error });
  }
}

function renderSkipRules() {
  const ruleList = document.getElementById('skipRuleList');

  if (skipRules.length === 0) {
    ruleList.innerHTML = `
      <div class="empty-state small">
        <p>No skip rules configured</p>
        <small>All tabs (except pinned if enabled) will be included in rotation</small>
      </div>
    `;
    return;
  }

  ruleList.innerHTML = skipRules.map(rule => `
    <div class="rule-item ${rule.enabled ? 'enabled' : 'disabled'}" data-rule-id="${escapeHtml(rule.id)}">
      <span class="rule-type-badge">${escapeHtml(rule.type)}</span>
      <div class="rule-info">
        <div class="rule-pattern">${escapeHtml(rule.pattern)}</div>
        ${rule.description ? `<div class="rule-description">${escapeHtml(rule.description)}</div>` : ''}
      </div>
      <div class="rule-actions">
        <button class="btn btn-sm btn-outline-primary toggle-skip-rule" data-rule-id="${escapeHtml(rule.id)}">
          ${rule.enabled ? '⏸️ Disable' : '▶️ Enable'}
        </button>
        <button class="btn btn-sm btn-outline-danger delete-skip-rule" data-rule-id="${escapeHtml(rule.id)}">
          🗑️
        </button>
      </div>
    </div>
  `).join('');
}

async function loadSkipStatistics() {
  try {
    const stats = await skipRuleEngine.getStatistics();

    document.getElementById('totalSkipRules').textContent = stats.totalRules;
    document.getElementById('enabledSkipRules').textContent = stats.enabledRules;
    document.getElementById('skipPinnedStatus').textContent =
      stats.skipPinnedEnabled ? 'Enabled' : 'Disabled';
  } catch (error) {
    logger.error('PremiumUI', 'Failed to load skip statistics', { error });
  }
}

async function handleSkipPinnedChange(e) {
  const skip = e.target.checked;

  try {
    await skipRuleEngine.setSkipPinnedTabs(skip);
    await loadSkipStatistics();
    showSuccess(`Skip pinned tabs ${skip ? 'enabled' : 'disabled'}`);
  } catch (error) {
    logger.error('PremiumUI', 'Failed to update skip pinned', { error });
    showError('Failed to update setting');
    e.target.checked = !skip; // Revert
  }
}

// ===== Rule Management =====

function showAddRuleModal(type) {
  const actionGroup = document.getElementById('ruleActionGroup');

  // Show/hide action select for refresh rules
  actionGroup.style.display = type === 'refresh' ? 'block' : 'none';

  // Update modal title
  document.getElementById('ruleModalTitle').textContent =
    type === 'refresh' ? 'Add Refresh Rule' : 'Add Skip Rule';

  // Clear form
  document.getElementById('ruleTypeSelect').value = 'url';
  document.getElementById('rulePatternInput').value = '';
  document.getElementById('ruleDescriptionInput').value = '';
  document.getElementById('ruleEnabledCheckbox').checked = true;
  if (type === 'refresh') {
    document.getElementById('ruleActionSelect').value = 'refresh';
  }

  showModal('addRuleModal');
}

async function handleAddRule() {
  const type = document.getElementById('ruleTypeSelect').value;
  const pattern = document.getElementById('rulePatternInput').value.trim();
  const description = document.getElementById('ruleDescriptionInput').value.trim();
  const enabled = document.getElementById('ruleEnabledCheckbox').checked;

  if (!pattern) {
    showError('Please enter a pattern');
    return;
  }

  const ruleData = {
    type,
    pattern,
    description: description || undefined,
    enabled
  };

  try {
    if (currentRuleType === 'refresh') {
      const action = document.getElementById('ruleActionSelect').value;
      await refreshManager.addRule({ ...ruleData, action });
      await loadRefreshRules();
    } else {
      await skipRuleEngine.addRule(ruleData);
      await loadSkipRules();
      await loadSkipStatistics();
    }

    hideModal('addRuleModal');
    showSuccess('Rule added successfully!');
  } catch (error) {
    logger.error('PremiumUI', 'Failed to add rule', { error });
    showError(error.message || 'Failed to add rule');
  }
}

// Global functions for rule actions
/**
 * Handle refresh rule toggle (called via event delegation)
 */
async function handleToggleRefreshRule(ruleId) {
  try {
    const rule = refreshRules.find(r => r.id === ruleId);
    if (!rule) {
      showError('Rule not found');
      return;
    }

    await refreshManager.addRule({ ...rule, enabled: !rule.enabled });
    await loadRefreshRules();
    showSuccess('Refresh rule updated successfully');
  } catch (error) {
    logger.error('PremiumUI', 'Failed to toggle refresh rule', { error });
    showError(`Failed to update rule: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Handle refresh rule deletion (called via event delegation)
 */
async function handleDeleteRefreshRule(ruleId) {
  if (!confirm('Are you sure you want to delete this refresh rule?')) {
    return;
  }

  try {
    await refreshManager.removeRule(ruleId);
    await loadRefreshRules();
    showSuccess('Refresh rule deleted successfully');
  } catch (error) {
    logger.error('PremiumUI', 'Failed to delete refresh rule', { error });
    showError(`Failed to delete rule: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Handle skip rule toggle (called via event delegation)
 */
async function handleToggleSkipRule(ruleId) {
  try {
    await skipRuleEngine.toggleRule(ruleId);
    await loadSkipRules();
    await loadSkipStatistics();
    showSuccess('Skip rule updated successfully');
  } catch (error) {
    logger.error('PremiumUI', 'Failed to toggle skip rule', { error });
    showError(`Failed to update rule: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Handle skip rule deletion (called via event delegation)
 */
async function handleDeleteSkipRule(ruleId) {
  if (!confirm('Are you sure you want to delete this skip rule?')) {
    return;
  }

  try {
    await skipRuleEngine.removeRule(ruleId);
    await loadSkipRules();
    await loadSkipStatistics();
    showSuccess('Skip rule deleted successfully');
  } catch (error) {
    logger.error('PremiumUI', 'Failed to delete skip rule', { error });
    showError(`Failed to delete rule: ${error.message || 'Unknown error'}`);
  }
}

// ===== Import/Export =====

async function loadExportStatistics() {
  try {
    const stats = await configManager.getExportStats();

    document.getElementById('exportStats').innerHTML = `
      Sessions: <strong>${stats.sessions}</strong><br>
      Refresh Rules: <strong>${stats.refreshRules}</strong><br>
      Skip Rules: <strong>${stats.skipRules}</strong><br>
      Backups: <strong>${stats.backups}</strong>
      ${stats.lastBackup ? `<br>Last Backup: <strong>${formatDate(stats.lastBackup)}</strong>` : ''}
    `;
  } catch (error) {
    logger.error('PremiumUI', 'Failed to load export stats', { error });
  }
}

async function handleExportConfig() {
  const options = {
    includeSettings: document.getElementById('exportSettingsCheckbox').checked,
    includeSessions: document.getElementById('exportSessionsCheckbox').checked,
    includeRefreshSettings: document.getElementById('exportRefreshCheckbox').checked,
    includeRefreshRules: document.getElementById('exportRefreshCheckbox').checked,
    includeSkipRules: document.getElementById('exportSkipCheckbox').checked,
    sanitize: document.getElementById('sanitizeExportCheckbox').checked
  };

  try {
    await configManager.downloadConfig(options);
    showSuccess('Configuration exported successfully!');
  } catch (error) {
    logger.error('PremiumUI', 'Failed to export config', { error });
    showError('Failed to export configuration');
  }
}

async function handleCopyConfig() {
  const options = {
    includeSettings: document.getElementById('exportSettingsCheckbox').checked,
    includeSessions: document.getElementById('exportSessionsCheckbox').checked,
    includeRefreshSettings: document.getElementById('exportRefreshCheckbox').checked,
    includeRefreshRules: document.getElementById('exportRefreshCheckbox').checked,
    includeSkipRules: document.getElementById('exportSkipCheckbox').checked,
    sanitize: document.getElementById('sanitizeExportCheckbox').checked
  };

  try {
    const jsonString = await configManager.exportAsJSON(options);
    await navigator.clipboard.writeText(jsonString);
    showSuccess('Configuration copied to clipboard!');
  } catch (error) {
    logger.error('PremiumUI', 'Failed to copy config', { error });
    showError('Failed to copy to clipboard');
  }
}

async function handleImportFile(e) {
  const file = e.target.files[0];
  if (!file) return;

  try {
    const text = await file.text();
    const merge = document.getElementById('importModeMerge').checked;

    const result = await configManager.importFromJSON(text, { merge });

    if (result.success) {
      showSuccess('Configuration imported successfully!');
      await loadAllData();
    } else {
      showError(`Import failed: ${result.errors?.join(', ')}`);
    }
  } catch (error) {
    logger.error('PremiumUI', 'Failed to import file', { error });
    showError('Failed to import configuration');
  }

  // Reset file input
  e.target.value = '';
}

async function handleImportText() {
  const text = document.getElementById('importJsonTextarea').value.trim();

  if (!text) {
    showError('Please paste JSON configuration');
    return;
  }

  try {
    const merge = document.getElementById('importModeMerge').checked;
    const result = await configManager.importFromJSON(text, { merge });

    if (result.success) {
      hideModal('importTextModal');
      showSuccess('Configuration imported successfully!');
      await loadAllData();
      document.getElementById('importJsonTextarea').value = '';
    } else {
      showError(`Import failed: ${result.errors?.join(', ')}`);
    }
  } catch (error) {
    logger.error('PremiumUI', 'Failed to import text', { error });
    showError('Failed to import configuration');
  }
}

async function handleCreateBackup() {
  try {
    await configManager.createBackup();
    showSuccess('Backup created successfully!');
    await loadExportStatistics();
  } catch (error) {
    logger.error('PremiumUI', 'Failed to create backup', { error });
    showError('Failed to create backup');
  }
}

// ===== Utility Functions =====

function showSuccess(message) {
  const alert = document.getElementById('successAlert');
  document.getElementById('successMessage').textContent = message;
  alert.style.display = 'block';

  setTimeout(() => {
    alert.style.display = 'none';
  }, 3000);

  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showError(message) {
  const alert = document.getElementById('errorAlert');
  document.getElementById('errorMessage').textContent = message;
  alert.style.display = 'block';

  setTimeout(() => {
    alert.style.display = 'none';
  }, 5000);

  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatDate(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;

  // Less than 1 minute
  if (diff < 60000) {
    return 'just now';
  }

  // Less than 1 hour
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000);
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
  }

  // Less than 1 day
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  }

  // Less than 7 days
  if (diff < 604800000) {
    const days = Math.floor(diff / 86400000);
    return `${days} ${days === 1 ? 'day' : 'days'} ago`;
  }

  // Format as date
  return date.toLocaleDateString();
}

// Hide alerts initially
document.getElementById('successAlert').style.display = 'none';
document.getElementById('errorAlert').style.display = 'none';
