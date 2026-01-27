/**
 * Tests for environment.ts
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { isPacked } from '../../utils/environment.js';

const mockChrome = (global as any).chrome;

describe('Environment utilities', () => {
  describe('isPacked', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    test('should return true when update_url is present', () => {
      mockChrome.runtime.getManifest.mockReturnValue({
        manifest_version: 3,
        name: 'Test Extension',
        version: '1.0.0',
        update_url: 'https://clients2.google.com/service/update2/crx'
      });

      const result = isPacked();

      expect(result).toBe(true);
      expect(mockChrome.runtime.getManifest).toHaveBeenCalled();
    });

    test('should return false when update_url is not present', () => {
      mockChrome.runtime.getManifest.mockReturnValue({
        manifest_version: 3,
        name: 'Test Extension',
        version: '1.0.0'
        // No update_url - unpacked extension
      });

      const result = isPacked();

      expect(result).toBe(false);
      expect(mockChrome.runtime.getManifest).toHaveBeenCalled();
    });

    test('should return false when update_url is empty string', () => {
      mockChrome.runtime.getManifest.mockReturnValue({
        manifest_version: 3,
        name: 'Test Extension',
        version: '1.0.0',
        update_url: ''
      });

      const result = isPacked();

      expect(result).toBe(false);
    });

    test('should return false when update_url is null', () => {
      mockChrome.runtime.getManifest.mockReturnValue({
        manifest_version: 3,
        name: 'Test Extension',
        version: '1.0.0',
        update_url: null
      });

      const result = isPacked();

      expect(result).toBe(false);
    });

    test('should return false when update_url is undefined', () => {
      mockChrome.runtime.getManifest.mockReturnValue({
        manifest_version: 3,
        name: 'Test Extension',
        version: '1.0.0',
        update_url: undefined
      });

      const result = isPacked();

      expect(result).toBe(false);
    });
  });
});
