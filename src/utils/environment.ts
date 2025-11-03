/**
 * Environment detection utilities
 */

/**
 * Detect if the extension is running as a packed (production) extension
 * or unpacked (development) extension.
 *
 * Packed extensions have an update_url in the manifest (from Chrome Web Store),
 * while unpacked extensions loaded via "Load unpacked" do not.
 *
 * @returns true if packed (production), false if unpacked (development)
 */
export function isPacked(): boolean {
  return !!chrome.runtime.getManifest().update_url;
}
