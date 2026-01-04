# Window Mode Service Worker Suspension Gaps

**Status**: Identified during Global mode fix validation
**Date**: 2026-01-04
**Severity**: MEDIUM (Window mode works, but lacks resilience features)

## Summary

Window mode tab switching continues to work after service worker suspension (unlike the critical Global mode bug), but lacks the keep-alive and restoration mechanisms that Global mode has.

## Current Behavior

✅ **What Works:**
- Window mode alarm handler checks storage values FIRST
- `data.windowStates[windowId].enabled` is persistent
- Even after service worker suspension, alarms continue to fire
- Tab switching continues to work

⚠️ **What's Missing:**
- No keep-alive alarm to detect suspension
- No heartbeat mechanism (like `lastIntervalCheck`)
- `restoreTimers()` method exists but is never called
- Relies on assumptions about alarm persistence

## Detailed Analysis

### 1. Guard Check Comparison

**Global Mode (After Fix):**
```typescript
// Primary guard: storage value
const data = await getSettings(['enabled']);
const enabled = data.enabled ?? DEFAULT_ENABLED;

if (!enabled || isStopping) {
  return;
}
```

**Window Mode (Current):**
```typescript
// Primary guard: storage value (GOOD)
const data = await getSettings(['switchingMode', 'windowStates']);

if (switchingMode === 'window' && data.windowStates[windowId]) {
  // Secondary guard: in-memory flag (unreliable after suspension)
  if (windowTimerManager.isStopping(windowId)) {
    return;
  }

  // Tertiary guard: storage value (GOOD)
  if (windowState.enabled) {
    // More in-memory guards (unreliable)
    if (windowTimerManager.isStopping(windowId)) { ... }
  }
}
```

**Verdict**: Window mode has redundant in-memory checks, but storage checks protect the critical path.

### 2. Missing Features

#### A. Keep-Alive Mechanism
Global mode creates a keep-alive alarm that fires every minute:
```typescript
await chrome.alarms.create(KEEPALIVE_ALARM_NAME, {
  delayInMinutes: 1,
  periodInMinutes: 1
});
```

Window mode has NO equivalent.

**Risk**: If all window alarms are lost (rare but possible), Window mode has no way to detect and restore them.

#### B. Suspension Detection
Global mode stores `lastIntervalCheck` in storage and uses it to detect suspension:
```typescript
const timeSinceLastCheck = Date.now() - lastIntervalCheck;
if (timeSinceLastCheck > (intervalDelayMs * 2)) {
  // Service worker was suspended, restore timer
  await startIntervalTimer(intervalDelayMs);
}
```

Window mode has NO equivalent heartbeat mechanism.

**Risk**: Cannot detect when service worker has been suspended and timers may need restoration.

#### C. Unused Restoration Method
`WindowTimerManager.restoreTimers()` exists (lines 162-174) but is never called:
```typescript
async restoreTimers(windowStates: {...}, delayMs: number): Promise<void> {
  for (const [windowIdStr, state] of Object.entries(windowStates)) {
    const windowId = parseInt(windowIdStr);
    if (state.enabled && !isNaN(windowId)) {
      await this.startTimer(windowId, delayMs);
    }
  }
}
```

**Current Workaround**: `handleWindowModeToggle()` stops ALL timers and recreates them (inefficient).

### 3. Failure Scenarios

#### Scenario A: Extended Idle
```
1. User enables Window mode
2. User doesn't interact with browser for 30+ minutes
3. Service worker gets suspended and terminated
4. Window-specific alarms may be lost (Chrome version dependent)
5. No keep-alive to wake service worker and verify timers
6. User returns, expects tab switching
7. Tab switching may not happen until next app event
```

**Current Mitigation**: User interaction (opening popup, clicking tabs) triggers storage change, which restarts timers.

#### Scenario B: Service Worker Killed Mid-Operation
```
1. handleWindowModeToggle() is creating timers for 5 windows
2. Service worker is killed after 2 timers are created
3. Remaining 3 windows don't get timers
4. Next settings change would fix it, but could have multi-minute gap
```

**Current Mitigation**: Windows without timers simply won't switch tabs until next toggle.

## Recommendations

### Priority 1: CRITICAL (For Production Readiness)

1. **Add Keep-Alive Mechanism for Window Mode**
   ```typescript
   // Location: background.ts in handleWindowModeToggle()
   if (Object.values(windowStates).some(state => state.enabled)) {
     await chrome.alarms.create('window-mode-keepalive', {
       delayInMinutes: 1,
       periodInMinutes: 1
     });
   }
   ```

2. **Implement Suspension Detection**
   ```typescript
   // Location: storage.ts initialization
   lastWindowCheck: Date.now(),

   // Location: background.ts alarm handler
   if (alarm.name === 'window-mode-keepalive') {
     const data = await getSettings(['lastWindowCheck', 'windowStates', 'delayTime']);
     const timeSinceCheck = Date.now() - (data.lastWindowCheck || Date.now());
     const hasEnabledWindows = Object.values(data.windowStates || {}).some(s => s.enabled);

     if (timeSinceCheck > 120000 && hasEnabledWindows) { // 2 minutes
       await windowTimerManager.restoreTimers(data.windowStates, data.delayTime);
     }

     await chrome.storage.local.set({ lastWindowCheck: Date.now() });
   }
   ```

3. **Use `restoreTimers()` Instead of Stop/Start All**
   ```typescript
   // In handleWindowModeToggle(), replace:
   await windowTimerManager.stopAllTimers();
   // ... start timers ...

   // With:
   await windowTimerManager.restoreTimers(windowStates, delayTime);
   ```

### Priority 2: CLEANUP

4. **Remove Redundant In-Memory Guards**
   - Keep first storage check at line 523
   - Remove `isStopping()` checks at lines 525, 536, 544
   - Trust storage values like Global mode does

5. **Add Documentation**
   - Document suspension strategy
   - Explain alarm persistence assumptions
   - Clarify failure modes and mitigations

### Priority 3: TESTING

6. **Test Cases to Add**
   - Service worker suspension + resumption
   - Extended idle periods (30+ minutes)
   - Multiple window timer creation race conditions
   - Keep-alive detection of missing timers

## Impact Assessment

**Likelihood of Failure**: LOW to MEDIUM
- Chrome alarms generally persist across suspensions
- Window mode checks storage, so core functionality works
- Most users interact with browser frequently enough to trigger restoration

**Severity if Failure Occurs**: MEDIUM
- Tab switching stops for affected windows
- No data loss or corruption
- User can fix by toggling settings
- Recovers automatically on next app event

**Priority**: MEDIUM
- Not blocking for MVP
- Should be fixed before 2.0 release
- Important for long-session users (developers, researchers)

## Files Affected

- `src/core/window-timer-manager.ts` (add heartbeat tracking)
- `src/background.ts` (add keep-alive handler, call restoreTimers)
- `src/core/storage.ts` (add lastWindowCheck initialization)
- `src/core/constants.ts` (add WINDOW_MODE_KEEPALIVE_NAME constant)

## Related Issues

- #[issue-number] - Global mode not working after fresh install (FIXED)
- This document describes follow-up improvements for Window mode resilience
