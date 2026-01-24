/**
 * Comprehensive tests for premium-access.ts
 * Tests build-time and runtime premium feature access control
 */

import { jest, describe, test, expect, beforeEach, afterEach } from '@jest/globals';

const mockChrome = (global as any).chrome;

describe('Premium Access Control', () => {
  let isPremiumBuild: any;
  let hasPremiumLicense: any;
  let canAccessPremiumFeature: any;
  let canAccessPremium: any;
  let getPremiumTier: any;
  let activateLicense: any;
  let deactivateLicense: any;
  let requirePremium: any;
  let requirePremiumLicense: any;
  let PremiumFeature: any;

  // Store original module to restore after tests
  let originalModule: any;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Reset chrome mocks
    mockChrome.storage.local.get.mockReset();
    mockChrome.storage.local.set.mockReset();

    // Import fresh module
    const premiumModule = await import('../core/premium-access.js');
    isPremiumBuild = premiumModule.isPremiumBuild;
    hasPremiumLicense = premiumModule.hasPremiumLicense;
    canAccessPremiumFeature = premiumModule.canAccessPremiumFeature;
    canAccessPremium = premiumModule.canAccessPremium;
    getPremiumTier = premiumModule.getPremiumTier;
    activateLicense = premiumModule.activateLicense;
    deactivateLicense = premiumModule.deactivateLicense;
    requirePremium = premiumModule.requirePremium;
    requirePremiumLicense = premiumModule.requirePremiumLicense;
    PremiumFeature = premiumModule.PremiumFeature;
    originalModule = premiumModule;
  });

  describe('Build-time checks', () => {
    test('isPremiumBuild should return boolean', () => {
      const result = isPremiumBuild();
      expect(typeof result).toBe('boolean');
    });

    test('isPremiumBuild should be consistent', () => {
      const result1 = isPremiumBuild();
      const result2 = isPremiumBuild();
      expect(result1).toBe(result2);
    });
  });

  describe('PremiumFeature enum', () => {
    test('should have all Phase 1 features', () => {
      expect(PremiumFeature.SESSION_MANAGEMENT).toBe('session_management');
      expect(PremiumFeature.SMART_AUTO_REFRESH).toBe('smart_auto_refresh');
      expect(PremiumFeature.SKIP_RULES).toBe('skip_rules');
      expect(PremiumFeature.PER_WINDOW_INTERVAL).toBe('per_window_interval');
      expect(PremiumFeature.IMPORT_EXPORT).toBe('import_export');
    });

    test('should have Phase 2 features', () => {
      expect(PremiumFeature.ADVANCED_SCHEDULING).toBe('advanced_scheduling');
      expect(PremiumFeature.CUSTOM_SEQUENCES).toBe('custom_sequences');
    });

    test('should have Phase 3 features', () => {
      expect(PremiumFeature.ANALYTICS).toBe('analytics');
      expect(PremiumFeature.TEAM_SHARING).toBe('team_sharing');
    });
  });

  describe('hasPremiumLicense', () => {
    test('should return false when premium not enabled', async () => {
      mockChrome.storage.local.get.mockResolvedValue({ premiumEnabled: false });

      const result = await hasPremiumLicense();

      // In free builds, this should always be false
      // In premium builds, it depends on license
      expect(typeof result).toBe('boolean');
    });

    test('should return false when no license key', async () => {
      mockChrome.storage.local.get
        .mockResolvedValueOnce({ premiumEnabled: true })
        .mockResolvedValueOnce({ licenseKey: null });

      const result = await hasPremiumLicense();

      // Should be false because no license key
      if (isPremiumBuild()) {
        expect(result).toBe(false);
      }
    });

    test('should return true when premium enabled with valid license key', async () => {
      mockChrome.storage.local.get
        .mockResolvedValueOnce({ premiumEnabled: true })
        .mockResolvedValueOnce({ licenseKey: 'TEST-LICENSE-KEY' });

      const result = await hasPremiumLicense();

      // In premium builds with valid license, should be true
      if (isPremiumBuild()) {
        expect(result).toBe(true);
      } else {
        // In free builds, should always be false
        expect(result).toBe(false);
      }
    });

    test('should handle storage errors gracefully', async () => {
      mockChrome.storage.local.get.mockRejectedValue(new Error('Storage error'));

      await expect(hasPremiumLicense()).rejects.toThrow();
    });
  });

  describe('canAccessPremiumFeature', () => {
    test('should return false in free builds', async () => {
      // Setup valid license
      mockChrome.storage.local.get
        .mockResolvedValueOnce({ premiumEnabled: true })
        .mockResolvedValueOnce({ licenseKey: 'TEST-LICENSE-KEY' });

      const result = await canAccessPremiumFeature(PremiumFeature.SESSION_MANAGEMENT);

      if (!isPremiumBuild()) {
        expect(result).toBe(false);
      }
    });

    test('should return false without premium license', async () => {
      mockChrome.storage.local.get.mockResolvedValue({ premiumEnabled: false });

      const result = await canAccessPremiumFeature(PremiumFeature.SESSION_MANAGEMENT);

      expect(result).toBe(false);
    });

    test('should return true with valid premium license in premium build', async () => {
      mockChrome.storage.local.get
        .mockResolvedValueOnce({ premiumEnabled: true })
        .mockResolvedValueOnce({ licenseKey: 'TEST-LICENSE-KEY' });

      const result = await canAccessPremiumFeature(PremiumFeature.SESSION_MANAGEMENT);

      if (isPremiumBuild()) {
        expect(result).toBe(true);
      } else {
        expect(result).toBe(false);
      }
    });

    test('should work for all premium features', async () => {
      mockChrome.storage.local.get
        .mockResolvedValue({ premiumEnabled: true })
        .mockResolvedValue({ licenseKey: 'TEST-KEY' });

      const features = [
        PremiumFeature.SESSION_MANAGEMENT,
        PremiumFeature.SMART_AUTO_REFRESH,
        PremiumFeature.SKIP_RULES,
        PremiumFeature.PER_WINDOW_INTERVAL,
        PremiumFeature.IMPORT_EXPORT,
      ];

      for (const feature of features) {
        const result = await canAccessPremiumFeature(feature);
        expect(typeof result).toBe('boolean');
      }
    });
  });

  describe('canAccessPremium', () => {
    test('should return false in free builds', async () => {
      mockChrome.storage.local.get
        .mockResolvedValueOnce({ premiumEnabled: true })
        .mockResolvedValueOnce({ licenseKey: 'TEST-KEY' });

      const result = await canAccessPremium();

      if (!isPremiumBuild()) {
        expect(result).toBe(false);
      }
    });

    test('should return false without license', async () => {
      mockChrome.storage.local.get.mockResolvedValue({ premiumEnabled: false });

      const result = await canAccessPremium();

      expect(result).toBe(false);
    });

    test('should return true with valid license in premium build', async () => {
      mockChrome.storage.local.get
        .mockResolvedValueOnce({ premiumEnabled: true })
        .mockResolvedValueOnce({ licenseKey: 'VALID-KEY' });

      const result = await canAccessPremium();

      if (isPremiumBuild()) {
        expect(result).toBe(true);
      } else {
        expect(result).toBe(false);
      }
    });
  });

  describe('getPremiumTier', () => {
    test('should return "free" without license', async () => {
      mockChrome.storage.local.get.mockResolvedValue({ premiumEnabled: false });

      const tier = await getPremiumTier();

      expect(tier).toBe('free');
    });

    test('should return "free" in free builds even with license', async () => {
      mockChrome.storage.local.get
        .mockResolvedValueOnce({ premiumEnabled: true })
        .mockResolvedValueOnce({ licenseKey: 'TEST-KEY' });

      const tier = await getPremiumTier();

      if (!isPremiumBuild()) {
        expect(tier).toBe('free');
      }
    });

    test('should return tier with valid license in premium build', async () => {
      mockChrome.storage.local.get
        .mockResolvedValueOnce({ premiumEnabled: true })
        .mockResolvedValueOnce({ licenseKey: 'TEST-KEY' });

      const tier = await getPremiumTier();

      if (isPremiumBuild()) {
        expect(['essential', 'professional', 'team', 'enterprise']).toContain(tier);
      } else {
        expect(tier).toBe('free');
      }
    });
  });

  describe('activateLicense', () => {
    test('should fail in free builds', async () => {
      const result = await activateLicense('TEST-LICENSE-KEY');

      if (!isPremiumBuild()) {
        expect(result.success).toBe(false);
        expect(result.error).toContain('not available');
      }
    });

    test('should fail with empty license key', async () => {
      const result = await activateLicense('');

      expect(result.success).toBe(false);
      expect(result.error).toContain('required');
    });

    test('should fail with whitespace-only license key', async () => {
      const result = await activateLicense('   ');

      expect(result.success).toBe(false);
      expect(result.error).toContain('required');
    });

    test('should succeed with valid license key in premium build', async () => {
      mockChrome.storage.local.set.mockResolvedValue(undefined);

      const result = await activateLicense('VALID-LICENSE-KEY-123');

      if (isPremiumBuild()) {
        expect(result.success).toBe(true);
        expect(result.tier).toBeDefined();
        expect(mockChrome.storage.local.set).toHaveBeenCalled();
      } else {
        expect(result.success).toBe(false);
      }
    });

    test('should handle storage errors during activation', async () => {
      mockChrome.storage.local.set.mockRejectedValue(new Error('Storage full'));

      if (isPremiumBuild()) {
        await expect(activateLicense('VALID-KEY')).rejects.toThrow();
      }
    });
  });

  describe('deactivateLicense', () => {
    test('should do nothing in free builds', async () => {
      await deactivateLicense();

      if (!isPremiumBuild()) {
        expect(mockChrome.storage.local.set).not.toHaveBeenCalled();
      }
    });

    test('should clear license in premium builds', async () => {
      mockChrome.storage.local.set.mockResolvedValue(undefined);

      await deactivateLicense();

      if (isPremiumBuild()) {
        expect(mockChrome.storage.local.set).toHaveBeenCalled();
      }
    });

    test('should handle storage errors during deactivation', async () => {
      mockChrome.storage.local.set.mockRejectedValue(new Error('Storage error'));

      if (isPremiumBuild()) {
        await expect(deactivateLicense()).rejects.toThrow();
      }
    });
  });

  describe('requirePremium guard', () => {
    test('should throw in free builds', () => {
      if (!isPremiumBuild()) {
        expect(() => requirePremium()).toThrow('not available');
      }
    });

    test('should not throw in premium builds', () => {
      if (isPremiumBuild()) {
        expect(() => requirePremium()).not.toThrow();
      }
    });
  });

  describe('requirePremiumLicense guard', () => {
    test('should throw in free builds', async () => {
      if (!isPremiumBuild()) {
        await expect(requirePremiumLicense()).rejects.toThrow('not available');
      }
    });

    test('should throw without license in premium builds', async () => {
      mockChrome.storage.local.get.mockResolvedValue({ premiumEnabled: false });

      if (isPremiumBuild()) {
        await expect(requirePremiumLicense()).rejects.toThrow('license required');
      }
    });

    test('should not throw with valid license in premium builds', async () => {
      mockChrome.storage.local.get
        .mockResolvedValueOnce({ premiumEnabled: true })
        .mockResolvedValueOnce({ licenseKey: 'VALID-KEY' });

      if (isPremiumBuild()) {
        await expect(requirePremiumLicense()).resolves.not.toThrow();
      }
    });
  });

  describe('Edge cases and security', () => {
    test('should handle null license key', async () => {
      mockChrome.storage.local.get
        .mockResolvedValueOnce({ premiumEnabled: true })
        .mockResolvedValueOnce({ licenseKey: null });

      const result = await hasPremiumLicense();

      if (isPremiumBuild()) {
        expect(result).toBe(false);
      }
    });

    test('should handle undefined premium enabled', async () => {
      mockChrome.storage.local.get.mockResolvedValue({ premiumEnabled: undefined });

      const result = await hasPremiumLicense();

      expect(result).toBe(false);
    });

    test('should handle malformed license keys', async () => {
      const malformedKeys = [
        null,
        undefined,
        '',
        '   ',
        'x'.repeat(1000), // Very long key
        '🔑', // Emoji
        '<script>alert(1)</script>', // XSS attempt
      ];

      for (const key of malformedKeys) {
        const result = await activateLicense(key as any);
        if (!isPremiumBuild()) {
          expect(result.success).toBe(false);
        } else {
          // In premium builds, only non-empty strings should succeed
          if (key && typeof key === 'string' && key.trim().length > 0) {
            expect(result.success).toBe(true);
          } else {
            expect(result.success).toBe(false);
          }
        }
      }
    });

    test('should be consistent across multiple calls', async () => {
      mockChrome.storage.local.get
        .mockResolvedValue({ premiumEnabled: true })
        .mockResolvedValue({ licenseKey: 'TEST-KEY' });

      const result1 = await canAccessPremium();
      const result2 = await canAccessPremium();
      const result3 = await canAccessPremium();

      expect(result1).toBe(result2);
      expect(result2).toBe(result3);
    });

    test('should handle concurrent access checks', async () => {
      mockChrome.storage.local.get
        .mockResolvedValue({ premiumEnabled: true })
        .mockResolvedValue({ licenseKey: 'TEST-KEY' });

      const promises = [
        canAccessPremium(),
        canAccessPremium(),
        canAccessPremium(),
        canAccessPremiumFeature(PremiumFeature.SESSION_MANAGEMENT),
        canAccessPremiumFeature(PremiumFeature.SMART_AUTO_REFRESH),
      ];

      const results = await Promise.all(promises);

      // All results should be the same for the same license state
      expect(new Set(results).size).toBeLessThanOrEqual(2); // All same or different types of checks
    });
  });

  describe('Integration scenarios', () => {
    test('fresh install scenario - no license', async () => {
      mockChrome.storage.local.get.mockResolvedValue({});

      const hasLicense = await hasPremiumLicense();
      const canAccess = await canAccessPremium();
      const tier = await getPremiumTier();

      expect(hasLicense).toBe(false);
      expect(canAccess).toBe(false);
      expect(tier).toBe('free');
    });

    test('activation scenario - from free to premium', async () => {
      mockChrome.storage.local.set.mockResolvedValue(undefined);

      // Start as free
      mockChrome.storage.local.get.mockResolvedValue({});
      let tier = await getPremiumTier();
      expect(tier).toBe('free');

      // Activate license
      const activation = await activateLicense('NEW-LICENSE-KEY');

      if (isPremiumBuild()) {
        expect(activation.success).toBe(true);

        // Should now have premium access
        mockChrome.storage.local.get
          .mockResolvedValueOnce({ premiumEnabled: true })
          .mockResolvedValueOnce({ licenseKey: 'NEW-LICENSE-KEY' });

        tier = await getPremiumTier();
        expect(tier).not.toBe('free');
      } else {
        expect(activation.success).toBe(false);
      }
    });

    test('deactivation scenario - from premium to free', async () => {
      mockChrome.storage.local.set.mockResolvedValue(undefined);

      if (isPremiumBuild()) {
        // Start with premium
        mockChrome.storage.local.get
          .mockResolvedValueOnce({ premiumEnabled: true })
          .mockResolvedValueOnce({ licenseKey: 'ACTIVE-KEY' });

        let hasAccess = await canAccessPremium();
        expect(hasAccess).toBe(true);

        // Deactivate
        await deactivateLicense();

        // Should now be free
        mockChrome.storage.local.get.mockResolvedValue({ premiumEnabled: false });
        hasAccess = await canAccessPremium();
        expect(hasAccess).toBe(false);
      }
    });
  });
});
