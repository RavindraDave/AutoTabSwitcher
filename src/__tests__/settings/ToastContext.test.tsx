/**
 * Tests for ToastContext
 */

import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { ToastProvider, useToast } from '../../settings/context/ToastContext';

// Test component to access context
function TestConsumer() {
  const { toasts, showToast, removeToast } = useToast();

  return (
    <div>
      <div data-testid="toast-count">{toasts.length}</div>
      <ul data-testid="toast-list">
        {toasts.map((toast) => (
          <li key={toast.id} data-testid={`toast-${toast.id}`}>
            <span data-testid={`toast-message-${toast.id}`}>{toast.message}</span>
            <span data-testid={`toast-type-${toast.id}`}>{toast.type}</span>
            <button
              data-testid={`remove-${toast.id}`}
              onClick={() => removeToast(toast.id)}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
      <button
        data-testid="showSuccessBtn"
        onClick={() => showToast('Success message', 'success')}
      >
        Show Success
      </button>
      <button
        data-testid="showErrorBtn"
        onClick={() => showToast('Error message', 'error')}
      >
        Show Error
      </button>
      <button
        data-testid="showWarningBtn"
        onClick={() => showToast('Warning message', 'warning')}
      >
        Show Warning
      </button>
      <button
        data-testid="showInfoBtn"
        onClick={() => showToast('Info message', 'info')}
      >
        Show Info
      </button>
      <button
        data-testid="showDefaultBtn"
        onClick={() => showToast('Default message')}
      >
        Show Default
      </button>
      <button
        data-testid="showCustomDurationBtn"
        onClick={() => showToast('Custom duration', 'info', 5000)}
      >
        Show Custom Duration
      </button>
    </div>
  );
}

describe('ToastContext', () => {
  describe('Provider initialization', () => {
    it('should start with no toasts', () => {
      render(
        <ToastProvider>
          <TestConsumer />
        </ToastProvider>
      );

      expect(screen.getByTestId('toast-count')).toHaveTextContent('0');
    });
  });

  describe('showToast', () => {
    it('should add a success toast', () => {
      render(
        <ToastProvider>
          <TestConsumer />
        </ToastProvider>
      );

      act(() => {
        screen.getByTestId('showSuccessBtn').click();
      });

      expect(screen.getByTestId('toast-count')).toHaveTextContent('1');
      expect(screen.getByText('Success message')).toBeInTheDocument();
    });

    it('should add an error toast', () => {
      render(
        <ToastProvider>
          <TestConsumer />
        </ToastProvider>
      );

      act(() => {
        screen.getByTestId('showErrorBtn').click();
      });

      expect(screen.getByText('Error message')).toBeInTheDocument();
    });

    it('should add a warning toast', () => {
      render(
        <ToastProvider>
          <TestConsumer />
        </ToastProvider>
      );

      act(() => {
        screen.getByTestId('showWarningBtn').click();
      });

      expect(screen.getByText('Warning message')).toBeInTheDocument();
    });

    it('should add an info toast', () => {
      render(
        <ToastProvider>
          <TestConsumer />
        </ToastProvider>
      );

      act(() => {
        screen.getByTestId('showInfoBtn').click();
      });

      expect(screen.getByText('Info message')).toBeInTheDocument();
    });

    it('should default to success type', () => {
      render(
        <ToastProvider>
          <TestConsumer />
        </ToastProvider>
      );

      act(() => {
        screen.getByTestId('showDefaultBtn').click();
      });

      const toasts = screen.getAllByTestId(/toast-type/);
      expect(toasts[0]).toHaveTextContent('success');
    });

    it('should support multiple toasts', () => {
      render(
        <ToastProvider>
          <TestConsumer />
        </ToastProvider>
      );

      act(() => {
        screen.getByTestId('showSuccessBtn').click();
        screen.getByTestId('showErrorBtn').click();
        screen.getByTestId('showInfoBtn').click();
      });

      expect(screen.getByTestId('toast-count')).toHaveTextContent('3');
    });

    it('should generate unique IDs for each toast', () => {
      render(
        <ToastProvider>
          <TestConsumer />
        </ToastProvider>
      );

      act(() => {
        screen.getByTestId('showSuccessBtn').click();
        screen.getByTestId('showSuccessBtn').click();
      });

      const toasts = screen.getAllByTestId(/^toast-toast-/);
      const ids = toasts.map((t) => t.getAttribute('data-testid'));
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  describe('removeToast', () => {
    it('should remove a toast', () => {
      render(
        <ToastProvider>
          <TestConsumer />
        </ToastProvider>
      );

      act(() => {
        screen.getByTestId('showSuccessBtn').click();
      });

      expect(screen.getByTestId('toast-count')).toHaveTextContent('1');

      const removeButton = screen.getByText('Remove');
      act(() => {
        removeButton.click();
      });

      expect(screen.getByTestId('toast-count')).toHaveTextContent('0');
    });

    it('should only remove the specified toast', () => {
      render(
        <ToastProvider>
          <TestConsumer />
        </ToastProvider>
      );

      act(() => {
        screen.getByTestId('showSuccessBtn').click();
        screen.getByTestId('showErrorBtn').click();
      });

      expect(screen.getByTestId('toast-count')).toHaveTextContent('2');

      const removeButtons = screen.getAllByText('Remove');
      act(() => {
        removeButtons[0].click();
      });

      expect(screen.getByTestId('toast-count')).toHaveTextContent('1');
      expect(screen.getByText('Error message')).toBeInTheDocument();
    });
  });

  describe('useToast hook', () => {
    it('should throw error when used outside provider', () => {
      // Suppress error output for this test
      const originalError = console.error;
      console.error = jest.fn();

      expect(() => {
        render(<TestConsumer />);
      }).toThrow('useToast must be used within a ToastProvider');

      console.error = originalError;
    });
  });
});
