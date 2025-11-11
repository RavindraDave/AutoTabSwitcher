/**
 * Diagnostics page controller
 */

import {
  getLogs,
  exportLogsAsText,
  exportLogsAsJSON,
  clearLogs,
  getDiagnosticSummary,
  type LogEntry,
} from '../core/logger.js';

// DOM Elements
let logContainer: HTMLElement;
let totalEntriesEl: HTMLElement;
let errorCountEl: HTMLElement;
let warningCountEl: HTMLElement;
let timeRangeEl: HTMLElement;
let categoriesEl: HTMLElement;
let alertContainer: HTMLElement;
let refreshBtn: HTMLButtonElement;
let exportTextBtn: HTMLButtonElement;
let exportJsonBtn: HTMLButtonElement;
let copyToClipboardBtn: HTMLButtonElement;
let clearLogsBtn: HTMLButtonElement;

/**
 * Initialize diagnostics page
 */
async function initializeDiagnostics(): Promise<void> {
  // Get DOM elements
  logContainer = document.getElementById('logContainer')!;
  totalEntriesEl = document.getElementById('totalEntries')!;
  errorCountEl = document.getElementById('errorCount')!;
  warningCountEl = document.getElementById('warningCount')!;
  timeRangeEl = document.getElementById('timeRange')!;
  categoriesEl = document.getElementById('categories')!;
  alertContainer = document.getElementById('alertContainer')!;
  refreshBtn = document.getElementById('refreshBtn') as HTMLButtonElement;
  exportTextBtn = document.getElementById('exportTextBtn') as HTMLButtonElement;
  exportJsonBtn = document.getElementById('exportJsonBtn') as HTMLButtonElement;
  copyToClipboardBtn = document.getElementById('copyToClipboardBtn') as HTMLButtonElement;
  clearLogsBtn = document.getElementById('clearLogsBtn') as HTMLButtonElement;

  // Set up event listeners
  refreshBtn.addEventListener('click', loadLogs);
  exportTextBtn.addEventListener('click', handleExportText);
  exportJsonBtn.addEventListener('click', handleExportJSON);
  copyToClipboardBtn.addEventListener('click', handleCopyToClipboard);
  clearLogsBtn.addEventListener('click', handleClearLogs);

  // Load logs
  await loadLogs();
}

/**
 * Load and display logs
 */
async function loadLogs(): Promise<void> {
  try {
    const logs = await getLogs();
    const summary = await getDiagnosticSummary();

    // Update summary
    totalEntriesEl.textContent = summary.totalEntries.toString();
    errorCountEl.textContent = summary.errorCount.toString();
    warningCountEl.textContent = summary.warningCount.toString();

    if (summary.oldestEntry && summary.newestEntry) {
      const oldest = new Date(summary.oldestEntry).toLocaleTimeString();
      const newest = new Date(summary.newestEntry).toLocaleTimeString();
      timeRangeEl.textContent = `${oldest} - ${newest}`;
    } else {
      timeRangeEl.textContent = '-';
    }

    if (summary.categories.length > 0) {
      categoriesEl.textContent = summary.categories.join(', ');
    } else {
      categoriesEl.textContent = '-';
    }

    // Display logs
    if (logs.length === 0) {
      logContainer.innerHTML = '<div class="empty-state">No logs available</div>';
    } else {
      logContainer.innerHTML = logs.map(renderLogEntry).join('');
    }
  } catch (error) {
    console.error('Error loading logs:', error);
    showAlert('Error loading logs', 'danger');
  }
}

/**
 * Render a single log entry
 */
function renderLogEntry(entry: LogEntry): string {
  const timestamp = new Date(entry.timestamp).toLocaleString();

  // Extract mode and window info from data for enhanced display
  let modeIndicator = '';
  let windowIndicator = '';

  if (entry.data) {
    if (entry.data['mode']) {
      const modeClass = entry.data['mode'] === 'global' ? 'mode-global' : 'mode-window';
      modeIndicator = `<span class="log-mode ${modeClass}">${entry.data['mode'] === 'global' ? '🌐 Global' : '🪟 Window'}</span>`;
    }
    if (entry.data['windowId'] !== undefined) {
      windowIndicator = `<span class="log-window">Window ${entry.data['windowId']}</span>`;
    }
  }

  let dataHtml = '';
  if (entry.data) {
    dataHtml = `<div class="log-data">${JSON.stringify(entry.data, null, 2)}</div>`;
  }

  return `
    <div class="log-entry">
      <div class="log-header">
        <span class="log-timestamp">${timestamp}</span>
        <span class="log-level ${entry.level}">${entry.level}</span>
        <span class="log-category">${entry.category}</span>
        ${modeIndicator}
        ${windowIndicator}
      </div>
      <div class="log-message">${escapeHtml(entry.message)}</div>
      ${dataHtml}
    </div>
  `;
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Handle export as text
 */
async function handleExportText(): Promise<void> {
  try {
    const text = await exportLogsAsText();
    downloadFile(text, 'auto-tab-switcher-logs.txt', 'text/plain');
    showAlert('Logs exported successfully', 'success');
  } catch (error) {
    console.error('Error exporting logs:', error);
    showAlert('Error exporting logs', 'danger');
  }
}

/**
 * Handle export as JSON
 */
async function handleExportJSON(): Promise<void> {
  try {
    const json = await exportLogsAsJSON();
    downloadFile(json, 'auto-tab-switcher-logs.json', 'application/json');
    showAlert('Logs exported successfully', 'success');
  } catch (error) {
    console.error('Error exporting logs:', error);
    showAlert('Error exporting logs', 'danger');
  }
}

/**
 * Handle copy to clipboard
 */
async function handleCopyToClipboard(): Promise<void> {
  try {
    const text = await exportLogsAsText();
    await navigator.clipboard.writeText(text);
    showAlert('Logs copied to clipboard', 'success');
  } catch (error) {
    console.error('Error copying to clipboard:', error);
    showAlert('Error copying to clipboard', 'danger');
  }
}

/**
 * Handle clear logs
 */
async function handleClearLogs(): Promise<void> {
  if (!confirm('Are you sure you want to clear all diagnostic logs?')) {
    return;
  }

  try {
    await clearLogs();
    await loadLogs();
    showAlert('Logs cleared successfully', 'success');
  } catch (error) {
    console.error('Error clearing logs:', error);
    showAlert('Error clearing logs', 'danger');
  }
}

/**
 * Download a file
 */
function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Show alert message
 */
function showAlert(message: string, type: 'success' | 'danger'): void {
  const alert = document.createElement('div');
  alert.className = `alert alert-${type} alert-dismissible fade show`;
  alert.setAttribute('role', 'alert');
  alert.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
  `;

  alertContainer.innerHTML = '';
  alertContainer.appendChild(alert);

  // Auto-dismiss after 5 seconds
  setTimeout(() => {
    alert.remove();
  }, 5000);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeDiagnostics);
} else {
  initializeDiagnostics();
}
