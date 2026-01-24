# Fix: Global mode not working after fresh install due to service worker suspension

## 🐛 Critical Bug Fix: Global Mode Installation Issue

### Problem
After a fresh install, when users enabled Global mode tab switching, **no tab switching occurred**. The timer appeared to restart every minute, but tabs never switched.

### Diagnostic Evidence
From user-provided diagnostic logs:
```
[11:25:52] Tab switcher started (60s delay, using alarms)
[11:26:53] Tab switcher started (60s delay, using alarms)
[11:27:18] Tab switcher started (60s delay, using alarms)
[11:28:18] Tab switcher started (60s delay, using alarms)
[11:29:19] Tab switcher started (60s delay, using alarms)
```
- Timer restarted every ~60 seconds
- **Only ONE "Tab switched" log in entire session** (at 11:24:53)
- No errors logged (silent failure)

### Root Cause Analysis

**Two critical issues identified:**

#### Issue #1: Missing `lastSwitchTimes` Initialization
- `lastSwitchTimes` was not initialized in `initializeStorage()`
- On fresh install, this field was `undefined`
- Created edge cases and inconsistent state

#### Issue #2: Service Worker Suspension Breaking Guard Checks (CRITICAL)
**The Main Problem:**
- In-memory `isEnabled` flag was lost when Chrome suspended the service worker
- Alarm listener checked `if (!isEnabled)` BEFORE reading storage
- After suspension, `isEnabled` reset to `false` (default value)
- Guard check returned early, `switchTab()` never called
- Alarm continued firing every minute, but silently failed

**Timeline of Failure:**
```
t=0:    User enables Global mode
        → isEnabled = true ✓
        → Alarm created (60s interval)

t=60s:  Alarm fires (FIRST TIME)
        → isEnabled still true (in memory) ✓
        → switchTab() executes ✓
        → Logs "Tab switched"

t=90s:  Service worker suspended
        → In-memory state LOST
        → isEnabled reset to false ❌

t=120s: Alarm fires (SECOND TIME)
        → Guard check: if (!isEnabled) return ❌
        → switchTab() NEVER CALLED
        → Silent failure continues forever
```

### Solution

**Fix #1: Initialize `lastSwitchTimes`**
```typescript
// src/core/storage.ts:122
lastSwitchTimes: {}, // Initialize on fresh install
```

**Fix #2: Remove Unreliable In-Memory Checks**
```typescript
// src/core/timing-hybrid.ts
// BEFORE (BROKEN):
if (isStopping || !isEnabled) {  // isEnabled lost after suspension
  return;
}

// AFTER (FIXED):
if (isStopping) {  // Only check synchronous flag
  return;
}
// Then check persistent storage:
const enabled = data.enabled ?? DEFAULT_ENABLED;
if (!enabled || isStopping) {
  return;
}
```

**Key Changes:**
- Removed `isEnabled` flag entirely
- All guard checks now use persistent `chrome.storage.local` values
- Only `isStopping` flag remains for immediate synchronous protection
- Works correctly across service worker suspensions

### Files Changed

**Modified:**
- `src/core/storage.ts` - Added `lastSwitchTimes: {}` initialization
- `src/core/timing-hybrid.ts` - Removed `isEnabled` flag and unreliable checks

**Documentation:**
- `.claude/docs/bug-fixes/WINDOW_MODE_SERVICE_WORKER_GAPS.md` - Analysis of Window mode resilience

### Window Mode Validation

Also validated Window mode for similar issues:
- ✅ **Window mode WORKS correctly** after suspension
- ✅ Primary guards check storage values first
- ⚠️ Missing keep-alive mechanism (documented for v2.0)
- ⚠️ Has unused `restoreTimers()` method (future optimization)

**Verdict:** Window mode is safe but has enhancement opportunities documented for future releases.

### Testing

✅ **All Tests Passing**
```
Test Suites: 13 passed, 13 total
Tests:       326 passed, 326 total
```

✅ **Build Successful**
- No compilation errors
- All TypeScript checks pass

### Impact

**Before Fix:**
- ❌ Global mode completely broken after fresh install
- ❌ Tabs never switched (only first switch worked)
- ❌ Silent failure (no errors logged)

**After Fix:**
- ✅ Global mode works correctly on fresh install
- ✅ Tab switching continues after service worker suspension
- ✅ Survives Chrome's service worker lifecycle management

### Backward Compatibility

✅ **Fully backward compatible**
- No breaking changes to API
- No storage schema changes (just initialization)
- Existing users automatically benefit from fix

### Related Issues

Fixes the critical installation bug reported in diagnostic logs where Global mode tab switching failed silently after fresh install.

---

**Severity:** Critical
**Priority:** P0 - Blocking release
**Type:** Bug Fix
**Testing:** All tests passing (326/326)
**Branch:** `claude/fix-global-mode-install-a73RE`
**Base:** `main`
