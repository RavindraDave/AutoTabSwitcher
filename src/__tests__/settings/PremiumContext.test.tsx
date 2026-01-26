/**
 * Tests for PremiumContext
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { PremiumProvider, usePremium } from '../../settings/context/PremiumContext';
import { resetMockStorage, getMockStorage } from './setup';

// Test component to access context
function TestConsumer() {
  const {
    isPremium,
    isLoading,
    licenseKey,
    activateLicense,
    deactivateLicense,
  } = usePremium();

  return (
    <div>
      <div data-testid="loading">{isLoading ? 'loading' : 'loaded'}</div>
      <div data-testid="isPremium">{isPremium ? 'true' : 'false'}</div>
      <div data-testid="licenseKey">{licenseKey || 'null'}</div>
      <button
        data-testid="activateBtn"
        onClick={async () => {
          const result = await activateLicense('ABCD-1234-EFGH-5678');
          (document.querySelector('[data-testid="activateResult"]') as HTMLElement).textContent =
            result ? 'success' : 'failed';
        }}
      >
        Activate
      </button>
      <button
        data-testid="activateEmptyBtn"
        onClick={async () => {
          const result = await activateLicense('');
          (document.querySelector('[data-testid="activateResult"]') as HTMLElement).textContent =
            result ? 'success' : 'failed';
        }}
      >
        Activate Empty
      </button>
      <button data-testid="deactivateBtn" onClick={() => deactivateLicense()}>
        Deactivate
      </button>
      <div data-testid="activateResult" />
    </div>
  );
}

describe('PremiumContext', () => {
  beforeEach(() => {
    resetMockStorage();
    // Reset PREMIUM_FEATURES_AVAILABLE to true for most tests
    (window as any).PREMIUM_FEATURES_AVAILABLE = true;
  });

  describe('Provider initialization', () => {
    it('should load non-premium status when storage is empty', async () => {
      render(
        <PremiumProvider>
          <TestConsumer />
        </PremiumProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
      });

      expect(screen.getByTestId('isPremium')).toHaveTextContent('false');
      expect(screen.getByTestId('licenseKey')).toHaveTextContent('null');
    });

    it('should load premium status from storage', async () => {
      resetMockStorage({
        premiumEnabled: true,
        licenseKey: 'TEST-KEY-1234',
      });

      render(
        <PremiumProvider>
          <TestConsumer />
        </PremiumProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
      });

      expect(screen.getByTestId('isPremium')).toHaveTextContent('true');
      expect(screen.getByTestId('licenseKey')).toHaveTextContent('TEST-KEY-1234');
    });
  });

  describe('activateLicense', () => {
    it('should activate license with valid key', async () => {
      render(
        <PremiumProvider>
          <TestConsumer />
        </PremiumProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
      });

      expect(screen.getByTestId('isPremium')).toHaveTextContent('false');

      await act(async () => {
        screen.getByTestId('activateBtn').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('activateResult')).toHaveTextContent('success');
      });

      expect(screen.getByTestId('isPremium')).toHaveTextContent('true');
      expect(screen.getByTestId('licenseKey')).toHaveTextContent('ABCD-1234-EFGH-5678');

      const storage = getMockStorage();
      expect(storage.premiumEnabled).toBe(true);
      expect(storage.licenseKey).toBe('ABCD-1234-EFGH-5678');
    });

    it('should reject empty license key', async () => {
      render(
        <PremiumProvider>
          <TestConsumer />
        </PremiumProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
      });

      await act(async () => {
        screen.getByTestId('activateEmptyBtn').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('activateResult')).toHaveTextContent('failed');
      });

      expect(screen.getByTestId('isPremium')).toHaveTextContent('false');
    });
  });

  describe('deactivateLicense', () => {
    it('should deactivate license', async () => {
      resetMockStorage({
        premiumEnabled: true,
        licenseKey: 'TEST-KEY-1234',
      });

      render(
        <PremiumProvider>
          <TestConsumer />
        </PremiumProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
      });

      expect(screen.getByTestId('isPremium')).toHaveTextContent('true');

      await act(async () => {
        screen.getByTestId('deactivateBtn').click();
      });

      expect(screen.getByTestId('isPremium')).toHaveTextContent('false');
      expect(screen.getByTestId('licenseKey')).toHaveTextContent('null');

      const storage = getMockStorage();
      expect(storage.premiumEnabled).toBe(false);
      expect(storage.licenseKey).toBe(null);
    });
  });

  describe('Storage change listener', () => {
    it('should update state when storage changes externally', async () => {
      render(
        <PremiumProvider>
          <TestConsumer />
        </PremiumProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
      });

      expect(screen.getByTestId('isPremium')).toHaveTextContent('false');

      // Simulate external storage change
      await act(async () => {
        await chrome.storage.local.set({
          premiumEnabled: true,
          licenseKey: 'EXTERNAL-KEY',
        });
      });

      expect(screen.getByTestId('isPremium')).toHaveTextContent('true');
      expect(screen.getByTestId('licenseKey')).toHaveTextContent('EXTERNAL-KEY');
    });
  });

  describe('usePremium hook', () => {
    it('should throw error when used outside provider', () => {
      // Suppress error output for this test
      const originalError = console.error;
      console.error = jest.fn();

      expect(() => {
        render(<TestConsumer />);
      }).toThrow('usePremium must be used within a PremiumProvider');

      console.error = originalError;
    });
  });
});
