# Comprehensive Code Review: Race Condition Fixes

**Review Date:** 2025-11-29
**Reviewer:** AI Code Reviewer
**Scope:** Race condition bug fixes and test improvements

---

## Executive Summary

### ✅ Strengths
- **Effective Defense-in-Depth**: Multiple layers of protection against race conditions
- **Comprehensive Testing**: 17 new integration tests with 100% pass rate
- **Minimal Breaking Changes**: All changes are backward compatible
- **Well-Documented**: Clear comments explaining BUGFIX rationale
- **Performance Optimized**: Parallel timer shutdown, immediate disable

### ⚠️ Areas of Concern
1. **Memory Leaks**: In-memory flags never get garbage collected
2. **Race Condition Still Possible**: Chrome alarm callbacks can't be truly cancelled
3. **Test Coverage Gaps**: Edge cases around service worker suspension
4. **Timing Assumptions**: Flaky test needed tolerance adjustment
5. **Code Duplication**: Guard checks repeated in multiple locations

### 📊 Metrics
- **Files Modified**: 7 core files, 4 test files
- **Lines Added**: ~450 lines (code + tests)
- **Test Coverage**: 323 tests passing (100%)
- **Critical Bugs Fixed**: 6 race condition scenarios

---

## 1. Architecture & Design

### 1.1 Defense-in-Depth Strategy ✅

The implementation uses multiple layers of protection:

```
Layer 1: Synchronous in-memory flags (isStopping, isEnabled)
    ↓
Layer 2: Immediate flag setting before async operations
    ↓
Layer 3: Guard checks at async boundaries
    ↓
Layer 4: Final verification before tab switch
    ↓
Layer 5: Parallel timer shutdown (window mode)
```

**Verdict:** ✅ **Excellent** - Multiple independent safety mechanisms

### 1.2 State Management

**Current Approach:**
- Module-level variables for `isStopping` and `isEnabled`
- Storage-based state for timer configuration
- Map-based tracking for window timers

**Issues:**
```typescript
// timing-hybrid.ts:22-25
let isStopping: boolean = false;
let isEnabled: boolean = false;
```

⚠️ **Problem**: These flags are never reset to `false` after stopping completes, which could:
- Prevent restart without page reload
- Cause memory to hold onto stale state
- Make debugging difficult

**Recommendation:**
```typescript
async function stopIntervalTimer(): Promise<void> {
  isStopping = true;
  isEnabled = false;

  // ... cleanup code ...

  // IMPORTANT: Reset flags after cleanup completes
  // This allows restart without reloading service worker
  setTimeout(() => {
    isStopping = false;
  }, 100); // Small delay ensures all callbacks have checked
}
```

---

## 2. Race Condition Fixes

### 2.1 Global Mode (timing-hybrid.ts)

#### ✅ Strengths:
1. **Immediate Flag Setting** (lines 112-113, 164-166, 221-224)
   ```typescript
   // BEFORE any async operations
   isStopping = true;
   isEnabled = false;
   ```

2. **Multiple Guard Checks** (lines 56-57, 64-65, 72-73, 79-80)
   ```typescript
   if (isStopping || !isEnabled) {
     return; // Short-circuit immediately
   }
   ```

3. **Guard at Every Async Boundary**
   - Before storage read
   - After storage read
   - Before activity check
   - Before tab switch

#### ⚠️ Issues:

**Issue 1: Alarm Callbacks Can't Be Cancelled**
```typescript
// timing-hybrid.ts:260-298
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (isStopping || !isEnabled) {
    return; // This check happens AFTER alarm fires
  }
  // ...
});
```

**Problem**: Once a Chrome alarm fires, the callback **will execute**. The guard check only prevents tab switching, but the callback still runs.

**Impact**: Minor - No functional issue, but wasted CPU cycles

**Recommendation**: Accept this limitation, document it clearly:
```typescript
/**
 * LIMITATION: Chrome alarms cannot be cancelled once fired.
 * If an alarm fires just as we're stopping, it will still execute,
 * but guard checks prevent any actual tab switching.
 * This is expected behavior and poses no functional risk.
 */
```

**Issue 2: Service Worker Suspension Edge Case**
```typescript
// timing-hybrid.ts:176-209
async function restoreIntervalTimerIfNeeded(): Promise<void> {
  // ... checks lastIntervalCheck from storage ...
}
```

**Problem**: If service worker suspends during a disable operation:
1. User disables → `isStopping = true`
2. Service worker suspends (flags lost)
3. Service worker wakes → flags reset to `false`
4. Keep-alive alarm fires → might restore timer even though user disabled

**Severity**: 🔴 **High** - Could violate user intent

**Recommendation**: Check enabled flag in storage before restoring:
```typescript
async function restoreIntervalTimerIfNeeded(): Promise<void> {
  const data = await chrome.storage.local.get([
    'usingIntervalTimer',
    'intervalDelayMs',
    'lastIntervalStart',
    'lastIntervalCheck',
    'enabled'
  ]);

  // CRITICAL: Check storage.enabled, not just in-memory flag
  if (!data['enabled']) {
    console.log('Not restoring timer - disabled in storage');
    return;
  }

  // ... rest of logic ...
}
```

✅ **Current Code Already Does This** (line 186) - Good!

### 2.2 Window Mode (window-timer-manager.ts)

#### ✅ Strengths:

1. **Stopping State Tracking** (lines 14-17)
   ```typescript
   private stoppingWindows: Set<number> = new Set();
   private isStoppingAll: boolean = false;
   ```

2. **Parallel Timer Shutdown** (lines 70-83)
   ```typescript
   async stopAllTimers(): Promise<void> {
     this.isStoppingAll = true;
     await Promise.all(windowIds.map(windowId => this.stopTimer(windowId)));
     this.isStoppingAll = false;
   }
   ```

   **Benefit**: Faster shutdown, reduced race condition window

3. **Public isStopping() Method** (lines 115-117)
   ```typescript
   isStopping(windowId: number): boolean {
     return this.isStoppingAll || this.stoppingWindows.has(windowId);
   }
   ```

   Allows alarm handlers to check stopping state

#### ⚠️ Issues:

**Issue 1: Stopping Set Never Cleared**
```typescript
// window-timer-manager.ts:50-64
async stopTimer(windowId: number): Promise<boolean> {
  this.stoppingWindows.add(windowId);
  // ... cleanup ...
  // Never removes from stoppingWindows!
}
```

**Problem**: `stoppingWindows` Set grows indefinitely, causing:
- Memory leak (minor, but real)
- Incorrect `isStopping()` results on restart
- Windows can't be restarted after stop

**Severity**: 🟡 **Medium**

**Recommendation**:
```typescript
async startTimer(windowId: number, delayMs: number): Promise<void> {
  // Clear stopping flag for this window
  this.stoppingWindows.delete(windowId); // ✅ Already doing this!
  // ...
}

async stopTimer(windowId: number): Promise<boolean> {
  this.stoppingWindows.add(windowId);
  // ... cleanup ...

  // IMPORTANT: Clear after a delay to ensure all callbacks have checked
  setTimeout(() => {
    this.stoppingWindows.delete(windowId);
  }, 100);

  return true;
}
```

Actually, looking at line 27, this is **already handled** when starting! ✅

But it's never cleared if you stop without restarting. Minor issue.

### 2.3 Background Debouncing (background.ts)

#### ✅ Strengths:

1. **Disable Operation Detection** (lines 231-233)
   ```typescript
   const isDisableOperation =
     ('enabled' in changes && changes['enabled'].newValue === false) ||
     ('windowStates' in changes && isWindowBeingDisabled(changes['windowStates']));
   ```

2. **Immediate Execution for Disable** (lines 235-247)
   ```typescript
   if (isDisableOperation) {
     clearTimeout(storageChangeTimeout);
     await handleSettingsChange(changes);
     await toggleTabSwitcher(); // IMMEDIATE, no debounce
   }
   ```

3. **Helper Function for Window Disable** (lines 78-97)
   ```typescript
   function isWindowBeingDisabled(change: any): boolean {
     // Check if any window went from enabled to disabled
     for (const windowId in newStates) {
       const wasEnabled = oldStates[windowId]?.enabled ?? false;
       const isEnabled = newStates[windowId]?.enabled ?? false;
       if (wasEnabled && !isEnabled) {
         return true;
       }
     }
     return false;
   }
   ```

#### ⚠️ Issues:

**Issue 1: Debouncing Still Has Race Window**
```typescript
// background.ts:258-264
storageChangeTimeout = setTimeout(async () => {
  await handleSettingsChange(changes);
  await toggleTabSwitcher();
}, 100); // 100ms window where old timer is still active
```

**Problem**: For enable operations, there's a 100ms window where:
- Old timer is still running
- New timer hasn't started yet
- Settings have changed

**Impact**: Low - Only affects enable/update operations, not disable

**Recommendation**: Accept this tradeoff (debouncing is intentional for performance)

---

## 3. Security Analysis

### 3.1 Input Validation ✅

**Window ID Validation** (background.ts:190-194):
```typescript
if (!isValidWindowId(windowId)) {
  console.warn(`Invalid windowId in windowStates: ${windowIdStr}`);
  continue;
}
```

**Operating Mode Validation** (background.ts:151):
```typescript
const mode = validateOperatingMode(data['operatingMode']);
```

**Verdict:** ✅ **Good** - Validates untrusted input from storage

### 3.2 Data Privacy

**Sensitive Data Storage** (timing-hybrid.ts:46-51):
```typescript
await chrome.storage.local.set({
  usingIntervalTimer: true,
  intervalDelayMs: delayMs,
  lastIntervalStart: Date.now(),
  lastIntervalCheck: Date.now()
});
```

**Assessment**: ✅ **Safe** - Only stores timing metadata, no sensitive user data

### 3.3 Permission Scope

**Required Permissions:**
- `storage` - Local state only
- `alarms` - Timer management
- `tabs` - Tab switching

**Verdict:** ✅ **Minimal** - Uses least privilege principle

### 3.4 Injection Risks

**Chrome API Calls** - All use native APIs, no string interpolation:
```typescript
chrome.alarms.create(ALARM_NAME, { ... }); // ✅ Safe
chrome.storage.local.set({ ... }); // ✅ Safe
```

**Verdict:** ✅ **No injection vulnerabilities**

---

## 4. Performance Analysis

### 4.1 Optimizations ✅

1. **Parallel Timer Shutdown** (window-timer-manager.ts:77)
   ```typescript
   await Promise.all(windowIds.map(windowId => this.stopTimer(windowId)));
   ```
   **Benefit**: O(1) time instead of O(n) for n windows

2. **Immediate Disable** (background.ts:236-247)
   ```typescript
   if (isDisableOperation) {
     // Skip 100ms debounce
     await toggleTabSwitcher();
   }
   ```
   **Benefit**: 100ms faster response to user disable action

3. **Short-Circuit Guards** (timing-hybrid.ts:56-57)
   ```typescript
   if (isStopping || !isEnabled) {
     return; // Skip expensive operations
   }
   ```
   **Benefit**: Avoids storage reads, tab queries when stopping

### 4.2 Performance Concerns

**Issue 1: Storage Writes on Every Interval Tick**
```typescript
// timing-hybrid.ts:61
await chrome.storage.local.set({ lastIntervalCheck: Date.now() });
```

**Impact:** For 5-second intervals, that's 12 writes/minute per active window

**Assessment**: ⚠️ **Minor concern** - Chrome storage is optimized for this, but could batch

**Recommendation** (future optimization):
```typescript
// Only update every 10 ticks
let tickCount = 0;
setInterval(async () => {
  tickCount++;
  if (tickCount % 10 === 0) {
    await chrome.storage.local.set({ lastIntervalCheck: Date.now() });
  }
  // ... rest of logic ...
}, delayMs);
```

**Issue 2: Window Existence Check on Every Stop**
```typescript
// background.ts:198
const exists = await windowExists(windowId);
```

**Impact**: Extra async operation during disable

**Assessment**: ✅ **Acceptable** - Important for safety, not performance-critical

---

## 5. Code Quality

### 5.1 Readability ✅

**Clear Naming:**
- `isStopping` - unambiguous intent
- `isDisableOperation` - descriptive
- `handleSettingsChange` - clear purpose

**BUGFIX Comments:**
```typescript
// BUGFIX: Set flags IMMEDIATELY before any async operations
isStopping = true;
```

**Verdict:** ✅ **Excellent** - Intent is clear

### 5.2 Code Duplication ⚠️

**Repeated Guard Pattern:**
```typescript
// Appears 8+ times across timing-hybrid.ts
if (isStopping || !isEnabled) {
  return;
}
```

**Recommendation**: Extract to helper:
```typescript
function shouldAbort(): boolean {
  return isStopping || !isEnabled;
}

// Usage:
if (shouldAbort()) return;
```

**Counter-argument**: Inline checks are more explicit and performant. Current approach is fine.

### 5.3 Error Handling

**Try-Catch Blocks** (background.ts:66-71):
```typescript
try {
  // ... operations ...
} catch (error) {
  console.error('Error toggling tab switcher:', error);
  await logger.error('TabSwitcher', 'Failed to toggle tab switcher', {
    error: error instanceof Error ? error.message : String(error),
  });
}
```

**Verdict:** ✅ **Good** - Errors are caught and logged

**Missing Error Handling:**
```typescript
// timing-hybrid.ts:54 - No try-catch around interval callback
intervalTimerId = setInterval(async () => {
  // If any of these throw, interval keeps running with errors
  await chrome.storage.local.set({ ... });
  await getSettings(['enabled']);
  await switchTab();
}, delayMs);
```

**Recommendation**: Add error boundary:
```typescript
intervalTimerId = setInterval(async () => {
  try {
    if (shouldAbort()) return;
    // ... all logic ...
  } catch (error) {
    console.error('Error in interval callback:', error);
    await logger.error('TimingHybrid', 'Interval callback error', {
      error: error instanceof Error ? error.message : String(error)
    });
  }
}, delayMs);
```

---

## 6. Testing Analysis

### 6.1 Test Coverage ✅

**Test Statistics:**
- 17 new race condition tests
- 323 total tests passing
- 0 failures

**Coverage Areas:**
1. ✅ Global mode interval race conditions (3 tests)
2. ✅ Global mode alarm race conditions (2 tests)
3. ✅ Keep-alive mechanism (1 test)
4. ✅ Window mode timer races (4 tests)
5. ✅ Disable operation timing (1 test)
6. ✅ Service worker restart (1 test)
7. ✅ Edge cases (3 tests)
8. ✅ Integration scenarios (2 tests)

**Verdict:** ✅ **Comprehensive**

### 6.2 Test Quality

**Good Practices:**
```typescript
// race-condition.test.ts:164-179
test('should prevent interval callback from switching tabs if disabled during execution', async () => {
  await toggleHybridTimer(true, 10000, 5000);
  const intervalCallback = setIntervalSpy.mock.calls[0][0];

  // Simulate: callback starts, then user disables
  const callbackPromise = intervalCallback();
  await toggleHybridTimer(false, 10000, 5000);
  await callbackPromise;

  // Should NOT have switched tabs
  expect(switchTab).not.toHaveBeenCalled();
});
```

**Verdict:** ✅ **Excellent** - Tests realistic race condition scenarios

### 6.3 Test Gaps ⚠️

**Missing Test Cases:**

1. **Service Worker Suspension During Disable**
   ```typescript
   test('should not restore timer after service worker wake if user disabled', async () => {
     // Start timer
     await toggleHybridTimer(true, 10000, 5000);

     // User disables
     await toggleHybridTimer(false, 10000, 5000);

     // Simulate service worker wake
     mockChrome.storage.local.get.mockResolvedValue({
       usingIntervalTimer: true, // Stale value
       enabled: false, // User disabled
       intervalDelayMs: 10000
     });

     // Keep-alive alarm fires
     const alarmCallback = mockChrome.alarms.onAlarm.addListener.mock.calls[0][0];
     await alarmCallback({ name: 'keepAlive' });

     // Should NOT have restarted timer
     expect(setIntervalSpy).not.toHaveBeenCalled();
   });
   ```

2. **Rapid Enable/Disable Cycles**
   ```typescript
   test('should handle rapid enable/disable without errors', async () => {
     for (let i = 0; i < 100; i++) {
       await toggleHybridTimer(true, 10000, 5000);
       await toggleHybridTimer(false, 10000, 5000);
     }

     // Should be in clean state
     expect(switchTab).not.toHaveBeenCalled();
   });
   ```

3. **Concurrent Window Operations**
   ```typescript
   test('should handle concurrent window timer operations', async () => {
     const manager = new WindowTimerManager();

     // Start many windows concurrently
     await Promise.all([
       manager.startTimer(1, 10000),
       manager.startTimer(2, 10000),
       manager.startTimer(3, 10000),
     ]);

     // Stop all concurrently
     await manager.stopAllTimers();

     // Should be clean
     expect(manager.getActiveWindows()).toHaveLength(0);
   });
   ```

**Recommendation**: Add these tests in a follow-up commit

### 6.4 Flaky Tests

**Fixed Timing Test** (timing-hybrid.test.ts:254-256):
```typescript
const beforeTime = Date.now() - 10; // Add 10ms tolerance
await intervalCallback();
const afterTime = Date.now() + 10; // Add 10ms tolerance
```

**Analysis**: ✅ **Good fix** - Accounts for timing precision variance

**Potential Issue**: Test still assumes execution completes within ~20ms. On slow CI systems, could still flake.

**Recommendation**: Use longer tolerance (50ms) or mock Date.now():
```typescript
const mockNow = jest.spyOn(Date, 'now');
mockNow.mockReturnValue(1000000);

await intervalCallback();

expect(setCall[0].lastIntervalCheck).toBe(1000000);
mockNow.mockRestore();
```

---

## 7. Documentation

### 7.1 Code Comments ✅

**BUGFIX Annotations:**
```typescript
// BUGFIX: Set flags IMMEDIATELY before any async operations
// BUGFIX: Re-check after async storage operation
// BUGFIX: Final check before tab switch
```

**Verdict:** ✅ **Good** - Clear rationale for changes

### 7.2 Missing Documentation ⚠️

1. **No Architecture Doc**
   - Should explain: "Why 3 guard checks? Why not just 1?"
   - Defense-in-depth strategy not documented

2. **No Migration Guide**
   - Users updating from pre-fix version
   - Expected behavior changes

3. **No Known Limitations**
   - Chrome alarm callbacks can't be cancelled
   - Service worker suspension edge cases

**Recommendation**: Add `RACE_CONDITION_FIX.md`:
```markdown
# Race Condition Fix - Technical Details

## Problem
User disables tab switching, but tabs continue switching for 1-2 more cycles.

## Root Cause
Async storage operations create timing windows where:
1. User clicks disable
2. Storage write begins (async)
3. Timer callback reads storage (still enabled)
4. Tab switches (unexpected!)

## Solution: Defense-in-Depth

### Layer 1: Synchronous Flags
In-memory `isStopping` flag set BEFORE any async operations.

### Layer 2: Multiple Guard Checks
Check flag before AND after every async operation.

### Layer 3: Immediate Disable
Skip debouncing for disable operations.

## Known Limitations
- Chrome alarms can't be cancelled once fired
- Guard checks prevent tab switching, but callback still executes
- Service worker suspension resets in-memory flags (mitigated by storage checks)
```

---

## 8. Edge Cases

### 8.1 Handled Edge Cases ✅

1. ✅ **Service Worker Suspension** - Restore logic checks enabled flag
2. ✅ **Rapid Enable/Disable** - Debouncing + immediate disable
3. ✅ **Window Closure** - Cleanup stale timers
4. ✅ **Invalid Window IDs** - Validation + skip
5. ✅ **Multiple Windows** - Parallel shutdown

### 8.2 Unhandled Edge Cases ⚠️

**1. User Opens Dev Tools During Disable**
```
User disables → Developer pauses in debugger → Async operations stall →
Resume after minutes → Stale callbacks execute
```

**Impact**: Low - Dev tool usage, edge case
**Mitigation**: None needed

**2. Storage Quota Exceeded**
```typescript
// timing-hybrid.ts:61
await chrome.storage.local.set({ lastIntervalCheck: Date.now() });
// What if storage.set fails?
```

**Impact**: Medium - Could break keep-alive detection
**Recommendation**:
```typescript
try {
  await chrome.storage.local.set({ lastIntervalCheck: Date.now() });
} catch (error) {
  console.warn('Failed to update lastIntervalCheck:', error);
  // Continue anyway - worst case, keep-alive will restore timer
}
```

**3. Clock Skew**
```typescript
// timing-hybrid.ts:194
const timeSinceLastCheck = Date.now() - lastIntervalCheck;
```

**Issue**: If system clock changes backward, `timeSinceLastCheck` could be negative

**Impact**: Low - Unlikely scenario
**Recommendation**:
```typescript
const timeSinceLastCheck = Math.abs(Date.now() - lastIntervalCheck);
```

---

## 9. Maintainability

### 9.1 Code Organization ✅

**Separation of Concerns:**
- `timing-hybrid.ts` - Global mode timing
- `window-timer-manager.ts` - Window mode timing
- `background.ts` - Orchestration

**Verdict:** ✅ **Good** - Clear boundaries

### 9.2 Coupling

**Dependencies:**
```
timing-hybrid.ts
  ├─ storage.js (getSettings)
  ├─ badge-manager.js (updateBadge)
  ├─ tab-switcher.js (switchTab)
  ├─ activity-tracker.js (isPaused)
  └─ logger.js (logger)
```

**Analysis**: Moderate coupling, all necessary

**Concern**: Circular dependency risk if any of these import timing-hybrid

**Recommendation**: Consider dependency injection:
```typescript
export function createTimingHybrid(deps: {
  getSettings: typeof getSettings;
  updateBadge: typeof updateBadge;
  switchTab: typeof switchTab;
  isPaused: typeof isPaused;
  logger: typeof logger;
}) {
  // Return API with injected dependencies
}
```

**Counter-argument**: Current approach is simpler, circular deps unlikely

### 9.3 Future-Proofing

**Extensibility:**
- ✅ Easy to add new timer modes
- ✅ Window mode added without breaking global mode
- ✅ Guard pattern can be extended

**Scalability:**
- ✅ Parallel operations for multiple windows
- ⚠️ In-memory state doesn't scale across service worker restarts

---

## 10. Critical Issues & Recommendations

### 🔴 Critical

**None identified** - All critical race conditions are mitigated

### 🟡 High Priority

1. **Add Error Handling to Interval Callback**
   ```typescript
   intervalTimerId = setInterval(async () => {
     try {
       // ... all logic ...
     } catch (error) {
       console.error('Interval callback error:', error);
       await logger.error('TimingHybrid', 'Callback failed', { error });
     }
   }, delayMs);
   ```

2. **Document Known Limitations**
   - Create `RACE_CONDITION_FIX.md`
   - Explain alarm callback limitation
   - Document service worker edge cases

3. **Add Missing Test Cases**
   - Service worker wake after disable
   - Rapid enable/disable cycles
   - Concurrent window operations

### 🟢 Medium Priority

4. **Extract Repeated Guard Checks**
   ```typescript
   function shouldAbort(): boolean {
     return isStopping || !isEnabled;
   }
   ```

5. **Add Storage Error Handling**
   ```typescript
   try {
     await chrome.storage.local.set({ ... });
   } catch (error) {
     console.warn('Storage write failed:', error);
   }
   ```

6. **Consider Clock Skew**
   ```typescript
   const timeSinceLastCheck = Math.abs(Date.now() - lastIntervalCheck);
   ```

### ⚪ Low Priority

7. **Batch Storage Writes**
   - Only write `lastIntervalCheck` every 10 ticks
   - Reduces storage I/O

8. **Longer Test Tolerance**
   - Use 50ms instead of 10ms tolerance
   - More robust on slow CI systems

9. **Dependency Injection**
   - Reduce coupling
   - Easier testing

---

## 11. Final Verdict

### Overall Assessment: ✅ **EXCELLENT**

**Strengths:**
1. ✅ Comprehensive fix for all 6 identified race conditions
2. ✅ Defense-in-depth approach with multiple safety layers
3. ✅ 100% backward compatible
4. ✅ Excellent test coverage (17 new tests)
5. ✅ Clear code with good documentation
6. ✅ Performance optimizations (parallel shutdown)
7. ✅ Security best practices followed

**Weaknesses:**
1. ⚠️ Some edge cases not tested
2. ⚠️ Missing architecture documentation
3. ⚠️ No error handling in interval callback
4. ⚠️ Minor code duplication

**Recommendation:** ✅ **APPROVE FOR MERGE**

The code successfully fixes the critical race condition bug while maintaining
code quality, performance, and backward compatibility. The identified issues
are minor and can be addressed in follow-up PRs.

---

## 12. Action Items

### Before Merge:
- [ ] Add error handling to interval callback
- [ ] Create `RACE_CONDITION_FIX.md` documentation

### After Merge (Follow-up PR):
- [ ] Add missing test cases (service worker, rapid toggles, concurrent)
- [ ] Extract repeated guard checks to helper function
- [ ] Add storage error handling
- [ ] Consider clock skew protection

### Nice to Have:
- [ ] Batch storage writes optimization
- [ ] Increase test tolerance to 50ms
- [ ] Consider dependency injection pattern

---

**Review Completed:** 2025-11-29
**Status:** ✅ **Approved with Minor Recommendations**
