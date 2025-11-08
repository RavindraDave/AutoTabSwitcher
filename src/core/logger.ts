/**
 * Logging and diagnostics system for debugging production issues
 *
 * Features:
 * - Keeps last 30 minutes of logs
 * - Privacy-focused (no URLs or sensitive data)
 * - Export capabilities for user support
 */

export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  category: string;
  message: string;
  data?: Record<string, any>;
}

const LOG_STORAGE_KEY = 'diagnosticLogs';
const MAX_LOG_AGE_MS = 30 * 60 * 1000; // 30 minutes
const MAX_LOG_ENTRIES = 500; // Prevent excessive storage usage

/**
 * Add a log entry
 */
export async function log(
  level: LogLevel,
  category: string,
  message: string,
  data?: Record<string, any>
): Promise<void> {
  try {
    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      category,
      message,
      data: data ? sanitizeData(data) : undefined,
    };

    // Get existing logs
    const logs = await getLogs();

    // Add new entry
    logs.push(entry);

    // Clean old logs and enforce size limit
    const cleanedLogs = cleanLogs(logs);

    // Save back to storage
    await chrome.storage.local.set({ [LOG_STORAGE_KEY]: cleanedLogs });

    // Also log to console in development
    const isDev = !chrome.runtime.getManifest().update_url;
    if (isDev) {
      const consoleMethod = level === 'ERROR' ? 'error' : level === 'WARN' ? 'warn' : 'log';
      console[consoleMethod](`[${category}] ${message}`, data || '');
    }
  } catch (error) {
    console.error('Failed to write log entry:', error);
  }
}

/**
 * Convenience methods for different log levels
 */
export const logger = {
  info: (category: string, message: string, data?: Record<string, any>) =>
    log('INFO', category, message, data),

  warn: (category: string, message: string, data?: Record<string, any>) =>
    log('WARN', category, message, data),

  error: (category: string, message: string, data?: Record<string, any>) =>
    log('ERROR', category, message, data),

  debug: (category: string, message: string, data?: Record<string, any>) =>
    log('DEBUG', category, message, data),
};

/**
 * Get all logs from storage
 */
export async function getLogs(): Promise<LogEntry[]> {
  try {
    const result = await chrome.storage.local.get(LOG_STORAGE_KEY);
    return result[LOG_STORAGE_KEY] || [];
  } catch (error) {
    console.error('Failed to retrieve logs:', error);
    return [];
  }
}

/**
 * Clean old logs and enforce size limits
 */
function cleanLogs(logs: LogEntry[]): LogEntry[] {
  const now = Date.now();
  const cutoffTime = now - MAX_LOG_AGE_MS;

  // Remove logs older than 30 minutes
  let cleaned = logs.filter(log => log.timestamp > cutoffTime);

  // Enforce maximum entry count (keep most recent)
  if (cleaned.length > MAX_LOG_ENTRIES) {
    cleaned = cleaned.slice(-MAX_LOG_ENTRIES);
  }

  return cleaned;
}

/**
 * Sanitize data to remove sensitive information
 */
function sanitizeData(data: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(data)) {
    // Skip sensitive fields
    if (key.toLowerCase().includes('url') ||
        key.toLowerCase().includes('title') ||
        key.toLowerCase().includes('token') ||
        key.toLowerCase().includes('password')) {
      sanitized[key] = '[REDACTED]';
      continue;
    }

    // Handle objects recursively
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      sanitized[key] = sanitizeData(value);
    } else if (Array.isArray(value)) {
      sanitized[key] = `[Array(${value.length})]`;
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Export logs as formatted text
 */
export async function exportLogsAsText(): Promise<string> {
  const logs = await getLogs();
  const manifest = chrome.runtime.getManifest();

  let output = `Auto Tab Switcher - Diagnostic Logs\n`;
  output += `=====================================\n\n`;
  output += `Extension Version: ${manifest.version}\n`;
  output += `Export Date: ${new Date().toISOString()}\n`;
  output += `Browser: ${navigator.userAgent}\n`;
  output += `Total Entries: ${logs.length}\n\n`;
  output += `=====================================\n\n`;

  for (const entry of logs) {
    const date = new Date(entry.timestamp).toISOString();
    output += `[${date}] [${entry.level}] [${entry.category}]\n`;
    output += `  ${entry.message}\n`;
    if (entry.data) {
      output += `  Data: ${JSON.stringify(entry.data, null, 2)}\n`;
    }
    output += `\n`;
  }

  return output;
}

/**
 * Export logs as JSON
 */
export async function exportLogsAsJSON(): Promise<string> {
  const logs = await getLogs();
  const manifest = chrome.runtime.getManifest();

  const exportData = {
    metadata: {
      extensionVersion: manifest.version,
      exportDate: new Date().toISOString(),
      browser: navigator.userAgent,
      totalEntries: logs.length,
    },
    logs,
  };

  return JSON.stringify(exportData, null, 2);
}

/**
 * Clear all logs
 */
export async function clearLogs(): Promise<void> {
  try {
    await chrome.storage.local.remove(LOG_STORAGE_KEY);
    console.log('Diagnostic logs cleared');
  } catch (error) {
    console.error('Failed to clear logs:', error);
  }
}

/**
 * Get diagnostic summary
 */
export async function getDiagnosticSummary(): Promise<{
  totalEntries: number;
  oldestEntry: number | null;
  newestEntry: number | null;
  errorCount: number;
  warningCount: number;
  categories: string[];
}> {
  const logs = await getLogs();

  const summary = {
    totalEntries: logs.length,
    oldestEntry: logs.length > 0 ? logs[0]!.timestamp : null,
    newestEntry: logs.length > 0 ? logs[logs.length - 1]!.timestamp : null,
    errorCount: logs.filter(l => l.level === 'ERROR').length,
    warningCount: logs.filter(l => l.level === 'WARN').length,
    categories: [...new Set(logs.map(l => l.category))],
  };

  return summary;
}
