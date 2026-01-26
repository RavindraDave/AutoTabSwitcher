/**
 * Tests for SettingsContext
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { SettingsProvider, useSettings } from '../../settings/context/SettingsContext';
import { resetMockStorage, getMockStorage } from './setup';

// Test component to access context
function TestConsumer() {
  const {
    settings,
    isLoading,
    updateSetting,
    updateSettings,
    getDelayInSeconds,
    getPauseDurationInSeconds,
    setDelayInSeconds,
    setPauseDurationInSeconds,
  } = useSettings();

  return (
    <div>
      <div data-testid="loading">{isLoading ? 'loading' : 'loaded'}</div>
      <div data-testid="enabled">{settings.enabled ? 'true' : 'false'}</div>
      <div data-testid="delayTime">{settings.delayTime}</div>
      <div data-testid="delaySeconds">{getDelayInSeconds()}</div>
      <div data-testid="pauseDuration">{settings.pauseDuration}</div>
      <div data-testid="pauseSeconds">{getPauseDurationInSeconds()}</div>
      <div data-testid="switchingMode">{settings.switchingMode}</div>
      <div data-testid="refreshEnabled">{settings.refreshEnabled ? 'true' : 'false'}</div>
      <div data-testid="refreshStrategy">{settings.refreshStrategy}</div>
      <button data-testid="enableBtn" onClick={() => updateSetting('enabled', true)}>
        Enable
      </button>
      <button data-testid="disableBtn" onClick={() => updateSetting('enabled', false)}>
        Disable
      </button>
      <button data-testid="setDelayBtn" onClick={() => setDelayInSeconds(120)}>
        Set Delay 120s
      </button>
      <button data-testid="setPauseBtn" onClick={() => setPauseDurationInSeconds(60)}>
        Set Pause 60s
      </button>
      <button
        data-testid="updateMultiBtn"
        onClick={() => updateSettings({ switchingMode: 'window', pauseOnActivity: true })}
      >
        Update Multiple
      </button>
      <button
        data-testid="updateRefreshBtn"
        onClick={() => updateSettings({ refreshEnabled: true, refreshStrategy: 'preemptive' })}
      >
        Update Refresh
      </button>
    </div>
  );
}

describe('SettingsContext', () => {
  beforeEach(() => {
    resetMockStorage();
  });

  describe('Provider initialization', () => {
    it('should load default settings when storage is empty', async () => {
      render(
        <SettingsProvider>
          <TestConsumer />
        </SettingsProvider>
      );

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
      });

      // Check default values
      expect(screen.getByTestId('enabled')).toHaveTextContent('false');
      expect(screen.getByTestId('delayTime')).toHaveTextContent('60000');
      expect(screen.getByTestId('delaySeconds')).toHaveTextContent('60');
      expect(screen.getByTestId('switchingMode')).toHaveTextContent('global');
    });

    it('should load settings from storage', async () => {
      resetMockStorage({
        delayTime: 30000,
        enabled: true,
        switchingMode: 'window',
        pauseOnActivity: true,
        pauseDuration: 15000,
      });

      render(
        <SettingsProvider>
          <TestConsumer />
        </SettingsProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
      });

      expect(screen.getByTestId('enabled')).toHaveTextContent('true');
      expect(screen.getByTestId('delayTime')).toHaveTextContent('30000');
      expect(screen.getByTestId('delaySeconds')).toHaveTextContent('30');
      expect(screen.getByTestId('switchingMode')).toHaveTextContent('window');
    });

    it('should load nested refresh settings', async () => {
      resetMockStorage({
        refreshSettings: {
          enabled: true,
          strategy: 'preemptive',
          preloadTime: 5000,
        },
      });

      render(
        <SettingsProvider>
          <TestConsumer />
        </SettingsProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
      });

      expect(screen.getByTestId('refreshEnabled')).toHaveTextContent('true');
      expect(screen.getByTestId('refreshStrategy')).toHaveTextContent('preemptive');
    });
  });

  describe('updateSetting', () => {
    it('should update a single setting', async () => {
      render(
        <SettingsProvider>
          <TestConsumer />
        </SettingsProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
      });

      expect(screen.getByTestId('enabled')).toHaveTextContent('false');

      await act(async () => {
        screen.getByTestId('enableBtn').click();
      });

      expect(screen.getByTestId('enabled')).toHaveTextContent('true');
      expect(getMockStorage().enabled).toBe(true);
    });

    it('should update nested refresh settings', async () => {
      render(
        <SettingsProvider>
          <TestConsumer />
        </SettingsProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
      });

      await act(async () => {
        screen.getByTestId('updateRefreshBtn').click();
      });

      expect(screen.getByTestId('refreshEnabled')).toHaveTextContent('true');
      expect(screen.getByTestId('refreshStrategy')).toHaveTextContent('preemptive');

      const storage = getMockStorage();
      expect(storage.refreshSettings?.enabled).toBe(true);
      expect(storage.refreshSettings?.strategy).toBe('preemptive');
    });
  });

  describe('updateSettings (batch)', () => {
    it('should update multiple settings at once', async () => {
      render(
        <SettingsProvider>
          <TestConsumer />
        </SettingsProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
      });

      await act(async () => {
        screen.getByTestId('updateMultiBtn').click();
      });

      expect(screen.getByTestId('switchingMode')).toHaveTextContent('window');
    });
  });

  describe('Time conversion helpers', () => {
    it('should convert delay time between ms and seconds', async () => {
      resetMockStorage({ delayTime: 90000 });

      render(
        <SettingsProvider>
          <TestConsumer />
        </SettingsProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
      });

      expect(screen.getByTestId('delayTime')).toHaveTextContent('90000');
      expect(screen.getByTestId('delaySeconds')).toHaveTextContent('90');
    });

    it('should set delay in seconds (converts to ms)', async () => {
      render(
        <SettingsProvider>
          <TestConsumer />
        </SettingsProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
      });

      await act(async () => {
        screen.getByTestId('setDelayBtn').click();
      });

      expect(screen.getByTestId('delayTime')).toHaveTextContent('120000');
      expect(screen.getByTestId('delaySeconds')).toHaveTextContent('120');
      expect(getMockStorage().delayTime).toBe(120000);
    });

    it('should set pause duration in seconds (converts to ms)', async () => {
      render(
        <SettingsProvider>
          <TestConsumer />
        </SettingsProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
      });

      await act(async () => {
        screen.getByTestId('setPauseBtn').click();
      });

      expect(screen.getByTestId('pauseDuration')).toHaveTextContent('60000');
      expect(screen.getByTestId('pauseSeconds')).toHaveTextContent('60');
      expect(getMockStorage().pauseDuration).toBe(60000);
    });
  });

  describe('Storage change listener', () => {
    it('should update state when storage changes externally', async () => {
      render(
        <SettingsProvider>
          <TestConsumer />
        </SettingsProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
      });

      expect(screen.getByTestId('enabled')).toHaveTextContent('false');

      // Simulate external storage change
      await act(async () => {
        await chrome.storage.local.set({ enabled: true });
      });

      expect(screen.getByTestId('enabled')).toHaveTextContent('true');
    });

    it('should handle refresh settings changes', async () => {
      render(
        <SettingsProvider>
          <TestConsumer />
        </SettingsProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
      });

      expect(screen.getByTestId('refreshEnabled')).toHaveTextContent('false');

      // Simulate external storage change
      await act(async () => {
        await chrome.storage.local.set({
          refreshSettings: { enabled: true, strategy: 'hybrid' },
        });
      });

      expect(screen.getByTestId('refreshEnabled')).toHaveTextContent('true');
      expect(screen.getByTestId('refreshStrategy')).toHaveTextContent('hybrid');
    });
  });

  describe('useSettings hook', () => {
    it('should throw error when used outside provider', () => {
      // Suppress error output for this test
      const originalError = console.error;
      console.error = jest.fn();

      expect(() => {
        render(<TestConsumer />);
      }).toThrow('useSettings must be used within a SettingsProvider');

      console.error = originalError;
    });
  });
});
