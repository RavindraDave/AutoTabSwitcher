/**
 * Tests for useStorage and useStorageMultiple hooks
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useStorage, useStorageMultiple } from '../../../settings/hooks/useStorage';
import { resetMockStorage } from '../setup';

// Helper to flush pending promises and effects
async function flushPromises() {
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 0));
  });
}

describe('useStorage', () => {
  beforeEach(() => {
    // Ensure mock storage is empty before each test
    resetMockStorage({});
  });

  describe('initialization', () => {
    it('should initialize with default value', () => {
      const { result } = renderHook(() => useStorage('testKey', 'default'));

      expect(result.current[0]).toBe('default');
      expect(result.current[2]).toBe(true); // isLoading
    });

    it('should load value from storage on mount', async () => {
      resetMockStorage({
        testKey: 'stored value',
      });

      const { result } = renderHook(() => useStorage('testKey', 'default'));

      await flushPromises();

      await waitFor(() => {
        expect(result.current[0]).toBe('stored value');
        expect(result.current[2]).toBe(false); // isLoading
      });
    });

    it('should use default value if storage is empty', async () => {
      resetMockStorage({});

      const { result } = renderHook(() => useStorage('testKey', 'default'));

      await flushPromises();

      await waitFor(() => {
        expect(result.current[0]).toBe('default');
        expect(result.current[2]).toBe(false); // isLoading
      });
    });

    it('should handle undefined values in storage', async () => {
      resetMockStorage({
        testKey: undefined,
      });

      const { result } = renderHook(() => useStorage('testKey', 'default'));

      await flushPromises();

      await waitFor(() => {
        expect(result.current[0]).toBe('default');
        expect(result.current[2]).toBe(false);
      });
    });

    it('should handle null values in storage', async () => {
      resetMockStorage({
        testKey: null,
      });

      const { result } = renderHook(() => useStorage('testKey', 'default'));

      await flushPromises();

      await waitFor(() => {
        expect(result.current[0]).toBe(null);
        expect(result.current[2]).toBe(false);
      });
    });

    it('should handle storage load error gracefully', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      (chrome.storage.local.get as jest.Mock).mockRejectedValueOnce(
        new Error('Storage error')
      );

      const { result } = renderHook(() => useStorage('testKey', 'default'));

      await flushPromises();

      await waitFor(() => {
        expect(result.current[0]).toBe('default');
        expect(result.current[2]).toBe(false); // isLoading set to false even on error
      });

      expect(consoleError).toHaveBeenCalled();
      consoleError.mockRestore();
    });

    it('should handle different data types', async () => {
      const objectValue = { name: 'test', count: 42 };
      resetMockStorage({
        testKey: objectValue,
      });

      const { result } = renderHook(() =>
        useStorage('testKey', { name: '', count: 0 })
      );

      await flushPromises();

      await waitFor(() => {
        expect(result.current[0]).toEqual(objectValue);
      });
    });

    it('should handle arrays', async () => {
      const arrayValue = [1, 2, 3, 4, 5];
      resetMockStorage({
        testKey: arrayValue,
      });

      const { result } = renderHook(() => useStorage('testKey', [] as number[]));

      await flushPromises();

      await waitFor(() => {
        expect(result.current[0]).toEqual(arrayValue);
      });
    });

    it('should handle boolean values', async () => {
      resetMockStorage({
        testKey: true,
      });

      const { result } = renderHook(() => useStorage('testKey', false));

      await flushPromises();

      await waitFor(() => {
        expect(result.current[0]).toBe(true);
      });
    });

    it('should handle number values', async () => {
      resetMockStorage({
        testKey: 42,
      });

      const { result } = renderHook(() => useStorage('testKey', 0));

      await flushPromises();

      await waitFor(() => {
        expect(result.current[0]).toBe(42);
      });
    });
  });

  describe('setStorageValue', () => {
    it('should update value and save to storage', async () => {
      resetMockStorage({});

      const { result } = renderHook(() => useStorage('testKey', 'default'));

      await flushPromises();

      await waitFor(() => {
        expect(result.current[2]).toBe(false); // isLoading
      });

      await act(async () => {
        await result.current[1]('new value');
      });

      expect(result.current[0]).toBe('new value');
      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        testKey: 'new value',
      });
    });

    it('should update local state immediately', async () => {
      resetMockStorage({});

      const { result } = renderHook(() => useStorage('testKey', 'default'));

      await flushPromises();

      await waitFor(() => {
        expect(result.current[2]).toBe(false);
      });

      await act(async () => {
        await result.current[1]('updated');
      });

      expect(result.current[0]).toBe('updated');
    });

    it('should handle storage save error', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      const error = new Error('Storage error');

      resetMockStorage({});
      (chrome.storage.local.set as jest.Mock).mockRejectedValueOnce(error);

      const { result } = renderHook(() => useStorage('testKey', 'default'));

      await flushPromises();

      await waitFor(() => {
        expect(result.current[2]).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current[1]('new value');
        })
      ).rejects.toThrow('Storage error');

      expect(consoleError).toHaveBeenCalled();
      consoleError.mockRestore();
    });

    it('should handle object updates', async () => {
      resetMockStorage({});

      const { result } = renderHook(() =>
        useStorage('testKey', { name: '', count: 0 })
      );

      await flushPromises();

      await waitFor(() => {
        expect(result.current[2]).toBe(false);
      });

      const newValue = { name: 'test', count: 42 };

      await act(async () => {
        await result.current[1](newValue);
      });

      expect(result.current[0]).toEqual(newValue);
      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        testKey: newValue,
      });
    });

    it('should handle array updates', async () => {
      resetMockStorage({});

      const { result } = renderHook(() => useStorage('testKey', [] as number[]));

      await flushPromises();

      await waitFor(() => {
        expect(result.current[2]).toBe(false);
      });

      const newValue = [1, 2, 3];

      await act(async () => {
        await result.current[1](newValue);
      });

      expect(result.current[0]).toEqual(newValue);
    });
  });

  describe('storage change listener', () => {
    it('should update value when storage changes from other sources', async () => {
      resetMockStorage({
        testKey: 'initial',
      });

      const { result } = renderHook(() => useStorage('testKey', 'default'));

      await flushPromises();

      await waitFor(() => {
        expect(result.current[0]).toBe('initial');
      });

      // Simulate storage change from another part of the extension
      const listeners = (chrome.storage.onChanged.addListener as jest.Mock).mock
        .calls;
      const listener = listeners[listeners.length - 1][0];

      act(() => {
        listener(
          {
            testKey: {
              oldValue: 'initial',
              newValue: 'updated from elsewhere',
            },
          },
          'local'
        );
      });

      expect(result.current[0]).toBe('updated from elsewhere');
    });

    it('should ignore changes from other storage areas', async () => {
      resetMockStorage({
        testKey: 'initial',
      });

      const { result } = renderHook(() => useStorage('testKey', 'default'));

      await flushPromises();

      await waitFor(() => {
        expect(result.current[0]).toBe('initial');
      });

      const listeners = (chrome.storage.onChanged.addListener as jest.Mock).mock
        .calls;
      const listener = listeners[listeners.length - 1][0];

      act(() => {
        listener(
          {
            testKey: {
              oldValue: 'initial',
              newValue: 'should be ignored',
            },
          },
          'sync' // Different area
        );
      });

      expect(result.current[0]).toBe('initial'); // Should not change
    });

    it('should ignore changes to other keys', async () => {
      resetMockStorage({
        testKey: 'initial',
      });

      const { result } = renderHook(() => useStorage('testKey', 'default'));

      await flushPromises();

      await waitFor(() => {
        expect(result.current[0]).toBe('initial');
      });

      const listeners = (chrome.storage.onChanged.addListener as jest.Mock).mock
        .calls;
      const listener = listeners[listeners.length - 1][0];

      act(() => {
        listener(
          {
            otherKey: {
              oldValue: 'old',
              newValue: 'new',
            },
          },
          'local'
        );
      });

      expect(result.current[0]).toBe('initial'); // Should not change
    });

    it('should remove listener on unmount', async () => {
      resetMockStorage({});

      const { unmount } = renderHook(() => useStorage('testKey', 'default'));

      await flushPromises();

      await waitFor(() => {
        expect(chrome.storage.onChanged.addListener).toHaveBeenCalled();
      });

      unmount();

      expect(chrome.storage.onChanged.removeListener).toHaveBeenCalled();
    });
  });

  describe('multiple instances', () => {
    it('should handle multiple instances of the same key', async () => {
      resetMockStorage({
        testKey: 'initial',
      });

      const { result: result1 } = renderHook(() =>
        useStorage('testKey', 'default')
      );
      const { result: result2 } = renderHook(() =>
        useStorage('testKey', 'default')
      );

      await flushPromises();

      await waitFor(() => {
        expect(result1.current[0]).toBe('initial');
        expect(result2.current[0]).toBe('initial');
      });

      // Update from first instance
      await act(async () => {
        await result1.current[1]('updated');
      });

      // Both should update due to storage change listener
      await waitFor(() => {
        expect(result1.current[0]).toBe('updated');
        expect(result2.current[0]).toBe('updated');
      });
    });
  });
});

describe('useStorageMultiple', () => {
  describe('initialization', () => {
    it('should initialize with default values', () => {
      const defaults = { key1: 'value1', key2: 'value2' };

      const { result } = renderHook(() =>
        useStorageMultiple(['key1', 'key2'], defaults)
      );

      expect(result.current[0]).toEqual(defaults);
      expect(result.current[2]).toBe(true); // isLoading
    });

    it('should load values from storage on mount', async () => {
      const defaults = { key1: 'value1', key2: 'value2' };
      const stored = { key1: 'stored1', key2: 'stored2' };

      resetMockStorage(stored);

      const { result } = renderHook(() =>
        useStorageMultiple(['key1', 'key2'], defaults)
      );

      await flushPromises();

      await waitFor(() => {
        expect(result.current[2]).toBe(false); // isLoading
      }, { timeout: 3000 });

      expect(result.current[0]).toEqual(stored);
    });

    it('should use default values for missing keys', async () => {
      const defaults = { key1: 'value1', key2: 'value2', key3: 'value3' };

      resetMockStorage({
        key1: 'stored1',
        // key2 and key3 missing
      });

      const { result } = renderHook(() =>
        useStorageMultiple(['key1', 'key2', 'key3'], defaults)
      );

      await flushPromises();

      await waitFor(() => {
        expect(result.current[2]).toBe(false); // Wait for loading
      }, { timeout: 3000 });

      expect(result.current[0]).toEqual({
        key1: 'stored1',
        key2: 'value2',
        key3: 'value3',
      });
    });

    it('should handle storage load error gracefully', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      const defaults = { key1: 'value1', key2: 'value2' };

      (chrome.storage.local.get as jest.Mock).mockRejectedValueOnce(
        new Error('Storage error')
      );

      const { result } = renderHook(() =>
        useStorageMultiple(['key1', 'key2'], defaults)
      );

      await flushPromises();

      await waitFor(() => {
        expect(result.current[2]).toBe(false);
      }, { timeout: 3000 });

      expect(result.current[0]).toEqual(defaults);
      expect(consoleError).toHaveBeenCalled();
      consoleError.mockRestore();
    });

    it('should handle mixed data types', async () => {
      const defaults = {
        stringKey: 'text',
        numberKey: 0,
        boolKey: false,
        objKey: { nested: 'value' },
        arrayKey: [] as number[],
      };

      const stored = {
        stringKey: 'stored text',
        numberKey: 42,
        boolKey: true,
        objKey: { nested: 'stored' },
        arrayKey: [1, 2, 3],
      };

      resetMockStorage(stored);

      const { result } = renderHook(() =>
        useStorageMultiple(
          ['stringKey', 'numberKey', 'boolKey', 'objKey', 'arrayKey'],
          defaults
        )
      );

      await flushPromises();

      await waitFor(() => {
        expect(result.current[2]).toBe(false); // Wait for loading to complete
      }, { timeout: 3000 });

      expect(result.current[0]).toEqual(stored);
    });
  });

  describe('updateValues', () => {
    it('should update specified values and save to storage', async () => {
      const defaults = { key1: 'value1', key2: 'value2', key3: 'value3' };

      resetMockStorage({});

      const { result } = renderHook(() =>
        useStorageMultiple(['key1', 'key2', 'key3'], defaults)
      );

      await flushPromises();

      await waitFor(() => {
        expect(result.current[2]).toBe(false); // isLoading
      }, { timeout: 3000 });

      const updates = { key1: 'updated1', key2: 'updated2' };

      await act(async () => {
        await result.current[1](updates);
      });

      expect(result.current[0]).toEqual({
        key1: 'updated1',
        key2: 'updated2',
        key3: 'value3', // Unchanged
      });

      expect(chrome.storage.local.set).toHaveBeenCalledWith(updates);
    });

    it('should handle partial updates', async () => {
      const defaults = { key1: 'value1', key2: 'value2' };

      resetMockStorage({});

      const { result } = renderHook(() =>
        useStorageMultiple(['key1', 'key2'], defaults)
      );

      await flushPromises();

      await waitFor(() => {
        expect(result.current[2]).toBe(false);
      }, { timeout: 3000 });

      await act(async () => {
        await result.current[1]({ key1: 'only key1 updated' });
      });

      expect(result.current[0]).toEqual({
        key1: 'only key1 updated',
        key2: 'value2',
      });
    });

    it('should handle storage save error', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      const defaults = { key1: 'value1', key2: 'value2' };
      const error = new Error('Storage error');

      resetMockStorage({});
      (chrome.storage.local.set as jest.Mock).mockRejectedValueOnce(error);

      const { result } = renderHook(() =>
        useStorageMultiple(['key1', 'key2'], defaults)
      );

      await flushPromises();

      await waitFor(() => {
        expect(result.current[2]).toBe(false);
      }, { timeout: 3000 });

      await expect(
        act(async () => {
          await result.current[1]({ key1: 'updated' });
        })
      ).rejects.toThrow('Storage error');

      expect(consoleError).toHaveBeenCalled();
      consoleError.mockRestore();
    });
  });

  describe('storage change listener', () => {
    it('should update values when storage changes', async () => {
      const defaults = { key1: 'value1', key2: 'value2' };

      resetMockStorage({});

      const { result } = renderHook(() =>
        useStorageMultiple(['key1', 'key2'], defaults)
      );

      await flushPromises();

      await waitFor(() => {
        expect(result.current[2]).toBe(false);
      }, { timeout: 3000 });

      expect(result.current[0]).toEqual(defaults);

      const listeners = (chrome.storage.onChanged.addListener as jest.Mock).mock
        .calls;
      const listener = listeners[listeners.length - 1][0];

      act(() => {
        listener(
          {
            key1: { oldValue: 'value1', newValue: 'updated1' },
            key2: { oldValue: 'value2', newValue: 'updated2' },
          },
          'local'
        );
      });

      expect(result.current[0]).toEqual({
        key1: 'updated1',
        key2: 'updated2',
      });
    });

    it('should handle partial changes', async () => {
      const defaults = { key1: 'value1', key2: 'value2', key3: 'value3' };

      resetMockStorage({});

      const { result } = renderHook(() =>
        useStorageMultiple(['key1', 'key2', 'key3'], defaults)
      );

      await flushPromises();

      await waitFor(() => {
        expect(result.current[2]).toBe(false);
      }, { timeout: 3000 });

      expect(result.current[0]).toEqual(defaults);

      const listeners = (chrome.storage.onChanged.addListener as jest.Mock).mock
        .calls;
      const listener = listeners[listeners.length - 1][0];

      act(() => {
        listener(
          {
            key1: { oldValue: 'value1', newValue: 'updated1' },
            // Only key1 changes
          },
          'local'
        );
      });

      expect(result.current[0]).toEqual({
        key1: 'updated1',
        key2: 'value2',
        key3: 'value3',
      });
    });

    it('should ignore changes to keys not in the list', async () => {
      const defaults = { key1: 'value1', key2: 'value2' };

      resetMockStorage({});

      const { result } = renderHook(() =>
        useStorageMultiple(['key1', 'key2'], defaults)
      );

      await flushPromises();

      await waitFor(() => {
        expect(result.current[2]).toBe(false);
      }, { timeout: 3000 });

      expect(result.current[0]).toEqual(defaults);

      const listeners = (chrome.storage.onChanged.addListener as jest.Mock).mock
        .calls;
      const listener = listeners[listeners.length - 1][0];

      act(() => {
        listener(
          {
            otherKey: { oldValue: 'old', newValue: 'new' },
          },
          'local'
        );
      });

      expect(result.current[0]).toEqual(defaults); // No change
    });

    it('should ignore changes from other storage areas', async () => {
      const defaults = { key1: 'value1', key2: 'value2' };

      resetMockStorage({});

      const { result } = renderHook(() =>
        useStorageMultiple(['key1', 'key2'], defaults)
      );

      await flushPromises();

      await waitFor(() => {
        expect(result.current[2]).toBe(false);
      }, { timeout: 3000 });

      expect(result.current[0]).toEqual(defaults);

      const listeners = (chrome.storage.onChanged.addListener as jest.Mock).mock
        .calls;
      const listener = listeners[listeners.length - 1][0];

      act(() => {
        listener(
          {
            key1: { oldValue: 'value1', newValue: 'should be ignored' },
          },
          'sync' // Different area
        );
      });

      expect(result.current[0]).toEqual(defaults); // No change
    });

    it('should remove listener on unmount', async () => {
      const defaults = { key1: 'value1', key2: 'value2' };

      resetMockStorage({});

      const { unmount } = renderHook(() =>
        useStorageMultiple(['key1', 'key2'], defaults)
      );

      await flushPromises();

      await waitFor(() => {
        expect(chrome.storage.onChanged.addListener).toHaveBeenCalled();
      });

      unmount();

      expect(chrome.storage.onChanged.removeListener).toHaveBeenCalled();
    });
  });
});
