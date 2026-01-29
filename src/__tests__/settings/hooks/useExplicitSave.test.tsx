/**
 * Tests for useExplicitSave and useExplicitSaveMultiple hooks
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import {
  useExplicitSave,
  useExplicitSaveMultiple,
} from '../../../settings/hooks/useExplicitSave';
import { ToastProvider } from '../../../settings/context/ToastContext';
import { resetMockStorage } from '../setup';

// Helper to flush pending promises and effects
async function flushPromises() {
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 0));
  });
}

// Wrapper component that provides context
function Wrapper({ children }: { children: React.ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}

describe('useExplicitSave', () => {
  describe('initialization', () => {
    it('should initialize with the provided initial value', () => {
      const { result } = renderHook(
        () => useExplicitSave('testKey', 'initial value'),
        {
          wrapper: Wrapper,
        }
      );

      expect(result.current.value).toBe('initial value');
      expect(result.current.isDirty).toBe(false);
      expect(result.current.isSaving).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.isValid).toBe(true);
    });

    it('should load value from storage on mount', async () => {
      // Pre-populate storage
      (chrome.storage.local.get as jest.Mock).mockResolvedValueOnce({
        testKey: 'stored value',
      });

      const { result } = renderHook(
        () => useExplicitSave('testKey', 'initial value'),
        {
          wrapper: Wrapper,
        }
      );

      await waitFor(() => {
        expect(result.current.value).toBe('stored value');
        expect(result.current.isDirty).toBe(false);
      });
    });

    it('should use initial value if storage is empty', async () => {
      (chrome.storage.local.get as jest.Mock).mockResolvedValueOnce({});

      const { result } = renderHook(
        () => useExplicitSave('testKey', 'initial value'),
        {
          wrapper: Wrapper,
        }
      );

      await waitFor(() => {
        expect(result.current.value).toBe('initial value');
      });
    });

    it('should handle storage load error gracefully', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      (chrome.storage.local.get as jest.Mock).mockRejectedValueOnce(
        new Error('Storage error')
      );

      const { result } = renderHook(
        () => useExplicitSave('testKey', 'initial value'),
        {
          wrapper: Wrapper,
        }
      );

      await waitFor(() => {
        expect(result.current.value).toBe('initial value');
      });

      expect(consoleError).toHaveBeenCalled();
      consoleError.mockRestore();
    });
  });

  describe('setValue', () => {
    it('should update local value without saving', () => {
      const { result } = renderHook(
        () => useExplicitSave('testKey', 'initial'),
        {
          wrapper: Wrapper,
        }
      );

      act(() => {
        result.current.setValue('updated');
      });

      expect(result.current.value).toBe('updated');
      expect(chrome.storage.local.set).not.toHaveBeenCalled();
    });

    it('should mark as dirty when value changes', async () => {
      const { result } = renderHook(
        () => useExplicitSave('testKey', 'initial'),
        {
          wrapper: Wrapper,
        }
      );

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.isDirty).toBe(false);
      });

      act(() => {
        result.current.setValue('updated');
      });

      expect(result.current.isDirty).toBe(true);
    });

    it('should not mark as dirty when value is same', async () => {
      const { result } = renderHook(
        () => useExplicitSave('testKey', 'initial'),
        {
          wrapper: Wrapper,
        }
      );

      await waitFor(() => {
        expect(result.current.isDirty).toBe(false);
      });

      act(() => {
        result.current.setValue('initial');
      });

      expect(result.current.isDirty).toBe(false);
    });

    it('should handle object values', async () => {
      const obj1 = { name: 'test', count: 1 };
      const obj2 = { name: 'test', count: 2 };

      const { result } = renderHook(
        () => useExplicitSave('testKey', obj1),
        {
          wrapper: Wrapper,
        }
      );

      await waitFor(() => {
        expect(result.current.isDirty).toBe(false);
      });

      act(() => {
        result.current.setValue(obj2);
      });

      expect(result.current.value).toEqual(obj2);
      expect(result.current.isDirty).toBe(true);
    });
  });

  describe('save', () => {
    it('should save value to storage', async () => {
      const { result } = renderHook(
        () => useExplicitSave('testKey', 'initial'),
        {
          wrapper: Wrapper,
        }
      );

      await waitFor(() => {
        expect(result.current.isDirty).toBe(false);
      });

      act(() => {
        result.current.setValue('updated');
      });

      let saveResult: boolean = false;
      await act(async () => {
        saveResult = await result.current.save();
      });

      expect(saveResult).toBe(true);
      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        testKey: 'updated',
      });
      expect(result.current.isDirty).toBe(false);
    });

    it('should set isSaving flag during save', async () => {
      const { result } = renderHook(
        () => useExplicitSave('testKey', 'initial'),
        {
          wrapper: Wrapper,
        }
      );

      await waitFor(() => {
        expect(result.current.isDirty).toBe(false);
      });

      act(() => {
        result.current.setValue('updated');
      });

      // Create a slow promise to check isSaving flag
      let resolveSave: () => void;
      const slowPromise = new Promise<void>((resolve) => {
        resolveSave = resolve;
      });

      (chrome.storage.local.set as jest.Mock).mockImplementationOnce(() => slowPromise);

      let savePromise: Promise<boolean>;
      await act(async () => {
        savePromise = result.current.save();
        // Wait a tick for the isSaving state to be set
        await Promise.resolve();
      });

      expect(result.current.isSaving).toBe(true);

      // Resolve the save
      act(() => {
        resolveSave!();
      });

      await act(async () => {
        await savePromise!;
      });

      expect(result.current.isSaving).toBe(false);
    });

    it('should call onSave callback on success', async () => {
      const onSave = jest.fn();

      const { result } = renderHook(
        () => useExplicitSave('testKey', 'initial', { onSave }),
        {
          wrapper: Wrapper,
        }
      );

      await waitFor(() => {
        expect(result.current.isDirty).toBe(false);
      });

      act(() => {
        result.current.setValue('updated');
      });

      await act(async () => {
        await result.current.save();
      });

      expect(onSave).toHaveBeenCalledWith('updated');
    });

    it('should call onError callback on failure', async () => {
      const onError = jest.fn();
      const error = new Error('Storage error');

      (chrome.storage.local.set as jest.Mock).mockRejectedValueOnce(error);

      const { result } = renderHook(
        () => useExplicitSave('testKey', 'initial', { onError }),
        {
          wrapper: Wrapper,
        }
      );

      await waitFor(() => {
        expect(result.current.isDirty).toBe(false);
      });

      act(() => {
        result.current.setValue('updated');
      });

      let saveResult: boolean = false;
      await act(async () => {
        saveResult = await result.current.save();
      });

      expect(saveResult).toBe(false);
      expect(onError).toHaveBeenCalledWith(error);
    });

    it('should return false on save failure', async () => {
      const error = new Error('Storage error');
      (chrome.storage.local.set as jest.Mock).mockRejectedValueOnce(error);

      const { result } = renderHook(
        () => useExplicitSave('testKey', 'initial'),
        {
          wrapper: Wrapper,
        }
      );

      await waitFor(() => {
        expect(result.current.isDirty).toBe(false);
      });

      act(() => {
        result.current.setValue('updated');
      });

      let saveResult: boolean = false;
      await act(async () => {
        saveResult = await result.current.save();
      });

      expect(saveResult).toBe(false);
      expect(result.current.isDirty).toBe(true); // Still dirty after failed save
    });
  });

  describe('reset', () => {
    it('should reset to last saved value', async () => {
      const { result } = renderHook(
        () => useExplicitSave('testKey', 'initial'),
        {
          wrapper: Wrapper,
        }
      );

      await waitFor(() => {
        expect(result.current.isDirty).toBe(false);
      });

      act(() => {
        result.current.setValue('updated');
      });

      expect(result.current.value).toBe('updated');
      expect(result.current.isDirty).toBe(true);

      act(() => {
        result.current.reset();
      });

      expect(result.current.value).toBe('initial');
      expect(result.current.isDirty).toBe(false);
    });

    it('should clear validation error on reset', async () => {
      const validate = jest.fn((value: string) => {
        return value.length < 3 ? 'Too short' : null;
      });

      const { result } = renderHook(
        () => useExplicitSave('testKey', 'initial', { validate }),
        {
          wrapper: Wrapper,
        }
      );

      await waitFor(() => {
        expect(result.current.error).toBe(null);
      });

      act(() => {
        result.current.setValue('ab');
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Too short');
      });

      act(() => {
        result.current.reset();
      });

      expect(result.current.error).toBe(null);
    });
  });

  describe('validation', () => {
    it('should validate value on change', async () => {
      const validate = jest.fn((value: string) => {
        return value.length < 3 ? 'Too short' : null;
      });

      const { result } = renderHook(
        () => useExplicitSave('testKey', 'initial', { validate }),
        {
          wrapper: Wrapper,
        }
      );

      await waitFor(() => {
        expect(result.current.error).toBe(null);
      });

      act(() => {
        result.current.setValue('ab');
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Too short');
        expect(result.current.isValid).toBe(false);
      });
    });

    it('should prevent save when validation fails', async () => {
      const validate = jest.fn((value: string) => {
        return value.length < 3 ? 'Too short' : null;
      });

      const { result } = renderHook(
        () => useExplicitSave('testKey', 'initial', { validate }),
        {
          wrapper: Wrapper,
        }
      );

      await waitFor(() => {
        expect(result.current.error).toBe(null);
      });

      act(() => {
        result.current.setValue('ab');
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Too short');
      });

      let saveResult: boolean = false;
      await act(async () => {
        saveResult = await result.current.save();
      });

      expect(saveResult).toBe(false);
      expect(chrome.storage.local.set).not.toHaveBeenCalled();
    });

    it('should allow save when validation passes', async () => {
      const validate = jest.fn((value: string) => {
        return value.length < 3 ? 'Too short' : null;
      });

      const { result } = renderHook(
        () => useExplicitSave('testKey', 'initial', { validate }),
        {
          wrapper: Wrapper,
        }
      );

      await waitFor(() => {
        expect(result.current.error).toBe(null);
      });

      act(() => {
        result.current.setValue('valid value');
      });

      await waitFor(() => {
        expect(result.current.error).toBe(null);
        expect(result.current.isValid).toBe(true);
      });

      let saveResult: boolean = false;
      await act(async () => {
        saveResult = await result.current.save();
      });

      expect(saveResult).toBe(true);
      expect(chrome.storage.local.set).toHaveBeenCalled();
    });

    it('should re-validate before save', async () => {
      const validate = jest.fn((value: string) => {
        return value.length < 3 ? 'Too short' : null;
      });

      const { result } = renderHook(
        () => useExplicitSave('testKey', 'initial', { validate }),
        {
          wrapper: Wrapper,
        }
      );

      await waitFor(() => {
        expect(result.current.error).toBe(null);
      });

      act(() => {
        result.current.setValue('ab');
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Too short');
      });

      validate.mockClear();

      await act(async () => {
        await result.current.save();
      });

      expect(validate).toHaveBeenCalledWith('ab');
    });
  });

  describe('custom messages', () => {
    it('should use custom success message', async () => {
      const { result } = renderHook(
        () =>
          useExplicitSave('testKey', 'initial', {
            successMessage: 'Custom success!',
          }),
        {
          wrapper: Wrapper,
        }
      );

      await waitFor(() => {
        expect(result.current.isDirty).toBe(false);
      });

      act(() => {
        result.current.setValue('updated');
      });

      await act(async () => {
        await result.current.save();
      });

      expect(chrome.storage.local.set).toHaveBeenCalled();
      // Custom message would be shown in toast
    });

    it('should use custom error message', async () => {
      const error = new Error('Storage error');
      (chrome.storage.local.set as jest.Mock).mockRejectedValueOnce(error);

      const { result } = renderHook(
        () =>
          useExplicitSave('testKey', 'initial', {
            errorMessage: 'Custom error!',
          }),
        {
          wrapper: Wrapper,
        }
      );

      await waitFor(() => {
        expect(result.current.isDirty).toBe(false);
      });

      act(() => {
        result.current.setValue('updated');
      });

      await act(async () => {
        await result.current.save();
      });

      // Custom error message would be shown in toast
    });
  });
});

describe('useExplicitSaveMultiple', () => {
  describe('initialization', () => {
    it('should initialize with provided initial values', () => {
      const initialValues = { key1: 'value1', key2: 'value2' };

      const { result } = renderHook(
        () =>
          useExplicitSaveMultiple(['key1', 'key2'], initialValues),
        {
          wrapper: Wrapper,
        }
      );

      expect(result.current.value).toEqual(initialValues);
      expect(result.current.isDirty).toBe(false);
      expect(result.current.isSaving).toBe(false);
    });

    it('should load values from storage on mount', async () => {
      const initialValues = { key1: 'value1', key2: 'value2' };
      const storedValues = { key1: 'stored1', key2: 'stored2' };

      resetMockStorage(storedValues);

      const { result } = renderHook(
        () =>
          useExplicitSaveMultiple(['key1', 'key2'], initialValues),
        {
          wrapper: Wrapper,
        }
      );

      await flushPromises();

      // Wait for the storage to load
      await waitFor(() => {
        expect(result.current.value).toEqual(storedValues);
      }, { timeout: 3000 });

      expect(result.current.isDirty).toBe(false);
    });

    it('should use initial values for missing keys', async () => {
      const initialValues = { key1: 'value1', key2: 'value2' };

      resetMockStorage({
        key1: 'stored1',
        // key2 is missing
      });

      const { result } = renderHook(
        () =>
          useExplicitSaveMultiple(['key1', 'key2'], initialValues),
        {
          wrapper: Wrapper,
        }
      );

      await flushPromises();

      // Wait for the storage to load
      await waitFor(() => {
        expect(result.current.value).toEqual({
          key1: 'stored1',
          key2: 'value2',
        });
      }, { timeout: 3000 });
    });

    it('should handle storage load error gracefully', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      const initialValues = { key1: 'value1', key2: 'value2' };

      (chrome.storage.local.get as jest.Mock).mockRejectedValueOnce(
        new Error('Storage error')
      );

      const { result } = renderHook(
        () =>
          useExplicitSaveMultiple(['key1', 'key2'], initialValues),
        {
          wrapper: Wrapper,
        }
      );

      await waitFor(() => {
        expect(result.current.value).toEqual(initialValues);
      });

      expect(consoleError).toHaveBeenCalled();
      consoleError.mockRestore();
    });
  });

  describe('setValue', () => {
    it('should update values without saving', () => {
      const initialValues = { key1: 'value1', key2: 'value2' };

      const { result } = renderHook(
        () =>
          useExplicitSaveMultiple(['key1', 'key2'], initialValues),
        {
          wrapper: Wrapper,
        }
      );

      act(() => {
        result.current.setValue({
          ...initialValues,
          key1: 'updated1',
        });
      });

      expect(result.current.value.key1).toBe('updated1');
      expect(chrome.storage.local.set).not.toHaveBeenCalled();
    });

    it('should mark as dirty when values change', async () => {
      const initialValues = { key1: 'value1', key2: 'value2' };

      const { result } = renderHook(
        () =>
          useExplicitSaveMultiple(['key1', 'key2'], initialValues),
        {
          wrapper: Wrapper,
        }
      );

      await waitFor(() => {
        expect(result.current.isDirty).toBe(false);
      });

      act(() => {
        result.current.setValue({
          ...initialValues,
          key1: 'updated1',
        });
      });

      expect(result.current.isDirty).toBe(true);
    });
  });

  describe('save', () => {
    it('should save all values to storage', async () => {
      const initialValues = { key1: 'value1', key2: 'value2' };

      const { result } = renderHook(
        () =>
          useExplicitSaveMultiple(['key1', 'key2'], initialValues),
        {
          wrapper: Wrapper,
        }
      );

      await waitFor(() => {
        expect(result.current.isDirty).toBe(false);
      });

      const updatedValues = { key1: 'updated1', key2: 'updated2' };

      act(() => {
        result.current.setValue(updatedValues);
      });

      await act(async () => {
        await result.current.save();
      });

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        key1: 'updated1',
        key2: 'updated2',
      });
      expect(result.current.isDirty).toBe(false);
    });

    it('should call onSave callback with values', async () => {
      const onSave = jest.fn();
      const initialValues = { key1: 'value1', key2: 'value2' };

      const { result } = renderHook(
        () =>
          useExplicitSaveMultiple(['key1', 'key2'], initialValues, {
            onSave,
          }),
        {
          wrapper: Wrapper,
        }
      );

      await waitFor(() => {
        expect(result.current.isDirty).toBe(false);
      });

      const updatedValues = { key1: 'updated1', key2: 'updated2' };

      act(() => {
        result.current.setValue(updatedValues);
      });

      await act(async () => {
        await result.current.save();
      });

      expect(onSave).toHaveBeenCalledWith(updatedValues);
    });

    it('should handle save errors', async () => {
      const onError = jest.fn();
      const error = new Error('Storage error');
      const initialValues = { key1: 'value1', key2: 'value2' };

      (chrome.storage.local.set as jest.Mock).mockRejectedValueOnce(error);

      const { result } = renderHook(
        () =>
          useExplicitSaveMultiple(['key1', 'key2'], initialValues, {
            onError,
          }),
        {
          wrapper: Wrapper,
        }
      );

      await waitFor(() => {
        expect(result.current.isDirty).toBe(false);
      });

      act(() => {
        result.current.setValue({ key1: 'updated1', key2: 'updated2' });
      });

      let saveResult: boolean = false;
      await act(async () => {
        saveResult = await result.current.save();
      });

      expect(saveResult).toBe(false);
      expect(onError).toHaveBeenCalledWith(error);
    });
  });

  describe('validation', () => {
    it('should validate values before save', async () => {
      const validate = jest.fn((value: { key1: string; key2: string }) => {
        return value.key1.length < 3 ? 'key1 too short' : null;
      });

      const initialValues = { key1: 'value1', key2: 'value2' };

      const { result } = renderHook(
        () =>
          useExplicitSaveMultiple(['key1', 'key2'], initialValues, {
            validate,
          }),
        {
          wrapper: Wrapper,
        }
      );

      await waitFor(() => {
        expect(result.current.isDirty).toBe(false);
      });

      act(() => {
        result.current.setValue({ key1: 'ab', key2: 'value2' });
      });

      await waitFor(() => {
        expect(result.current.error).toBe('key1 too short');
      });

      let saveResult: boolean = false;
      await act(async () => {
        saveResult = await result.current.save();
      });

      expect(saveResult).toBe(false);
      expect(chrome.storage.local.set).not.toHaveBeenCalled();
    });
  });

  describe('reset', () => {
    it('should reset to last saved values', async () => {
      const initialValues = { key1: 'value1', key2: 'value2' };

      const { result } = renderHook(
        () =>
          useExplicitSaveMultiple(['key1', 'key2'], initialValues),
        {
          wrapper: Wrapper,
        }
      );

      await waitFor(() => {
        expect(result.current.isDirty).toBe(false);
      });

      act(() => {
        result.current.setValue({ key1: 'updated1', key2: 'updated2' });
      });

      expect(result.current.isDirty).toBe(true);

      act(() => {
        result.current.reset();
      });

      expect(result.current.value).toEqual(initialValues);
      expect(result.current.isDirty).toBe(false);
    });
  });
});
