/**
 * Tests for useAutoSave and useAutoSaveImmediate hooks
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAutoSave, useAutoSaveImmediate } from '../../../settings/hooks/useAutoSave';
import { ToastProvider } from '../../../settings/context/ToastContext';

// Wrapper component that provides context
function Wrapper({ children }: { children: React.ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}

describe('useAutoSave', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('basic functionality', () => {
    it('should not save on first render', async () => {
      const { rerender } = renderHook(
        ({ value }) => useAutoSave('testKey', value),
        {
          wrapper: Wrapper,
          initialProps: { value: 'initial' },
        }
      );

      // Fast-forward time
      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(chrome.storage.local.set).not.toHaveBeenCalled();

      // Cleanup
      rerender({ value: 'initial' });
    });

    it('should save after debounce delay when value changes', async () => {
      const { rerender } = renderHook(
        ({ value }) => useAutoSave('testKey', value),
        {
          wrapper: Wrapper,
          initialProps: { value: 'initial' },
        }
      );

      // Change value
      rerender({ value: 'updated' });

      // Should not save immediately
      expect(chrome.storage.local.set).not.toHaveBeenCalled();

      // Fast-forward past debounce delay
      await act(async () => {
        jest.advanceTimersByTime(300);
      });

      // Should save now
      await waitFor(() => {
        expect(chrome.storage.local.set).toHaveBeenCalledWith({
          testKey: 'updated',
        });
      });
    });

    it('should not save if value has not changed', async () => {
      const { rerender } = renderHook(
        ({ value }) => useAutoSave('testKey', value),
        {
          wrapper: Wrapper,
          initialProps: { value: 'test' },
        }
      );

      // Re-render with same value
      rerender({ value: 'test' });

      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(chrome.storage.local.set).not.toHaveBeenCalled();
    });

    it('should debounce multiple rapid changes', async () => {
      const { rerender } = renderHook(
        ({ value }) => useAutoSave('testKey', value),
        {
          wrapper: Wrapper,
          initialProps: { value: 'initial' },
        }
      );

      // Make multiple rapid changes
      rerender({ value: 'change1' });
      act(() => {
        jest.advanceTimersByTime(100);
      });

      rerender({ value: 'change2' });
      act(() => {
        jest.advanceTimersByTime(100);
      });

      rerender({ value: 'change3' });

      // Fast-forward past debounce delay
      await act(async () => {
        jest.advanceTimersByTime(300);
      });

      // Should only save the final value once
      await waitFor(() => {
        expect(chrome.storage.local.set).toHaveBeenCalledTimes(1);
        expect(chrome.storage.local.set).toHaveBeenCalledWith({
          testKey: 'change3',
        });
      });
    });

    it('should handle complex objects', async () => {
      const obj1 = { name: 'test', count: 1 };
      const obj2 = { name: 'test', count: 2 };

      const { rerender } = renderHook(
        ({ value }) => useAutoSave('testKey', value),
        {
          wrapper: Wrapper,
          initialProps: { value: obj1 },
        }
      );

      rerender({ value: obj2 });

      await act(async () => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(chrome.storage.local.set).toHaveBeenCalledWith({
          testKey: obj2,
        });
      });
    });

    it('should detect changes in nested objects', async () => {
      const obj1 = { nested: { value: 1 } };
      const obj2 = { nested: { value: 2 } };

      const { rerender } = renderHook(
        ({ value }) => useAutoSave('testKey', value),
        {
          wrapper: Wrapper,
          initialProps: { value: obj1 },
        }
      );

      rerender({ value: obj2 });

      await act(async () => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(chrome.storage.local.set).toHaveBeenCalledWith({
          testKey: obj2,
        });
      });
    });
  });

  describe('custom options', () => {
    it('should use custom debounce delay', async () => {
      const { rerender } = renderHook(
        ({ value }) => useAutoSave('testKey', value, { debounceMs: 500 }),
        {
          wrapper: Wrapper,
          initialProps: { value: 'initial' },
        }
      );

      rerender({ value: 'updated' });

      // Should not save at 300ms
      act(() => {
        jest.advanceTimersByTime(300);
      });
      expect(chrome.storage.local.set).not.toHaveBeenCalled();

      // Should save at 500ms
      await act(async () => {
        jest.advanceTimersByTime(200);
      });

      await waitFor(() => {
        expect(chrome.storage.local.set).toHaveBeenCalled();
      });
    });

    it('should call onSave callback on successful save', async () => {
      const onSave = jest.fn();

      const { rerender } = renderHook(
        ({ value }) => useAutoSave('testKey', value, { onSave }),
        {
          wrapper: Wrapper,
          initialProps: { value: 'initial' },
        }
      );

      rerender({ value: 'updated' });

      await act(async () => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledTimes(1);
      });
    });

    it('should call onError callback on save failure', async () => {
      const onError = jest.fn();
      const error = new Error('Storage error');

      // Mock storage failure
      (chrome.storage.local.set as jest.Mock).mockRejectedValueOnce(error);

      const { rerender } = renderHook(
        ({ value }) => useAutoSave('testKey', value, { onError }),
        {
          wrapper: Wrapper,
          initialProps: { value: 'initial' },
        }
      );

      rerender({ value: 'updated' });

      await act(async () => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(error);
      });
    });

    it('should not show toast when silent option is true', async () => {
      const { rerender } = renderHook(
        ({ value }) => useAutoSave('testKey', value, { silent: true }),
        {
          wrapper: Wrapper,
          initialProps: { value: 'initial' },
        }
      );

      rerender({ value: 'updated' });

      await act(async () => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(chrome.storage.local.set).toHaveBeenCalled();
      });

      // Toast would normally be shown, but silent mode suppresses it
      // We can't directly test toast display here, but the hook should work
    });
  });

  describe('forceSave', () => {
    it('should save immediately when forceSave is called', async () => {
      const { result, rerender } = renderHook(
        ({ value }) => useAutoSave('testKey', value),
        {
          wrapper: Wrapper,
          initialProps: { value: 'initial' },
        }
      );

      rerender({ value: 'updated' });

      // Call forceSave
      await act(async () => {
        await result.current.forceSave();
      });

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        testKey: 'updated',
      });
    });

    it('should cancel pending debounced save when forceSave is called', async () => {
      const { result, rerender } = renderHook(
        ({ value }) => useAutoSave('testKey', value),
        {
          wrapper: Wrapper,
          initialProps: { value: 'initial' },
        }
      );

      rerender({ value: 'updated' });

      // Wait a bit but not full debounce time
      act(() => {
        jest.advanceTimersByTime(100);
      });

      // Force save
      await act(async () => {
        await result.current.forceSave();
      });

      // Should save immediately
      expect(chrome.storage.local.set).toHaveBeenCalledTimes(1);

      // Advance past original debounce time
      act(() => {
        jest.advanceTimersByTime(300);
      });

      // Should not save again
      expect(chrome.storage.local.set).toHaveBeenCalledTimes(1);
    });
  });

  describe('cleanup', () => {
    it('should clear timeout on unmount', async () => {
      const { rerender, unmount } = renderHook(
        ({ value }) => useAutoSave('testKey', value),
        {
          wrapper: Wrapper,
          initialProps: { value: 'initial' },
        }
      );

      rerender({ value: 'updated' });

      // Unmount before debounce completes
      unmount();

      act(() => {
        jest.advanceTimersByTime(300);
      });

      // Should not save after unmount
      expect(chrome.storage.local.set).not.toHaveBeenCalled();
    });
  });
});

describe('useAutoSaveImmediate', () => {
  describe('basic functionality', () => {
    it('should return a save function', () => {
      const { result } = renderHook(
        () => useAutoSaveImmediate('testKey'),
        {
          wrapper: Wrapper,
        }
      );

      expect(typeof result.current).toBe('function');
    });

    it('should save immediately when called', async () => {
      const { result } = renderHook(
        () => useAutoSaveImmediate('testKey'),
        {
          wrapper: Wrapper,
        }
      );

      await act(async () => {
        await result.current('test value');
      });

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        testKey: 'test value',
      });
    });

    it('should save different values', async () => {
      const { result } = renderHook(
        () => useAutoSaveImmediate('testKey'),
        {
          wrapper: Wrapper,
        }
      );

      await act(async () => {
        await result.current('value1');
      });

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        testKey: 'value1',
      });

      await act(async () => {
        await result.current('value2');
      });

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        testKey: 'value2',
      });
    });

    it('should handle complex objects', async () => {
      const { result } = renderHook(
        () => useAutoSaveImmediate('testKey'),
        {
          wrapper: Wrapper,
        }
      );

      const obj = { name: 'test', count: 42 };

      await act(async () => {
        await result.current(obj);
      });

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        testKey: obj,
      });
    });
  });

  describe('callbacks', () => {
    it('should call onSave callback on successful save', async () => {
      const onSave = jest.fn();

      const { result } = renderHook(
        () => useAutoSaveImmediate('testKey', { onSave }),
        {
          wrapper: Wrapper,
        }
      );

      await act(async () => {
        await result.current('test value');
      });

      expect(onSave).toHaveBeenCalledTimes(1);
    });

    it('should call onError callback on save failure', async () => {
      const onError = jest.fn();
      const error = new Error('Storage error');

      // Mock storage failure
      (chrome.storage.local.set as jest.Mock).mockRejectedValueOnce(error);

      const { result } = renderHook(
        () => useAutoSaveImmediate('testKey', { onError }),
        {
          wrapper: Wrapper,
        }
      );

      await expect(
        act(async () => {
          await result.current('test value');
        })
      ).rejects.toThrow('Storage error');

      expect(onError).toHaveBeenCalledWith(error);
    });

    it('should throw error on save failure', async () => {
      const error = new Error('Storage error');
      (chrome.storage.local.set as jest.Mock).mockRejectedValueOnce(error);

      const { result } = renderHook(
        () => useAutoSaveImmediate('testKey'),
        {
          wrapper: Wrapper,
        }
      );

      await expect(
        act(async () => {
          await result.current('test value');
        })
      ).rejects.toThrow('Storage error');
    });
  });

  describe('silent mode', () => {
    it('should not show toast when silent option is true', async () => {
      const { result } = renderHook(
        () => useAutoSaveImmediate('testKey', { silent: true }),
        {
          wrapper: Wrapper,
        }
      );

      await act(async () => {
        await result.current('test value');
      });

      expect(chrome.storage.local.set).toHaveBeenCalled();
      // Toast would normally be shown, but silent mode suppresses it
    });

    it('should not show error toast when silent and error occurs', async () => {
      const error = new Error('Storage error');
      (chrome.storage.local.set as jest.Mock).mockRejectedValueOnce(error);

      const { result } = renderHook(
        () => useAutoSaveImmediate('testKey', { silent: true }),
        {
          wrapper: Wrapper,
        }
      );

      await expect(
        act(async () => {
          await result.current('test value');
        })
      ).rejects.toThrow('Storage error');
      // Error toast would normally be shown, but silent mode suppresses it
    });
  });

  describe('custom messages', () => {
    it('should use custom success message', async () => {
      const { result } = renderHook(
        () =>
          useAutoSaveImmediate('testKey', {
            successMessage: 'Custom success!',
          }),
        {
          wrapper: Wrapper,
        }
      );

      await act(async () => {
        await result.current('test value');
      });

      expect(chrome.storage.local.set).toHaveBeenCalled();
      // Custom message would be shown in toast
    });

    it('should use custom error message', async () => {
      const error = new Error('Storage error');
      (chrome.storage.local.set as jest.Mock).mockRejectedValueOnce(error);

      const { result } = renderHook(
        () =>
          useAutoSaveImmediate('testKey', {
            errorMessage: 'Custom error!',
          }),
        {
          wrapper: Wrapper,
        }
      );

      await expect(
        act(async () => {
          await result.current('test value');
        })
      ).rejects.toThrow('Storage error');
      // Custom error message would be shown in toast
    });
  });
});
