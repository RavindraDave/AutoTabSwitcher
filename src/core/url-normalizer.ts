/**
 * URL Normalizer
 *
 * Converts URLs into stable storage keys for per-tab delay lookups.
 * The key is composed of origin + pathname, intentionally ignoring
 * query strings and hash fragments so that rotating SPA URLs
 * (e.g., /dashboard?tab=1 and /dashboard?tab=2) collapse to one entry.
 *
 * SECURITY: Only http(s)/file/ftp schemes are considered eligible.
 * chrome://, javascript:, data:, and other schemes return null to
 * prevent storing sensitive URLs or allowing scheme spoofing.
 */

/**
 * Allowed URL schemes for per-tab delay storage.
 */
const ALLOWED_SCHEMES = new Set(['http:', 'https:', 'file:', 'ftp:']);

/**
 * Normalize a URL string into a storage key (origin + pathname).
 *
 * Returns null if the URL is invalid, empty, or uses a disallowed
 * scheme (e.g., chrome://, javascript:).
 *
 * @param url - The raw URL from a chrome.tabs.Tab
 * @returns The normalized storage key, or null if ineligible
 */
export function normalizeUrlKey(url: string | undefined | null): string | null {
  if (!url || typeof url !== 'string') {
    return null;
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  if (!ALLOWED_SCHEMES.has(parsed.protocol)) {
    return null;
  }

  // Collapse trailing slashes so "/dashboard" and "/dashboard/" are equivalent,
  // but preserve the root "/" when pathname is empty or just "/".
  const pathname = parsed.pathname.replace(/\/+$/, '') || '/';
  return `${parsed.origin}${pathname}`;
}

/**
 * Check if a URL is eligible for a per-tab delay entry.
 *
 * @param url - The raw URL
 * @returns true if eligible, false otherwise
 */
export function isUrlEligibleForPerTabDelay(url: string | undefined | null): boolean {
  return normalizeUrlKey(url) !== null;
}

/**
 * Build a short display label from a normalized URL key.
 * Used when the user hasn't supplied their own label.
 *
 * @param urlKey - The normalized URL key
 * @returns A human-readable label (hostname + pathname)
 */
export function buildDefaultLabelFromUrl(urlKey: string): string {
  try {
    const parsed = new URL(urlKey);
    const path = parsed.pathname === '/' ? '' : parsed.pathname;
    return `${parsed.hostname}${path}`;
  } catch {
    return urlKey;
  }
}
