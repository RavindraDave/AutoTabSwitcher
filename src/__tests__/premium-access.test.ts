/**
 * Feature access: every feature is free, so all checks always allow access.
 */

import {
  PremiumFeature,
  isPremiumBuild,
  hasPremiumLicense,
  canAccessPremium,
  canAccessPremiumFeature,
  getPremiumTier,
  requirePremium,
  requirePremiumLicense,
} from '../core/premium-access';

describe('Feature access', () => {
  test('every build includes all features', () => {
    expect(isPremiumBuild()).toBe(true);
  });

  test('no licence is required', async () => {
    await expect(hasPremiumLicense()).resolves.toBe(true);
    await expect(canAccessPremium()).resolves.toBe(true);
  });

  test('every feature is accessible', async () => {
    for (const feature of Object.values(PremiumFeature)) {
      await expect(canAccessPremiumFeature(feature)).resolves.toBe(true);
    }
  });

  test('there is a single tier with everything included', async () => {
    await expect(getPremiumTier()).resolves.toBe('professional');
  });

  test('guards never throw', async () => {
    expect(() => requirePremium()).not.toThrow();
    await expect(requirePremiumLicense()).resolves.toBeUndefined();
  });
});
