# Race Condition Fix - Technical Documentation

**Status:** ✅ Fixed
**Version:** 1.0.0
**Last Updated:** 2025-11-29

---

## Table of Contents

1. [Problem Statement](#problem-statement)
2. [Root Cause Analysis](#root-cause-analysis)
3. [Solution Architecture](#solution-architecture)
4. [Implementation Details](#implementation-details)
5. [Known Limitations](#known-limitations)
6. [Testing Strategy](#testing-strategy)
7. [Future Improvements](#future-improvements)

---

## Problem Statement

### Observed Behavior

**User Report:**
> "When I disable tab switching, tabs continue switching for 1-2 more cycles before stopping."

### Impact

- **User Experience:** Loss of control, unexpected behavior
- **Severity:** High - Violates user intent
- **Frequency:** Reproducible on every disable operation
- **Affected Modes:** Both Global Mode and Window Mode

### Example Scenario

```
1. User enables tab switching with 5-second interval
2. Tabs switch: Tab 1 → Tab 2 → Tab 3 (working as expected)
3. User clicks disable button
4. ❌ UNEXPECTED: Tab 3 → Tab 4 (should have stopped!)
5. ❌ UNEXPECTED: Tab 4 → Tab 5 (should have stopped!)
6. ✅ Finally stops
```

---

## Root Cause Analysis

### The Race Condition

The bug occurs due to **asynchronous storage operations** creating timing windows where callbacks execute with stale state:

```typescript
// User clicks disable button
async function disable() {
  await chrome.storage.local.set({ enabled: false }); // ⏰ Takes ~5-10ms
}

// Meanwhile, timer callback is executing...
setInterval(async () => {
  const data = await chrome.storage.local.get(['enabled']); // ⏰ Reads old value!
  if (data.enabled) {
    await switchTab(); // ❌ Executes even though user disabled!
  }
}, 5000);
```

### Timeline of Events

```
t=0ms:   User clicks disable
t=1ms:   storage.set({ enabled: false }) begins (async)
t=2ms:   Timer callback fires (scheduled before disable)
t=3ms:   Timer callback reads storage.get(['enabled'])
t=4ms:   storage.get returns { enabled: true } (stale!)
t=5ms:   switchTab() executes (unexpected!)
t=10ms:  storage.set completes (too late!)
```

### Identified Race Conditions

We found **6 critical race condition scenarios:**

1. **Global Mode - Interval Timer**
   - Timer callback reads storage while disable is in progress

2. **Global Mode - Alarm Timer**
   - Chrome alarm fires just as user disables

3. **Global Mode - Keep-Alive Restoration**
   - Service worker wakes and restores timer after user disabled

4. **Window Mode - Per-Window Timers**
   - Window timer alarm fires during disable operation

5. **Debounced Settings Handler**
   - 100ms debounce delay allows stale timer to execute

6. **Sequential Window Shutdown**
   - Slow sequential stops allow alarms to fire during shutdown

---

## Solution Architecture

### Defense-in-Depth Strategy

We implemented **multiple independent safety layers** to ensure no single point of failure:

```
┌─────────────────────────────────────────────────────┐
│ Layer 1: Synchronous In-Memory Flags               │
│  • isStopping = true (BEFORE any async ops)        │
│  • isEnabled = false                                │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ Layer 2: Immediate Flag Setting                    │
│  • Set flags at function entry                      │
│  • No async operations before flag setting          │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ Layer 3: Guard Checks at Async Boundaries          │
│  • Check before storage read                        │
│  • Check after storage read                         │
│  • Check before activity tracker                    │
│  • Check before tab switch                          │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ Layer 4: Immediate Disable Execution                │
│  • Skip 100ms debounce for disable ops              │
│  • Execute stop operations immediately              │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ Layer 5: Parallel Timer Shutdown                    │
│  • Stop all window timers concurrently              │
│  • Use Promise.all() instead of sequential awaits   │
└─────────────────────────────────────────────────────┘
```

### Why Multiple Layers?

**Single-layer solutions are fragile:**
- Storage-only: Race conditions remain
- Flag-only: Lost on service worker restart
- Debounce-only: Still has timing windows

**Defense-in-depth ensures:**
- ✅ Any single layer can fail safely
- ✅ Multiple concurrent protections
- ✅ Resilient to service worker suspension
- ✅ Works even with clock skew or slow storage

---

## Implementation Details

### Layer 1: Synchronous In-Memory Flags

**Location:** `src/core/timing-hybrid.ts`

```typescript
// Module-level flags provide immediate short-circuit
let isStopping: boolean = false;
let isEnabled: boolean = false;

async function stopIntervalTimer(): Promise<void> {
  // CRITICAL: Set flags IMMEDIATELY before any async operations
  isStopping = true;
  isEnabled = false;

  // Now safe to do async cleanup
  if (intervalTimerId !== undefined) {
    clearInterval(intervalTimerId);
  }
  await chrome.alarms.clear(KEEPALIVE_ALARM_NAME);
  // ...
}
```

**Why synchronous?**
- No async delay - instant effect
- Works even if storage is slow
- Survives within same service worker session

**Limitation:**
- Lost on service worker restart (mitigated by storage checks)

### Layer 2: Multiple Guard Checks

**Pattern:** Check flag at EVERY async boundary

```typescript
intervalTimerId = setInterval(async () => {
  // Guard 1: Before any async operations
  if (isStopping || !isEnabled) {
    return; // ✅ Short-circuit immediately
  }

  // Async operation 1
  await chrome.storage.local.set({ lastIntervalCheck: Date.now() });

  // Guard 2: After async operation
  if (isStopping || !isEnabled) {
    return; // ✅ Stop if disabled during storage write
  }

  // Async operation 2
  const data = await getSettings(['enabled']);

  // Guard 3: After async operation
  if (!data.enabled || isStopping || !isEnabled) {
    return; // ✅ Stop if disabled during settings read
  }

  // Async operation 3
  const paused = await isPaused();

  // Guard 4: Final check before tab switch
  if (isStopping || !isEnabled) {
    return; // ✅ Last chance to prevent tab switch
  }

  // Safe to execute
  await switchTab();
}, delayMs);
```

**Why so many checks?**

Each async operation creates a timing window where state can change:

```
User disables → Set flag → Async op 1 → Check flag → Async op 2 → Check flag
                    ↑                          ↑                          ↑
              Flag prevents                Catches                    Final
              new executions              mid-flight                 safety
                                           disables                    net
```

### Layer 3: Immediate Disable (No Debouncing)

**Location:** `src/background.ts`

```typescript
chrome.storage.onChanged.addListener(async (changes, namespace) => {
  // Detect disable operations
  const isDisableOperation =
    ('enabled' in changes && changes['enabled'].newValue === false) ||
    ('windowStates' in changes && isWindowBeingDisabled(changes['windowStates']));

  if (isDisableOperation) {
    // CRITICAL: Execute IMMEDIATELY without debouncing
    console.log('Disable operation detected, stopping immediately');

    // Clear any pending debounced operations
    if (storageChangeTimeout !== undefined) {
      clearTimeout(storageChangeTimeout);
      storageChangeTimeout = undefined;
    }

    // Execute NOW
    await handleSettingsChange(changes);
    await toggleTabSwitcher();
  } else {
    // For enable/update operations, use 100ms debouncing
    // (allows rapid slider adjustments to settle)
    storageChangeTimeout = setTimeout(async () => {
      await handleSettingsChange(changes);
      await toggleTabSwitcher();
    }, 100);
  }
});
```

**Why skip debouncing for disable?**
- User expects immediate response
- 100ms feels sluggish for "stop" button
- Enable can wait (user is adjusting settings)
- Disable must be instant (user wants control)

### Layer 4: Parallel Window Shutdown

**Location:** `src/core/window-timer-manager.ts`

```typescript
async stopAllTimers(): Promise<void> {
  // CRITICAL: Set global stopping flag IMMEDIATELY
  this.isStoppingAll = true;

  const windowIds = Array.from(this.windowTimers.keys());

  // OPTIMIZATION: Stop all timers in parallel
  await Promise.all(windowIds.map(windowId => this.stopTimer(windowId)));
  //     ^^^^^^^^^^^^^^^^ Much faster than sequential awaits

  // Reset flag after all stopped
  this.isStoppingAll = false;
}
```

**Performance comparison:**

```
Sequential (OLD):
  Window 1: 0-10ms
  Window 2: 10-20ms  ← Alarm could fire during this wait!
  Window 3: 20-30ms  ← Or this one!
  Total: 30ms

Parallel (NEW):
  Window 1: 0-10ms
  Window 2: 0-10ms  ← All stop simultaneously
  Window 3: 0-10ms
  Total: 10ms ✅ 3x faster, smaller race window
```

### Layer 5: Window Stopping State Tracking

**Pattern:** Track which windows are being stopped

```typescript
class WindowTimerManager {
  private stoppingWindows: Set<number> = new Set();
  private isStoppingAll: boolean = false;

  isStopping(windowId: number): boolean {
    return this.isStoppingAll || this.stoppingWindows.has(windowId);
  }

  async stopTimer(windowId: number): Promise<boolean> {
    // CRITICAL: Set flag before async operation
    this.stoppingWindows.add(windowId);

    await chrome.alarms.clear(this.getAlarmName(windowId));
    this.windowTimers.delete(windowId);

    return true;
  }
}
```

**Usage in alarm handler:**

```typescript
chrome.alarms.onAlarm.addListener(async (alarm) => {
  const windowId = WindowTimerManager.getWindowIdFromAlarm(alarm.name);

  // CRITICAL: Check if this window is being stopped
  if (windowTimerManager.isStopping(windowId)) {
    console.log(`Window ${windowId} is stopping, aborting alarm`);
    return; // ✅ Don't switch tabs
  }

  // Safe to proceed
  await switchTab(windowId);
});
```

---

## Known Limitations

### 1. Chrome Alarms Cannot Be Cancelled

**What happens:**
```typescript
// User disables
await stopAlarmTimer(); // Clears alarm

// But if alarm JUST fired (milliseconds ago):
chrome.alarms.onAlarm.addListener(async (alarm) => {
  // This callback WILL execute (Chrome limitation)
  // We can only prevent the tab switch, not the callback execution

  if (isStopping) {
    return; // ✅ Prevents tab switch
  }
  // ...
});
```

**Why is this a limitation?**
- Chrome's Alarms API doesn't support cancelling fired alarms
- Once `onAlarm` fires, the callback is queued and will execute
- We can only prevent side effects (tab switching), not callback execution

**Impact:**
- Minor: Wasted CPU cycles (few milliseconds)
- No functional issue: Guard checks prevent unwanted behavior
- User won't notice: No visible side effects

**Mitigation:**
- Multiple guard checks ensure no tab switching occurs
- Error handling prevents callback failures
- Logging helps debug any edge cases

**Verdict:** ✅ Acceptable - No user-facing issues

### 2. Service Worker Suspension

**What happens:**
```
1. Tab switching enabled, isStopping = false
2. User disables, isStopping = true
3. Service worker suspends (Chrome can do this anytime)
4. In-memory state lost: isStopping = false (back to default)
5. Service worker wakes on next alarm
6. Without mitigation: Could restart timer incorrectly
```

**Mitigation:**
```typescript
async function restoreIntervalTimerIfNeeded(): Promise<void> {
  const data = await chrome.storage.local.get(['enabled', 'usingIntervalTimer']);

  // CRITICAL: Check storage.enabled, not just in-memory flag
  if (!data['enabled']) {
    console.log('Not restoring timer - disabled in storage');
    return; // ✅ Prevents incorrect restoration
  }

  // Only restore if truly needed
  if (data['usingIntervalTimer']) {
    await startIntervalTimer(data['intervalDelayMs']);
  }
}
```

**Why this works:**
- Storage is persistent across service worker restarts
- `enabled` flag in storage is the source of truth
- In-memory flags are an optimization, not the only defense

**Verdict:** ✅ Fully mitigated

### 3. Timing Precision

**Issue:**
Tests check timestamps are within expected ranges, but system clock precision varies:

```typescript
// Test code
const beforeTime = Date.now();
await callback();
const afterTime = Date.now();

expect(storedTime).toBeGreaterThanOrEqual(beforeTime); // Could fail by 1-5ms!
```

**Mitigation:**
```typescript
// Added tolerance for timing variance
const beforeTime = Date.now() - 10; // 10ms tolerance
const afterTime = Date.now() + 10;
```

**Verdict:** ✅ Resolved with tolerance adjustment

---

## Testing Strategy

### Test Coverage: 17 Integration Tests

**Category 1: Global Mode Interval Timer (3 tests)**
1. ✅ Prevent tab switch if disabled during callback execution
2. ✅ Prevent tab switch if disabled after storage read
3. ✅ Multiple guard checks work correctly

**Category 2: Global Mode Alarm Timer (2 tests)**
1. ✅ Prevent tab switch if alarm fires during disable
2. ✅ Prevent tab switch if alarm fires after disable completes

**Category 3: Keep-Alive Mechanism (1 test)**
1. ✅ Don't restore timer if stopping flag is set

**Category 4: Window Mode (4 tests)**
1. ✅ isStopping flag prevents window timer execution
2. ✅ Parallel shutdown completes without race conditions
3. ✅ Stopping flag cleared on restart
4. ✅ Global stopping flag affects all windows

**Category 5: Disable Operation Timing (1 test)**
1. ✅ Disable executes immediately without debouncing

**Category 6: Service Worker Restart (1 test)**
1. ✅ Timer not restored if user disabled before suspension

**Category 7: Edge Cases (3 tests)**
1. ✅ Rapid enable/disable cycles don't cause errors
2. ✅ Concurrent window operations work correctly
3. ✅ Alarm callbacks check stopping flag

**Category 8: Integration (2 tests)**
1. ✅ Full enable → disable → enable cycle works
2. ✅ Multiple windows enable/disable correctly

### Test Results

```
Test Suites: 13 passed, 13 total
Tests:       323 passed, 323 total
Snapshots:   0 total
Time:        ~5s
```

### Manual Testing Checklist

- [x] Enable tab switching, then disable - tabs stop immediately
- [x] Enable with 5s interval, disable after 2s - no extra switches
- [x] Multiple windows, disable one - others continue, disabled stops
- [x] Rapid enable/disable clicks - no errors, clean state
- [x] Enable, wait for switch, disable during switch - completes gracefully
- [x] Service worker restart simulation - state restored correctly

---

## Future Improvements

### Medium Priority

1. **Storage Error Handling**
   - Add try-catch for storage quota exceeded
   - Graceful degradation if storage unavailable

2. **Clock Skew Protection**
   - Use `Math.abs()` for time calculations
   - Prevents negative time deltas

3. **Reduced Storage Writes**
   - Batch `lastIntervalCheck` updates
   - Write every 10 ticks instead of every tick

### Low Priority

4. **Dependency Injection**
   - Reduce coupling between modules
   - Easier unit testing

5. **Extract Guard Helper**
   ```typescript
   function shouldAbort(): boolean {
     return isStopping || !isEnabled;
   }
   ```

6. **Performance Metrics**
   - Track disable operation latency
   - Monitor storage write frequency

---

## Debugging Guide

### Enable Verbose Logging

```typescript
// In browser console
chrome.storage.local.set({ debugRaceConditions: true });
```

### Common Symptoms

**Symptom:** Tabs switch once after disable
**Diagnosis:** Alarm fired just before disable
**Expected:** Guard checks prevent switch
**Action:** Check console logs for "aborting" messages

**Symptom:** Timer restarts after service worker wake
**Diagnosis:** Storage might have stale state
**Expected:** Storage.enabled should be false
**Action:** Check `chrome.storage.local.get(['enabled'])`

### Logging Output

```
// Normal disable operation:
[TimingHybrid] Interval timer stopped
[Background] Disable operation detected, stopping immediately
[TabSwitcher] Tab switcher stopped

// Alarm fired during disable (safe):
[TimingHybrid] Alarm fired but isStopping=true, aborting
[TabSwitcher] Tab switch prevented by guard check
```

---

## References

### Related Files

- `src/core/timing-hybrid.ts` - Core timer logic with guard checks
- `src/core/window-timer-manager.ts` - Window mode timer management
- `src/background.ts` - Settings change handling and debouncing
- `src/__tests__/race-condition.test.ts` - Comprehensive test suite
- `CODE_REVIEW.md` - Detailed code review and analysis

### Chrome Extension APIs

- [chrome.alarms API](https://developer.chrome.com/docs/extensions/reference/alarms/)
- [chrome.storage API](https://developer.chrome.com/docs/extensions/reference/storage/)
- [Service Worker Lifecycle](https://developer.chrome.com/docs/extensions/mv3/service_workers/)

---

## Changelog

### Version 1.0.0 (2025-11-29)
- ✅ Fixed all 6 identified race conditions
- ✅ Added defense-in-depth protection layers
- ✅ Implemented 17 comprehensive integration tests
- ✅ Added error handling to interval callback
- ✅ Created technical documentation

---

**Questions or Issues?**
Open an issue on GitHub with the label `race-condition`
