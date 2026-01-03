# Global Mode Bug Fixes

**Date**: 2026-01-03
**Branch**: `claude/fix-global-mode-issues-Auz9t`

## Issues Fixed

### Issue 1: Tab Switching Not Working in Global Mode
**Severity**: Critical
**Symptoms**: After enabling Global mode, automatic tab switching does not occur

**Root Cause**:
- File: `src/core/tab-switcher.ts:69`
- The code used `chrome.windows.getCurrent()` in a Manifest V3 service worker context
- `getCurrent()` doesn't work reliably in service workers because they don't run within a window context
- This caused the tab switcher to fail to identify the target window for switching

**Fix**:
- Changed `chrome.windows.getCurrent()` to `chrome.windows.getLastFocused()`
- `getLastFocused()` correctly retrieves the most recently focused window, which is what Global mode should target
- Added clear comments explaining the service worker compatibility issue

### Issue 2: Timer Always Showing 60 Seconds
**Severity**: High
**Symptoms**: On clicking the extension badge, the countdown timer always shows the full interval (60 seconds) instead of the actual time remaining

**Root Cause**:
- File: `src/popup/index.ts`
- When enabling Global mode, no `lastSwitchTimes` timestamp was being set
- This meant the popup couldn't calculate when the timer actually started
- Combined with Issue 1 (tabs not switching), the `lastSwitchTimes` was never updated, so the timer would always reset

**Fix**:
- Modified `handleToggle()` function to initialize `lastSwitchTimes[currentWindowId]` when enabling Global mode
- This ensures the countdown starts properly from the current time
- Now the popup can accurately calculate and display the countdown

## Files Changed

1. **src/core/tab-switcher.ts**
   - Line 71: Changed `getCurrent()` to `getLastFocused()`
   - Added explanatory comments about service worker compatibility

2. **src/popup/index.ts**
   - Lines 356-364: Added timer initialization when enabling Global mode
   - Sets `lastSwitchTimes[currentWindowId] = Date.now()` to properly start countdown

3. **src/__tests__/tab-switcher.test.ts**
   - Lines 151, 158, 178, 185: Updated mocks from `getCurrent` to `getLastFocused`
   - Line 37: Added `getLastFocused` mock reset in beforeEach

4. **src/__tests__/setup.ts**
   - Line 96: Added `getLastFocused` mock to windows API

## Testing

All existing tests pass:
- ✅ badge-integration.test.ts
- ✅ badge-manager.test.ts
- ✅ window-state-manager.test.ts
- ✅ mode-switcher.test.ts
- ✅ background.test.ts
- ✅ **tab-switcher.test.ts** (updated for new API)
- ✅ storage.test.ts
- ✅ logger.test.ts
- ✅ timer-manager.test.ts
- ✅ All other test suites

## Impact Analysis

### What Changed:
- Tab switching in Global mode now correctly targets the last focused window
- Timer countdown in Global mode now displays accurate time remaining

### What Didn't Change:
- Window Mode functionality (unchanged, uses separate code path)
- Current-Window Mode functionality (unchanged)
- Badge display logic (unchanged)
- Storage structure (backward compatible - just initializes existing field)
- All other extension features (unchanged)

## Backward Compatibility

These changes are **fully backward compatible**:
- No new storage fields added
- Uses existing `lastSwitchTimes` structure
- No breaking changes to any APIs
- Users upgrading will see fixes immediately without migration

## Verification Steps

To verify these fixes work:

1. **Test Tab Switching in Global Mode**:
   - Switch to Global mode
   - Enable auto-switching
   - Verify tabs switch automatically every N seconds
   - Check that switching happens in the currently focused window

2. **Test Timer Countdown**:
   - Enable Global mode
   - Click extension icon to open popup
   - Verify countdown shows accurate time remaining (not always 60)
   - Wait for countdown to reach 0 and verify tab switches
   - Reopen popup and verify countdown continues from correct position

3. **Test Window Mode Still Works**:
   - Switch to Window mode
   - Enable current window
   - Verify tabs still switch in that window only
   - Verify timer countdown works correctly

## Related Issues

These fixes address the core problems preventing Global mode from functioning properly. If you encounter any issues with Global mode in the future, check:

1. Service worker compatibility (always use `getLastFocused()` instead of `getCurrent()` in background scripts)
2. Timer initialization (ensure `lastSwitchTimes` is set when enabling)
3. Storage updates (ensure all relevant timestamps are being updated)
