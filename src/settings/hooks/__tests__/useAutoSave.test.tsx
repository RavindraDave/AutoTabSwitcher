/**
 * Tests for useAutoSave and useAutoSaveImmediate hooks
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useAutoSave, useAutoSaveImmediate } from '../useAutoSave';
import * as ToastContext from '../../context/ToastContext';

// Mock Chrome storage API
const mockChrome = (global as any).chrome;

// Mock ToastContext
jest.mock('../../context/ToastContext', () => ({
  useToast: jest.fn(),
}));

describe('useAutoSave', () => {
  const mockShowToast = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    (ToastContext.useToast as jest.Mock).mockReturnValue({
      showToast: mockShowToast,
    });

    mockChrome.storage.local.set.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should not save on first render', async () => {
    renderHook(() => useAutoSave('testKey', 'initialValue'));

    await act(async () => {
      jest.advanceTimersByTime(500);
    });

    expect(mockChrome.storage.local.set).not.toHaveBeenCalled();
  });

  it('should save value after debounce delay', async () => {
    const { rerender } = renderHook(
      ({ value }) => useAutoSave('testKey', value),
      { initialProps: { value: 'initialValue' } }
    );

    // Update value
    rerender({ value: 'newValue' });

    // Should not save immediately
    expect(mockChrome.storage.local.set).not.toHaveBeenCalled();

    // Wait for debounce (default 300ms)
    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
        testKey: 'newValue',
      });
    });

    expect(mockShowToast).toHaveBeenCalledWith('Setting saved', 'success');
  });

  it('should debounce multiple rapid changes', async () => {
    const { rerender } = renderHook(
      ({ value }) => useAutoSave('testKey', value),
      { initialProps: { value: 'initialValue' } }
    );

    // Make multiple rapid changes
    rerender({ value: 'value1' });
    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    rerender({ value: 'value2' });
    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    rerender({ value: 'value3' });
    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    // Should not have saved yet
    expect(mockChrome.storage.local.set).not.toHaveBeenCalled();

    // Wait for final debounce
    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    // Should only save once with the final value
    await waitFor(() => {
      expect(mockChrome.storage.local.set).toHaveBeenCalledTimes(1);
    });

    expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
      testKey: 'value3',
    });
  });

  it('should not save if value hasn not changed', async () => {
    const { rerender } = renderHook(
      ({ value }) => useAutoSave('testKey', value),
      { initialProps: { value: 'sameValue' } }
    );

    // Re-render with same value
    rerender({ value: 'sameValue' });

    await act(async () => {
      jest.advanceTimersByTime(500);
    });

    expect(mockChrome.storage.local.set).not.toHaveBeenCalled();
  });

  it('should use custom debounce delay', async () => {
    const { rerender } = renderHook(
      ({ value }) => useAutoSave('testKey', value, { debounceMs: 1000 }),
      { initialProps: { value: 'initialValue' } }
    );

    rerender({ value: 'newValue' });

    // Should not save after 500ms
    await act(async () => {
      jest.advanceTimersByTime(500);
    });
    expect(mockChrome.storage.local.set).not.toHaveBeenCalled();

    // Should save after 1000ms
    await act(async () => {
      jest.advanceTimersByTime(500);
    });

    await waitFor(() => {
      expect(mockChrome.storage.local.set).toHaveBeenCalled();
    });
  });

  it('should use custom success message', async () => {
    const { rerender } = renderHook(
      ({ value }) =>
        useAutoSave('testKey', value, { successMessage: 'Custom success!' }),
      { initialProps: { value: 'initialValue' } }
    );

    rerender({ value: 'newValue' });

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('Custom success!', 'success');
    });
  });

  it('should call onSave callback after successful save', async () => {
    const onSave = jest.fn();
    const { rerender } = renderHook(
      ({ value }) => useAutoSave('testKey', value, { onSave }),
      { initialProps: { value: 'initialValue' } }
    );

    rerender({ value: 'newValue' });

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(onSave).toHaveBeenCalled();
    });
  });

  it('should handle save error gracefully', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation();
    const onError = jest.fn();
    mockChrome.storage.local.set.mockRejectedValue(new Error('Save failed'));

    const { rerender } = renderHook(
      ({ value }) =>
        useAutoSave('testKey', value, {
          errorMessage: 'Custom error!',
          onError,
        }),
      { initialProps: { value: 'initialValue' } }
    );

    rerender({ value: 'newValue' });

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('Custom error!', 'error');
    });

    expect(onError).toHaveBeenCalledWith(expect.any(Error));
    expect(consoleError).toHaveBeenCalled();

    consoleError.mockRestore();
  });

  it('should not show toast when silent is true', async () => {
    const { rerender } = renderHook(
      ({ value }) => useAutoSave('testKey', value, { silent: true }),
      { initialProps: { value: 'initialValue' } }
    );

    rerender({ value: 'newValue' });

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(mockChrome.storage.local.set).toHaveBeenCalled();
    });

    expect(mockShowToast).not.toHaveBeenCalled();
  });

  it('should force save immediately when forceSave is called', async () => {
    const { result, rerender } = renderHook(
      ({ value }) => useAutoSave('testKey', value),
      { initialProps: { value: 'initialValue' } }
    );

    rerender({ value: 'newValue' });

    // Call forceSave before debounce completes
    await act(async () => {
      await result.current.forceSave();
    });

    expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
      testKey: 'newValue',
    });
  });

  it('should clear timeout on unmount', async () => {
    const { rerender, unmount } = renderHook(
      ({ value }) => useAutoSave('testKey', value),
      { initialProps: { value: 'initialValue' } }
    );

    rerender({ value: 'newValue' });

    // Unmount before debounce completes
    unmount();

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    // Should not have saved
    expect(mockChrome.storage.local.set).not.toHaveBeenCalled();
  });

  it('should work with complex objects', async () => {
    const initialObject = { foo: 'bar', baz: 123 };
    const newObject = { foo: 'qux', baz: 456 };

    const { rerender } = renderHook(
      ({ value }) => useAutoSave('testKey', value),
      { initialProps: { value: initialObject } }
    );

    rerender({ value: newObject });

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
        testKey: newObject,
      });
    });
  });
});

describe('useAutoSaveImmediate', () => {
  const mockShowToast = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    (ToastContext.useToast as jest.Mock).mockReturnValue({
      showToast: mockShowToast,
    });

    mockChrome.storage.local.set.mockResolvedValue(undefined);
  });

  it('should save immediately when called', async () => {
    const { result } = renderHook(() => useAutoSaveImmediate('testKey'));

    await act(async () => {
      await result.current('newValue');
    });

    expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
      testKey: 'newValue',
    });

    expect(mockShowToast).toHaveBeenCalledWith('Setting saved', 'success');
  });

  it('should use custom success message', async () => {
    const { result } = renderHook(() =>
      useAutoSaveImmediate('testKey', { successMessage: 'Saved!' })
    );

    await act(async () => {
      await result.current('newValue');
    });

    expect(mockShowToast).toHaveBeenCalledWith('Saved!', 'success');
  });

  it('should call onSave callback after successful save', async () => {
    const onSave = jest.fn();
    const { result } = renderHook(() =>
      useAutoSaveImmediate('testKey', { onSave })
    );

    await act(async () => {
      await result.current('newValue');
    });

    expect(onSave).toHaveBeenCalled();
  });

  it('should handle save error and throw', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation();
    const onError = jest.fn();
    mockChrome.storage.local.set.mockRejectedValue(new Error('Save failed'));

    const { result } = renderHook(() =>
      useAutoSaveImmediate('testKey', {
        errorMessage: 'Failed!',
        onError,
      })
    );

    await expect(
      act(async () => {
        await result.current('newValue');
      })
    ).rejects.toThrow('Save failed');

    expect(mockShowToast).toHaveBeenCalledWith('Failed!', 'error');
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
    expect(consoleError).toHaveBeenCalled();

    consoleError.mockRestore();
  });

  it('should not show toast when silent is true', async () => {
    const { result } = renderHook(() =>
      useAutoSaveImmediate('testKey', { silent: true })
    );

    await act(async () => {
      await result.current('newValue');
    });

    expect(mockChrome.storage.local.set).toHaveBeenCalled();
    expect(mockShowToast).not.toHaveBeenCalled();
  });

  it('should work with different data types', async () => {
    const { result } = renderHook(() => useAutoSaveImmediate('testKey'));

    // String
    await act(async () => {
      await result.current('stringValue');
    });
    expect(mockChrome.storage.local.set).toHaveBeenLastCalledWith({
      testKey: 'stringValue',
    });

    // Number
    await act(async () => {
      await result.current(42);
    });
    expect(mockChrome.storage.local.set).toHaveBeenLastCalledWith({
      testKey: 42,
    });

    // Boolean
    await act(async () => {
      await result.current(true);
    });
    expect(mockChrome.storage.local.set).toHaveBeenLastCalledWith({
      testKey: true,
    });

    // Object
    const obj = { foo: 'bar' };
    await act(async () => {
      await result.current(obj);
    });
    expect(mockChrome.storage.local.set).toHaveBeenLastCalledWith({
      testKey: obj,
    });
  });
});
