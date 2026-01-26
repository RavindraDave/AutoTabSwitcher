import { useState, useEffect, useCallback } from 'react';

/**
 * Hook for syncing a value with Chrome storage
 * Automatically updates when storage changes from other parts of the extension
 */
export function useStorage<T>(
  key: string,
  defaultValue: T
): [T, (value: T) => Promise<void>, boolean] {
  const [value, setValue] = useState<T>(defaultValue);
  const [isLoading, setIsLoading] = useState(true);

  // Load initial value
  useEffect(() => {
    chrome.storage.local.get(key).then((result) => {
      if (result[key] !== undefined) {
        setValue(result[key] as T);
      }
      setIsLoading(false);
    }).catch((error) => {
      console.error(`Failed to load ${key} from storage:`, error);
      setIsLoading(false);
    });
  }, [key]);

  // Listen for changes from other parts of the extension
  useEffect(() => {
    const handleChange = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string
    ) => {
      if (areaName === 'local' && changes[key]) {
        setValue(changes[key].newValue as T);
      }
    };

    chrome.storage.onChanged.addListener(handleChange);
    return () => chrome.storage.onChanged.removeListener(handleChange);
  }, [key]);

  // Update storage
  const setStorageValue = useCallback(async (newValue: T) => {
    try {
      await chrome.storage.local.set({ [key]: newValue });
      setValue(newValue);
    } catch (error) {
      console.error(`Failed to save ${key} to storage:`, error);
      throw error;
    }
  }, [key]);

  return [value, setStorageValue, isLoading];
}

/**
 * Hook for reading multiple storage values at once
 */
export function useStorageMultiple<T extends Record<string, unknown>>(
  keys: (keyof T)[],
  defaults: T
): [T, (updates: Partial<T>) => Promise<void>, boolean] {
  const [values, setValues] = useState<T>(defaults);
  const [isLoading, setIsLoading] = useState(true);

  // Load initial values
  useEffect(() => {
    chrome.storage.local.get(keys as string[]).then((result) => {
      const loaded = { ...defaults };
      for (const key of keys) {
        if (result[key as string] !== undefined) {
          loaded[key] = result[key as string];
        }
      }
      setValues(loaded);
      setIsLoading(false);
    }).catch((error) => {
      console.error('Failed to load from storage:', error);
      setIsLoading(false);
    });
  }, []);

  // Listen for changes
  useEffect(() => {
    const handleChange = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string
    ) => {
      if (areaName !== 'local') return;

      const updates: Partial<T> = {};
      let hasUpdates = false;

      for (const key of keys) {
        if (changes[key as string]) {
          updates[key] = changes[key as string].newValue;
          hasUpdates = true;
        }
      }

      if (hasUpdates) {
        setValues((prev) => ({ ...prev, ...updates }));
      }
    };

    chrome.storage.onChanged.addListener(handleChange);
    return () => chrome.storage.onChanged.removeListener(handleChange);
  }, []);

  // Update storage
  const updateValues = useCallback(async (updates: Partial<T>) => {
    try {
      await chrome.storage.local.set(updates);
      setValues((prev) => ({ ...prev, ...updates }));
    } catch (error) {
      console.error('Failed to save to storage:', error);
      throw error;
    }
  }, []);

  return [values, updateValues, isLoading];
}
