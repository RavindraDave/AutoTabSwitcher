/**
 * Feature Access
 *
 * Every feature is free and available to everyone: there is no licence key,
 * activation or tiering. The functions below are kept so existing callers keep
 * working, and they always allow access.
 */

/**
 * Feature enumeration, kept for granular checks at call sites
 */
export enum PremiumFeature {
  SESSION_MANAGEMENT = 'session_management',
  SMART_AUTO_REFRESH = 'smart_auto_refresh',
  SKIP_RULES = 'skip_rules',
  PER_WINDOW_INTERVAL = 'per_window_interval',
  IMPORT_EXPORT = 'import_export',
  ADVANCED_SCHEDULING = 'advanced_scheduling',
  CUSTOM_SEQUENCES = 'custom_sequences',
  ANALYTICS = 'analytics',
  TEAM_SHARING = 'team_sharing',
}

/** All features are included in every build. */
export function isPremiumBuild(): boolean {
  return true;
}

/** Access is always granted; no licence is required. */
export async function hasPremiumLicense(): Promise<boolean> {
  return true;
}

/** Access to every feature is always granted. */
export async function canAccessPremiumFeature(_feature: PremiumFeature): Promise<boolean> {
  return true;
}

/** Access is always granted. */
export async function canAccessPremium(): Promise<boolean> {
  return true;
}

/** There is a single tier: everything is included. */
export async function getPremiumTier(): Promise<'free' | 'essential' | 'professional' | 'team' | 'enterprise'> {
  return 'professional';
}

/** No-op guard, kept for existing callers. */
export function requirePremium(): void {
  // Everything is available.
}

/** No-op guard, kept for existing callers. */
export async function requirePremiumLicense(): Promise<void> {
  // Everything is available.
}
