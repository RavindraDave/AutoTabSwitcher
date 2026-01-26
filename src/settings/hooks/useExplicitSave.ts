import { useState, useCallback, useMemo, useEffect } from 'react';
import { useToast } from '../context/ToastContext';

interface UseExplicitSaveOptions<T> {
  /** Custom success message */
  successMessage?: string;
  /** Custom error message */
  errorMessage?: string;
  /** Callback after successful save */
  onSave?: (value: T) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
  /** Validation function - return error message or null if valid */
  validate?: (value: T) => string | null;
}

interface UseExplicitSaveReturn<T> {
  /** Current local value */
  value: T;
  /** Update local value (does not save) */
  setValue: (value: T) => void;
  /** Whether local value differs from saved value */
  isDirty: boolean;
  /** Whether save is in progress */
  isSaving: boolean;
  /** Validation error message if any */
  error: string | null;
  /** Save current value to storage */
  save: () => Promise<boolean>;
  /** Reset to last saved value */
  reset: () => void;
  /** Check if current value is valid */
  isValid: boolean;
}

/**
 * Hook for explicit save functionality
 * Tracks dirty state and provides save/reset actions
 */
export function useExplicitSave<T>(
  key: string,
  initialValue: T,
  options: UseExplicitSaveOptions<T> = {}
): UseExplicitSaveReturn<T> {
  const {
    successMessage = 'Changes saved',
    errorMessage = 'Failed to save changes',
    onSave,
    onError,
    validate,
  } = options;

  const { showToast } = useToast();
  const [value, setValue] = useState<T>(initialValue);
  const [savedValue, setSavedValue] = useState<T>(initialValue);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load initial value from storage
  useEffect(() => {
    chrome.storage.local.get(key).then((result) => {
      if (result[key] !== undefined) {
        setValue(result[key] as T);
        setSavedValue(result[key] as T);
      }
    }).catch((err) => {
      console.error(`Failed to load ${key} from storage:`, err);
    });
  }, [key]);

  // Validate on value change
  useEffect(() => {
    if (validate) {
      const validationError = validate(value);
      setError(validationError);
    } else {
      setError(null);
    }
  }, [value, validate]);

  const isDirty = useMemo(() => {
    return JSON.stringify(value) !== JSON.stringify(savedValue);
  }, [value, savedValue]);

  const isValid = error === null;

  const save = useCallback(async (): Promise<boolean> => {
    // Validate before saving
    if (validate) {
      const validationError = validate(value);
      if (validationError) {
        setError(validationError);
        return false;
      }
    }

    setIsSaving(true);
    try {
      await chrome.storage.local.set({ [key]: value });
      setSavedValue(value);
      showToast(successMessage, 'success');
      onSave?.(value);
      return true;
    } catch (err) {
      console.error(`Failed to save ${key}:`, err);
      showToast(errorMessage, 'error');
      onError?.(err as Error);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [key, value, validate, successMessage, errorMessage, onSave, onError, showToast]);

  const reset = useCallback(() => {
    setValue(savedValue);
    setError(null);
  }, [savedValue]);

  return {
    value,
    setValue,
    isDirty,
    isSaving,
    error,
    save,
    reset,
    isValid,
  };
}

/**
 * Hook for explicit save with multiple fields
 */
export function useExplicitSaveMultiple<T extends Record<string, unknown>>(
  keys: (keyof T)[],
  initialValues: T,
  options: UseExplicitSaveOptions<T> = {}
): UseExplicitSaveReturn<T> {
  const {
    successMessage = 'Changes saved',
    errorMessage = 'Failed to save changes',
    onSave,
    onError,
    validate,
  } = options;

  const { showToast } = useToast();
  const [value, setValue] = useState<T>(initialValues);
  const [savedValue, setSavedValue] = useState<T>(initialValues);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load initial values from storage
  useEffect(() => {
    chrome.storage.local.get(keys as string[]).then((result) => {
      const loaded = { ...initialValues };
      for (const key of keys) {
        if (result[key as string] !== undefined) {
          loaded[key] = result[key as string];
        }
      }
      setValue(loaded);
      setSavedValue(loaded);
    }).catch((err) => {
      console.error('Failed to load from storage:', err);
    });
  }, []);

  // Validate on value change
  useEffect(() => {
    if (validate) {
      const validationError = validate(value);
      setError(validationError);
    } else {
      setError(null);
    }
  }, [value, validate]);

  const isDirty = useMemo(() => {
    return JSON.stringify(value) !== JSON.stringify(savedValue);
  }, [value, savedValue]);

  const isValid = error === null;

  const save = useCallback(async (): Promise<boolean> => {
    if (validate) {
      const validationError = validate(value);
      if (validationError) {
        setError(validationError);
        return false;
      }
    }

    setIsSaving(true);
    try {
      const updates: Record<string, unknown> = {};
      for (const key of keys) {
        updates[key as string] = value[key];
      }
      await chrome.storage.local.set(updates);
      setSavedValue(value);
      showToast(successMessage, 'success');
      onSave?.(value);
      return true;
    } catch (err) {
      console.error('Failed to save:', err);
      showToast(errorMessage, 'error');
      onError?.(err as Error);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [keys, value, validate, successMessage, errorMessage, onSave, onError, showToast]);

  const reset = useCallback(() => {
    setValue(savedValue);
    setError(null);
  }, [savedValue]);

  return {
    value,
    setValue,
    isDirty,
    isSaving,
    error,
    save,
    reset,
    isValid,
  };
}
