import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { Icon } from '../../components/common/Icon';
import { PremiumGate } from '../../components/common/PremiumGate';
import { useToast } from '../../context/ToastContext';
import styles from './SessionManagement.module.css';

interface TabInfo {
  url: string;
  title: string;
  favIconUrl?: string;
}

interface SavedSession {
  id: string;
  name: string;
  tabs: TabInfo[];
  createdAt: number;
  updatedAt: number;
}

function SessionManagementContent() {
  const { showToast } = useToast();
  const [sessions, setSessions] = useState<SavedSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingSession, setEditingSession] = useState<SavedSession | null>(null);
  const [sessionToDelete, setSessionToDelete] = useState<SavedSession | null>(null);
  const [sessionName, setSessionName] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Load sessions from storage
  const loadSessions = useCallback(async () => {
    try {
      const result = await chrome.storage.local.get('savedSessions');
      setSessions(result.savedSessions || []);
    } catch (error) {
      console.error('Failed to load sessions:', error);
      showToast('Failed to load sessions', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // Save sessions to storage
  const saveSessions = async (updatedSessions: SavedSession[]) => {
    await chrome.storage.local.set({ savedSessions: updatedSessions });
    setSessions(updatedSessions);
  };

  // Get current window tabs
  const getCurrentTabs = async (): Promise<TabInfo[]> => {
    const tabs = await chrome.tabs.query({ currentWindow: true });
    return tabs
      .filter((tab) => tab.url && !tab.url.startsWith('chrome://'))
      .map((tab) => ({
        url: tab.url!,
        title: tab.title || 'Untitled',
        favIconUrl: tab.favIconUrl,
      }));
  };

  // Handle save current session
  const handleSaveClick = async () => {
    const tabs = await getCurrentTabs();
    if (tabs.length === 0) {
      showToast('No tabs to save in current window', 'warning');
      return;
    }
    setSessionName('');
    setNameError(null);
    setEditingSession(null);
    setShowSaveModal(true);
  };

  // Handle edit session
  const handleEditClick = (session: SavedSession) => {
    setSessionName(session.name);
    setNameError(null);
    setEditingSession(session);
    setShowSaveModal(true);
  };

  // Handle delete click
  const handleDeleteClick = (session: SavedSession) => {
    setSessionToDelete(session);
    setShowDeleteModal(true);
  };

  // Validate session name
  const validateName = (name: string): string | null => {
    if (!name.trim()) return 'Session name is required';
    if (name.length > 50) return 'Name must be 50 characters or less';

    // Check for duplicate names (excluding current session if editing)
    const isDuplicate = sessions.some(
      (s) => s.name.toLowerCase() === name.trim().toLowerCase() && s.id !== editingSession?.id
    );
    if (isDuplicate) return 'A session with this name already exists';

    return null;
  };

  // Save or update session
  const handleSaveSession = async () => {
    const error = validateName(sessionName);
    if (error) {
      setNameError(error);
      return;
    }

    setIsSaving(true);
    try {
      let updatedSessions: SavedSession[];

      if (editingSession) {
        // Update existing session
        updatedSessions = sessions.map((s) =>
          s.id === editingSession.id
            ? { ...s, name: sessionName.trim(), updatedAt: Date.now() }
            : s
        );
        showToast('Session renamed successfully', 'success');
      } else {
        // Create new session
        const tabs = await getCurrentTabs();
        const newSession: SavedSession = {
          id: `session_${Date.now()}`,
          name: sessionName.trim(),
          tabs,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        updatedSessions = [newSession, ...sessions];
        showToast(`Session saved with ${tabs.length} tabs`, 'success');
      }

      await saveSessions(updatedSessions);
      setShowSaveModal(false);
    } catch (error) {
      console.error('Failed to save session:', error);
      showToast('Failed to save session', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete session
  const handleDeleteSession = async () => {
    if (!sessionToDelete) return;

    try {
      const updatedSessions = sessions.filter((s) => s.id !== sessionToDelete.id);
      await saveSessions(updatedSessions);
      showToast('Session deleted', 'success');
      setShowDeleteModal(false);
      setSessionToDelete(null);
    } catch (error) {
      console.error('Failed to delete session:', error);
      showToast('Failed to delete session', 'error');
    }
  };

  // Restore session (open all tabs)
  const handleRestoreSession = async (session: SavedSession) => {
    try {
      // Create a new window with all session tabs
      await chrome.windows.create({
        url: session.tabs.map((t) => t.url),
        focused: true,
      });
      showToast(`Restored ${session.tabs.length} tabs in new window`, 'success');
    } catch (error) {
      console.error('Failed to restore session:', error);
      showToast('Failed to restore session', 'error');
    }
  };

  // Update session with current tabs
  const handleUpdateSession = async (session: SavedSession) => {
    try {
      const tabs = await getCurrentTabs();
      if (tabs.length === 0) {
        showToast('No tabs to save in current window', 'warning');
        return;
      }

      const updatedSessions = sessions.map((s) =>
        s.id === session.id ? { ...s, tabs, updatedAt: Date.now() } : s
      );
      await saveSessions(updatedSessions);
      showToast(`Updated session with ${tabs.length} tabs`, 'success');
    } catch (error) {
      console.error('Failed to update session:', error);
      showToast('Failed to update session', 'error');
    }
  };

  // Format date
  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return <div className={styles.loading}>Loading sessions...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Session Management</h1>
        <p className={styles.description}>
          Save and restore your browser sessions instantly
        </p>
      </div>

      <Card
        title="Saved Sessions"
        description={`${sessions.length} session${sessions.length !== 1 ? 's' : ''} saved`}
        icon={<Icon name="folder" size={20} />}
        headerAction={
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Icon name="plus" size={16} />}
            onClick={handleSaveClick}
          >
            Save Current
          </Button>
        }
      >
        {sessions.length === 0 ? (
          <div className={styles.emptyState}>
            <Icon name="folder" size={48} />
            <p>No saved sessions yet</p>
            <span>Click "Save Current" to save your first session</span>
          </div>
        ) : (
          <div className={styles.sessionList}>
            {sessions.map((session) => (
              <div key={session.id} className={styles.sessionItem}>
                <div className={styles.sessionInfo}>
                  <div className={styles.sessionHeader}>
                    <span className={styles.sessionName}>{session.name}</span>
                    <span className={styles.tabCount}>
                      {session.tabs.length} tab{session.tabs.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className={styles.sessionMeta}>
                    <span>Created: {formatDate(session.createdAt)}</span>
                    {session.updatedAt !== session.createdAt && (
                      <span>Updated: {formatDate(session.updatedAt)}</span>
                    )}
                  </div>
                  <div className={styles.tabPreviews}>
                    {session.tabs.slice(0, 5).map((tab, index) => (
                      <img
                        key={index}
                        src={tab.favIconUrl || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect fill="%23ddd" width="16" height="16" rx="2"/></svg>'}
                        alt=""
                        className={styles.tabFavicon}
                        title={tab.title}
                      />
                    ))}
                    {session.tabs.length > 5 && (
                      <span className={styles.moreCount}>+{session.tabs.length - 5}</span>
                    )}
                  </div>
                </div>
                <div className={styles.sessionActions}>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleRestoreSession(session)}
                    title="Open all tabs in new window"
                  >
                    Restore
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleUpdateSession(session)}
                    title="Update with current window tabs"
                  >
                    <Icon name="refresh" size={16} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditClick(session)}
                    title="Rename session"
                  >
                    <Icon name="settings" size={16} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteClick(session)}
                    title="Delete session"
                  >
                    <Icon name="trash" size={16} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="Tips" icon={<Icon name="info" size={20} />}>
        <div className={styles.tipsContent}>
          <div className={styles.tipItem}>
            <Icon name="check" size={16} />
            <span>Sessions are saved locally and persist across browser restarts</span>
          </div>
          <div className={styles.tipItem}>
            <Icon name="check" size={16} />
            <span>Use "Restore" to open all session tabs in a new window</span>
          </div>
          <div className={styles.tipItem}>
            <Icon name="check" size={16} />
            <span>Click the refresh icon to update a session with current tabs</span>
          </div>
        </div>
      </Card>

      {/* Save/Edit Modal */}
      <Modal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        title={editingSession ? 'Rename Session' : 'Save Session'}
      >
        <div className={styles.modalContent}>
          <Input
            label="Session Name"
            value={sessionName}
            onChange={setSessionName}
            placeholder="Enter a name for this session"
            error={nameError || undefined}
            autoFocus
          />
          <div className={styles.modalActions}>
            <Button variant="ghost" onClick={() => setShowSaveModal(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSaveSession}
              isLoading={isSaving}
            >
              {editingSession ? 'Save' : 'Save Session'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Session"
      >
        <div className={styles.modalContent}>
          <p className={styles.deleteWarning}>
            Are you sure you want to delete "{sessionToDelete?.name}"? This action cannot be undone.
          </p>
          <div className={styles.modalActions}>
            <Button variant="ghost" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDeleteSession}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function SessionManagement() {
  return (
    <PremiumGate
      featureTitle="Session Management"
      featureDescription="Save and restore your browser sessions instantly"
      features={[
        { text: 'Save current window as a session' },
        { text: 'Restore sessions instantly' },
        { text: 'Update sessions with current tabs' },
        { text: 'Organize with named sessions' },
      ]}
    >
      <SessionManagementContent />
    </PremiumGate>
  );
}

export default SessionManagement;
