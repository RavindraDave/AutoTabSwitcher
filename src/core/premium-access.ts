/**
 * Premium Feature Access Control
 *
 * This module provides multi-layer protection for premium features:
 * 1. Build-time exclusion: Premium code removed from free builds via tree-shaking
 * 2. Runtime license check: Validates premium status from storage
 * 3. Future: Server-side validation for license verification
 */

import { PREMIUM_FEATURES_AVAILABLE } from './constants.js';
import { isPremiumEnabled, getLicenseKey } from './storage.js';

/**
 * Premium feature enumeration for granular access control
 */
export enum PremiumFeature {
  SESSION_MANAGEMENT = 'session_management',
  SMART_AUTO_REFRESH = 'smart_auto_refresh',
  SKIP_RULES = 'skip_rules',
  PER_WINDOW_INTERVAL = 'per_window_interval',
  IMPORT_EXPORT = 'import_export',
  ADVANCED_SCHEDULING = 'advanced_scheduling', // Phase 2
  CUSTOM_SEQUENCES = 'custom_sequences', // Phase 2
  ANALYTICS = 'analytics', // Phase 3
  TEAM_SHARING = 'team_sharing', // Phase 3
}

/**
 * Feature availability by phase
 * Used to control gradual rollout of premium features
 * TODO (Phase 2+): Use this for feature-specific availability checks
 *
 * Currently unused - will be used in canAccessPremiumFeature() in Phase 2+
 */
// @ts-ignore - Unused in Phase 1, will be used in Phase 2+
const _FEATURE_PHASES = {
  phase1: [
    PremiumFeature.SESSION_MANAGEMENT,
    PremiumFeature.SMART_AUTO_REFRESH,
    PremiumFeature.SKIP_RULES,
    PremiumFeature.PER_WINDOW_INTERVAL,
    PremiumFeature.IMPORT_EXPORT,
  ],
  phase2: [
    PremiumFeature.ADVANCED_SCHEDULING,
    PremiumFeature.CUSTOM_SEQUENCES,
  ],
  phase3: [
    PremiumFeature.ANALYTICS,
    PremiumFeature.TEAM_SHARING,
  ],
} as const;

/**
 * Check if premium features are available in this build
 *
 * Build-time check: Returns false in free builds (code eliminated via tree-shaking)
 * This is the first layer of protection against reverse engineering
 *
 * @returns true if this is a premium build, false otherwise
 */
export function isPremiumBuild(): boolean {
  return PREMIUM_FEATURES_AVAILABLE;
}

/**
 * Check if user has premium access (runtime license check)
 *
 * This performs a runtime check of the user's license status
 * Should be used in addition to build-time checks
 *
 * @returns Promise<boolean> true if user has valid premium license
 */
export async function hasPremiumLicense(): Promise<boolean> {
  // Build-time guard: Premium features not available in free builds
  if (!PREMIUM_FEATURES_AVAILABLE) {
    return false;
  }

  // Runtime license check
  const premiumEnabled = await isPremiumEnabled();
  if (!premiumEnabled) {
    return false;
  }

  // Validate license key exists
  const licenseKey = await getLicenseKey();
  if (!licenseKey) {
    return false;
  }

  // TODO (Phase 2): Add server-side license validation
  // - Verify license key with licensing server
  // - Check expiration date
  // - Validate seat count for team licenses
  // - Rate limit validation requests to prevent abuse

  return true;
}

/**
 * Check if user can access a specific premium feature
 *
 * This is the main access control function that should be used
 * before enabling any premium functionality
 *
 * Usage:
 * ```typescript
 * if (await canAccessPremiumFeature(PremiumFeature.SESSION_MANAGEMENT)) {
 *   // Show session management UI
 * } else {
 *   // Show upgrade prompt
 * }
 * ```
 *
 * @param _feature The premium feature to check (unused in Phase 1, will be used in Phase 2+)
 * @returns Promise<boolean> true if user can access this feature
 */
export async function canAccessPremiumFeature(_feature: PremiumFeature): Promise<boolean> {
  // Build-time guard: Premium features not available in free builds
  if (!PREMIUM_FEATURES_AVAILABLE) {
    return false;
  }

  // Runtime license check
  if (!await hasPremiumLicense()) {
    return false;
  }

  // TODO (Phase 2+): Add feature-specific availability checks
  // - Check if feature is enabled in current phase (use _feature and FEATURE_PHASES)
  // - Validate feature flags from server
  // - Check tier-specific feature access (Essential vs Professional)

  return true;
}

/**
 * Check if user can access any premium feature (general check)
 *
 * Simplified version for general "is premium" checks
 *
 * @returns Promise<boolean> true if user has any premium access
 */
export async function canAccessPremium(): Promise<boolean> {
  if (!PREMIUM_FEATURES_AVAILABLE) {
    return false;
  }

  return await hasPremiumLicense();
}

/**
 * Get user's premium tier
 *
 * @returns Promise<'free' | 'essential' | 'professional' | 'team' | 'enterprise'>
 */
export async function getPremiumTier(): Promise<'free' | 'essential' | 'professional' | 'team' | 'enterprise'> {
  if (!PREMIUM_FEATURES_AVAILABLE) {
    return 'free';
  }

  if (!await hasPremiumLicense()) {
    return 'free';
  }

  // TODO (Phase 2): Parse license key to determine tier
  // For now, assume 'professional' for any valid license
  return 'professional';
}

/**
 * Validate and activate a license key
 *
 * @param licenseKey The license key to activate
 * @returns Promise<{success: boolean, error?: string, tier?: string}>
 */
export async function activateLicense(licenseKey: string): Promise<{
  success: boolean;
  error?: string;
  tier?: string;
}> {
  if (!PREMIUM_FEATURES_AVAILABLE) {
    return {
      success: false,
      error: 'Premium features are not available in this build',
    };
  }

  // Basic validation
  if (!licenseKey || licenseKey.trim().length === 0) {
    return {
      success: false,
      error: 'License key is required',
    };
  }

  // TODO (Phase 2): Implement proper license validation
  // - Verify format (e.g., XXXX-XXXX-XXXX-XXXX)
  // - Contact licensing server for validation
  // - Verify license hasn't been revoked
  // - Check device limit for license
  // - Store activation timestamp

  // For now, accept any non-empty key (development only)
  const { setLicenseKey, setPremiumEnabled } = await import('./storage.js');
  await setLicenseKey(licenseKey);
  await setPremiumEnabled(true);

  return {
    success: true,
    tier: 'professional', // TODO: Get from server response
  };
}

/**
 * Deactivate current license (for testing or license transfer)
 *
 * @returns Promise<void>
 */
export async function deactivateLicense(): Promise<void> {
  if (!PREMIUM_FEATURES_AVAILABLE) {
    return;
  }

  // TODO (Phase 2): Notify licensing server of deactivation

  const { setPremiumEnabled, setLicenseKey } = await import('./storage.js');
  await setPremiumEnabled(false);
  await setLicenseKey('');
}

/**
 * Guard function for premium code blocks
 * Throws error if premium features are not available
 *
 * Use this at the start of premium functions to fail-fast
 *
 * Usage:
 * ```typescript
 * async function saveSession(session: SavedSession) {
 *   requirePremium(); // Throws if not premium build
 *   // ... rest of implementation
 * }
 * ```
 */
export function requirePremium(): void {
  if (!PREMIUM_FEATURES_AVAILABLE) {
    throw new Error('Premium features are not available in this build');
  }
}

/**
 * Async guard function for premium code blocks with license check
 * Throws error if user doesn't have premium license
 *
 * Usage:
 * ```typescript
 * async function saveSession(session: SavedSession) {
 *   await requirePremiumLicense(); // Throws if no valid license
 *   // ... rest of implementation
 * }
 * ```
 */
export async function requirePremiumLicense(): Promise<void> {
  requirePremium(); // Build-time check

  if (!await hasPremiumLicense()) {
    throw new Error('Premium license required. Please upgrade to access this feature.');
  }
}
