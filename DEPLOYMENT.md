# Deployment Guide - Chrome Web Store

## Overview

This guide explains how to configure the extension for production deployment to the Chrome Web Store, including support for delays as low as 5 seconds.

## Chrome alarms API Constraints

### Development (Unpacked Extension)
- Minimum delay: **60 seconds (1 minute)**
- API: `chrome.alarms`
- Reason: Chrome enforces stricter limits during development

### Production (Packed Extension - Chrome Web Store)
- Chrome alarms API minimum: **30 seconds** (Chrome 120+) or **60 seconds** (older versions)
- **For sub-30-second delays**: Use alternative implementation

## Supporting 5-Second Minimum Delay

Since Chrome's alarms API doesn't support 5-second intervals even for packed extensions, we need a **hybrid approach**:

### Option 1: Service Worker with setInterval (Simple, Some Limitations)

**Pros:**
- Simple implementation
- Works for most use cases

**Cons:**
- Service worker can be terminated (timer stops)
- Not 100% reliable for long sessions
- May miss intervals if service worker is inactive

**Implementation:**
Use `setInterval` for delays < 30 seconds, `chrome.alarms` for >= 30 seconds.

### Option 2: Offscreen Document (Most Reliable)

**Pros:**
- Persistent, won't be terminated
- Reliable timing
- Recommended by Chrome for timers

**Cons:**
- More complex implementation
- Additional files needed

**Implementation:**
Create an offscreen document that maintains the timer and communicates with the service worker.

### Option 3: Hybrid Approach (Recommended)

Combine both approaches:
- **Delays >= 30 seconds**: Use `chrome.alarms` (most efficient)
- **Delays < 30 seconds**: Use offscreen document or service worker timer

## Changes Required for Chrome Web Store

### 1. Update manifest.json

Add offscreen document permission:

```json
{
  "manifest_version": 3,
  "name": "Auto Tab Switcher",
  "permissions": [
    "tabs",
    "activeTab",
    "storage",
    "alarms",
    "offscreen"
  ],
  "minimum_chrome_version": "109"
}
```

### 2. Update Constants

In `src/background.ts`:

```typescript
// Production constants (for Chrome Web Store)
const MIN_DELAY_MS_DEVELOPMENT = 60000; // 1 minute for unpacked
const MIN_DELAY_MS_PRODUCTION = 5000;   // 5 seconds for packed
const MIN_ALARM_DELAY_MS = 30000;       // Chrome alarms minimum (packed)

// Detect if running as packed extension
const isPacked = !chrome.runtime.getManifest().update_url;
const MIN_DELAY_MS = isPacked ? MIN_DELAY_MS_PRODUCTION : MIN_DELAY_MS_DEVELOPMENT;
```

### 3. Update popup constants

In `src/popup/popup.ts`:

```typescript
// Detection function (same as background)
function getMinDelay(): number {
  const isPacked = !chrome.runtime.getManifest().update_url;
  return isPacked ? 5 : 60; // 5 seconds for packed, 60 for unpacked
}

const MIN_DELAY_SECONDS = getMinDelay();
```

## Production Build Steps

### 1. Clean Build
```bash
npm run clean
npm run build
```

### 2. Update Version
Update version in `src/manifest.json`:
```json
{
  "version": "1.1.0"
}
```

### 3. Create Distribution Package

```bash
# Create a dist-release folder with only necessary files
mkdir -p dist-release
cp -r dist/* dist-release/
cd dist-release
zip -r ../auto-tab-switcher-v1.1.0.zip .
cd ..
```

### 4. Test Packed Extension Locally

Before uploading to Chrome Web Store:

1. Pack the extension:
   - Go to `chrome://extensions/`
   - Click "Pack extension"
   - Select `dist` directory
   - Chrome creates `.crx` and `.pem` files

2. Test the packed extension:
   - Drag the `.crx` file to Chrome
   - Verify 5-second minimum works

### 5. Chrome Web Store Upload

1. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. Upload the `.zip` file (NOT the `.crx`)
3. Fill in store listing details
4. Submit for review

## Configuration Checklist

Before uploading to Chrome Web Store:

- [ ] Update version number in `manifest.json`
- [ ] Set minimum delay to 5 seconds for production
- [ ] Add offscreen permission if using offscreen documents
- [ ] Test packed extension locally
- [ ] Verify timer works at 5-second intervals
- [ ] Clean build (`npm run build`)
- [ ] Create ZIP package from `dist/` folder
- [ ] Test ZIP contents (ensure all files present)
- [ ] Upload to Chrome Web Store
- [ ] Test published extension after approval

## Environment Detection

The extension automatically detects whether it's running as packed or unpacked:

```typescript
// Returns true for packed extensions (Chrome Web Store)
// Returns false for unpacked extensions (development)
const isPacked = !chrome.runtime.getManifest().update_url;
```

This allows different minimum delays for development vs. production.

## Recommended Architecture

For the best user experience with 5-second support:

1. **Use hybrid timing approach**:
   - Delays >= 30s: `chrome.alarms` API (efficient)
   - Delays < 30s: Offscreen document (reliable)

2. **Environment-aware constants**:
   - Development: 60-second minimum
   - Production: 5-second minimum

3. **User messaging**:
   - Show different limits based on environment
   - Explain why development has higher minimum

## Testing

### Development Testing
```bash
npm run build
# Load unpacked extension from dist/
# Verify 60-second minimum enforced
```

### Production Testing
```bash
npm run build
# Pack extension via chrome://extensions/
# Install packed extension
# Verify 5-second minimum works
```

## Notes

- **Service Worker Limitations**: For sub-30-second delays, the service worker may be terminated, causing timer interruptions
- **Offscreen Documents**: More reliable but require additional implementation
- **User Expectations**: Clearly document the minimum delay in the Chrome Web Store listing
- **Battery Impact**: Warn users that very short delays (5s) may impact battery life

## References

- [Chrome Alarms API](https://developer.chrome.com/docs/extensions/reference/alarms/)
- [Offscreen Documents](https://developer.chrome.com/docs/extensions/reference/offscreen/)
- [Chrome Web Store Publishing](https://developer.chrome.com/docs/webstore/publish/)
