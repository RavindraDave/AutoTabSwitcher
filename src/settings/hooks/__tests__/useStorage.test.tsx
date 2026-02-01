/**
 * Tests for useStorage and useStorageMultiple hooks
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useStorage, useStorageMultiple } from '../useStorage';

// Mock Chrome storage API
const mockChrome = (global as any).chrome;

describe('useStorage', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Reset storage mock
    mockChrome.storage.local.get.mockImplementation((keys: any) => {
      return Promise.resolve({});
    });

    mockChrome.storage.local.set.mockImplementation(() => {
      return Promise.resolve();
    });

    // Clear listeners
    mockChrome.storage.onChanged.addListener.mockClear();
    mockChrome.storage.onChanged.removeListener.mockClear();
  });

  it('should initialize with default value when storage is empty', async () => {
    mockChrome.storage.local.get.mockResolvedValue({});

    const { result } = renderHook(() => useStorage('testKey', 'defaultValue'));

    expect(result.current[2]).toBe(true); // isLoading should be true initially

    await waitFor(() => {
      expect(result.current[2]).toBe(false); // isLoading should become false
    });

    expect(result.current[0]).toBe('defaultValue');
  });

  it('should load value from storage on mount', async () => {
    mockChrome.storage.local.get.mockResolvedValue({ testKey: 'storedValue' });

    const { result } = renderHook(() => useStorage('testKey', 'defaultValue'));

    await waitFor(() => {
      expect(result.current[2]).toBe(false);
    });

    expect(result.current[0]).toBe('storedValue');
  });

  it('should update value when setStorageValue is called', async () => {
    mockChrome.storage.local.get.mockResolvedValue({ testKey: 'initialValue' });

    const { result } = renderHook(() => useStorage('testKey', 'defaultValue'));

    await waitFor(() => {
      expect(result.current[2]).toBe(false);
    });

    await act(async () => {
      await result.current[1]('newValue');
    });

    expect(mockChrome.storage.local.set).toHaveBeenCalledWith({ testKey: 'newValue' });
    expect(result.current[0]).toBe('newValue');
  });

  it('should update value when storage changes externally', async () => {
    mockChrome.storage.local.get.mockResolvedValue({ testKey: 'initialValue' });

    let storageListener: any;
    mockChrome.storage.onChanged.addListener.mockImplementation((listener: any) => {
      storageListener = listener;
    });

    const { result } = renderHook(() => useStorage('testKey', 'defaultValue'));

    await waitFor(() => {
      expect(result.current[2]).toBe(false);
    });

    expect(result.current[0]).toBe('initialValue');

    // Simulate external storage change
    act(() => {
      storageListener(
        { testKey: { newValue: 'externalValue', oldValue: 'initialValue' } },
        'local'
      );
    });

    expect(result.current[0]).toBe('externalValue');
  });

  it('should not update value when storage changes in different area', async () => {
    mockChrome.storage.local.get.mockResolvedValue({ testKey: 'initialValue' });

    let storageListener: any;
    mockChrome.storage.onChanged.addListener.mockImplementation((listener: any) => {
      storageListener = listener;
    });

    const { result } = renderHook(() => useStorage('testKey', 'defaultValue'));

    await waitFor(() => {
      expect(result.current[2]).toBe(false);
    });

    // Simulate storage change in sync area (should be ignored)
    act(() => {
      storageListener(
        { testKey: { newValue: 'externalValue', oldValue: 'initialValue' } },
        'sync'
      );
    });

    expect(result.current[0]).toBe('initialValue'); // Should not change
  });

  it('should handle storage load error gracefully', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation();
    mockChrome.storage.local.get.mockRejectedValue(new Error('Storage error'));

    const { result } = renderHook(() => useStorage('testKey', 'defaultValue'));

    await waitFor(() => {
      expect(result.current[2]).toBe(false);
    });

    expect(result.current[0]).toBe('defaultValue');
    expect(consoleError).toHaveBeenCalledWith(
      expect.stringContaining('Failed to load testKey from storage'),
      expect.any(Error)
    );

    consoleError.mockRestore();
  });

  it('should handle storage save error gracefully', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation();
    mockChrome.storage.local.get.mockResolvedValue({ testKey: 'initialValue' });
    mockChrome.storage.local.set.mockRejectedValue(new Error('Save error'));

    const { result } = renderHook(() => useStorage('testKey', 'defaultValue'));

    await waitFor(() => {
      expect(result.current[2]).toBe(false);
    });

    await expect(
      act(async () => {
        await result.current[1]('newValue');
      })
    ).rejects.toThrow('Save error');

    expect(consoleError).toHaveBeenCalledWith(
      expect.stringContaining('Failed to save testKey to storage'),
      expect.any(Error)
    );

    consoleError.mockRestore();
  });

  it('should remove storage listener on unmount', async () => {
    mockChrome.storage.local.get.mockResolvedValue({});

    let storageListener: any;
    mockChrome.storage.onChanged.addListener.mockImplementation((listener: any) => {
      storageListener = listener;
    });

    const { unmount } = renderHook(() => useStorage('testKey', 'defaultValue'));

    await waitFor(() => {
      expect(mockChrome.storage.onChanged.addListener).toHaveBeenCalled();
    });

    unmount();

    expect(mockChrome.storage.onChanged.removeListener).toHaveBeenCalledWith(
      storageListener
    );
  });

  it('should work with different data types', async () => {
    // Test with number
    mockChrome.storage.local.get.mockResolvedValue({ numberKey: 42 });
    const { result: numberResult } = renderHook(() => useStorage('numberKey', 0));

    await waitFor(() => {
      expect(numberResult.current[2]).toBe(false);
    });
    expect(numberResult.current[0]).toBe(42);

    // Test with boolean
    mockChrome.storage.local.get.mockResolvedValue({ boolKey: true });
    const { result: boolResult } = renderHook(() => useStorage('boolKey', false));

    await waitFor(() => {
      expect(boolResult.current[2]).toBe(false);
    });
    expect(boolResult.current[0]).toBe(true);

    // Test with object
    const testObject = { foo: 'bar', baz: 123 };
    mockChrome.storage.local.get.mockResolvedValue({ objectKey: testObject });
    const { result: objectResult } = renderHook(() => useStorage('objectKey', {}));

    await waitFor(() => {
      expect(objectResult.current[2]).toBe(false);
    });
    expect(objectResult.current[0]).toEqual(testObject);
  });
});

describe('useStorageMultiple', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockChrome.storage.local.get.mockImplementation((keys: any) => {
      return Promise.resolve({});
    });

    mockChrome.storage.local.set.mockImplementation(() => {
      return Promise.resolve();
    });

    mockChrome.storage.onChanged.addListener.mockClear();
    mockChrome.storage.onChanged.removeListener.mockClear();
  });

  it('should initialize with default values when storage is empty', async () => {
    mockChrome.storage.local.get.mockResolvedValue({});

    const defaults = { key1: 'default1', key2: 'default2', key3: 123 };
    const { result } = renderHook(() =>
      useStorageMultiple(['key1', 'key2', 'key3'], defaults)
    );

    expect(result.current[2]).toBe(true); // isLoading

    await waitFor(() => {
      expect(result.current[2]).toBe(false);
    });

    expect(result.current[0]).toEqual(defaults);
  });

  it('should load values from storage on mount', async () => {
    const stored = { key1: 'stored1', key2: 'stored2', key3: 456 };
    mockChrome.storage.local.get.mockResolvedValue(stored);

    const defaults = { key1: 'default1', key2: 'default2', key3: 123 };
    const { result } = renderHook(() =>
      useStorageMultiple(['key1', 'key2', 'key3'], defaults)
    );

    await waitFor(() => {
      expect(result.current[2]).toBe(false);
    });

    expect(result.current[0]).toEqual(stored);
  });

  it('should merge defaults with stored values', async () => {
    mockChrome.storage.local.get.mockResolvedValue({ key1: 'stored1' });

    const defaults = { key1: 'default1', key2: 'default2', key3: 123 };
    const { result } = renderHook(() =>
      useStorageMultiple(['key1', 'key2', 'key3'], defaults)
    );

    await waitFor(() => {
      expect(result.current[2]).toBe(false);
    });

    expect(result.current[0]).toEqual({
      key1: 'stored1',
      key2: 'default2',
      key3: 123,
    });
  });

  it('should update values when updateValues is called', async () => {
    mockChrome.storage.local.get.mockResolvedValue({});

    const defaults = { key1: 'default1', key2: 'default2' };
    const { result } = renderHook(() =>
      useStorageMultiple(['key1', 'key2'], defaults)
    );

    await waitFor(() => {
      expect(result.current[2]).toBe(false);
    });

    await act(async () => {
      await result.current[1]({ key1: 'updated1' });
    });

    expect(mockChrome.storage.local.set).toHaveBeenCalledWith({ key1: 'updated1' });
    expect(result.current[0]).toEqual({
      key1: 'updated1',
      key2: 'default2',
    });
  });

  it('should update values when storage changes externally', async () => {
    mockChrome.storage.local.get.mockResolvedValue({});

    let storageListener: any;
    mockChrome.storage.onChanged.addListener.mockImplementation((listener: any) => {
      storageListener = listener;
    });

    const defaults = { key1: 'default1', key2: 'default2' };
    const { result } = renderHook(() =>
      useStorageMultiple(['key1', 'key2'], defaults)
    );

    await waitFor(() => {
      expect(result.current[2]).toBe(false);
    });

    // Simulate external storage change
    act(() => {
      storageListener(
        {
          key1: { newValue: 'external1', oldValue: 'default1' },
          key2: { newValue: 'external2', oldValue: 'default2' },
        },
        'local'
      );
    });

    expect(result.current[0]).toEqual({
      key1: 'external1',
      key2: 'external2',
    });
  });

  it('should handle partial external updates', async () => {
    mockChrome.storage.local.get.mockResolvedValue({});

    let storageListener: any;
    mockChrome.storage.onChanged.addListener.mockImplementation((listener: any) => {
      storageListener = listener;
    });

    const defaults = { key1: 'default1', key2: 'default2', key3: 'default3' };
    const { result } = renderHook(() =>
      useStorageMultiple(['key1', 'key2', 'key3'], defaults)
    );

    await waitFor(() => {
      expect(result.current[2]).toBe(false);
    });

    // Simulate external storage change for only key1
    act(() => {
      storageListener(
        { key1: { newValue: 'external1', oldValue: 'default1' } },
        'local'
      );
    });

    expect(result.current[0]).toEqual({
      key1: 'external1',
      key2: 'default2',
      key3: 'default3',
    });
  });

  it('should not update when storage changes in different area', async () => {
    mockChrome.storage.local.get.mockResolvedValue({});

    let storageListener: any;
    mockChrome.storage.onChanged.addListener.mockImplementation((listener: any) => {
      storageListener = listener;
    });

    const defaults = { key1: 'default1', key2: 'default2' };
    const { result } = renderHook(() =>
      useStorageMultiple(['key1', 'key2'], defaults)
    );

    await waitFor(() => {
      expect(result.current[2]).toBe(false);
    });

    const valuesBefore = result.current[0];

    // Simulate storage change in sync area (should be ignored)
    act(() => {
      storageListener(
        { key1: { newValue: 'external1', oldValue: 'default1' } },
        'sync'
      );
    });

    expect(result.current[0]).toBe(valuesBefore); // Should not change
  });

  it('should handle storage load error gracefully', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation();
    mockChrome.storage.local.get.mockRejectedValue(new Error('Storage error'));

    const defaults = { key1: 'default1', key2: 'default2' };
    const { result } = renderHook(() =>
      useStorageMultiple(['key1', 'key2'], defaults)
    );

    await waitFor(() => {
      expect(result.current[2]).toBe(false);
    });

    expect(result.current[0]).toEqual(defaults);
    expect(consoleError).toHaveBeenCalledWith(
      'Failed to load from storage:',
      expect.any(Error)
    );

    consoleError.mockRestore();
  });

  it('should handle storage save error gracefully', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation();
    mockChrome.storage.local.get.mockResolvedValue({});
    mockChrome.storage.local.set.mockRejectedValue(new Error('Save error'));

    const defaults = { key1: 'default1', key2: 'default2' };
    const { result } = renderHook(() =>
      useStorageMultiple(['key1', 'key2'], defaults)
    );

    await waitFor(() => {
      expect(result.current[2]).toBe(false);
    });

    await expect(
      act(async () => {
        await result.current[1]({ key1: 'updated1' });
      })
    ).rejects.toThrow('Save error');

    expect(consoleError).toHaveBeenCalledWith(
      'Failed to save to storage:',
      expect.any(Error)
    );

    consoleError.mockRestore();
  });

  it('should remove storage listener on unmount', async () => {
    mockChrome.storage.local.get.mockResolvedValue({});

    let storageListener: any;
    mockChrome.storage.onChanged.addListener.mockImplementation((listener: any) => {
      storageListener = listener;
    });

    const defaults = { key1: 'default1' };
    const { unmount } = renderHook(() =>
      useStorageMultiple(['key1'], defaults)
    );

    await waitFor(() => {
      expect(mockChrome.storage.onChanged.addListener).toHaveBeenCalled();
    });

    unmount();

    expect(mockChrome.storage.onChanged.removeListener).toHaveBeenCalledWith(
      storageListener
    );
  });
});
