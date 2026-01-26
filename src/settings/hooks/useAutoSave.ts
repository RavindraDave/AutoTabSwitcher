import { useEffect, useRef, useCallback } from 'react';
import { useToast } from '../context/ToastContext';

interface UseAutoSaveOptions {
  /** Debounce delay in milliseconds (default: 300) */
  debounceMs?: number;
  /** Custom success message */
  successMessage?: string;
  /** Custom error message */
  errorMessage?: string;
  /** Callback after successful save */
  onSave?: () => void;
  /** Callback on error */
  onError?: (error: Error) => void;
  /** Skip showing toast on save */
  silent?: boolean;
}

/**
 * Hook for auto-saving a value to Chrome storage with debounce
 * Shows toast notification on save
 */
export function useAutoSave<T>(
  key: string,
  value: T,
  options: UseAutoSaveOptions = {}
) {
  const {
    debounceMs = 300,
    successMessage = 'Setting saved',
    errorMessage = 'Failed to save setting',
    onSave,
    onError,
    silent = false,
  } = options;

  const { showToast } = useToast();
  const previousValue = useRef<T>(value);
  const isFirstRender = useRef(true);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const save = useCallback(async (valueToSave: T) => {
    try {
      await chrome.storage.local.set({ [key]: valueToSave });
      if (!silent) {
        showToast(successMessage, 'success');
      }
      onSave?.();
    } catch (error) {
      console.error(`Auto-save failed for ${key}:`, error);
      if (!silent) {
        showToast(errorMessage, 'error');
      }
      onError?.(error as Error);
    }
  }, [key, successMessage, errorMessage, onSave, onError, silent, showToast]);

  useEffect(() => {
    // Skip first render (initial load)
    if (isFirstRender.current) {
      isFirstRender.current = false;
      previousValue.current = value;
      return;
    }

    // Skip if value hasn't changed
    if (JSON.stringify(previousValue.current) === JSON.stringify(value)) {
      return;
    }

    previousValue.current = value;

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Debounce the save
    timeoutRef.current = setTimeout(() => {
      save(value);
    }, debounceMs);

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, debounceMs, save]);

  // Force save (bypass debounce)
  const forceSave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    return save(value);
  }, [save, value]);

  return { forceSave };
}

/**
 * Hook for auto-saving with immediate save (no debounce)
 * Use for toggle switches and other instant-feedback controls
 */
export function useAutoSaveImmediate<T>(
  key: string,
  options: Omit<UseAutoSaveOptions, 'debounceMs'> = {}
) {
  const {
    successMessage = 'Setting saved',
    errorMessage = 'Failed to save setting',
    onSave,
    onError,
    silent = false,
  } = options;

  const { showToast } = useToast();

  const save = useCallback(async (value: T) => {
    try {
      await chrome.storage.local.set({ [key]: value });
      if (!silent) {
        showToast(successMessage, 'success');
      }
      onSave?.();
    } catch (error) {
      console.error(`Auto-save failed for ${key}:`, error);
      if (!silent) {
        showToast(errorMessage, 'error');
      }
      onError?.(error as Error);
      throw error;
    }
  }, [key, successMessage, errorMessage, onSave, onError, silent, showToast]);

  return save;
}
