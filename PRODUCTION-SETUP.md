# Production Setup Guide - 5 Second Minimum Delay

## Quick Start

To prepare the extension for Chrome Web Store with 5-second minimum delay support:

```bash
# Run the automated preparation script
bash scripts/prepare-production.sh
```

This will:
1. Switch to hybrid implementation (supports 5s minimum)
2. Build the extension
3. Create a release package ready for Chrome Web Store upload

## What Changes for Production

### Current Implementation (Development)
- **File**: `src/background.ts`
- **Minimum delay**: 60 seconds (Chrome's minimum for unpacked extensions)
- **Timing**: `chrome.alarms` API only

### Production Implementation (Chrome Web Store)
- **File**: `src/background-hybrid.ts`
- **Minimum delay**: 5 seconds
- **Timing**: Hybrid approach
  - Delays >= 30s: Uses `chrome.alarms` (efficient)
  - Delays < 30s: Uses `setInterval` (may be interrupted)

## Manual Setup (Alternative to Script)

If you prefer manual setup:

### 1. Replace background.ts

```bash
cp src/background-hybrid.ts src/background.ts
```

### 2. Replace popup.ts

```bash
cp src/popup/popup-hybrid.ts src/popup/popup.ts
```

### 3. Build

```bash
npm run build
```

### 4. Package for Chrome Web Store

```bash
cd dist
zip -r ../auto-tab-switcher.zip . -x "*.map"
cd ..
```

## Key Differences

### Environment Detection

Both files automatically detect the environment:

```typescript
// Returns true for packed extensions (Chrome Web Store)
// Returns false for unpacked extensions (development)
const isPacked = (): boolean => {
  return !chrome.runtime.getManifest().update_url;
};
```

### Adaptive Minimum Delays

**Development (Unpacked)**:
- MIN_DELAY_MS = 60000 (60 seconds)
- Uses `chrome.alarms` API exclusively

**Production (Packed)**:
- MIN_DELAY_MS = 5000 (5 seconds)
- Uses hybrid timing:
  - `chrome.alarms` for >= 30s
  - `setInterval` for < 30s

### User Interface

The popup automatically shows appropriate limits:

**Development**:
```
Minimum delay: 60 seconds
Production version allows 5-second minimum
```

**Production**:
```
Minimum delay: 5 seconds
```

## Caveats and Limitations

### setInterval Limitations (< 30 second delays)

When using delays < 30 seconds:

⚠️ **Service Worker Termination**: Chrome may terminate the service worker, interrupting the timer

**Workaround**: The service worker restarts on:
- Extension startup
- Settings change
- Storage events
- Window creation

### Recommendations

For the best user experience:

1. **Encourage longer delays**: Recommend 30+ seconds for reliability
2. **Document limitations**: Explain that very short delays may be interrupted
3. **Add user warning**: Show a notice for delays < 30 seconds

Example warning in popup:
```
⚠️ Delays under 30 seconds may be interrupted when the browser is idle.
For maximum reliability, use 30 seconds or more.
```

## Testing Production Build

### 1. Pack the Extension

1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Pack extension"
4. Root directory: Select `dist` folder
5. Chrome creates `.crx` and `.pem` files

### 2. Install Packed Extension

1. Drag the `.crx` file to Chrome
2. Confirm installation

### 3. Test 5-Second Minimum

1. Open extension popup
2. Set delay to 5 seconds
3. Enable the extension
4. Verify tabs switch every 5 seconds

### 4. Test Edge Cases

- [ ] Set to 5 seconds - should work
- [ ] Set to 3 seconds - should show error
- [ ] Set to 30 seconds - should use alarms
- [ ] Set to 60 seconds - should use alarms
- [ ] Disable and re-enable - should restart timer
- [ ] Close all windows and reopen - should restore state

## Restoring Development Version

To switch back to development version:

```bash
# Restore from backups
mv src/background.ts.backup src/background.ts
mv src/popup/popup.ts.backup src/popup/popup.ts

# Rebuild
npm run build
```

## Chrome Web Store Submission

### Checklist

- [ ] Run `bash scripts/prepare-production.sh`
- [ ] Test packed extension locally
- [ ] Verify 5-second minimum works
- [ ] Update version in `manifest.json`
- [ ] Create screenshots for store listing
- [ ] Write store description
- [ ] Upload ZIP file (NOT .crx)
- [ ] Submit for review

### Store Listing Tips

**Mention in description**:
```
✨ Configurable delay from 5 seconds to 1 hour
⚠️ Note: Delays under 30 seconds may be interrupted when browser is idle
```

## Version Management

Recommended workflow:

1. **Development**: Use standard `background.ts` (60s minimum)
2. **Pre-release Testing**: Switch to hybrid version
3. **Release**: Upload hybrid version to Chrome Web Store
4. **Post-release**: Keep hybrid version for future updates

## Files Reference

### Development Files
- `src/background.ts` - Standard version (60s minimum)
- `src/popup/popup.ts` - Standard version (60s minimum)

### Production Files
- `src/background-hybrid.ts` - Hybrid version (5s minimum)
- `src/popup/popup-hybrid.ts` - Adaptive UI version

### Build Scripts
- `scripts/prepare-production.sh` - Automated production setup
- `scripts/copy-assets.js` - Asset pipeline

### Documentation
- `DEPLOYMENT.md` - Detailed deployment guide
- `PRODUCTION-SETUP.md` - This file
- `README.md` - User documentation

## Troubleshooting

### Issue: Timer stops working

**Cause**: Service worker terminated (for < 30s delays)

**Solution**:
- Interact with the browser (opens a tab, clicks extension icon)
- Service worker will restart and restore timer

### Issue: Minimum is still 60 seconds after deploying

**Cause**: Extension not detected as packed

**Check**:
```javascript
// In browser console (background.js)
console.log(chrome.runtime.getManifest().update_url);
// Should be undefined for unpacked, defined for packed
```

### Issue: Build fails

**Solution**:
```bash
npm run clean
rm -rf node_modules
npm install
npm run build
```

## Support

For issues or questions:
1. Check `DEPLOYMENT.md` for detailed information
2. Review Chrome Extension documentation
3. Test with packed extension locally before uploading

## References

- [Chrome Alarms API](https://developer.chrome.com/docs/extensions/reference/alarms/)
- [Service Workers](https://developer.chrome.com/docs/extensions/mv3/service_workers/)
- [Chrome Web Store Publishing](https://developer.chrome.com/docs/webstore/publish/)
